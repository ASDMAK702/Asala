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
    if (restored.settings) setSettings((prev) => ({ ...prev, ...restored.settings }));
    if (typeof restored.waterGlasses === 'number') setWaterGlasses(restored.waterGlasses);
  };

  const navItems = [
    { id: 'dashboard', icon: 'fa-solid fa-compass', label: 'الرئيسية' },
    {
      id: 'connected-services',
      icon: 'fa-brands fa-google',
      label: 'الخدمات المتصلة',
      badge: user ? 'متصل' : 'جديد',
    },
    { id: 'tasks', icon: 'fa-solid fa-list-check', label: 'المهام' },
    { id: 'habits', icon: 'fa-solid fa-seedling', label: 'العادات' },
    { id: 'journal', icon: 'fa-solid fa-feather', label: 'اليوميات' },
    { id: 'finance', icon: 'fa-solid fa-wallet', label: 'المالية' },
    { id: 'focus', icon: 'fa-solid fa-stopwatch', label: 'التركيز' },
    { id: 'vision', icon: 'fa-solid fa-mountain-sun', label: 'الرؤية' },
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
              settings,
              waterGlasses,
              setWaterGlasses,
            }}
            navigate={setActiveTab}
            user={user}
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
            appData={{ tasks, habits, journal, finances, vision, waterGlasses }}
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
      {/* Desktop Sidebar */}
      <aside className="hidden md:flex flex-col w-64 lg:w-72 bg-beige-50 dark:bg-dark-surface border-l border-beige-200 dark:border-dark-border h-full z-20 shrink-0">
        <div className="p-6 lg:p-7 flex items-center justify-between border-b border-beige-200 dark:border-dark-border">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-olive-700 text-beige-50 flex items-center justify-center font-serif text-xl font-bold shadow-xs">
              أ
            </div>
            <div>
              <h1 className="font-serif text-2xl lg:text-3xl font-bold text-olive-800 dark:text-beige-50 tracking-wide">
                أصالة
              </h1>
              <p className="text-[11px] text-olive-600 dark:text-olive-400 font-medium">
                Workspace &amp; Life OS
              </p>
            </div>
          </div>
        </div>

        <nav className="flex-1 px-4 py-5 space-y-1.5 overflow-y-auto no-scrollbar">
          {navItems.map((item) => {
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => setActiveTab(item.id)}
                className={`w-full flex items-center justify-between px-4 py-3 rounded-2xl transition-all duration-200 font-medium cursor-pointer ${
                  isActive
                    ? 'bg-olive-700 dark:bg-olive-600 text-beige-50 shadow-md transform scale-[1.01]'
                    : 'text-olive-800 dark:text-beige-300 hover:bg-beige-200/80 dark:hover:bg-dark-bg'
                }`}
              >
                <div className="flex items-center gap-3.5">
                  <i
                    className={`${item.icon} text-lg w-5 text-center ${
                      isActive ? 'text-beige-50' : 'text-olive-600 dark:text-olive-400'
                    }`}
                  ></i>
                  <span className="text-sm">{item.label}</span>
                </div>
                {item.badge && (
                  <span
                    className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${
                      isActive
                        ? 'bg-white/20 text-white'
                        : item.badge === 'متصل'
                        ? 'bg-green-100 text-green-700 dark:bg-green-950/50 dark:text-green-300'
                        : 'bg-olive-100 text-olive-700 dark:bg-olive-950/50 dark:text-olive-300'
                    }`}
                  >
                    {item.badge}
                  </span>
                )}
              </button>
            );
          })}
        </nav>

        {/* Sidebar Footer */}
        <div className="p-4 border-t border-beige-200 dark:border-dark-border text-center">
          <div className="flex items-center justify-center gap-1.5 text-xs text-olive-700 dark:text-olive-400 font-medium">
            <i className="fa-brands fa-google text-sm"></i>
            <span>Google Workspace رسمي</span>
          </div>
          <p className="text-[10px] text-beige-500 mt-1">تزامن وتشفير آمن للبيانات</p>
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
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-olive-700 text-white flex items-center justify-center font-serif font-bold text-lg">
                  أ
                </div>
                <h1 className="font-serif text-2xl font-bold text-olive-800 dark:text-beige-50">
                  أصالة
                </h1>
              </div>
              <button
                onClick={() => setMobileMenuOpen(false)}
                className="text-2xl text-dark dark:text-beige-50 p-2 cursor-pointer"
              >
                <i className="fa-solid fa-xmark"></i>
              </button>
            </div>

            <nav className="flex-1 p-4 space-y-2 overflow-y-auto">
              {navItems.map((item) => {
                const isActive = activeTab === item.id;
                return (
                  <button
                    key={item.id}
                    onClick={() => {
                      setActiveTab(item.id);
                      setMobileMenuOpen(false);
                    }}
                    className={`w-full flex items-center justify-between px-4 py-3.5 rounded-2xl transition-all font-medium text-base cursor-pointer ${
                      isActive
                        ? 'bg-olive-700 text-beige-50'
                        : 'text-olive-800 dark:text-beige-300 hover:bg-beige-200 dark:hover:bg-dark-bg'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <i className={`${item.icon} text-lg w-6 text-center`}></i>
                      <span>{item.label}</span>
                    </div>
                    {item.badge && (
                      <span className="text-xs bg-olive-100 text-olive-800 px-2 py-0.5 rounded-full">
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
        {/* Top Header */}
        <header className="h-20 bg-beige-50/85 dark:bg-dark-surface/85 backdrop-blur-md border-b border-beige-200 dark:border-dark-border flex items-center justify-between px-5 sm:px-8 lg:px-10 z-10 shrink-0">
          <div className="flex items-center gap-4">
            <button
              className="md:hidden text-olive-800 dark:text-beige-50 text-2xl p-2 cursor-pointer"
              onClick={() => setMobileMenuOpen(true)}
              aria-label="القائمة"
            >
              <i className="fa-solid fa-bars-staggered"></i>
            </button>
            <div>
              <h2 className="font-serif text-xl sm:text-2xl text-olive-900 dark:text-beige-50 font-bold">
                {navItems.find((i) => i.id === activeTab)?.label}
              </h2>
            </div>
          </div>

          <div className="flex items-center gap-3 sm:gap-4">
            <span className="text-xs font-medium text-beige-600 dark:text-beige-400 hidden lg:inline-block">
              {formatDate(new Date().toISOString(), true)}
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
          <div className="absolute bottom-6 left-1/2 transform -translate-x-1/2 bg-neutral-900 dark:bg-beige-50 text-white dark:text-neutral-900 px-6 py-3 rounded-2xl shadow-xl flex items-center gap-3 z-50 animate-slide-up text-sm font-medium border border-neutral-700/50">
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
            <div className="bg-white dark:bg-dark-surface rounded-3xl p-6 md:p-8 max-w-md w-full shadow-2xl animate-slide-up mx-4 border border-beige-200 dark:border-dark-border text-center">
              <div className="w-14 h-14 rounded-2xl bg-olive-100 dark:bg-olive-900/40 text-olive-700 dark:text-olive-300 flex items-center justify-center text-2xl mx-auto mb-4">
                <i className="fa-solid fa-circle-question"></i>
              </div>
              <h3 className="font-serif text-xl font-bold text-dark dark:text-beige-50 mb-3">
                تأكيد الإجراء
              </h3>
              <p className="text-sm text-beige-700 dark:text-beige-300 leading-relaxed mb-6 font-sans">
                {confirmDialog.message}
              </p>
              <div className="flex gap-3 flex-col sm:flex-row">
                <button
                  type="button"
                  onClick={() => setConfirmDialog(null)}
                  className="flex-1 py-3 px-4 rounded-xl font-medium text-sm bg-beige-200 text-olive-900 dark:bg-dark-bg dark:text-beige-200 hover:bg-beige-300 dark:hover:bg-neutral-800 transition-colors cursor-pointer"
                >
                  إلغاء
                </button>
                <button
                  type="button"
                  onClick={confirmDialog.onConfirm}
                  className="flex-1 py-3 px-4 rounded-xl font-medium text-sm bg-olive-700 text-white hover:bg-olive-800 dark:bg-olive-600 transition-colors cursor-pointer shadow-md"
                >
                  تأكيد ومتابعة
                </button>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
