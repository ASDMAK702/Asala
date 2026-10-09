import React, { useState, useEffect } from 'react';
import { User } from 'firebase/auth';
import {
  backupToDrive,
  fetchDriveBackups,
  restoreFromDrive,
  addTaskToCalendar,
  exportFinancesToGoogleSheet,
  exportJournalToGoogleDoc,
  exportVisionToGoogleDoc,
} from '@/src/services/googleWorkspace';
import { getAccessToken, googleSignIn } from '@/src/services/firebaseAuth';
import {
  Finances,
  Habit,
  JournalEntry,
  SyncLogItem,
  Task,
  VisionGoal,
} from '@/src/types';
import { Button, Card, Badge, formatDate } from './CommonUI';

interface Props {
  user: User | null;
  tasks: Task[];
  habits: Habit[];
  journal: JournalEntry[];
  finances: Finances;
  vision: VisionGoal[];
  settings: any;
  onRestoreData: (restoredData: any) => void;
  showToast: (msg: string, type?: 'success' | 'info' | 'error') => void;
  confirmAction: (msg: string, onConfirm: () => void) => void;
  syncLogs: SyncLogItem[];
  addSyncLog: (log: Omit<SyncLogItem, 'id' | 'timestamp'>) => void;
  clearSyncLogs: () => void;
}

