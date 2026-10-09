import React, { useState, useEffect, useRef } from 'react';
import { User } from 'firebase/auth';
import { Button } from './CommonUI';
import { addFocusSessionToCalendar } from '@/src/services/googleWorkspace';
import { getAccessToken } from '@/src/services/firebaseAuth';

interface Props {
  settings: any;
  updateSettings: (newSettings: any) => void;
  user: User | null;
  showToast: (msg: string, type?: 'success' | 'info' | 'error') => void;
  addSyncLog?: (log: any) => void;
}

export const FocusView: React.FC<Props> = ({
  settings,
  updateSettings,
  user,
  showToast,
  addSyncLog,
}) => {
  const [timeLeft, setTimeLeft] = useState(25 * 60);
  const [isActive, setIsActive] = useState(false);
  const [mode, setMode] = useState<'work' | 'shortBreak' | 'longBreak' | 'breathe'>('work');
  const [syncToCalendar, setSyncToCalendar] = useState(true);
  const timerRef = useRef<any>(null);

  const times = { work: 25, shortBreak: 5, longBreak: 15, breathe: 2 };
  const labels = {
    work: 'جلسة تركيز وعمل',
    shortBreak: 'استراحة قصيرة',
    longBreak: 'استراحة طويلة',
    breathe: 'تأمل وتنفس (4-7-8)',
  };

  const switchMode = (newMode: 'work' | 'shortBreak' | 'longBreak' | 'breathe') => {
    setMode(newMode);
    setIsActive(false);
    setTimeLeft(times[newMode] * 60);
    document.title = `أصالة | ${labels[newMode]}`;
  };

  const toggleTimer = () => setIsActive(!isActive);

  useEffect(() => {
    if (isActive && timeLeft > 0) {
      timerRef.current = setInterval(() => setTimeLeft((prev) => prev - 1), 1000);
      const mins = Math.floor(timeLeft / 60)
        .toString()
        .padStart(2, '0');
      const secs = (timeLeft % 60).toString().padStart(2, '0');
      document.title = `(${mins}:${secs}) - أصالة`;
    } else if (timeLeft === 0 && isActive) {
      clearInterval(timerRef.current);
      setIsActive(false);

      if (mode === 'work') {
        const nextSessions = (settings.focusSessions || 0) + 1;
        updateSettings({ focusSessions: nextSessions });
        showToast('مبارك! اكتملت جلسة التركيز بنجاح.', 'success');

        // Automatically sync completed focus session to Google Calendar if enabled & logged in
        if (syncToCalendar && user) {
          const token = getAccessToken();
          if (token) {
            addFocusSessionToCalendar(times.work, 'جلسة تركيز وإنجاز', token)
              .then((res) => {
                showToast('تم توثيق جلسة التركيز في Google Calendar تلقائياً!', 'info');
                if (addSyncLog) {
                  addSyncLog({
                    service: 'Calendar',
                    action: `توثيق جلسة تركيز (${times.work} دقيقة)`,
                    status: 'success',
                    url: res.htmlLink,
                  });
                }
              })
              .catch((err) => console.warn('Could not add session to calendar:', err));
          }
        }
      } else {
        showToast('انتهت فترة الاستراحة، مستعد للعودة إلى الإنجاز؟');
      }

      document.title = 'أصالة | انتهى الوقت';
    }

    return () => clearInterval(timerRef.current);
  }, [isActive, timeLeft, mode]);

  const minutes = Math.floor(timeLeft / 60)
    .toString()
    .padStart(2, '0');
  const seconds = (timeLeft % 60).toString().padStart(2, '0');
  const totalSeconds = times[mode] * 60;
  const percentage = ((totalSeconds - timeLeft) / totalSeconds) * 100;

  const strokeColor =
    mode === 'work' ? '#678242' : mode === 'breathe' ? '#0d9488' : '#2563eb';

  return (
    <div className="flex flex-col items-center justify-center min-h-[75vh] animate-fade-in max-w-xl mx-auto text-center px-4">
      {/* Mode Buttons */}
      <div className="bg-white dark:bg-dark-surface p-1.5 rounded-full shadow-xs border border-beige-200 dark:border-dark-border mb-8 flex gap-1.5 overflow-x-auto max-w-full">
        {(Object.keys(times) as Array<keyof typeof times>).map((m) => (
          <button
            key={m}
            type="button"
            onClick={() => switchMode(m)}
            className={`px-4 sm:px-5 py-2 rounded-full text-xs sm:text-sm font-bold transition-all cursor-pointer whitespace-nowrap ${
              mode === m
                ? m === 'work'
                  ? 'bg-olive-700 text-white shadow-xs'
                  : m === 'breathe'
                  ? 'bg-teal-600 text-white shadow-xs'
                  : 'bg-blue-600 text-white shadow-xs'
                : 'text-beige-700 dark:text-beige-300 hover:bg-beige-100 dark:hover:bg-dark-bg'
            }`}
          >
            {labels[m]}
          </button>
        ))}
      </div>

      {/* Circular Progress & Breathing Animation */}
      <div className="relative w-72 h-72 sm:w-80 sm:h-80 flex items-center justify-center mb-10">
        {mode === 'breathe' && isActive && (
          <div className="absolute w-44 h-44 bg-teal-300 dark:bg-teal-800 rounded-full animate-breathe opacity-40 mix-blend-multiply filter blur-xl"></div>
        )}

        <svg className="absolute w-full h-full transform -rotate-90">
          <circle
            cx="50%"
            cy="50%"
            r="44%"
            fill="none"
            className="stroke-beige-200 dark:stroke-dark-border"
            strokeWidth="6"
          />
          <circle
            cx="50%"
            cy="50%"
            r="44%"
            fill="none"
            stroke={strokeColor}
            strokeWidth="7"
            strokeDasharray="911"
            strokeDashoffset={911 - (911 * percentage) / 100}
            className="transition-all duration-1000 ease-linear"
            strokeLinecap="round"
          />
        </svg>

        <div className="text-center z-10 flex flex-col items-center">
          {mode === 'breathe' && isActive ? (
            <h2 className="text-2xl font-serif text-teal-700 dark:text-teal-300 mb-2 animate-pulse font-bold">
              شهيق.. زفير..
            </h2>
          ) : null}
          <h1 className="text-6xl sm:text-7xl font-sans font-light text-dark dark:text-beige-50 tabular-nums tracking-tight">
            {minutes}:{seconds}
          </h1>
          <p className="text-beige-600 dark:text-beige-400 mt-2 font-serif text-base sm:text-lg">
            {labels[mode]}
          </p>
        </div>
      </div>

      {/* Control Buttons */}
      <div className="flex gap-4 items-center">
        <Button
          onClick={toggleTimer}
          size="lg"
          className="w-44 py-3.5 text-lg rounded-2xl"
          icon={isActive ? 'fa-solid fa-pause' : 'fa-solid fa-play'}
        >
          {isActive ? 'إيقاف مؤقت' : 'ابدأ الجلسة'}
        </Button>
        <Button
          onClick={() => switchMode(mode)}
          variant="secondary"
          size="lg"
          className="w-14 h-14 rounded-2xl !p-0"
          icon="fa-solid fa-rotate-right"
          title="إعادة ضبط الوقت"
        ></Button>
      </div>

      {/* Bottom info */}
      <div className="mt-8 flex flex-col sm:flex-row items-center gap-4 text-xs text-beige-500">
        <span>أنجزت اليوم: {settings.focusSessions || 0} جلسات تركيز مكتملة</span>
        {user && mode === 'work' && (
          <label className="flex items-center gap-2 cursor-pointer select-none text-olive-700 dark:text-olive-400">
            <input
              type="checkbox"
              checked={syncToCalendar}
              onChange={(e) => setSyncToCalendar(e.target.checked)}
              className="accent-olive-600 rounded"
            />
            <span>توثيق الجلسات المكتملة في Google Calendar تلقائياً</span>
          </label>
        )}
      </div>
    </div>
  );
};
