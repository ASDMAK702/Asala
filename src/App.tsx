/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { User } from 'firebase/auth';
import { initAuth } from '@/src/services/firebaseAuth';
import {
  Task,
  Habit,
  JournalEntry,
  Finances,
  VisionGoal,
  Book,
  WeeklyReview,
  AppSettings,
  SyncLogItem,
} from '@/src/types';
import { GoogleSignInButton } from '@/src/components/GoogleSignInButton';
import { DashboardView } from '@/src/components/DashboardView';
import { ConnectedServicesView } from '@/src/components/ConnectedServicesView';
import { TasksView } from '@/src/components/TasksView';
import { HabitsView } from '@/src/components/HabitsView';
import { JournalView } from '@/src/components/JournalView';
import { FinanceView } from '@/src/components/FinanceView';
import { FocusView } from '@/src/components/FocusView';
import { VisionView } from '@/src/components/VisionView';
import { LibraryView } from '@/src/components/LibraryView';
import { TasbeehView } from '@/src/components/TasbeehView';
import { WeeklyReviewView } from '@/src/components/WeeklyReviewView';
import { SettingsView } from '@/src/components/SettingsView';
import { formatDate } from '@/src/components/CommonUI';

function useLocalStorage<T>(key: string, initialValue: T): [T, (val: T | ((prev: T) => T)) => void] {
  const [storedValue, setStoredValue] = useState<T>(() => {
    try {
      const item = window.localStorage.getItem(key);
      return item ? JSON.parse(item) : initialValue;
    } catch {
      return initialValue;
    }
  });

  const setValue = (value: T | ((prev: T) => T)) => {
    try {
      const valueToStore = value instanceof Function ? value(storedValue) : value;
      setStoredValue(valueToStore);
      window.localStorage.setItem(key, JSON.stringify(valueToStore));
    } catch (error) {
      console.error('Error writing to localStorage:', error);
    }
  };

  return [storedValue, setValue];
}

