import React, { useState } from 'react';
import { Habit } from '@/src/types';
import { Button, Card, Input } from './CommonUI';

interface Props {
  habits: Habit[];
  setHabits: (habits: Habit[] | ((prev: Habit[]) => Habit[])) => void;
  showToast: (msg: string, type?: 'success' | 'info' | 'error') => void;
  confirmAction: (msg: string, onConfirm: () => void) => void;
}

export const HabitsView: React.FC<Props> = ({
  habits,
  setHabits,
  showToast,
  confirmAction,
}) => {
  const [newHabit, setNewHabit] = useState('');
  const [cat, setCat] = useState<'عقل' | 'جسد' | 'روح'>('عقل');

  const generateId = () => Math.random().toString(36).substring(2, 9) + Date.now().toString(36);

  const addHabit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newHabit.trim()) return;

    const habitItem: Habit = {
      id: generateId(),
      name: newHabit.trim(),
      category: cat,
      history: {},
      streak: 0,
      bestStreak: 0,
      archived: false,
      createdAt: new Date().toISOString(),
    };

    setHabits([...habits, habitItem]);
    setNewHabit('');
    showToast('تمت زراعة عادة جديدة!', 'success');
  };

  const toggleHabit = (id: string, dateStr: string) => {
    setHabits(
      habits.map((h) => {
        if (h.id !== id) return h;
        const newHistory = { ...h.history, [dateStr]: !h.history[dateStr] };

        // Calculate current and best streak
        let current = 0;
        let checkDate = new Date();
        while (true) {
          const dStr = checkDate.toISOString().split('T')[0];
          if (newHistory[dStr]) {
            current++;
            checkDate.setDate(checkDate.getDate() - 1);
          } else {
            break;
          }
        }
        const best = Math.max(h.bestStreak || 0, current);

        return { ...h, history: newHistory, streak: current, bestStreak: best };
      })
    );
  };

  const deleteHabit = (id: string) => {
    confirmAction('هل أنت متأكد من حذف هذه العادة نهائياً؟', () => {
      setHabits(habits.filter((h) => h.id !== id));
      showToast('تم حذف العادة');
    });
  };

  const last7Days = Array.from({ length: 7 }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() - (6 - i));
    return {
      dateStr: d.toISOString().split('T')[0],
      dayName: d.toLocaleDateString('ar-SA', { weekday: 'short' }),
    };
  });

  return (
    <div className="space-y-6 animate-fade-in max-w-5xl mx-auto pb-10">
      <Card title="زراعة العادات" icon="fa-solid fa-seedling">
        <form onSubmit={addHabit} className="flex flex-col sm:flex-row gap-3 mb-6">
          <Input
            value={newHabit}
            onChange={(e) => setNewHabit(e.target.value)}
            placeholder="عادة جديدة (مثال: قراءة 15 دقيقة، شرب لترين ماء...)"
            className="flex-1 mb-0"
            required
          />
          <select
            value={cat}
            onChange={(e) => setCat(e.target.value as any)}
            className="bg-beige-50 dark:bg-dark-bg border border-beige-300 dark:border-dark-border text-dark dark:text-beige-50 rounded-xl px-4 py-2.5 text-sm focus:outline-none"
          >
            <option value="عقل">عقل (قراءة، تعلم)</option>
            <option value="جسد">جسد (رياضة، صحة)</option>
            <option value="روح">روح (عبادة، هدوء)</option>
          </select>
          <Button type="submit" icon="fa-solid fa-plus" className="px-6">
            زراعة
          </Button>
        </form>

        <div className="overflow-x-auto rounded-2xl border border-beige-200 dark:border-dark-border">
          <table className="w-full text-right bg-white dark:bg-dark-surface">
            <thead className="bg-beige-50/80 dark:bg-dark-bg/80 border-b border-beige-200 dark:border-dark-border">
              <tr>
                <th className="py-4 px-4 font-serif text-olive-800 dark:text-beige-200 font-bold">
                  العادة
                </th>
                {last7Days.map((day, i) => (
                  <th
                    key={i}
                    className="py-4 px-2 text-center text-xs font-medium text-beige-700 dark:text-beige-300"
                  >
                    {day.dayName}
                    <br />
                    <span className="text-[10px] text-beige-500 font-normal">
                      {day.dateStr.split('-')[2]}
                    </span>
                  </th>
                ))}
                <th className="py-4 px-4 text-center font-serif text-olive-800 dark:text-beige-200 font-bold">
                  الإنجاز
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-beige-100 dark:divide-dark-border/60">
              {habits.map((habit) => (
                <tr
                  key={habit.id}
                  className="hover:bg-beige-50/40 dark:hover:bg-dark-bg/40 transition-colors"
                >
                  <td className="py-4 px-4">
                    <div className="font-bold text-dark dark:text-beige-50 text-base">
                      {habit.name}
                    </div>
                    <div className="text-xs text-beige-500 mt-0.5">
                      {habit.category} • أطول سلسلة: {habit.bestStreak || 0} يوم
                    </div>
                  </td>
                  {last7Days.map((day, i) => {
                    const isDone = habit.history && habit.history[day.dateStr];
                    const isToday = day.dateStr === new Date().toISOString().split('T')[0];
                    return (
                      <td key={i} className="py-4 px-2 text-center">
                        <button
                          onClick={() => toggleHabit(habit.id, day.dateStr)}
                          className={`w-10 h-10 rounded-xl transition-all flex items-center justify-center mx-auto cursor-pointer ${
                            isDone
                              ? 'bg-olive-600 text-white shadow-xs transform scale-105'
                              : isToday
                              ? 'bg-beige-100 dark:bg-dark-border border-2 border-olive-400 dark:border-olive-700 hover:bg-olive-100 dark:hover:bg-olive-900/40'
                              : 'bg-beige-100 dark:bg-dark-bg hover:bg-beige-200 dark:hover:bg-dark-border text-transparent'
                          }`}
                        >
                          <i
                            className={`fa-solid ${
                              isDone ? 'fa-leaf' : 'fa-check'
                            } text-sm ${isDone ? '' : 'opacity-0 hover:opacity-40'}`}
                          ></i>
                        </button>
                      </td>
                    );
                  })}
                  <td className="py-4 px-4 text-center">
                    <div className="flex items-center justify-center gap-2">
                      <span
                        title="السلسلة الحالية"
                        className="bg-amber-100 dark:bg-amber-900/30 text-amber-800 dark:text-amber-300 px-3 py-1 rounded-full text-xs font-bold flex items-center gap-1"
                      >
                        <i className="fa-solid fa-fire text-amber-500"></i> {habit.streak}
                      </span>
                      <button
                        onClick={() => deleteHabit(habit.id)}
                        className="text-beige-400 hover:text-red-500 transition-colors p-1 cursor-pointer"
                        title="حذف العادة"
                      >
                        <i className="fa-solid fa-xmark"></i>
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {habits.length === 0 && (
            <p className="text-center py-12 text-beige-500 font-serif text-base">
              لا توجد عادات مسجلة بعد. ابدأ ببناء وتثبيت عاداتك الإيجابية اليوم.
            </p>
          )}
        </div>
      </Card>
    </div>
  );
};
