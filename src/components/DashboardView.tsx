import React, { useState, useEffect, useMemo } from 'react';
import { User } from 'firebase/auth';
import { Task, Finances, Habit, JournalEntry, VisionGoal } from '@/src/types';
import { Card, formatDate, Button } from './CommonUI';

interface Props {
  data: {
    tasks: Task[];
    habits: Habit[];
    journal: JournalEntry[];
    finances: Finances;
    vision: VisionGoal[];
    settings: any;
    waterGlasses: number;
    setWaterGlasses: (val: number | ((prev: number) => number)) => void;
  };
  navigate: (tab: string) => void;
  user: User | null;
}

export const DashboardView: React.FC<Props> = ({ data, navigate, user }) => {
  const [greeting, setGreeting] = useState('');
  const [time, setTime] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    const hour = time.getHours();
    if (hour >= 4 && hour < 12) setGreeting('صباح الإنجاز والبركة');
    else if (hour >= 12 && hour < 17) setGreeting('مساء العمل والطموح');
    else if (hour >= 17 && hour < 21) setGreeting('مساء الهدوء والسكينة');
    else setGreeting('تصبح على خير وطمأنينة');
  }, [time]);

  const quotes = [
    'النجاح ليس نتيجة اشتعال مفاجئ، بل هو تراكم شرارات صغيرة.',
    'من عرف نفسه لم يضره ما قاله الناس عنه.',
    'القليل الدائم، خير من الكثير المنقطع.',
    'الجمال في البساطة، والقوة في الاستمرارية.',
    'اجعل من كل يوم لوحة فنية جديدة في حياتك.',
    'الوقت هو العملة الوحيدة التي تملكها، فاحذر أن تنفقها في غير محلها.',
    'لا تقاس الإرادة بما حققته، بل بما تجاوزته لتصل إليه.',
    'أعظم استثمار هو استثمارك في عقلك وصحتك.',
    'الرحلة تبدأ بخطوة، والتغيير يبدأ بقرار.',
    'كل إنجاز عظيم كان يعتبر يوماً ما مستحيلاً.',
  ];

  const randomQuote = useMemo(() => quotes[Math.floor(Math.random() * quotes.length)], []);

  const today = new Date().toISOString().split('T')[0];
  const todayTasks = data.tasks.filter((t) => t.createdAt?.startsWith(today) || t.dueDate === today);
  const completedToday = todayTasks.filter((t) => t.completed).length;
  const taskProgress = todayTasks.length === 0 ? 0 : Math.round((completedToday / todayTasks.length) * 100);

  const activeHabitsToday = data.habits.filter((h) => h.history && h.history[today]).length;
  const habitsPercent = data.habits.length === 0 ? 0 : Math.round((activeHabitsToday / data.habits.length) * 100);

  return (
    <div className="space-y-6 animate-fade-in max-w-6xl mx-auto pb-8">
      {/* Welcome Banner */}
      <div className="glass-panel p-6 md:p-10 rounded-3xl relative overflow-hidden flex flex-col md:flex-row justify-between items-center gap-6 border border-beige-200/60 dark:border-dark-border">
        <div className="absolute top-0 right-0 w-72 h-72 bg-olive-300 dark:bg-olive-800 rounded-full mix-blend-multiply filter blur-3xl opacity-25 transform translate-x-1/3 -translate-y-1/3 pointer-events-none"></div>

        <div className="relative z-10 text-center md:text-right">
          <h1 className="font-serif text-3xl md:text-5xl font-bold text-olive-900 dark:text-beige-50 mb-3">
            {greeting}،{' '}
            <span className="text-olive-600 dark:text-olive-400">
              {user?.displayName || data.settings?.userName || 'صديقي'}
            </span>
          </h1>
          <p className="text-olive-800 dark:text-beige-300 font-serif text-lg md:text-xl italic opacity-90 max-w-xl">
            "{randomQuote}"
          </p>
        </div>

        {/* Live Clock */}
        <div className="relative z-10 text-center bg-white/70 dark:bg-dark-surface/70 px-6 py-4 rounded-2xl border border-beige-200 dark:border-dark-border backdrop-blur-md shadow-xs">
          <p className="text-4xl font-bold text-olive-800 dark:text-beige-100 tabular-nums font-sans tracking-widest">
            {time.toLocaleTimeString('ar-SA', { hour: '2-digit', minute: '2-digit' })}
          </p>
          <p className="text-sm text-olive-600 dark:text-beige-400 mt-1">
            {formatDate(time.toISOString())}
          </p>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        <Card
          className="hover:-translate-y-1 transition-transform cursor-pointer"
          onClick={() => navigate('tasks')}
        >
          <div className="flex justify-between items-start">
            <div>
              <p className="text-sm text-beige-700 dark:text-beige-400 mb-1">مهام اليوم</p>
              <h3 className="text-3xl font-bold text-olive-800 dark:text-beige-50">
                {taskProgress}%
              </h3>
              <p className="text-xs mt-1 text-beige-500">
                أنجزت {completedToday} من {todayTasks.length}
              </p>
            </div>
            <div className="p-3 bg-olive-100 dark:bg-olive-900/50 rounded-xl text-olive-600 dark:text-olive-400">
              <i className="fa-solid fa-check-double text-xl"></i>
            </div>
          </div>
          <div className="w-full bg-beige-200 dark:bg-dark-border h-2 mt-4 rounded-full overflow-hidden">
            <div
              className="bg-olive-500 h-full rounded-full transition-all duration-1000"
              style={{ width: `${taskProgress}%` }}
            ></div>
          </div>
        </Card>

        <Card
          className="hover:-translate-y-1 transition-transform cursor-pointer"
          onClick={() => navigate('finance')}
        >
          <div className="flex justify-between items-start">
            <div>
              <p className="text-sm text-beige-700 dark:text-beige-400 mb-1">الرصيد المالي</p>
              <h3 className="text-2xl font-bold text-olive-800 dark:text-beige-50">
                {data.finances.balance.toLocaleString()}{' '}
                <span className="text-sm font-normal">رس</span>
              </h3>
              <p className="text-xs mt-1 text-beige-500">
                {data.finances.history.length} عمليات مسجلة
              </p>
            </div>
            <div className="p-3 bg-blue-100 dark:bg-blue-900/50 rounded-xl text-blue-600 dark:text-blue-400">
              <i className="fa-solid fa-wallet text-xl"></i>
            </div>
          </div>
        </Card>

        <Card
          className="hover:-translate-y-1 transition-transform cursor-pointer"
          onClick={() => navigate('habits')}
        >
          <div className="flex justify-between items-start">
            <div>
              <p className="text-sm text-beige-700 dark:text-beige-400 mb-1">عادات اليوم</p>
              <h3 className="text-3xl font-bold text-olive-800 dark:text-beige-50">
                {habitsPercent}%
              </h3>
              <p className="text-xs mt-1 text-beige-500">
                {activeHabitsToday} من {data.habits.length} مكتملة
              </p>
            </div>
            <div className="p-3 bg-emerald-100 dark:bg-emerald-900/50 rounded-xl text-emerald-600 dark:text-emerald-400">
              <i className="fa-solid fa-seedling text-xl"></i>
            </div>
          </div>
        </Card>

        <Card
          className="hover:-translate-y-1 transition-transform cursor-pointer"
          onClick={() => navigate('focus')}
        >
          <div className="flex justify-between items-start">
            <div>
              <p className="text-sm text-beige-700 dark:text-beige-400 mb-1">جلسات التركيز</p>
              <h3 className="text-3xl font-bold text-olive-800 dark:text-beige-50">
                {data.settings?.focusSessions || 0}
              </h3>
              <p className="text-xs mt-1 text-beige-500">جلسات منجزة</p>
            </div>
            <div className="p-3 bg-purple-100 dark:bg-purple-900/50 rounded-xl text-purple-600 dark:text-purple-400">
              <i className="fa-solid fa-stopwatch text-xl"></i>
            </div>
          </div>
        </Card>
      </div>

      {/* Quick Action Widgets: Hydration Tracker & Connected Services Hub Banner */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Hydration Tracker */}
        <Card className="lg:col-span-1">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-sm text-beige-700 dark:text-beige-400 mb-1">الارتواء وشرب الماء</p>
              <p className="text-xs text-beige-500 mb-3">الهدف اليومي: 8 أكواب</p>
              <div className="flex items-center gap-3">
                <button
                  onClick={() => data.setWaterGlasses(Math.max(0, data.waterGlasses - 1))}
                  className="w-9 h-9 flex items-center justify-center rounded-xl bg-beige-200 dark:bg-dark-border text-olive-800 hover:bg-beige-300 transition-colors text-lg font-bold cursor-pointer"
                >
                  -
                </button>
                <h3 className="text-4xl font-bold text-blue-500 tabular-nums">
                  {data.waterGlasses}
                </h3>
                <button
                  onClick={() => data.setWaterGlasses(Math.min(20, data.waterGlasses + 1))}
                  className="w-9 h-9 flex items-center justify-center rounded-xl bg-blue-100 text-blue-600 hover:bg-blue-200 transition-colors text-lg font-bold cursor-pointer"
                >
                  +
                </button>
              </div>
            </div>
            <div className="p-3.5 bg-blue-50 dark:bg-blue-900/30 rounded-2xl text-blue-500 text-2xl">
              <i className="fa-solid fa-droplet"></i>
            </div>
          </div>

          <div className="flex gap-1.5 mt-4">
            {Array.from({ length: 8 }).map((_, i) => (
              <div
                key={i}
                className={`h-2 flex-1 rounded-full transition-all ${
                  i < data.waterGlasses ? 'bg-blue-500' : 'bg-beige-200 dark:bg-dark-border'
                }`}
              ></div>
            ))}
          </div>
        </Card>

        {/* Google Workspace Quick Hub Card */}
        <Card className="lg:col-span-2 bg-gradient-to-br from-white to-olive-50/50 dark:from-dark-surface dark:to-olive-950/20">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-olive-100 dark:bg-olive-900/50 flex items-center justify-center text-olive-700 dark:text-olive-300 text-lg">
                <i className="fa-brands fa-google"></i>
              </div>
              <div>
                <h3 className="font-serif text-lg font-bold text-olive-900 dark:text-beige-50">
                  تكامل Google Workspace الذكي
                </h3>
                <p className="text-xs text-beige-600 dark:text-beige-400">
                  {user
                    ? `متصل بالحساب: ${user.email}`
                    : 'سجّل دخولك لمزامنة المهام والنسخ الاحتياطي في Drive'}
                </p>
              </div>
            </div>

            <Button
              onClick={() => navigate('connected-services')}
              variant="secondary"
              size="sm"
              icon="fa-solid fa-sliders"
            >
              إدارة الخدمات المتصلة
            </Button>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2">
            <div
              onClick={() => navigate('connected-services')}
              className="p-3 rounded-xl border border-beige-200 dark:border-dark-border bg-white/60 dark:bg-dark-bg/60 hover:border-olive-400 cursor-pointer transition-all"
            >
              <div className="flex items-center gap-2 text-blue-500 mb-1">
                <i className="fa-brands fa-google-drive text-base"></i>
                <span className="text-xs font-bold text-dark dark:text-beige-100">Drive</span>
              </div>
              <p className="text-[11px] text-beige-500">نسخ سحابي كامل</p>
            </div>

            <div
              onClick={() => navigate('connected-services')}
              className="p-3 rounded-xl border border-beige-200 dark:border-dark-border bg-white/60 dark:bg-dark-bg/60 hover:border-olive-400 cursor-pointer transition-all"
            >
              <div className="flex items-center gap-2 text-red-500 mb-1">
                <i className="fa-regular fa-calendar text-base"></i>
                <span className="text-xs font-bold text-dark dark:text-beige-100">Calendar</span>
              </div>
              <p className="text-[11px] text-beige-500">مزامنة المواعيد</p>
            </div>

            <div
              onClick={() => navigate('connected-services')}
              className="p-3 rounded-xl border border-beige-200 dark:border-dark-border bg-white/60 dark:bg-dark-bg/60 hover:border-olive-400 cursor-pointer transition-all"
            >
              <div className="flex items-center gap-2 text-emerald-500 mb-1">
                <i className="fa-solid fa-table-cells text-base"></i>
                <span className="text-xs font-bold text-dark dark:text-beige-100">Sheets</span>
              </div>
              <p className="text-[11px] text-beige-500">جداول المالية</p>
            </div>

            <div
              onClick={() => navigate('connected-services')}
              className="p-3 rounded-xl border border-beige-200 dark:border-dark-border bg-white/60 dark:bg-dark-bg/60 hover:border-olive-400 cursor-pointer transition-all"
            >
              <div className="flex items-center gap-2 text-sky-500 mb-1">
                <i className="fa-regular fa-file-lines text-base"></i>
                <span className="text-xs font-bold text-dark dark:text-beige-100">Docs</span>
              </div>
              <p className="text-[11px] text-beige-500">توثيق اليوميات</p>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
};
