import React, { useState } from 'react';
import { User } from 'firebase/auth';
import { JournalEntry } from '@/src/types';
import { Button, Card, Input, formatDate } from './CommonUI';
import { exportJournalToGoogleDoc } from '@/src/services/googleWorkspace';
import { getAccessToken, googleSignIn } from '@/src/services/firebaseAuth';

interface Props {
  journal: JournalEntry[];
  setJournal: (entries: JournalEntry[] | ((prev: JournalEntry[]) => JournalEntry[])) => void;
  user: User | null;
  showToast: (msg: string, type?: 'success' | 'info' | 'error') => void;
  confirmAction: (msg: string, onConfirm: () => void) => void;
  addSyncLog?: (log: any) => void;
}

export const JournalView: React.FC<Props> = ({
  journal,
  setJournal,
  user,
  showToast,
  confirmAction,
  addSyncLog,
}) => {
  const [text, setText] = useState('');
  const [mood, setMood] = useState('مطمئن');
  const [search, setSearch] = useState('');
  const [exportingId, setExportingId] = useState<string | null>(null);
  const [exportingAll, setExportingAll] = useState(false);

  const moods = [
    { name: 'ممتاز', icon: 'fa-solid fa-sun', color: 'text-amber-500' },
    { name: 'مطمئن', icon: 'fa-solid fa-leaf', color: 'text-olive-600' },
    { name: 'مرهق', icon: 'fa-solid fa-cloud-rain', color: 'text-blue-400' },
    { name: 'قلق', icon: 'fa-solid fa-wind', color: 'text-neutral-500' },
    { name: 'غاضب', icon: 'fa-solid fa-bolt', color: 'text-orange-500' },
  ];

  const prompts = [
    'ما هو الشيء الذي تشعر بالامتنان والسكينة تجاهه اليوم؟',
    'ما هو التحدي الذي واجهته اليوم وكيف تعاملت معه بحكمة؟',
    'لو كان ليومك عنوان كتاب أو فصل، ماذا سيكون؟',
    'ما هو الإنجاز الصغير الذي تفخر به في نفسك اليوم؟',
    'فكرة أو إلهام استوقف عقلك وتريد حفظه للأيام القادمة؟',
  ];
  const [prompt] = useState(() => prompts[Math.floor(Math.random() * prompts.length)]);

  const generateId = () => Math.random().toString(36).substring(2, 9) + Date.now().toString(36);

  const saveEntry = () => {
    if (!text.trim()) return;

    const newEntry: JournalEntry = {
      id: generateId(),
      text: text.trim(),
      mood,
      date: new Date().toISOString(),
      wordCount: text.trim().split(/\s+/).length,
      isPinned: false,
    };

    setJournal([newEntry, ...journal]);
    setText('');
    showToast('تم تدوين أفكارك بسلام');
  };

  const togglePin = (id: string) => {
    setJournal(journal.map((j) => (j.id === id ? { ...j, isPinned: !j.isPinned } : j)));
  };

  const deleteEntry = (id: string) => {
    confirmAction('هل ترغب حقاً في حذف هذه التدوينة؟', () => {
      setJournal(journal.filter((j) => j.id !== id));
      showToast('تم الحذف', 'info');
    });
  };

  // Export single entry to Google Docs
  const exportSingleToGoogleDocs = async (entry: JournalEntry) => {
    setExportingId(entry.id);
    try {
      let token = getAccessToken();
      if (!token) {
        const res = await googleSignIn();
        if (!res) return;
        token = res.accessToken;
      }
      const result = await exportJournalToGoogleDoc(journal, token, entry.id);
      setJournal(
        journal.map((j) => (j.id === entry.id ? { ...j, googleDocUrl: result.documentUrl } : j))
      );
      showToast('تم تصدير التدوينة إلى مستند Google Doc بنجاح!');
      if (addSyncLog) {
        addSyncLog({
          service: 'Docs',
          action: `تصدير تدوينة (${formatDate(entry.date)})`,
          status: 'success',
          url: result.documentUrl,
        });
      }
      window.open(result.documentUrl, '_blank');
    } catch (err: any) {
      showToast(err.message || 'فشل التصدير إلى Google Docs', 'error');
    } finally {
      setExportingId(null);
    }
  };

  // Export all entries to a consolidated Google Doc
  const exportAllToGoogleDocs = async () => {
    if (journal.length === 0) {
      showToast('لا توجد تدوينات لتصديرها حالياً', 'info');
      return;
    }

    setExportingAll(true);
    try {
      let token = getAccessToken();
      if (!token) {
        const res = await googleSignIn();
        if (!res) return;
        token = res.accessToken;
      }
      const result = await exportJournalToGoogleDoc(journal, token);
      showToast(`تم تصدير ${journal.length} تدوينات إلى Google Docs بنجاح!`);
      if (addSyncLog) {
        addSyncLog({
          service: 'Docs',
          action: 'تصدير كامل اليوميات لمستند Google Doc',
          status: 'success',
          url: result.documentUrl,
        });
      }
      window.open(result.documentUrl, '_blank');
    } catch (err: any) {
      showToast(err.message || 'فشل التصدير إلى Google Docs', 'error');
    } finally {
      setExportingAll(false);
    }
  };

  const filteredJournal = journal
    .filter((j) => j.text.toLowerCase().includes(search.toLowerCase()))
    .sort((a, b) => (b.isPinned ? 1 : 0) - (a.isPinned ? 1 : 0));

  return (
    <div className="space-y-6 animate-fade-in max-w-4xl mx-auto pb-10">
      <Card title="مساحة البوح والتأملات" icon="fa-solid fa-feather-pointed">
        <p className="text-sm text-olive-800 dark:text-beige-300 mb-4 italic font-serif">
          تأمل اليوم: "{prompt}"
        </p>

        {/* Mood Selector */}
        <div className="flex gap-2 sm:gap-3 mb-4 overflow-x-auto pb-2 no-scrollbar">
          {moods.map((m) => (
            <button
              key={m.name}
              type="button"
              onClick={() => setMood(m.name)}
              className={`flex items-center gap-2 px-3.5 py-2 rounded-xl border transition-all whitespace-nowrap cursor-pointer text-sm ${
                mood === m.name
                  ? 'border-olive-600 bg-olive-50 dark:bg-olive-900/30 text-olive-800 dark:text-olive-300 font-bold'
                  : 'border-beige-200 dark:border-dark-border hover:bg-beige-50 dark:hover:bg-dark-bg text-beige-800 dark:text-beige-300'
              }`}
            >
              <i className={`${m.icon} ${m.color}`}></i>
              <span>{m.name}</span>
            </button>
          ))}
        </div>

        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          rows={5}
          placeholder="اكتب ما يجول بخاطرك ووثّق رحلة يومك بكل صدق..."
          className="w-full bg-beige-50 dark:bg-dark-bg border border-beige-300 dark:border-dark-border text-dark dark:text-beige-50 rounded-2xl p-4 focus:outline-none focus:border-olive-500 resize-y mb-4 leading-relaxed font-sans text-base"
        ></textarea>

        <div className="flex justify-between items-center">
          <span className="text-xs text-beige-500">
            {text.trim() ? text.trim().split(/\s+/).length : 0} كلمة
          </span>
          <Button onClick={saveEntry} icon="fa-solid fa-pen-nib" className="px-6">
            حفظ التدوينة
          </Button>
        </div>
      </Card>

      {/* Entries List Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
        <div className="flex-1 w-full">
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="ابحث في خواطرك ومدوناتك..."
            icon="fa-solid fa-magnifying-glass"
            className="mb-0"
          />
        </div>

        {journal.length > 0 && (
          <Button
            variant="secondary"
            size="sm"
            onClick={exportAllToGoogleDocs}
            loading={exportingAll}
            icon="fa-regular fa-file-word"
            title="تصدير جميع التدوينات إلى ملف Google Doc واحد"
          >
            تصدير الكل إلى Google Docs
          </Button>
        )}
      </div>

      {/* Entries List */}
      <div className="space-y-4">
        {filteredJournal.map((j) => {
          const moodObj = moods.find((m) => m.name === j.mood) || moods[1];

          return (
            <div
              key={j.id}
              className={`bg-white dark:bg-dark-surface p-6 rounded-2xl border transition-all ${
                j.isPinned
                  ? 'border-olive-400 dark:border-olive-600 shadow-md bg-olive-50/20'
                  : 'border-beige-200 dark:border-dark-border hover:shadow-xs'
              }`}
            >
              <div className="flex justify-between items-start mb-4">
                <div className="flex items-center gap-3 text-sm text-beige-600 dark:text-beige-400">
                  <div
                    className={`w-9 h-9 rounded-full flex items-center justify-center bg-beige-100 dark:bg-dark-bg ${moodObj.color} text-lg`}
                  >
                    <i className={moodObj.icon}></i>
                  </div>
                  <div>
                    <p className="font-bold text-dark dark:text-beige-100">{formatDate(j.date)}</p>
                    <p className="text-xs text-beige-500">
                      {new Date(j.date).toLocaleTimeString('ar-SA')} • {j.wordCount} كلمة • الحالة:{' '}
                      {j.mood}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-1">
                  <button
                    onClick={() => exportSingleToGoogleDocs(j)}
                    disabled={exportingId === j.id}
                    className="p-2 text-beige-400 hover:text-sky-600 dark:hover:text-sky-400 transition-colors cursor-pointer"
                    title="تصدير هذه التدوينة إلى Google Docs"
                  >
                    {exportingId === j.id ? (
                      <i className="fa-solid fa-spinner fa-spin text-xs"></i>
                    ) : (
                      <i className="fa-regular fa-file-lines text-sm"></i>
                    )}
                  </button>

                  <button
                    onClick={() => togglePin(j.id)}
                    className={`p-2 transition-colors cursor-pointer ${
                      j.isPinned ? 'text-olive-600' : 'text-beige-300 hover:text-olive-500'
                    }`}
                    title={j.isPinned ? 'إلغاء التثبيت' : 'تثبيت التدوينة في الأعلى'}
                  >
                    <i className="fa-solid fa-thumbtack"></i>
                  </button>

                  <button
                    onClick={() => deleteEntry(j.id)}
                    className="p-2 text-beige-300 hover:text-red-500 transition-colors cursor-pointer"
                    title="حذف التدوينة"
                  >
                    <i className="fa-solid fa-trash-can"></i>
                  </button>
                </div>
              </div>

              <p className="whitespace-pre-wrap leading-loose text-dark dark:text-beige-100 font-sans text-base">
                {j.text}
              </p>

              {j.googleDocUrl && (
                <div className="mt-4 pt-3 border-t border-beige-100 dark:border-dark-border/60 flex items-center gap-2">
                  <span className="text-xs text-beige-500">تم التصدير إلى Google Docs:</span>
                  <a
                    href={j.googleDocUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="text-xs text-sky-600 dark:text-sky-400 hover:underline flex items-center gap-1 font-medium"
                  >
                    فتح المستند
                    <i className="fa-solid fa-arrow-up-right-from-square text-[10px]"></i>
                  </a>
                </div>
              )}
            </div>
          );
        })}

        {journal.length === 0 && (
          <p className="text-center py-12 text-beige-500 font-serif text-lg">
            دفتر يومياتك ينتظر أولى كلماتك لتخليد اللحظة.
          </p>
        )}
      </div>
    </div>
  );
};
