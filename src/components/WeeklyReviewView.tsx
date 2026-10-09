import React, { useState } from 'react';
import { WeeklyReview } from '@/src/types';
import { Button, Card, Input, formatDate } from './CommonUI';
import { exportJournalToGoogleDoc } from '@/src/services/googleWorkspace';
import { getAccessToken, googleSignIn } from '@/src/services/firebaseAuth';

interface Props {
  reviews: WeeklyReview[];
  setReviews: (reviews: WeeklyReview[] | ((prev: WeeklyReview[]) => WeeklyReview[])) => void;
  showToast: (msg: string, type?: 'success' | 'info' | 'error') => void;
  confirmAction: (msg: string, onConfirm: () => void) => void;
  addSyncLog?: (log: any) => void;
}

export const WeeklyReviewView: React.FC<Props> = ({
  reviews,
  setReviews,
  showToast,
  confirmAction,
  addSyncLog,
}) => {
  const [biggestWin, setBiggestWin] = useState('');
  const [lessonLearned, setLessonLearned] = useState('');
  const [rating, setRating] = useState(4);
  const [p1, setP1] = useState('');
  const [p2, setP2] = useState('');
  const [p3, setP3] = useState('');
  const [exporting, setExporting] = useState(false);

  const generateId = () => Math.random().toString(36).substring(2, 9) + Date.now().toString(36);

  const saveReview = (e: React.FormEvent) => {
    e.preventDefault();
    if (!biggestWin.trim()) return;

    const priorities = [p1.trim(), p2.trim(), p3.trim()].filter(Boolean);

    const newRev: WeeklyReview = {
      id: generateId(),
      weekStartDate: new Date().toISOString(),
      biggestWin: biggestWin.trim(),
      lessonLearned: lessonLearned.trim(),
      rating,
      nextWeekPriorities: priorities,
      createdAt: new Date().toISOString(),
    };

    setReviews([newRev, ...(reviews || [])]);
    setBiggestWin('');
    setLessonLearned('');
    setP1('');
    setP2('');
    setP3('');
    showToast('تم حفظ المراجعة والتخطيط الأسبوعي بنجاح');
  };

  const deleteReview = (id: string) => {
    confirmAction('هل أنت متأكد من حذف هذه المراجعة الأسبوعية؟', () => {
      setReviews(reviews.filter((r) => r.id !== id));
      showToast('تم الحذف', 'info');
    });
  };

  // Export Weekly Reviews to Google Docs
  const handleExportReviews = async () => {
    if (!reviews || reviews.length === 0) {
      showToast('لا توجد مراجعات مسجلة لتصديرها', 'info');
      return;
    }

    setExporting(true);
    try {
      let token = getAccessToken();
      if (!token) {
        const res = await googleSignIn();
        if (!res) return;
        token = res.accessToken;
      }

      const formattedEntries = reviews.map((r) => ({
        id: r.id,
        text: `مراجعة وتخطيط الأسبوع (${formatDate(r.weekStartDate)})\nالتقييم العام: ${'★'.repeat(
          r.rating
        )}${'☆'.repeat(5 - r.rating)}\n\nالإنجاز الأبرز للأسبوع:\n${
          r.biggestWin
        }\n\nالدرس والعبرة المستفادة:\n${
          r.lessonLearned || 'لا يوجد'
        }\n\nأولويات الأسبوع القادم:\n${r.nextWeekPriorities.map((p, i) => `${i + 1}. ${p}`).join('\n')}`,
        mood: r.rating >= 4 ? 'ممتاز' : 'مطمئن',
        date: r.createdAt,
        wordCount: 100,
        isPinned: false,
      }));

      const result = await exportJournalToGoogleDoc(formattedEntries, token);
      showToast('تم تصدير سجل المراجعة الأسبوعية إلى Google Docs!');
      if (addSyncLog) {
        addSyncLog({
          service: 'Docs',
          action: 'تصدير وثيقة التخطيط والمراجعة الأسبوعية',
          status: 'success',
          url: result.documentUrl,
        });
      }
      window.open(result.documentUrl, '_blank');
    } catch (err: any) {
      showToast(err.message || 'فشل التصدير إلى Google Docs', 'error');
    } finally {
      setExporting(false);
    }
  };

  return (
    <div className="space-y-6 animate-fade-in max-w-4xl mx-auto pb-10">
      <Card title="المراجعة والتخطيط الأسبوعي" icon="fa-solid fa-compass-drafting">
        <p className="text-sm text-olive-800 dark:text-beige-300 mb-6 font-serif leading-relaxed">
          توقف في نهاية كل أسبوع لتأمل ما مضى، استخلاص العِبر، وتحديد البوصلة للأيام السبعة القادمة.
        </p>

        <form onSubmit={saveReview} className="space-y-5">
          <div>
            <label className="block text-sm text-olive-800 dark:text-beige-300 mb-1.5 font-medium">
              أكبر إنجاز أو لحظة فخر في هذا الأسبوع
            </label>
            <textarea
              rows={2}
              value={biggestWin}
              onChange={(e) => setBiggestWin(e.target.value)}
              placeholder="ما الذي حققته وشعرت بالرضا عنه؟"
              className="w-full bg-beige-50 dark:bg-dark-bg border border-beige-300 dark:border-dark-border text-dark dark:text-beige-50 rounded-xl p-3 text-sm focus:outline-none focus:border-olive-500"
              required
            ></textarea>
          </div>

          <div>
            <label className="block text-sm text-olive-800 dark:text-beige-300 mb-1.5 font-medium">
              أهم درس أو عبرة تعلمتها
            </label>
            <textarea
              rows={2}
              value={lessonLearned}
              onChange={(e) => setLessonLearned(e.target.value)}
              placeholder="ما الشيء الذي يمكن تحسينه أو تفاديه الأسبوع القادم؟"
              className="w-full bg-beige-50 dark:bg-dark-bg border border-beige-300 dark:border-dark-border text-dark dark:text-beige-50 rounded-xl p-3 text-sm focus:outline-none focus:border-olive-500"
            ></textarea>
          </div>

          <div>
            <label className="block text-sm text-olive-800 dark:text-beige-300 mb-2 font-medium">
              تقييمك لإنتاجية وراحة هذا الأسبوع
            </label>
            <div className="flex gap-2">
              {[1, 2, 3, 4, 5].map((star) => (
                <button
                  key={star}
                  type="button"
                  onClick={() => setRating(star)}
                  className="text-2xl text-amber-500 cursor-pointer transition-transform hover:scale-110"
                >
                  <i className={`fa-${star <= rating ? 'solid' : 'regular'} fa-star`}></i>
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-sm text-olive-800 dark:text-beige-300 mb-2 font-medium">
              أهم 3 أولويات للأسبوع القادم
            </label>
            <div className="space-y-2">
              <Input
                value={p1}
                onChange={(e) => setP1(e.target.value)}
                placeholder="الأولوية الأولى (الأهم)"
                className="mb-0"
              />
              <Input
                value={p2}
                onChange={(e) => setP2(e.target.value)}
                placeholder="الأولوية الثانية"
                className="mb-0"
              />
              <Input
                value={p3}
                onChange={(e) => setP3(e.target.value)}
                placeholder="الأولوية الثالثة"
                className="mb-0"
              />
            </div>
          </div>

          <Button type="submit" icon="fa-solid fa-check" className="w-full sm:w-auto px-8">
            حفظ المراجعة الأسبوعية
          </Button>
        </form>
      </Card>

      {/* Review History */}
      <Card
        title="أرشيف المراجعات الأسبوعية"
        icon="fa-solid fa-clock-rotate-left"
        action={
          reviews && reviews.length > 0 ? (
            <Button
              variant="secondary"
              size="sm"
              onClick={handleExportReviews}
              loading={exporting}
              icon="fa-regular fa-file-word"
            >
              تصدير لـ Google Docs
            </Button>
          ) : undefined
        }
      >
        <div className="space-y-4">
          {(reviews || []).map((rev) => (
            <div
              key={rev.id}
              className="p-5 rounded-2xl border border-beige-200 dark:border-dark-border bg-white dark:bg-dark-surface space-y-3"
            >
              <div className="flex justify-between items-start">
                <div>
                  <span className="font-bold text-sm text-olive-900 dark:text-beige-50">
                    أسبوع: {formatDate(rev.weekStartDate)}
                  </span>
                  <div className="text-amber-500 text-xs mt-1">
                    {'★'.repeat(rev.rating)}
                    {'☆'.repeat(5 - rev.rating)}
                  </div>
                </div>
                <button
                  onClick={() => deleteReview(rev.id)}
                  className="text-beige-300 hover:text-red-500 text-xs p-1 cursor-pointer"
                  title="حذف"
                >
                  <i className="fa-solid fa-trash"></i>
                </button>
              </div>

              <div>
                <p className="text-xs text-olive-700 dark:text-olive-300 font-bold mb-1">
                  أبرز إنجاز:
                </p>
                <p className="text-sm text-dark dark:text-beige-100">{rev.biggestWin}</p>
              </div>

              {rev.lessonLearned && (
                <div>
                  <p className="text-xs text-olive-700 dark:text-olive-300 font-bold mb-1">
                    الدرس المستفاد:
                  </p>
                  <p className="text-sm text-dark dark:text-beige-100">{rev.lessonLearned}</p>
                </div>
              )}

              {rev.nextWeekPriorities?.length > 0 && (
                <div className="pt-2 border-t border-beige-100 dark:border-dark-border/60">
                  <p className="text-xs text-beige-600 dark:text-beige-400 font-bold mb-1">
                    أولويات الأسبوع:
                  </p>
                  <ul className="list-disc list-inside text-xs text-beige-800 dark:text-beige-200 space-y-0.5">
                    {rev.nextWeekPriorities.map((p, i) => (
                      <li key={i}>{p}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          ))}

          {(!reviews || reviews.length === 0) && (
            <p className="text-center py-10 text-beige-400 font-serif text-base">
              لم تقم بتسجيل أي مراجعة أسبوعية بعد.
            </p>
          )}
        </div>
      </Card>
    </div>
  );
};
