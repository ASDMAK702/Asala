import React, { useRef } from 'react';
import { User } from 'firebase/auth';
import { Button, Card } from './CommonUI';
import { GoogleSignInButton } from './GoogleSignInButton';
import { backupToDrive } from '@/src/services/googleWorkspace';
import { getAccessToken } from '@/src/services/firebaseAuth';

interface Props {
  settings: any;
  updateSettings: (newSettings: any) => void;
  user: User | null;
  onUserChange: (user: User | null) => void;
  onNavigateToServices: () => void;
  showToast: (msg: string, type?: 'success' | 'info' | 'error') => void;
  confirmAction: (msg: string, onConfirm: () => void) => void;
  appData: any;
  onRestoreData: (restoredData: any) => void;
}

export const SettingsView: React.FC<Props> = ({
  settings,
  updateSettings,
  user,
  onUserChange,
  onNavigateToServices,
  showToast,
  confirmAction,
  appData,
  onRestoreData,
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleThemeChange = () => {
    const newTheme = settings.theme === 'dark' ? 'light' : 'dark';
    updateSettings({ theme: newTheme });
    if (newTheme === 'dark') document.documentElement.classList.add('dark');
    else document.documentElement.classList.remove('dark');
  };

  const exportLocalData = () => {
    const data = {
      tasks: appData.tasks,
      habits: appData.habits,
      journal: appData.journal,
      finances: appData.finances,
      vision: appData.vision,
      settings: settings,
      exportedAt: new Date().toISOString(),
    };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `asala_backup_${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    showToast('تم تحميل النسخة الاحتياطية بنجاح');
  };

  const handleImportFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const parsed = JSON.parse(event.target?.result as string);
        confirmAction(
          'سيتم استبدال البيانات الحالية بالبيانات الموجودة في الملف المستورد. متابعة؟',
          () => {
            onRestoreData(parsed);
            showToast('تمت استعادة البيانات بنجاح!');
          }
        );
      } catch {
        showToast('فشل في قراءة ملف النسخة الاحتياطية', 'error');
      }
    };
    reader.readAsText(file);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleQuickDriveBackup = async () => {
    if (!user) {
      showToast('يرجى تسجيل الدخول بحساب Google أولاً', 'info');
      return;
    }
    const token = getAccessToken();
    if (!token) {
      showToast('يرجى تجديد المصادقة بحساب Google', 'info');
      return;
    }
    try {
      await backupToDrive(
        {
          ...appData,
          settings,
          exportedAt: new Date().toISOString(),
        },
        token
      );
      showToast('تم رفع النسخة الاحتياطية إلى Google Drive بنجاح!');
    } catch (err: any) {
      showToast(err.message || 'فشل النسخ الاحتياطي في Drive', 'error');
    }
  };

  const factoryReset = () => {
    confirmAction(
      'تحذير أخير: سيتم مسح كافة المهام، العادات، اليوميات، الحسابات والإعدادات نهائياً من هذا المتصفح! هل أنت متأكد تماماً؟',
      () => {
        localStorage.clear();
        window.location.reload();
      }
    );
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6 animate-fade-in pb-12">
      {/* Google Account Card */}
      <Card title="حساب Google والخدمات المرتبطة" icon="fa-brands fa-google">
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 p-4 rounded-2xl bg-beige-50/60 dark:bg-dark-bg/60 border border-beige-200/60 dark:border-dark-border">
            <div className="flex items-center gap-3">
              {user?.photoURL ? (
                <img
                  src={user.photoURL}
                  alt={user.displayName || ''}
                  className="w-12 h-12 rounded-full border border-olive-500 object-cover"
                  referrerPolicy="no-referrer"
                />
              ) : (
                <div className="w-12 h-12 rounded-full bg-olive-700 text-white flex items-center justify-center font-bold text-xl">
                  {(user?.displayName || settings.userName || 'أ').charAt(0)}
                </div>
              )}
              <div>
                <h4 className="font-bold text-base text-dark dark:text-beige-50">
                  {user ? user.displayName || 'مستخدم Google' : 'حساب غير متصل'}
                </h4>
                <p className="text-xs text-beige-500">
                  {user ? user.email : 'سجل دخولك لمزامنة البيانات وتفعيل خدمات Google'}
                </p>
              </div>
            </div>

            <div className="w-full sm:w-auto">
              <GoogleSignInButton
                user={user}
                onUserChange={onUserChange}
                onNavigateToServices={onNavigateToServices}
              />
            </div>
          </div>

          <div className="flex justify-between items-center pt-2">
            <span className="text-xs text-beige-600 dark:text-beige-400">
              خدمات Google المفعلة: Drive, Calendar, Sheets, Docs
            </span>
            <Button
              variant="secondary"
              size="sm"
              onClick={onNavigateToServices}
              icon="fa-solid fa-sliders"
            >
              لوحة الخدمات المتصلة
            </Button>
          </div>
        </div>
      </Card>

      {/* Profile & Appearance */}
      <Card title="إعدادات الحساب والمظهر" icon="fa-solid fa-gear">
        <div className="space-y-5">
          <div>
            <label className="block text-sm text-olive-800 dark:text-beige-300 mb-1.5 font-medium">
              الاسم المستعار في التطبيق
            </label>
            <input
              type="text"
              value={settings.userName}
              onChange={(e) => updateSettings({ userName: e.target.value })}
              className="w-full bg-beige-50 dark:bg-dark-bg border border-beige-300 dark:border-dark-border text-dark dark:text-beige-50 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-olive-500"
            />
          </div>

          <div className="flex items-center justify-between py-4 border-t border-beige-100 dark:border-dark-border/60">
            <div>
              <h4 className="font-bold text-dark dark:text-beige-50 text-sm">مظهر التطبيق</h4>
              <p className="text-xs text-beige-500">
                التبديل بين الوضع الفاتح الكلاسيكي والوضع الليلي الهادئ
              </p>
            </div>
            <button
              onClick={handleThemeChange}
              className={`w-14 h-7 rounded-full transition-all relative cursor-pointer ${
                settings.theme === 'dark' ? 'bg-olive-600' : 'bg-beige-300'
              }`}
            >
              <div
                className={`absolute top-1 w-5 h-5 rounded-full bg-white transition-all shadow-xs ${
                  settings.theme === 'dark' ? 'left-1' : 'left-8'
                }`}
              ></div>
            </button>
          </div>
        </div>
      </Card>

      {/* Data Backup & Cloud Management */}
      <Card title="البيانات والنسخ الاحتياطي" icon="fa-solid fa-hard-drive">
        <div className="space-y-4">
          <p className="text-xs text-olive-800 dark:text-olive-300 bg-olive-50 dark:bg-olive-950/40 p-3 rounded-xl border border-olive-200/60 dark:border-olive-900/40">
            <i className="fa-solid fa-shield-halved ml-2 text-olive-600"></i>
            بياناتك محفوظة محلياً في جهازك، ويمكنك مزامنتها مع Google Drive لحمايتها واستعادتها عبر
            كافة أجهزتك.
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
            {user && (
              <Button
                onClick={handleQuickDriveBackup}
                variant="primary"
                icon="fa-brands fa-google-drive"
                className="w-full"
              >
                نسخ فوري إلى Google Drive
              </Button>
            )}

            <Button
              onClick={exportLocalData}
              variant="secondary"
              icon="fa-solid fa-download"
              className="w-full"
            >
              تصدير ملف JSON محلي
            </Button>
          </div>

          <div className="pt-2">
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleImportFile}
              accept=".json"
              className="hidden"
            />
            <Button
              onClick={() => fileInputRef.current?.click()}
              variant="secondary"
              icon="fa-solid fa-upload"
              className="w-full"
            >
              استيراد بيانات من ملف JSON
            </Button>
          </div>
        </div>
      </Card>

      {/* Danger Zone */}
      <Card title="منطقة الخطر" icon="fa-solid fa-triangle-exclamation">
        <div className="space-y-3">
          <p className="text-xs text-red-600 dark:text-red-400">
            سيؤدي هذا الإجراء إلى مسح التخزين المحلي للتطبيق بالكامل وإعادته إلى حالته الأولى.
          </p>
          <Button
            onClick={factoryReset}
            variant="danger"
            icon="fa-solid fa-trash-can"
            className="w-full"
          >
            مسح جميع البيانات وإعادة ضبط المصنع
          </Button>
        </div>
      </Card>
    </div>
  );
};
