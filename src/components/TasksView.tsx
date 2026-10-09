import React, { useState } from 'react';
import { User } from 'firebase/auth';
import { Task, Subtask } from '@/src/types';
import { Button, Card, Input, Badge } from './CommonUI';
import { addTaskToCalendar } from '@/src/services/googleWorkspace';
import { getAccessToken, googleSignIn } from '@/src/services/firebaseAuth';

interface Props {
  tasks: Task[];
  setTasks: (tasks: Task[] | ((prev: Task[]) => Task[])) => void;
  user: User | null;
  showToast: (msg: string, type?: 'success' | 'info' | 'error') => void;
  confirmAction: (msg: string, onConfirm: () => void) => void;
  addSyncLog?: (log: any) => void;
}

export const TasksView: React.FC<Props> = ({
  tasks,
  setTasks,
  user,
  showToast,
  confirmAction,
  addSyncLog,
}) => {
  const [newTask, setNewTask] = useState('');
  const [category, setCategory] = useState('شخصي');
  const [priority, setPriority] = useState<'عالية' | 'متوسطة' | 'عادية'>('عادية');
  const [dueDate, setDueDate] = useState('');
  const [search, setSearch] = useState('');
  const [filterCat, setFilterCat] = useState('الكل');
  const [syncingTaskId, setSyncingTaskId] = useState<string | null>(null);
  const [syncingAll, setSyncingAll] = useState(false);

  const categories = ['شخصي', 'عمل', 'دراسة', 'صحة', 'عائلة'];
  const priorities: Record<'عالية' | 'متوسطة' | 'عادية', 'red' | 'blue' | 'beige'> = {
    عالية: 'red',
    متوسطة: 'blue',
    عادية: 'beige',
  };

  const generateId = () => Math.random().toString(36).substring(2, 9) + Date.now().toString(36);

  const addTask = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTask.trim()) return;

    const taskItem: Task = {
      id: generateId(),
      title: newTask.trim(),
      category,
      priority,
      dueDate: dueDate || null,
      completed: false,
      createdAt: new Date().toISOString(),
      subtasks: [],
    };

    setTasks([taskItem, ...tasks]);
    setNewTask('');
    setDueDate('');
    showToast('تمت إضافة المهمة بنجاح');
  };

  const toggleTask = (id: string) => {
    setTasks(tasks.map((t) => (t.id === id ? { ...t, completed: !t.completed } : t)));
  };

  const deleteTask = (id: string) => {
    confirmAction('هل أنت متأكد من حذف هذه المهمة؟', () => {
      setTasks(tasks.filter((t) => t.id !== id));
      showToast('تم حذف المهمة', 'info');
    });
  };

  const clearCompleted = () => {
    confirmAction('حذف جميع المهام المكتملة نهائياً؟', () => {
      setTasks(tasks.filter((t) => !t.completed));
      showToast('تم تنظيف القائمة');
    });
  };

  const addSubtask = (taskId: string, subTitle: string) => {
    if (!subTitle.trim()) return;
    const newSub: Subtask = { id: generateId(), title: subTitle.trim(), completed: false };
    setTasks(
      tasks.map((t) => (t.id === taskId ? { ...t, subtasks: [...(t.subtasks || []), newSub] } : t))
    );
  };

  const toggleSubtask = (taskId: string, subId: string) => {
    setTasks(
      tasks.map((t) => {
        if (t.id === taskId) {
          const updated = t.subtasks.map((s) => (s.id === subId ? { ...s, completed: !s.completed } : s));
          return { ...t, subtasks: updated };
        }
        return t;
      })
    );
  };

  // Sync a single task to Google Calendar
  const syncTaskToCalendar = async (task: Task) => {
    try {
      setSyncingTaskId(task.id);
      let token = getAccessToken();
      if (!token) {
        const res = await googleSignIn();
        if (!res) return;
        token = res.accessToken;
      }
      const result = await addTaskToCalendar(task, token);
      setTasks(
        tasks.map((t) => (t.id === task.id ? { ...t, googleCalendarEventId: result.eventId } : t))
      );
      showToast(`تمت إضافة "${task.title}" إلى تقويم Google!`);
      if (addSyncLog) {
        addSyncLog({
          service: 'Calendar',
          action: `إضافة مهمة "${task.title}"`,
          status: 'success',
          url: result.htmlLink,
        });
      }
    } catch (err: any) {
      showToast(err.message || 'فشلت إضافة المهمة إلى التقويم', 'error');
    } finally {
      setSyncingTaskId(null);
    }
  };

  // Sync all pending tasks to Google Calendar
  const syncAllUpcomingTasks = async () => {
    const pendingWithDate = tasks.filter((t) => t.dueDate && !t.completed && !t.googleCalendarEventId);
    if (pendingWithDate.length === 0) {
      showToast('جميع المهام ذات المواعيد مزامنة بالفعل مع التقويم', 'info');
      return;
    }

    setSyncingAll(true);
    let count = 0;
    try {
      let token = getAccessToken();
      if (!token) {
        const res = await googleSignIn();
        if (!res) return;
        token = res.accessToken;
      }
      for (const t of pendingWithDate) {
        await addTaskToCalendar(t, token);
        count++;
      }
      setTasks(
        tasks.map((t) => (t.dueDate && !t.completed ? { ...t, googleCalendarEventId: 'synced' } : t))
      );
      showToast(`تمت مزامنة ${count} مهام بنجاح مع Google Calendar!`);
    } catch (err: any) {
      showToast(err.message || 'حدث خطأ أثناء المزامنة الجماعية', 'error');
    } finally {
      setSyncingAll(false);
    }
  };

  const filteredTasks = tasks
    .filter((t) => filterCat === 'الكل' || t.category === filterCat)
    .filter((t) => t.title.toLowerCase().includes(search.toLowerCase()))
    .sort((a, b) => {
      if (a.completed !== b.completed) return a.completed ? 1 : -1;
      const pValues = { عالية: 3, متوسطة: 2, عادية: 1 };
      if (pValues[a.priority] !== pValues[b.priority])
        return pValues[b.priority] - pValues[a.priority];
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    });

  return (
    <div className="space-y-6 animate-fade-in max-w-5xl mx-auto pb-10">
      {/* Add New Task Form */}
      <Card title="مهمة جديدة" icon="fa-solid fa-plus">
        <form onSubmit={addTask} className="space-y-4">
          <div className="flex flex-col md:flex-row gap-4">
            <Input
              value={newTask}
              onChange={(e) => setNewTask(e.target.value)}
              placeholder="ما الذي تود إنجازه اليوم؟"
              className="flex-1 mb-0"
              required
            />
            <div className="flex items-center gap-2">
              <span className="text-xs text-beige-600 dark:text-beige-400 whitespace-nowrap">
                تاريخ الاستحقاق:
              </span>
              <input
                type="date"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
                className="bg-beige-50 dark:bg-dark-bg border border-beige-300 dark:border-dark-border text-dark dark:text-beige-50 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-olive-500"
              />
            </div>
          </div>

          <div className="flex flex-col sm:flex-row gap-4 items-center justify-between bg-beige-50/60 dark:bg-dark-bg/60 p-3.5 rounded-2xl border border-beige-200/60 dark:border-dark-border">
            <div className="flex gap-2 w-full sm:w-auto overflow-x-auto pb-1 no-scrollbar items-center">
              <span className="text-xs text-beige-600 dark:text-beige-400 whitespace-nowrap">
                التصنيف:
              </span>
              {categories.map((c) => (
                <button
                  type="button"
                  key={c}
                  onClick={() => setCategory(c)}
                  className={`px-3 py-1 text-xs rounded-full whitespace-nowrap transition-all cursor-pointer ${
                    category === c
                      ? 'bg-olive-700 text-white shadow-xs'
                      : 'bg-white dark:bg-dark-surface border border-beige-200 dark:border-dark-border text-olive-800 dark:text-beige-300'
                  }`}
                >
                  {c}
                </button>
              ))}
            </div>

            <div className="flex gap-2 w-full sm:w-auto items-center">
              <span className="text-xs text-beige-600 dark:text-beige-400 whitespace-nowrap">
                الأولوية:
              </span>
              {(['عادية', 'متوسطة', 'عالية'] as const).map((p) => (
                <button
                  type="button"
                  key={p}
                  onClick={() => setPriority(p)}
                  className={`px-3 py-1 text-xs rounded-full whitespace-nowrap transition-all cursor-pointer ${
                    priority === p
                      ? 'bg-olive-700 text-white shadow-xs'
                      : 'bg-white dark:bg-dark-surface border border-beige-200 dark:border-dark-border text-olive-800 dark:text-beige-300'
                  }`}
                >
                  {p}
                </button>
              ))}
            </div>

            <Button type="submit" className="w-full sm:w-auto px-6" icon="fa-solid fa-paper-plane">
              إضافة
            </Button>
          </div>
        </form>
      </Card>

      {/* Tasks List */}
      <Card
        title="قائمة المهام"
        icon="fa-solid fa-list-check"
        action={
          <div className="flex items-center gap-2">
            <Button
              variant="secondary"
              size="sm"
              onClick={syncAllUpcomingTasks}
              loading={syncingAll}
              icon="fa-regular fa-calendar-plus"
              title="مزامنة كافة المهام القادمة ذات التاريخ مع تقويم Google"
            >
              مزامنة مع Google Calendar
            </Button>
            <Button variant="ghost" size="sm" onClick={clearCompleted} icon="fa-solid fa-broom">
              تنظيف المكتمل
            </Button>
          </div>
        }
      >
        {/* Search & Category Filter */}
        <div className="flex flex-col sm:flex-row gap-3 mb-6">
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="بحث في أسماء المهام..."
            className="flex-1 mb-0"
            icon="fa-solid fa-magnifying-glass"
          />
          <select
            value={filterCat}
            onChange={(e) => setFilterCat(e.target.value)}
            className="bg-beige-50 dark:bg-dark-bg border border-beige-300 dark:border-dark-border text-dark dark:text-beige-50 rounded-xl px-4 py-2 text-sm focus:outline-none"
          >
            <option value="الكل">جميع التصنيفات</option>
            {categories.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </div>

        {/* Task Cards */}
        <div className="space-y-3">
          {filteredTasks.map((task) => {
            const isOverdue =
              task.dueDate &&
              !task.completed &&
              new Date(task.dueDate) < new Date(new Date().setHours(0, 0, 0, 0));

            return (
              <div
                key={task.id}
                className={`p-4 bg-white dark:bg-dark-surface rounded-2xl border transition-all ${
                  task.completed
                    ? 'border-beige-200 dark:border-dark-border opacity-70 bg-beige-50/30'
                    : isOverdue
                    ? 'border-red-300 dark:border-red-800 shadow-xs'
                    : 'border-beige-200 dark:border-dark-border hover:border-olive-400 dark:hover:border-olive-500 shadow-xs'
                }`}
              >
                <div className="flex items-start gap-3.5">
                  <button
                    onClick={() => toggleTask(task.id)}
                    className={`mt-1 flex-shrink-0 w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all cursor-pointer ${
                      task.completed
                        ? 'bg-olive-600 border-olive-600 text-white'
                        : 'border-beige-400 dark:border-beige-600 hover:border-olive-500'
                    }`}
                  >
                    {task.completed && <i className="fa-solid fa-check text-xs"></i>}
                  </button>

                  <div className="flex-1">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                      <h4
                        className={`font-medium text-base md:text-lg ${
                          task.completed
                            ? 'line-through text-beige-500'
                            : 'text-dark dark:text-beige-50'
                        }`}
                      >
                        {task.title}
                      </h4>
                      <div className="flex gap-2 items-center flex-wrap">
                        <Badge color={priorities[task.priority]}>{task.priority}</Badge>
                        <Badge color="beige">{task.category}</Badge>
                        {task.dueDate && (
                          <span
                            className={`text-xs flex items-center gap-1 ${
                              isOverdue
                                ? 'text-red-500 font-bold'
                                : 'text-beige-600 dark:text-beige-400'
                            }`}
                          >
                            <i className="fa-regular fa-calendar"></i>
                            {task.dueDate}
                          </span>
                        )}
                        {task.googleCalendarEventId && (
                          <span
                            className="text-[11px] bg-red-50 dark:bg-red-950/40 text-red-600 dark:text-red-400 px-2 py-0.5 rounded-md flex items-center gap-1 border border-red-200/60"
                            title="تمت المزامنة مع تقويم Google"
                          >
                            <i className="fa-regular fa-calendar-check text-[10px]"></i>
                            في التقويم
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Subtasks */}
                    {!task.completed && (
                      <div className="mt-3 pr-2 border-r-2 border-beige-200 dark:border-dark-border ml-2">
                        {(task.subtasks || []).map((sub) => (
                          <div
                            key={sub.id}
                            className="flex items-center gap-2 mb-1.5 cursor-pointer select-none"
                            onClick={() => toggleSubtask(task.id, sub.id)}
                          >
                            <i
                              className={`fa-solid fa-circle text-[8px] ${
                                sub.completed ? 'text-olive-500' : 'text-beige-300 dark:text-dark-border'
                              }`}
                            ></i>
                            <span
                              className={`text-xs ${
                                sub.completed
                                  ? 'line-through text-beige-400'
                                  : 'text-beige-700 dark:text-beige-300'
                              }`}
                            >
                              {sub.title}
                            </span>
                          </div>
                        ))}
                        <div className="flex mt-2">
                          <input
                            type="text"
                            placeholder="إضافة خطوة فرعية (اضغط Enter)..."
                            className="text-xs bg-transparent border-b border-beige-200 dark:border-dark-border text-dark dark:text-beige-50 px-1 py-1 focus:outline-none focus:border-olive-400 flex-1"
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') {
                                addSubtask(task.id, (e.target as HTMLInputElement).value);
                                (e.target as HTMLInputElement).value = '';
                              }
                            }}
                          />
                        </div>
                      </div>
                    )}
                  </div>

                  <div className="flex items-center gap-1">
                    {!task.completed && (
                      <button
                        onClick={() => syncTaskToCalendar(task)}
                        disabled={syncingTaskId === task.id}
                        className="text-beige-400 hover:text-red-500 transition-colors p-2 cursor-pointer"
                        title="إضافة إلى تقويم Google"
                      >
                        {syncingTaskId === task.id ? (
                          <i className="fa-solid fa-spinner fa-spin text-xs"></i>
                        ) : (
                          <i className="fa-regular fa-calendar-plus text-sm"></i>
                        )}
                      </button>
                    )}
                    <button
                      onClick={() => deleteTask(task.id)}
                      className="text-beige-400 hover:text-red-500 transition-colors p-2 cursor-pointer"
                      title="حذف المهمة"
                    >
                      <i className="fa-solid fa-trash-can text-sm"></i>
                    </button>
                  </div>
                </div>
              </div>
            );
          })}

          {filteredTasks.length === 0 && (
            <div className="text-center py-12 text-beige-400">
              <i className="fa-solid fa-leaf text-5xl mb-4 opacity-40"></i>
              <p className="font-serif text-lg">قائمتك خالية كنقاء الصباح.</p>
            </div>
          )}
        </div>
      </Card>
    </div>
  );
};