export const ConnectedServicesView: React.FC<Props> = ({
  user,
  tasks,
  habits,
  journal,
  finances,
  vision,
  settings,
  onRestoreData,
  showToast,
  confirmAction,
  syncLogs,
  addSyncLog,
  clearSyncLogs,
}) => {
  const [loadingDrive, setLoadingDrive] = useState(false);
  const [loadingCalendar, setLoadingCalendar] = useState(false);
  const [loadingSheets, setLoadingSheets] = useState(false);
  const [loadingDocs, setLoadingDocs] = useState(false);
  const [driveBackups, setDriveBackups] = useState<Array<{ id: string; name: string; modifiedTime: string; webViewLink?: string }>>([]);
  const [loadingBackupsList, setLoadingBackupsList] = useState(false);
  const [logFilter, setLogFilter] = useState<string>('all');

  // Load existing Drive backups on mount if user is connected
  useEffect(() => {
    if (user) {
      loadDriveBackups();
    }
  }, [user]);

  const getValidToken = async (): Promise<string> => {
    let token = getAccessToken();
    if (!token) {
      // Prompt user to sign in / re-authenticate
      const res = await googleSignIn();
      if (!res) {
        throw new Error('تم إلغاء عملية تسجيل الدخول أو إغلاق النافذة');
      }
      token = res.accessToken;
    }
    if (!token) {
      throw new Error('يرجى تسجيل الدخول بحساب Google أولاً للمتابعة');
    }
    return token;
  };

  const loadDriveBackups = async () => {
    try {
      setLoadingBackupsList(true);
      const token = await getValidToken();
      const backups = await fetchDriveBackups(token);
      setDriveBackups(backups);
    } catch (err: any) {
      console.warn('Could not list drive backups:', err.message);
    } finally {
      setLoadingBackupsList(false);
    }
  };

  // 1. Google Drive: Full Backup
  const handleDriveBackup = async () => {
    confirmAction(
      'سيتم حفظ نسخة احتياطية مشفرة وشاملة لكافة بياناتك (المهام، العادات، اليوميات، المالية، والرؤية) مباشرة داخل مجلد Google Drive الخاص بك. متابعة؟',
      async () => {
        setLoadingDrive(true);
        try {
          const token = await getValidToken();
          const backupPayload = {
            tasks,
            habits,
            journal,
            finances,
            vision,
            settings,
            waterGlasses: parseInt(localStorage.getItem(`asala_water_${new Date().toISOString().split('T')[0]}`) || '0'),
            exportedAt: new Date().toISOString(),
          };

          const result = await backupToDrive(backupPayload, token);
          showToast('تم حفظ النسخة الاحتياطية بنجاح على Google Drive!');
          addSyncLog({
            service: 'Drive',
            action: 'إنشاء نسخة احتياطية سحابية كاملة',
            status: 'success',
            details: `الملف: ${result.name} | التحديث: ${new Date(result.modifiedTime).toLocaleTimeString('ar-SA')}`,
            url: result.webViewLink,
          });
          loadDriveBackups();
        } catch (err: any) {
          showToast(err.message || 'فشل حفظ النسخة في Google Drive', 'error');
          addSyncLog({
            service: 'Drive',
            action: 'فشل حفظ النسخة الاحتياطية',
            status: 'error',
            details: err.message,
          });
        } finally {
          setLoadingDrive(false);
        }
      }
    );
  };

  // 2. Google Drive: Restore
  const handleDriveRestore = async (fileId: string) => {
    confirmAction(
      'تحذير: استعادة النسخة من Google Drive ستستبدل البيانات المحلية الحالية ببيانات النسخة الاحتياطية. هل تريد المتابعة؟',
      async () => {
        setLoadingDrive(true);
        try {
          const token = await getValidToken();
          const data = await restoreFromDrive(fileId, token);
          onRestoreData(data);
          showToast('تمت استعادة كافة البيانات بنجاح من Google Drive!');
          addSyncLog({
            service: 'Drive',
            action: 'استعادة البيانات من السحابة',
            status: 'success',
            details: `تم استرجاع البيانات بنجاح بتاريخ ${new Date().toLocaleTimeString('ar-SA')}`,
          });
        } catch (err: any) {
          showToast(err.message || 'تعذر استرجاع النسخة الاحتياطية', 'error');
          addSyncLog({
            service: 'Drive',
            action: 'فشل استعادة البيانات',
            status: 'error',
            details: err.message,
          });
        } finally {
          setLoadingDrive(false);
        }
      }
    );
  };

  // 3. Google Calendar: Sync Scheduled Tasks
  const handleCalendarSync = async () => {
    const tasksWithDueDate = tasks.filter((t) => t.dueDate && !t.completed);
    if (tasksWithDueDate.length === 0) {
      showToast('لا توجد مهام نشطة محددة بتاريخ استحقاق لمزامنتها حالياً', 'info');
      return;
    }

    confirmAction(
      `سيتم تصدير ومزامنة ${tasksWithDueDate.length} مهام نشطة لها تاريخ استحقاق إلى تقويم Google Calendar الخاص بك. متابعة؟`,
      async () => {
        setLoadingCalendar(true);
        let syncedCount = 0;
        let lastLink = '';
        try {
          const token = await getValidToken();
          for (const task of tasksWithDueDate) {
            const res = await addTaskToCalendar(task, token);
            syncedCount++;
            lastLink = res.htmlLink;
          }
          showToast(`تمت مزامنة ${syncedCount} مهمة بنجاح مع Google Calendar!`);
          addSyncLog({
            service: 'Calendar',
            action: `مزامنة ${syncedCount} مهام مع التقويم`,
            status: 'success',
            details: `تم إدراج المواعيد في التقويم الأساسي`,
            url: lastLink || 'https://calendar.google.com',
          });
        } catch (err: any) {
          showToast(err.message || 'فشلت مزامنة المهام مع التقويم', 'error');
          addSyncLog({
            service: 'Calendar',
            action: 'فشل مزامنة المهام',
            status: 'error',
            details: err.message,
          });
        } finally {
          setLoadingCalendar(false);
        }
      }
    );
  };

  // 4. Google Sheets: Export Finances
  const handleSheetsExport = async () => {
    confirmAction(
      'سيتم إنشاء جدول بيانات جديد في Google Sheets وتصدير كافة سجلاتك المالية وتحليلات الدخل والمصروفات إليه تلقائياً. متابعة؟',
      async () => {
        setLoadingSheets(true);
        try {
          const token = await getValidToken();
          const result = await exportFinancesToGoogleSheet(finances, token);
          showToast('تم تصدير السجل المالي إلى Google Sheets بنجاح!');
          addSyncLog({
            service: 'Sheets',
            action: 'تصدير التقرير المالي الشامل',
            status: 'success',
            details: `${finances.history.length} معاملة مالية مسجلة بالجدول`,
            url: result.spreadsheetUrl,
          });
          // Open sheet in a new tab
          window.open(result.spreadsheetUrl, '_blank');
        } catch (err: any) {
          showToast(err.message || 'فشل التصدير إلى Google Sheets', 'error');
          addSyncLog({
            service: 'Sheets',
            action: 'فشل تصدير المالية',
            status: 'error',
            details: err.message,
          });
        } finally {
          setLoadingSheets(false);
        }
      }
    );
  };

  // 5. Google Docs: Export Journal or Vision
  const handleDocsExport = async (type: 'journal' | 'vision') => {
    const isJournal = type === 'journal';
    confirmAction(
      isJournal
        ? `سيتم تصدير ${journal.length} تدوينة من مساحة البوح إلى مستند Google Doc منسق وجديد. متابعة؟`
        : `سيتم تصدير رؤية وأهداف العام (${vision.length} هدف) إلى مستند Google Doc رسمي. متابعة؟`,
      async () => {
        setLoadingDocs(true);
        try {
          const token = await getValidToken();
          let result;
          if (isJournal) {
            result = await exportJournalToGoogleDoc(journal, token);
            showToast('تم تصدير اليوميات إلى Google Docs بنجاح!');
            addSyncLog({
              service: 'Docs',
              action: 'تصدير يوميات مساحة البوح',
              status: 'success',
              details: `${journal.length} تدوينة منسقة`,
              url: result.documentUrl,
            });
          } else {
            result = await exportVisionToGoogleDoc(vision, token);
            showToast('تم تصدير وثيقة الرؤية السنوية بنجاح!');
            addSyncLog({
              service: 'Docs',
              action: 'تصدير وثيقة الرؤية السنوية',
              status: 'success',
              details: `${vision.length} هدف مصنف حسب المجالات`,
              url: result.documentUrl,
            });
          }
          window.open(result.documentUrl, '_blank');
        } catch (err: any) {
          showToast(err.message || 'فشل التصدير إلى Google Docs', 'error');
          addSyncLog({
            service: 'Docs',
            action: isJournal ? 'فشل تصدير اليوميات' : 'فشل تصدير الرؤية',
            status: 'error',
            details: err.message,
          });
        } finally {
          setLoadingDocs(false);
        }
      }
    );
  };

  const filteredLogs = syncLogs.filter((log) => {
    if (logFilter === 'all') return true;
    return log.service.toLowerCase() === logFilter.toLowerCase();
  });

  return (
    <div className="space-y-8 animate-fade-in max-w-6xl mx-auto pb-12">
      {/* Overview Banner */}
      <div className="glass-panel p-6 md:p-8 rounded-3xl relative overflow-hidden border border-olive-200/50 dark:border-olive-900/40">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 relative z-10">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <span className="p-2.5 rounded-2xl bg-olive-100 dark:bg-olive-900/60 text-olive-700 dark:text-olive-300">
                <i className="fa-brands fa-google text-2xl"></i>
              </span>
              <div>
                <h2 className="font-serif text-2xl md:text-3xl font-bold text-olive-900 dark:text-beige-50">
                  لوحة الخدمات المتصلة | Google Workspace
                </h2>
                <p className="text-sm text-olive-700 dark:text-beige-300">
                  ربط متزامن وآمن لحفظ بياناتك ومشاركتها مع خدمات Google الرسمية
                </p>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {user ? (
              <div className="flex items-center gap-3 bg-white/70 dark:bg-dark-surface/70 px-4 py-2.5 rounded-2xl border border-beige-200 dark:border-dark-border">
                <span className="w-2.5 h-2.5 rounded-full bg-green-500 animate-pulse"></span>
                <span className="text-sm font-medium text-olive-800 dark:text-beige-100">
                  الحساب متصل ومصرح
                </span>
                <Badge color="green">OAuth 2.0 نشط</Badge>
              </div>
            ) : (
              <div className="flex items-center gap-3 bg-amber-50 dark:bg-amber-950/30 px-4 py-2.5 rounded-2xl border border-amber-200 dark:border-amber-800">
                <span className="w-2.5 h-2.5 rounded-full bg-amber-500"></span>
                <span className="text-sm font-medium text-amber-800 dark:text-amber-300">
                  يرجى تسجيل الدخول لتفعيل المزامنة
                </span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Services Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {/* 1. Google Drive Card */}
        <Card className="hover:border-olive-400 transition-all flex flex-col justify-between">
          <div>
            <div className="flex justify-between items-start mb-4">
              <div className="w-12 h-12 rounded-2xl bg-blue-50 dark:bg-blue-900/30 flex items-center justify-center text-blue-600 dark:text-blue-400 text-2xl">
                <i className="fa-brands fa-google-drive"></i>
              </div>
              <Badge color={user ? 'green' : 'beige'}>{user ? 'متصل' : 'غير متصل'}</Badge>
            </div>
            <h3 className="font-serif text-xl font-bold text-olive-900 dark:text-beige-50 mb-1">
              Google Drive
            </h3>
            <p className="text-xs text-beige-600 dark:text-beige-400 mb-4 leading-relaxed">
              نسخ احتياطي سحابي تلقائي لكافة البيانات واستعادتها بضغطة زر واحدة بأمان تام.
            </p>
          </div>

          <div className="space-y-2 pt-3 border-t border-beige-100 dark:border-dark-border/50">
            <Button
              onClick={handleDriveBackup}
              loading={loadingDrive}
              disabled={!user}
              variant="primary"
              size="sm"
              className="w-full"
              icon="fa-solid fa-cloud-arrow-up"
            >
              نسخ احتياطي للـ Drive
            </Button>
            {driveBackups.length > 0 && (
              <Button
                onClick={() => handleDriveRestore(driveBackups[0].id)}
                loading={loadingDrive}
                disabled={!user}
                variant="secondary"
                size="sm"
                className="w-full"
                icon="fa-solid fa-cloud-arrow-down"
              >
                استعادة آخر نسخة ({formatDate(driveBackups[0].modifiedTime)})
              </Button>
            )}
          </div>
        </Card>

        {/* 2. Google Calendar Card */}
        <Card className="hover:border-olive-400 transition-all flex flex-col justify-between">
          <div>
            <div className="flex justify-between items-start mb-4">
              <div className="w-12 h-12 rounded-2xl bg-red-50 dark:bg-red-900/30 flex items-center justify-center text-red-500 text-2xl">
                <i className="fa-regular fa-calendar-check"></i>
              </div>
              <Badge color={user ? 'green' : 'beige'}>{user ? 'متصل' : 'غير متصل'}</Badge>
            </div>
            <h3 className="font-serif text-xl font-bold text-olive-900 dark:text-beige-50 mb-1">
              Google Calendar
            </h3>
            <p className="text-xs text-beige-600 dark:text-beige-400 mb-4 leading-relaxed">
              إدراج مواعيد المهام المستحقة وجلسات التركيز تلقائياً في تقويم Google مع تذكيرات.
            </p>
          </div>

          <div className="space-y-2 pt-3 border-t border-beige-100 dark:border-dark-border/50">
            <Button
              onClick={handleCalendarSync}
              loading={loadingCalendar}
              disabled={!user}
              variant="primary"
              size="sm"
              className="w-full"
              icon="fa-solid fa-arrows-rotate"
            >
              مزامنة المهام القادمة ({tasks.filter((t) => t.dueDate && !t.completed).length})
            </Button>
            <a
              href="https://calendar.google.com"
              target="_blank"
              rel="noreferrer"
              className="w-full block"
            >
              <Button variant="ghost" size="sm" className="w-full" icon="fa-solid fa-arrow-up-right-from-square">
                فتح Google Calendar
              </Button>
            </a>
          </div>
        </Card>

        {/* 3. Google Sheets Card */}
        <Card className="hover:border-olive-400 transition-all flex flex-col justify-between">
          <div>
            <div className="flex justify-between items-start mb-4">
              <div className="w-12 h-12 rounded-2xl bg-emerald-50 dark:bg-emerald-900/30 flex items-center justify-center text-emerald-600 text-2xl">
                <i className="fa-solid fa-table-cells"></i>
              </div>
              <Badge color={user ? 'green' : 'beige'}>{user ? 'متصل' : 'غير متصل'}</Badge>
            </div>
            <h3 className="font-serif text-xl font-bold text-olive-900 dark:text-beige-50 mb-1">
              Google Sheets
            </h3>
            <p className="text-xs text-beige-600 dark:text-beige-400 mb-4 leading-relaxed">
              تصدير سجل المعاملات المالية، الميزانية، وتصنيفات الصرف إلى جداول تفاعلية منسقة.
            </p>
          </div>

          <div className="space-y-2 pt-3 border-t border-beige-100 dark:border-dark-border/50">
            <Button
              onClick={handleSheetsExport}
              loading={loadingSheets}
              disabled={!user}
              variant="primary"
              size="sm"
              className="w-full"
              icon="fa-solid fa-file-excel"
            >
              تصدير المالية إلى Sheet
            </Button>
            <span className="text-[11px] text-center block text-beige-500">
              {finances.history.length} عمليات مالية جاهزة للتصدير
            </span>
          </div>
        </Card>

        {/* 4. Google Docs Card */}
        <Card className="hover:border-olive-400 transition-all flex flex-col justify-between">
          <div>
            <div className="flex justify-between items-start mb-4">
              <div className="w-12 h-12 rounded-2xl bg-sky-50 dark:bg-sky-900/30 flex items-center justify-center text-sky-600 text-2xl">
                <i className="fa-regular fa-file-lines"></i>
              </div>
              <Badge color={user ? 'green' : 'beige'}>{user ? 'متصل' : 'غير متصل'}</Badge>
            </div>
            <h3 className="font-serif text-xl font-bold text-olive-900 dark:text-beige-50 mb-1">
              Google Docs
            </h3>
            <p className="text-xs text-beige-600 dark:text-beige-400 mb-4 leading-relaxed">
              توليد مستندات محررة لتدوينات اليوميات التأملية وأهداف الرؤية السنوية بصيغة احترافية.
            </p>
          </div>

          <div className="space-y-2 pt-3 border-t border-beige-100 dark:border-dark-border/50">
            <Button
              onClick={() => handleDocsExport('journal')}
              loading={loadingDocs}
              disabled={!user}
              variant="primary"
              size="sm"
              className="w-full"
              icon="fa-solid fa-feather-pointed"
            >
              تصدير اليوميات ({journal.length})
            </Button>
            <Button
              onClick={() => handleDocsExport('vision')}
              loading={loadingDocs}
              disabled={!user}
              variant="secondary"
              size="sm"
              className="w-full"
              icon="fa-solid fa-mountain-sun"
            >
              تصدير وثيقة الرؤية ({vision.length})
            </Button>
          </div>
        </Card>
      </div>

      {/* Cloud Backups List from Drive */}
      {user && driveBackups.length > 0 && (
        <Card title="ملفات النسخ الاحتياطي في Google Drive" icon="fa-brands fa-google-drive">
          <div className="space-y-3">
            {driveBackups.map((b) => (
              <div
                key={b.id}
                className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 p-4 rounded-xl border border-beige-200 dark:border-dark-border bg-beige-50/40 dark:bg-dark-bg/40"
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-blue-100 dark:bg-blue-900/40 text-blue-600 flex items-center justify-center text-lg">
                    <i className="fa-solid fa-database"></i>
                  </div>
                  <div>
                    <h4 className="font-bold text-sm text-dark dark:text-beige-50">{b.name}</h4>
                    <p className="text-xs text-beige-500">
                      آخر تحديث: {formatDate(b.modifiedTime, true)}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2 w-full sm:w-auto">
                  {b.webViewLink && (
                    <a
                      href={b.webViewLink}
                      target="_blank"
                      rel="noreferrer"
                      className="text-xs text-olive-600 hover:underline px-3 py-1.5"
                    >
                      <i className="fa-solid fa-arrow-up-right-from-square ml-1"></i>
                      عرض في Drive
                    </a>
                  )}
                  <Button
                    onClick={() => handleDriveRestore(b.id)}
                    loading={loadingDrive}
                    variant="secondary"
                    size="sm"
                    icon="fa-solid fa-rotate-left"
                  >
                    استعادة هذه النسخة
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* Operations & Sync Audit Log */}
      <Card
        title="سجل العمليات والمزامنة"
        icon="fa-solid fa-clock-rotate-left"
        action={
          <div className="flex items-center gap-2">
            <select
              value={logFilter}
              onChange={(e) => setLogFilter(e.target.value)}
              className="text-xs bg-beige-50 dark:bg-dark-bg border border-beige-300 dark:border-dark-border rounded-lg px-2.5 py-1.5 focus:outline-none"
            >
              <option value="all">جميع الخدمات</option>
              <option value="drive">Drive</option>
              <option value="calendar">Calendar</option>
              <option value="sheets">Sheets</option>
              <option value="docs">Docs</option>
            </select>
            {syncLogs.length > 0 && (
              <Button variant="ghost" size="sm" onClick={clearSyncLogs} icon="fa-solid fa-trash-can">
                مسح السجل
              </Button>
            )}
          </div>
        }
      >
        <div className="space-y-3">
          {filteredLogs.map((log) => {
            const serviceIcons = {
              Drive: { icon: 'fa-brands fa-google-drive', color: 'text-blue-500' },
              Calendar: { icon: 'fa-regular fa-calendar-check', color: 'text-red-500' },
              Sheets: { icon: 'fa-solid fa-table-cells', color: 'text-emerald-500' },
              Docs: { icon: 'fa-regular fa-file-lines', color: 'text-sky-500' },
              Auth: { icon: 'fa-brands fa-google', color: 'text-amber-500' },
            };
            const sInfo = serviceIcons[log.service] || { icon: 'fa-solid fa-cloud', color: 'text-olive-500' };

            return (
              <div
                key={log.id}
                className="flex items-start justify-between gap-3 p-3.5 rounded-xl border border-beige-200 dark:border-dark-border bg-white dark:bg-dark-surface hover:shadow-xs transition-shadow"
              >
                <div className="flex items-start gap-3">
                  <div className={`mt-0.5 text-lg ${sInfo.color}`}>
                    <i className={sInfo.icon}></i>
                  </div>
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-bold text-sm text-dark dark:text-beige-50">
                        {log.action}
                      </span>
                      <Badge color={log.status === 'success' ? 'green' : 'red'}>
                        {log.status === 'success' ? 'ناجحة' : 'فشلت'}
                      </Badge>
                      <span className="text-[11px] text-beige-500">
                        {new Date(log.timestamp).toLocaleTimeString('ar-SA')} • {formatDate(log.timestamp)}
                      </span>
                    </div>
                    {log.details && (
                      <p className="text-xs text-beige-600 dark:text-beige-400 mt-1">
                        {log.details}
                      </p>
                    )}
                  </div>
                </div>

                {log.url && (
                  <a
                    href={log.url}
                    target="_blank"
                    rel="noreferrer"
                    className="flex-shrink-0 text-xs text-olive-600 dark:text-olive-400 hover:underline flex items-center gap-1 font-medium bg-olive-50 dark:bg-olive-950/40 px-3 py-1.5 rounded-lg border border-olive-200/50 dark:border-olive-900/50"
                  >
                    فتح
                    <i className="fa-solid fa-arrow-up-right-from-square text-[10px]"></i>
                  </a>
                )}
              </div>
            );
          })}

          {filteredLogs.length === 0 && (
            <div className="text-center py-12 text-beige-400">
              <i className="fa-solid fa-cloud-arrow-up text-4xl mb-3 opacity-40"></i>
              <p className="font-serif text-base">لا توجد عمليات مسجلة حتى الآن.</p>
              <p className="text-xs text-beige-500 mt-1">
                ستظهر هنا كافة عمليات التصدير، النسخ الاحتياطي، والمزامنة مع Google.
              </p>
            </div>
          )}
        </div>
      </Card>
    </div>
  );
};
