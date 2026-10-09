import React, { useState, useEffect, useMemo } from 'react';
import { User } from 'firebase/auth';
import { Task, Finances, Habit, JournalEntry, VisionGoal, Book } from '@/src/types';
import { Card, formatDate, Button } from './CommonUI';

interface Props {
  data: {
    tasks: Task[];
    habits: Habit[];
    journal: JournalEntry[];
    finances: Finances;
    vision: VisionGoal[];
    library?: Book[];
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

  const totalReadPages = (data.library || []).reduce(
    (acc, book) => acc + (parseInt(book.currentPg as any) || 0),
    0
  );

  return (
    <div className="space-y-6 animate-fade-in pb-8">
      {/* Welcome Banner - Clean classic styling, NO neon blur */}
      <div className="glass-panel p-6 md:p-10 rounded-3xl mb-8 relative overflow-hidden flex flex-col md:flex-row justify-between items-center gap-6">
        <div className="relative z-10 text-center md:text-right">
          <h1 className="font-serif text-3xl md:text-5xl font-bold text-olive-900 dark:text-beige-50 mb-3">
            {greeting}،{' '}
            <span className="text-olive-600 dark:text-olive-400">
              {user?.displayName || data.settings?.userName || 'صديقي'}
            </span>
          </h1>
          <p className="text-olive-700 dark:text-beige-300 font-serif text-lg md:text-xl italic opacity-90">
            "{randomQuote}"
          </p>
        </div>

        {/* Live Clock Display */}
        <div className="relative z-10 text-center bg-white/50 dark:bg-dark-surface/50 p-4 rounded-2xl border border-beige-200/50 dark:border-dark-border/50 backdrop-blur-sm">
          <p className="text-4xl font-bold text-olive-800 dark:text-beige-100 tabular-nums font-sans tracking-widest">
            {time.toLocaleTimeString('ar-SA', { hour: '2-digit', minute: '2-digit' })}
          </p>
          <p className="text-sm text-olive-600 dark:text-beige-400 mt-1">
            {formatDate(time.toISOString())}
          </p>
        </div>
      </div>

      {/* Summary Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-5">
        {/* Card 1: Tasks */}
        <Card
          className="hover:-translate-y-1 transition-transform duration-300 cursor-pointer"
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

        {/* Card 2: Finances */}
        <Card
          className="hover:-translate-y-1 transition-transform duration-300 cursor-pointer"
          onClick={() => navigate('finance')}
        >
          <div className="flex justify-between items-start">
            <div>
              <p className="text-sm text-beige-700 dark:text-beige-400 mb-1">الرصيد المتوفر</p>
              <h3 className="text-2xl font-bold text-olive-800 dark:text-beige-50">
                {data.finances.balance.toLocaleString()}{' '}
                <span className="text-sm font-normal">رس</span>
              </h3>
            </div>
            <div className="p-3 bg-blue-100 dark:bg-blue-900/50 rounded-xl text-blue-600 dark:text-blue-400">
              <i className="fa-solid fa-wallet text-xl"></i>
            </div>
          </div>
        </Card>

        {/* Card 3: Library (حصيلة القراءة) */}
        <Card
          className="hover:-translate-y-1 transition-transform duration-300 cursor-pointer"
          onClick={() => navigate('library')}
        >
          <div className="flex justify-between items-start">
            <div>
              <p className="text-sm text-beige-700 dark:text-beige-400 mb-1">حصيلة القراءة</p>
              <h3 className="text-3xl font-bold text-olive-800 dark:text-beige-50">
                {totalReadPages}
              </h3>
              <p className="text-xs mt-1 text-beige-500">صفحة مقروءة</p>
            </div>
            <div className="p-3 bg-orange-100 dark:bg-orange-900/50 rounded-xl text-orange-600 dark:text-orange-400">
              <i className="fa-solid fa-book-open text-xl"></i>
            </div>
          </div>
        </Card>

        {/* Card 4: Focus */}
        <Card
          className="hover:-translate-y-1 transition-transform duration-300 cursor-pointer"
          onClick={() => navigate('focus')}
        >
          <div className="flex justify-between items-start">
            <div>
              <p className="text-sm text-beige-700 dark:text-beige-400 mb-1">جلسات التركيز</p>
              <h3 className="text-3xl font-bold text-olive-800 dark:text-beige-50">
                {data.settings?.focusSessions || 0}
              </h3>
              <p className="text-xs mt-1 text-beige-500">جلسة مكتملة</p>
            </div>
            <div className="p-3 bg-purple-100 dark:bg-purple-900/50 rounded-xl text-purple-600 dark:text-purple-400">
              <i className="fa-solid fa-stopwatch text-xl"></i>
            </div>
          </div>
        </Card>

        {/* Card 5: Hydration */}
        <Card className="hover:-translate-y-1 transition-transform duration-300">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-sm text-beige-700 dark:text-beige-400 mb-1">الارتواء (كوب ماء)</p>
              <div className="flex items-center gap-3 mt-1">
                <button
                  type="button"
                  onClick={() => data.setWaterGlasses(Math.max(0, data.waterGlasses - 1))}
                  className="w-8 h-8 flex items-center justify-center rounded-full bg-beige-200 dark:bg-dark-border text-olive-700 hover:bg-beige-300 transition-colors cursor-pointer"
                >
                  -
                </button>
                <h3 className="text-3xl font-bold text-blue-500 tabular-nums">
                  {data.waterGlasses}
                </h3>
                <button
                  type="button"
                  onClick={() => data.setWaterGlasses(Math.min(15, data.waterGlasses + 1))}
                  className="w-8 h-8 flex items-center justify-center rounded-full bg-blue-100 text-blue-600 hover:bg-blue-200 transition-colors cursor-pointer"
                >
                  +
                </button>
              </div>
            </div>
            <div className="p-3 bg-blue-50 dark:bg-blue-900/30 rounded-xl text-blue-500">
              <i className="fa-solid fa-droplet text-xl"></i>
            </div>
          </div>
        </Card>
      </div>

      {/* Connected Services & Quick Google Hub Bar */}
      <Card
        title="تكاملات Google الرسمية والخدمات المتصلة"
        icon="fa-brands fa-google"
        action={
          <Button
            onClick={() => navigate('connected-services')}
            variant="secondary"
            size="sm"
            icon="fa-solid fa-sliders"
          >
            إدارة الخدمات
          </Button>
        }
      >
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <div
            onClick={() => navigate('connected-services')}
            className="p-3 rounded-xl border border-beige-200 dark:border-dark-border bg-beige-50/50 dark:bg-dark-bg/50 hover:border-olive-400 cursor-pointer transition-colors"
          >
            <div className="flex items-center gap-2 text-blue-600 mb-1">
              <i className="fa-brands fa-google-drive text-lg"></i>
              <span className="text-xs font-bold text-dark dark:text-beige-100">Google Drive</span>
            </div>
            <p className="text-[11px] text-beige-500">نسخ سحابي كامل واستعادة</p>
          </div>

          <div
            onClick={() => navigate('connected-services')}
            className="p-3 rounded-xl border border-beige-200 dark:border-dark-border bg-beige-50/50 dark:bg-dark-bg/50 hover:border-olive-400 cursor-pointer transition-colors"
          >
            <div className="flex items-center gap-2 text-red-500 mb-1">
              <i className="fa-regular fa-calendar-check text-lg"></i>
              <span className="text-xs font-bold text-dark dark:text-beige-100">Google Calendar</span>
            </div>
            <p className="text-[11px] text-beige-500">مزامنة المهام والتركيز</p>
          </div>

          <div
            onClick={() => navigate('connected-services')}
            className="p-3 rounded-xl border border-beige-200 dark:border-dark-border bg-beige-50/50 dark:bg-dark-bg/50 hover:border-olive-400 cursor-pointer transition-colors"
          >
            <div className="flex items-center gap-2 text-emerald-600 mb-1">
              <i className="fa-solid fa-table-cells text-lg"></i>
              <span className="text-xs font-bold text-dark dark:text-beige-100">Google Sheets</span>
            </div>
            <p className="text-[11px] text-beige-500">تصدير المعاملات المالية</p>
          </div>

          <div
            onClick={() => navigate('connected-services')}
            className="p-3 rounded-xl border border-beige-200 dark:border-dark-border bg-beige-50/50 dark:bg-dark-bg/50 hover:border-olive-400 cursor-pointer transition-colors"
          >
            <div className="flex items-center gap-2 text-sky-600 mb-1">
              <i className="fa-regular fa-file-lines text-lg"></i>
              <span className="text-xs font-bold text-dark dark:text-beige-100">Google Docs</span>
            </div>
            <p className="text-[11px] text-beige-500">توثيق اليوميات والرؤية</p>
          </div>
        </div>
      </Card>
    </div>
  );
};