export default function App() {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'info' | 'error' } | null>(
    null
  );
  const [confirmDialog, setConfirmDialog] = useState<{
    message: string;
    onConfirm: () => void;
  } | null>(null);

  // User Auth State
  const [user, setUser] = useState<User | null>(null);

  // App Data in LocalStorage
  const [tasks, setTasks] = useLocalStorage<Task[]>('asala_pro_tasks', []);
  const [habits, setHabits] = useLocalStorage<Habit[]>('asala_pro_habits', []);
  const [journal, setJournal] = useLocalStorage<JournalEntry[]>('asala_pro_journal', []);
  const [finances, setFinances] = useLocalStorage<Finances>('asala_pro_finances', {
    balance: 0,
    history: [],
  });
  const [vision, setVision] = useLocalStorage<VisionGoal[]>('asala_pro_vision', []);
  const [library, setLibrary] = useLocalStorage<Book[]>('asala_pro_library', []);
  const [weeklyReviews, setWeeklyReviews] = useLocalStorage<WeeklyReview[]>('asala_weekly_reviews', []);
  const [settings, setSettings] = useLocalStorage<AppSettings>('asala_pro_settings', {
    userName: 'صديقي',
    theme: 'light',
    focusSessions: 0,
  });

  const todayStr = new Date().toISOString().split('T')[0];
  const [waterGlasses, setWaterGlasses] = useLocalStorage<number>(`asala_water_${todayStr}`, 0);

  // Sync and audit logs
  const [syncLogs, setSyncLogs] = useLocalStorage<SyncLogItem[]>('asala_sync_logs', []);

  // Initialize Firebase Auth listener
  useEffect(() => {
    const unsubscribe = initAuth(
      (currentUser) => {
        setUser(currentUser);
        if (currentUser?.displayName && settings.userName === 'صديقي') {
          setSettings((prev) => ({ ...prev, userName: currentUser.displayName! }));
        }
      },
      () => {
        setUser(null);
      }
    );
    return () => unsubscribe();
  }, []);

  // Apply dark / light theme
  useEffect(() => {
    if (settings.theme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [settings.theme]);

  const showToast = (message: string, type: 'success' | 'info' | 'error' = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3500);
  };

  const confirmAction = (message: string, onConfirm: () => void) => {
    setConfirmDialog({
      message,
      onConfirm: () => {
        onConfirm();
        setConfirmDialog(null);
      },
    });
  };

  const updateSettings = (newSettings: Partial<AppSettings>) => {
    setSettings((prev) => ({ ...prev, ...newSettings }));
  };

  const addSyncLog = (item: Omit<SyncLogItem, 'id' | 'timestamp'>) => {
    const newLog: SyncLogItem = {
      ...item,
      id: Math.random().toString(36).substring(2, 9) + Date.now().toString(36),
      timestamp: new Date().toISOString(),
    };
    setSyncLogs((prev) => [newLog, ...(prev || [])]);
  };

  const clearSyncLogs = () => {
    setSyncLogs([]);
    showToast('تم مسح سجل العمليات', 'info');
  };

  // Restore imported data
  const handleRestoreData = (restored: any) => {
    if (restored.tasks) setTasks(restored.tasks);
    if (restored.habits) setHabits(restored.habits);
    if (restored.journal) setJournal(restored.journal);
    if (restored.finances) setFinances(restored.finances);
    if (restored.vision) setVision(restored.vision);
    if (restored.library) setLibrary(restored.library);
    if (restored.weeklyReviews) setWeeklyReviews(restored.weeklyReviews);
    if (restored.settings) setSettings((prev) => ({ ...prev, ...restored.settings }));
    if (typeof restored.waterGlasses === 'number') setWaterGlasses(restored.waterGlasses);
  };

  // Primary Navigation Items
  const navItems = [
    { id: 'dashboard', icon: 'fa-solid fa-compass', label: 'الرئيسية' },
    { id: 'vision', icon: 'fa-solid fa-mountain-sun', label: 'الرؤية' },
    { id: 'tasks', icon: 'fa-solid fa-list-check', label: 'المهام' },
    { id: 'habits', icon: 'fa-solid fa-seedling', label: 'العادات' },
    { id: 'library', icon: 'fa-solid fa-book-open', label: 'المكتبة' },
    { id: 'journal', icon: 'fa-solid fa-feather', label: 'اليوميات' },
    { id: 'tasbeeh', icon: 'fa-solid fa-peace', label: 'السكينة والمسبحة' },
    { id: 'finance', icon: 'fa-solid fa-wallet', label: 'المالية' },
    { id: 'focus', icon: 'fa-solid fa-stopwatch', label: 'التركيز' },
    { id: 'weekly-review', icon: 'fa-solid fa-compass-drafting', label: 'المراجعة الأسبوعية' },
    {
      id: 'connected-services',
      icon: 'fa-brands fa-google',
      label: 'الخدمات المتصلة',
      badge: user ? 'متصل' : undefined,
    },
    { id: 'settings', icon: 'fa-solid fa-gear', label: 'الإعدادات' },
  ];

  const renderContent = () => {
    switch (activeTab) {
      case 'dashboard':
        return (
          <DashboardView
            data={{
              tasks,
              habits,
              journal,
              finances,
              vision,
              library,
              settings,
              waterGlasses,
              setWaterGlasses,
            }}
            navigate={setActiveTab}
            user={user}
          />
        );

      case 'vision':
        return (
          <VisionView
            vision={vision}
            setVision={setVision}
            user={user}
            showToast={showToast}
            confirmAction={confirmAction}
            addSyncLog={addSyncLog}
          />
        );

      case 'tasks':
        return (
          <TasksView
            tasks={tasks}
            setTasks={setTasks}
            user={user}
            showToast={showToast}
            confirmAction={confirmAction}
            addSyncLog={addSyncLog}
          />
        );

      case 'habits':
        return (
          <HabitsView
            habits={habits}
            setHabits={setHabits}
            showToast={showToast}
            confirmAction={confirmAction}
          />
        );

      case 'library':
        return (
          <LibraryView
            library={library}
            setLibrary={setLibrary}
            showToast={showToast}
            confirmAction={confirmAction}
            addSyncLog={addSyncLog}
          />
        );

      case 'journal':
        return (
          <JournalView
            journal={journal}
            setJournal={setJournal}
            user={user}
            showToast={showToast}
            confirmAction={confirmAction}
            addSyncLog={addSyncLog}
          />
        );

      case 'tasbeeh':
        return <TasbeehView />;

      case 'finance':
        return (
          <FinanceView
            finances={finances}
            setFinances={setFinances}
            user={user}
            showToast={showToast}
            confirmAction={confirmAction}
            addSyncLog={addSyncLog}
          />
        );

      case 'focus':
        return (
          <FocusView
            settings={settings}
            updateSettings={updateSettings}
            user={user}
            showToast={showToast}
            addSyncLog={addSyncLog}
          />
        );

      case 'weekly-review':
        return (
          <WeeklyReviewView
            reviews={weeklyReviews}
            setReviews={setWeeklyReviews}
            showToast={showToast}
            confirmAction={confirmAction}
            addSyncLog={addSyncLog}
          />
        );

      case 'connected-services':
        return (
          <ConnectedServicesView
            user={user}
            tasks={tasks}
            habits={habits}
            journal={journal}
            finances={finances}
            vision={vision}
            settings={settings}
            onRestoreData={handleRestoreData}
            showToast={showToast}
            confirmAction={confirmAction}
            syncLogs={syncLogs}
            addSyncLog={addSyncLog}
            clearSyncLogs={clearSyncLogs}
          />
        );

      case 'settings':
        return (
          <SettingsView
            settings={settings}
            updateSettings={updateSettings}
            user={user}
            onUserChange={setUser}
            onNavigateToServices={() => setActiveTab('connected-services')}
            showToast={showToast}
            confirmAction={confirmAction}
            appData={{ tasks, habits, journal, finances, vision, library, waterGlasses }}
            onRestoreData={handleRestoreData}
          />
        );

      default:
        return (
          <DashboardView
            data={{
              tasks,
              habits,
              journal,
              finances,
              vision,
              library,
              settings,
              waterGlasses,
              setWaterGlasses,
            }}
            navigate={setActiveTab}
            user={user}
          />
        );
    }
  };

  return (
    <div className="flex h-screen overflow-hidden font-sans selection:bg-olive-200 selection:text-olive-900 bg-beige-100 dark:bg-[#151514] text-dark dark:text-beige-100">
      {/* Sidebar Desktop - Clean original Asala structure */}
      <aside className="hidden md:flex flex-col w-64 lg:w-72 bg-beige-50 dark:bg-dark-surface border-l border-beige-200 dark:border-dark-border h-full z-20 shrink-0">
        <div className="p-6 lg:p-8 flex items-center justify-center border-b border-beige-200 dark:border-dark-border">
          <h1 className="font-serif text-3xl lg:text-4xl font-bold text-olive-800 dark:text-beige-50 tracking-wider">
            أصالة
          </h1>
        </div>

        <nav className="flex-1 px-4 py-6 space-y-1.5 overflow-y-auto no-scrollbar">
          {navItems.map((item) => {
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => setActiveTab(item.id)}
                className={`w-full flex items-center gap-4 px-4 py-3 rounded-2xl transition-all duration-300 font-medium cursor-pointer ${
                  isActive
                    ? 'bg-olive-700 dark:bg-olive-600 text-beige-50 shadow-md transform scale-[1.02]'
                    : 'text-olive-700 dark:text-beige-300 hover:bg-beige-200 dark:hover:bg-dark-bg'
                }`}
              >
                <i className={`${item.icon} text-lg w-6 text-center`}></i>
                <span className="flex-1 text-right text-sm">{item.label}</span>
                {item.badge && (
                  <span className="text-[10px] bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300 px-2 py-0.5 rounded-full font-bold">
                    {item.badge}
                  </span>
                )}
              </button>
            );
          })}
        </nav>

        <div className="p-4 text-center border-t border-beige-200 dark:border-dark-border text-xs text-beige-400 dark:text-dark-border">
          إصدار أصالة الشامل | 100+ ميزة
        </div>
      </aside>

      {/* Mobile Drawer Menu */}
      {mobileMenuOpen && (
        <div
          className="md:hidden fixed inset-0 bg-dark/60 z-50 backdrop-blur-sm"
          onClick={() => setMobileMenuOpen(false)}
        >
          <aside
            className="w-4/5 max-w-sm bg-beige-50 dark:bg-dark-surface h-full flex flex-col shadow-2xl animate-fade-in text-right"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-6 border-b border-beige-200 dark:border-dark-border flex justify-between items-center">
              <h1 className="font-serif text-3xl font-bold text-olive-800 dark:text-beige-50">
                أصالة
              </h1>
              <button
                onClick={() => setMobileMenuOpen(false)}
                className="text-2xl text-dark dark:text-beige-50 p-2 cursor-pointer"
              >
                <i className="fa-solid fa-xmark"></i>
              </button>
            </div>

            <nav className="flex-1 p-4 space-y-1.5 overflow-y-auto no-scrollbar">
              {navItems.map((item) => {
                const isActive = activeTab === item.id;
                return (
                  <button
                    key={item.id}
                    onClick={() => {
                      setActiveTab(item.id);
                      setMobileMenuOpen(false);
                    }}
                    className={`w-full flex items-center gap-4 px-5 py-3 rounded-2xl transition-all font-medium text-base cursor-pointer ${
                      isActive
                        ? 'bg-olive-700 text-beige-50'
                        : 'text-olive-700 dark:text-beige-300 hover:bg-beige-200 dark:hover:bg-dark-bg'
                    }`}
                  >
                    <i className={`${item.icon} text-lg w-6 text-center`}></i>
                    <span className="flex-1 text-right">{item.label}</span>
                    {item.badge && (
                      <span className="text-[10px] bg-green-100 text-green-700 px-2 py-0.5 rounded-full font-bold">
                        {item.badge}
                      </span>
                    )}
                  </button>
                );
              })}
            </nav>

            <div className="p-4 border-t border-beige-200 dark:border-dark-border">
              <GoogleSignInButton
                user={user}
                onUserChange={setUser}
                onNavigateToServices={() => {
                  setActiveTab('connected-services');
                  setMobileMenuOpen(false);
                }}
              />
            </div>
          </aside>
        </div>
      )}

      {/* Main App Content Viewport */}
      <main className="flex-1 flex flex-col h-full overflow-hidden relative">
        {/* Top Header - Clean original layout */}
        <header className="h-20 bg-beige-50/80 dark:bg-dark-surface/80 backdrop-blur-md border-b border-beige-200 dark:border-dark-border flex items-center justify-between px-6 lg:px-10 z-10 shrink-0">
          <div className="flex items-center gap-4">
            <button
              className="md:hidden text-olive-800 dark:text-beige-50 text-2xl p-2 cursor-pointer"
              onClick={() => setMobileMenuOpen(true)}
              aria-label="القائمة"
            >
              <i className="fa-solid fa-bars-staggered"></i>
            </button>
            <h2 className="font-serif text-2xl text-olive-800 dark:text-beige-50 font-bold hidden sm:block">
              {navItems.find((i) => i.id === activeTab)?.label}
            </h2>
          </div>

          <div className="flex items-center gap-4">
            <span className="text-sm font-medium text-beige-600 dark:text-beige-400 hidden md:inline-block">
              {formatDate(new Date().toISOString())}
            </span>

            {/* Official Google Sign-In & Profile Component */}
            <GoogleSignInButton
              user={user}
              onUserChange={setUser}
              onNavigateToServices={() => setActiveTab('connected-services')}
            />
          </div>
        </header>

        {/* Dynamic Tab Body */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 md:p-8 lg:p-10 no-scrollbar">
          {renderContent()}
        </div>

        {/* Global Toast Notification */}
        {toast && (
          <div className="absolute bottom-6 left-1/2 transform -translate-x-1/2 bg-dark dark:bg-beige-50 text-white dark:text-dark px-6 py-3 rounded-full shadow-lg flex items-center gap-3 z-50 animate-slide-up text-sm font-medium border border-dark/20">
            <i
              className={`fa-solid ${
                toast.type === 'success'
                  ? 'fa-circle-check text-green-400 dark:text-green-600'
                  : toast.type === 'error'
                  ? 'fa-circle-exclamation text-red-400 dark:text-red-600'
                  : 'fa-circle-info text-blue-400'
              }`}
            ></i>
            <span>{toast.message}</span>
          </div>
        )}

        {/* Confirmation Modal */}
        {confirmDialog && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-fade-in">
            <div className="bg-white dark:bg-dark-surface rounded-2xl p-6 md:p-8 max-w-sm w-full shadow-2xl animate-slide-up mx-4 text-center">
              <h3 className="font-serif text-xl font-bold text-dark dark:text-beige-50 mb-4 text-center">
                {confirmDialog.message}
              </h3>
              <div className="flex gap-4 mt-8 flex-col sm:flex-row">
                <button
                  type="button"
                  onClick={() => setConfirmDialog(null)}
                  className="flex-1 py-2.5 px-4 rounded-xl font-medium text-sm bg-beige-200 text-olive-800 hover:bg-beige-300 dark:bg-dark-surface dark:text-beige-200 border border-beige-300 dark:border-dark-border transition-colors cursor-pointer"
                >
                  إلغاء
                </button>
                <button
                  type="button"
                  onClick={confirmDialog.onConfirm}
                  className="flex-1 py-2.5 px-4 rounded-xl font-medium text-sm bg-red-50 text-red-600 hover:bg-red-100 border border-red-200 dark:bg-red-900/30 dark:text-red-400 dark:border-red-800/50 transition-colors cursor-pointer"
                >
                  نعم، متأكد
                </button>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
