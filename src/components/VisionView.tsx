import React, { useState } from 'react';
import { User } from 'firebase/auth';
import { VisionGoal } from '@/src/types';
import { Button, Card, Input } from './CommonUI';
import { exportVisionToGoogleDoc } from '@/src/services/googleWorkspace';
import { getAccessToken, googleSignIn } from '@/src/services/firebaseAuth';

interface Props {
  vision: VisionGoal[];
  setVision: (vision: VisionGoal[] | ((prev: VisionGoal[]) => VisionGoal[])) => void;
  user: User | null;
  showToast: (msg: string, type?: 'success' | 'info' | 'error') => void;
  confirmAction: (msg: string, onConfirm: () => void) => void;
  addSyncLog?: (log: any) => void;
}

export const VisionView: React.FC<Props> = ({
  vision,
  setVision,
  user,
  showToast,
  confirmAction,
  addSyncLog,
}) => {
  const [goal, setGoal] = useState('');
  const [category, setCategory] = useState('شخصي');
  const [exportingDoc, setExportingDoc] = useState(false);
  const categories = ['شخصي', 'مهني', 'مالي', 'صحي', 'علمي'];

  const currentYear = new Date().getFullYear();

  const generateId = () => Math.random().toString(36).substring(2, 9) + Date.now().toString(36);

  const addGoal = (e: React.FormEvent) => {
    e.preventDefault();
    if (!goal.trim()) return;

    const newGoal: VisionGoal = {
      id: generateId(),
      text: goal.trim(),
      category,
      completed: false,
      year: currentYear,
    };

    setVision([newGoal, ...(vision || [])]);
    setGoal('');
    showToast('تمت إضافة الهدف السنوي بنجاح');
  };

  const toggleGoal = (id: string) => {
    setVision(vision.map((v) => (v.id === id ? { ...v, completed: !v.completed } : v)));
  };

  const deleteGoal = (id: string) => {
    confirmAction('هل أنت متأكد من حذف هذا الهدف؟', () => {
      setVision(vision.filter((v) => v.id !== id));
      showToast('تم حذف الهدف');
    });
  };

  // Export Vision to Google Docs
  const handleExportVision = async () => {
    if (!vision || vision.length === 0) {
      showToast('لا توجد أهداف مسجلة لتصديرها حالياً', 'info');
      return;
    }

    setExportingDoc(true);
    try {
      let token = getAccessToken();
      if (!token) {
        const res = await googleSignIn();
        if (!res) return;
        token = res.accessToken;
      }
      const result = await exportVisionToGoogleDoc(vision, token, currentYear);
      showToast('تم تصدير وثيقة الرؤية السنوية إلى Google Docs بنجاح!');
      if (addSyncLog) {
        addSyncLog({
          service: 'Docs',
          action: `تصدير وثيقة رؤية عام ${currentYear}`,
          status: 'success',
          url: result.documentUrl,
        });
      }
      window.open(result.documentUrl, '_blank');
    } catch (err: any) {
      showToast(err.message || 'فشل تصدير وثيقة الرؤية', 'error');
    } finally {
      setExportingDoc(false);
    }
  };

  const totalGoals = vision?.length || 0;
  const completedGoals = vision?.filter((g) => g.completed).length || 0;
  const progressPercent = totalGoals > 0 ? Math.round((completedGoals / totalGoals) * 100) : 0;

  return (
    <div className="space-y-6 animate-fade-in max-w-5xl mx-auto pb-10">
      {/* Header Overview */}
      <div className="glass-panel p-6 rounded-3xl flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="font-serif text-2xl font-bold text-olive-900 dark:text-beige-50">
            رؤية عام {currentYear} والأهداف الكبرى
          </h2>
          <p className="text-xs text-olive-700 dark:text-beige-300 mt-1">
            وجّه طاقتك نحو غاياتك الأسمى وراقب ثمار نموك الشخصي
          </p>
        </div>

        <div className="flex items-center gap-3 w-full sm:w-auto">
          <div className="bg-white/80 dark:bg-dark-surface/80 px-4 py-2 rounded-2xl border border-beige-200 dark:border-dark-border text-center">
            <span className="text-xs text-beige-500">الإنجاز الكلي</span>
            <p className="font-bold text-lg text-olive-800 dark:text-beige-50">
              {progressPercent}%
            </p>
          </div>

          <Button
            variant="secondary"
            size="sm"
            onClick={handleExportVision}
            loading={exportingDoc}
            icon="fa-regular fa-file-word"
            title="تصدير وثيقة الرؤية السنوية إلى مستند Google Doc رسمي"
          >
            تصدير إلى Google Docs
          </Button>
        </div>
      </div>

      <Card title="إضافة هدف استراتيجي" icon="fa-solid fa-mountain-sun">
        <form onSubmit={addGoal} className="flex flex-col md:flex-row gap-3 mb-6">
          <Input
            value={goal}
            onChange={(e) => setGoal(e.target.value)}
            placeholder="هدف كبير وطموح تسعى لتحقيقه هذا العام..."
            className="flex-1 mb-0"
            required
          />
          <select
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            className="bg-beige-50 dark:bg-dark-bg border border-beige-300 dark:border-dark-border text-dark dark:text-beige-50 rounded-xl px-4 py-2.5 text-sm focus:outline-none"
          >
            {categories.map((c) => (
              <option key={c} value={c}>
                مجال: {c}
              </option>
            ))}
          </select>
          <Button type="submit" icon="fa-solid fa-plus" className="px-6">
            إضافة للرؤية
          </Button>
        </form>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {categories.map((cat) => {
            const catGoals = (vision || []).filter((v) => v.category === cat);
            if (catGoals.length === 0) return null;

            return (
              <div
                key={cat}
                className="bg-beige-50/50 dark:bg-dark-bg/50 p-4 rounded-2xl border border-beige-200/60 dark:border-dark-border"
              >
                <div className="flex justify-between items-center mb-3 border-b border-beige-200 dark:border-dark-border pb-2">
                  <h4 className="font-bold text-olive-800 dark:text-olive-300 text-sm">
                    {cat}
                  </h4>
                  <span className="text-[11px] text-beige-500">
                    {catGoals.filter((g) => g.completed).length}/{catGoals.length}
                  </span>
                </div>

                <div className="space-y-2">
                  {catGoals.map((g) => (
                    <div
                      key={g.id}
                      className="flex items-start justify-between group p-2 rounded-xl hover:bg-white/60 dark:hover:bg-dark-surface/60 transition-colors"
                    >
                      <div
                        className="flex items-start gap-3 cursor-pointer flex-1 select-none"
                        onClick={() => toggleGoal(g.id)}
                      >
                        <div
                          className={`mt-0.5 flex-shrink-0 w-5 h-5 rounded-md border flex items-center justify-center transition-all ${
                            g.completed
                              ? 'bg-olive-600 border-olive-600 text-white'
                              : 'border-beige-400 dark:border-beige-600'
                          }`}
                        >
                          {g.completed && <i className="fa-solid fa-check text-[10px]"></i>}
                        </div>
                        <span
                          className={`text-sm ${
                            g.completed
                              ? 'line-through text-beige-400'
                              : 'text-dark dark:text-beige-100'
                          }`}
                        >
                          {g.text}
                        </span>
                      </div>
                      <button
                        onClick={() => deleteGoal(g.id)}
                        className="text-beige-300 hover:text-red-500 text-xs p-1 opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
                      >
                        <i className="fa-solid fa-trash"></i>
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>

        {(!vision || vision.length === 0) && (
          <p className="text-center py-10 text-beige-500 font-serif text-base">
            لم تقم بصياغة أهدافك الكبرى لهذا العام بعد. دوّن ما ترنو إليه روحك.
          </p>
        )}
      </Card>
    </div>
  );
};
