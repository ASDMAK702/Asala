export interface Subtask {
  id: string;
  title: string;
  completed: boolean;
}

export interface Task {
  id: string;
  title: string;
  category: string;
  priority: 'عالية' | 'متوسطة' | 'عادية';
  dueDate: string | null;
  completed: boolean;
  createdAt: string;
  subtasks: Subtask[];
  googleCalendarEventId?: string;
}

export interface Habit {
  id: string;
  name: string;
  category: 'عقل' | 'جسد' | 'روح';
  history: Record<string, boolean>;
  streak: number;
  bestStreak: number;
  archived: boolean;
  createdAt: string;
}

export interface JournalEntry {
  id: string;
  text: string;
  mood: string;
  date: string;
  wordCount: number;
  isPinned: boolean;
  googleDocUrl?: string;
}

export interface Transaction {
  id: string;
  amount: number;
  desc: string;
  type: 'income' | 'expense';
  category: string;
  date: string;
}

export interface Finances {
  balance: number;
  budget?: number;
  history: Transaction[];
}

export interface VisionGoal {
  id: string;
  text: string;
  category: string;
  completed: boolean;
  year: number;
}

export interface AppSettings {
  userName: string;
  theme: 'light' | 'dark';
  focusSessions: number;
  pinCode?: string;
  autoDriveBackup?: boolean;
  lastBackupDate?: string;
}

export interface SyncLogItem {
  id: string;
  service: 'Drive' | 'Calendar' | 'Sheets' | 'Docs' | 'Auth';
  action: string;
  status: 'success' | 'error' | 'pending';
  details?: string;
  url?: string;
  timestamp: string;
}

export interface GoogleUserProfile {
  uid: string;
  displayName: string | null;
  email: string | null;
  photoURL: string | null;
}
