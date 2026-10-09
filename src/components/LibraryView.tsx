import React, { useState } from 'react';
import { Book } from '@/src/types';
import { Button, Card, Input, Badge } from './CommonUI';
import { exportJournalToGoogleDoc } from '@/src/services/googleWorkspace';
import { getAccessToken, googleSignIn } from '@/src/services/firebaseAuth';

interface Props {
  library: Book[];
  setLibrary: (books: Book[] | ((prev: Book[]) => Book[])) => void;
  showToast: (msg: string, type?: 'success' | 'info' | 'error') => void;
  confirmAction: (msg: string, onConfirm: () => void) => void;
  addSyncLog?: (log: any) => void;
}

export const LibraryView: React.FC<Props> = ({
  library,
  setLibrary,
  showToast,
  confirmAction,
  addSyncLog,
}) => {
  const [title, setTitle] = useState('');
  const [author, setAuthor] = useState('');
  const [totalPages, setTotalPages] = useState('');
  const [currentPg, setCurrentPg] = useState('0');
  const [status, setStatus] = useState<'reading' | 'completed' | 'wishlist'>('reading');
  const [notes, setNotes] = useState('');
  const [filter, setFilter] = useState<'all' | 'reading' | 'completed' | 'wishlist'>('all');
  const [search, setSearch] = useState('');
  const [exporting, setExporting] = useState(false);

  const generateId = () => Math.random().toString(36).substring(2, 9) + Date.now().toString(36);

  const addBook = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;

    const newBook: Book = {
      id: generateId(),
      title: title.trim(),
      author: author.trim() || 'غير محدد',
      totalPages: parseInt(totalPages) || 100,
      currentPg: Math.min(parseInt(currentPg) || 0, parseInt(totalPages) || 100),
      status,
      notes: notes.trim(),
      updatedAt: new Date().toISOString(),
    };

    setLibrary([newBook, ...(library || [])]);
    setTitle('');
    setAuthor('');
    setTotalPages('');
    setCurrentPg('0');
    setNotes('');
    showToast('تمت إضافة الكتاب إلى مكتبتك');
  };

  const updateProgress = (id: string, delta: number) => {
    setLibrary(
      library.map((b) => {
        if (b.id !== id) return b;
        const newPage = Math.max(0, Math.min(b.totalPages, b.currentPg + delta));
        const isDone = newPage >= b.totalPages;
        return {
          ...b,
          currentPg: newPage,
          status: isDone ? 'completed' : b.status === 'wishlist' ? 'reading' : b.status,
          updatedAt: new Date().toISOString(),
        };
      })
    );
  };

  const deleteBook = (id: string) => {
    confirmAction('هل أنت متأكد من حذف هذا الكتاب من مكتبتك؟', () => {
      setLibrary(library.filter((b) => b.id !== id));
      showToast('تم حذف الكتاب', 'info');
    });
  };

  // Export Reading list to Google Docs
  const handleExportLibrary = async () => {
    if (!library || library.length === 0) {
      showToast('لا توجد كتب مسجلة في مكتبتك بعد', 'info');
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

      // Format books as journal-like text for Google Docs export
      const readingEntries = library.map((b) => ({
        id: b.id,
        text: `كتاب: ${b.title}\nالمؤلف: ${b.author}\nالصفحات: ${b.currentPg} من ${b.totalPages} (${Math.round(
          (b.currentPg / b.totalPages) * 100
        )}%)\nالحالة: ${
          b.status === 'completed' ? 'مكتمل' : b.status === 'reading' ? 'قيد القراءة' : 'في قائمة الأمنيات'
        }${b.notes ? `\nالملاحظات والفوائد: ${b.notes}` : ''}`,
        mood: b.status === 'completed' ? 'ممتاز' : 'مطمئن',
        date: b.updatedAt || new Date().toISOString(),
        wordCount: b.totalPages,
        isPinned: false,
      }));

      const result = await exportJournalToGoogleDoc(readingEntries, token);
      showToast('تم تصدير سجل القراءة إلى Google Docs بنجاح!');
      if (addSyncLog) {
        addSyncLog({
          service: 'Docs',
          action: 'تصدير سجل قراءة المكتبة',
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

  const totalPagesRead = (library || []).reduce((acc, b) => acc + (b.currentPg || 0), 0);
  const completedBooks = (library || []).filter((b) => b.status === 'completed').length;
  const currentlyReading = (library || []).filter((b) => b.status === 'reading').length;

  const filteredBooks = (library || [])
    .filter((b) => filter === 'all' || b.status === filter)
    .filter(
      (b) =>
        b.title.toLowerCase().includes(search.toLowerCase()) ||
        b.author.toLowerCase().includes(search.toLowerCase())
    );

  return (
    <div className="space-y-6 animate-fade-in max-w-5xl mx-auto pb-10">
      {/* Overview Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
        <Card className="text-center">
          <p className="text-xs text-beige-600 dark:text-beige-400 mb-1">إجمالي الصفحات المقروءة</p>
          <h3 className="text-3xl font-bold text-olive-800 dark:text-beige-50">{totalPagesRead}</h3>
          <p className="text-[11px] text-beige-500 mt-1">صفحة موثقة</p>
        </Card>

        <Card className="text-center">
          <p className="text-xs text-beige-600 dark:text-beige-400 mb-1">كتب تم إكمالها</p>
          <h3 className="text-3xl font-bold text-olive-700 dark:text-olive-400">{completedBooks}</h3>
          <p className="text-[11px] text-beige-500 mt-1">كتاب منجز</p>
        </Card>

        <Card className="text-center">
          <p className="text-xs text-beige-600 dark:text-beige-400 mb-1">قيد القراءة حالياً</p>
          <h3 className="text-3xl font-bold text-amber-700 dark:text-amber-400">{currentlyReading}</h3>
          <p className="text-[11px] text-beige-500 mt-1">كتاب نشط</p>
        </Card>
      </div>

      {/* Add New Book */}
      <Card title="إضافة كتاب جديد للمكتبة" icon="fa-solid fa-book">
        <form onSubmit={addBook} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Input
              label="عنوان الكتاب"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="مثال: البداية والنهاية، مقدمة ابن خلدون..."
              required
            />
            <Input
              label="المؤلف"
              value={author}
              onChange={(e) => setAuthor(e.target.value)}
              placeholder="اسم الكاتب أو المؤلف"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <Input
              label="إجمالي عدد الصفحات"
              type="number"
              value={totalPages}
              onChange={(e) => setTotalPages(e.target.value)}
              placeholder="300"
              required
            />
            <Input
              label="الصفحة الحالية"
              type="number"
              value={currentPg}
              onChange={(e) => setCurrentPg(e.target.value)}
              placeholder="0"
            />
            <div>
              <label className="block text-sm text-olive-800 dark:text-beige-300 mb-1.5 font-medium">
                حالة القراءة
              </label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value as any)}
                className="w-full bg-beige-50 dark:bg-dark-bg border border-beige-300 dark:border-dark-border text-dark dark:text-beige-50 rounded-xl px-4 py-2.5 text-sm focus:outline-none"
              >
                <option value="reading">قيد القراءة</option>
                <option value="completed">مكتمل</option>
                <option value="wishlist">في قائمة الأمنيات</option>
              </select>
            </div>
          </div>

          <Input
            label="ملاحظات وفائدة مختصرة"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="فكرة أعجبتك أو اقتباس من الكتاب..."
          />

          <Button type="submit" icon="fa-solid fa-plus" className="w-full sm:w-auto px-8">
            إضافة إلى المكتبة
          </Button>
        </form>
      </Card>

      {/* Library Shelf */}
      <Card
        title="رفوف المكتبة وقائمة القراءة"
        icon="fa-solid fa-book-bookmark"
        action={
          <div className="flex items-center gap-2">
            <Button
              variant="secondary"
              size="sm"
              onClick={handleExportLibrary}
              loading={exporting}
              icon="fa-regular fa-file-word"
              title="تصدير قائمة القراءة إلى Google Docs"
            >
              تصدير لـ Google Docs
            </Button>
          </div>
        }
      >
        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-3 mb-6">
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="بحث بالعنوان أو اسم المؤلف..."
            icon="fa-solid fa-magnifying-glass"
            className="flex-1 mb-0"
          />

          <div className="flex gap-1.5 bg-beige-100 dark:bg-dark-bg p-1 rounded-xl">
            {(['all', 'reading', 'completed', 'wishlist'] as const).map((s) => {
              const labels = {
                all: 'الكل',
                reading: 'قيد القراءة',
                completed: 'مكتمل',
                wishlist: 'الأمنيات',
              };
              return (
                <button
                  key={s}
                  type="button"
                  onClick={() => setFilter(s)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all cursor-pointer ${
                    filter === s
                      ? 'bg-white dark:bg-dark-surface shadow-xs text-olive-800 dark:text-beige-50 font-bold'
                      : 'text-beige-600 dark:text-beige-400'
                  }`}
                >
                  {labels[s]}
                </button>
              );
            })}
          </div>
        </div>

        {/* Books Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filteredBooks.map((b) => {
            const percent =
              b.totalPages > 0 ? Math.min(100, Math.round((b.currentPg / b.totalPages) * 100)) : 0;

            return (
              <div
                key={b.id}
                className="p-4 rounded-2xl border border-beige-200 dark:border-dark-border bg-white dark:bg-dark-surface hover:border-olive-300 transition-all flex flex-col justify-between"
              >
                <div>
                  <div className="flex justify-between items-start gap-2 mb-2">
                    <div>
                      <h4 className="font-bold text-base text-dark dark:text-beige-50">{b.title}</h4>
                      <p className="text-xs text-beige-500">{b.author}</p>
                    </div>
                    <Badge
                      color={
                        b.status === 'completed'
                          ? 'green'
                          : b.status === 'reading'
                          ? 'olive'
                          : 'beige'
                      }
                    >
                      {b.status === 'completed'
                        ? 'مكتمل'
                        : b.status === 'reading'
                        ? 'قيد القراءة'
                        : 'أمنيات'}
                    </Badge>
                  </div>

                  {b.notes && (
                    <p className="text-xs text-beige-600 dark:text-beige-300 italic mb-3 bg-beige-50/50 dark:bg-dark-bg/50 p-2 rounded-lg">
                      "{b.notes}"
                    </p>
                  )}
                </div>

                <div className="pt-3 border-t border-beige-100 dark:border-dark-border/60">
                  <div className="flex justify-between text-xs text-beige-600 dark:text-beige-400 mb-1.5">
                    <span>
                      صفحة {b.currentPg} من {b.totalPages}
                    </span>
                    <span className="font-bold text-olive-700 dark:text-olive-400">{percent}%</span>
                  </div>

                  <div className="w-full bg-beige-200 dark:bg-dark-border h-2 rounded-full overflow-hidden mb-3">
                    <div
                      className="bg-olive-600 h-full rounded-full transition-all duration-300"
                      style={{ width: `${percent}%` }}
                    ></div>
                  </div>

                  <div className="flex justify-between items-center">
                    <div className="flex gap-1.5">
                      <button
                        onClick={() => updateProgress(b.id, 5)}
                        className="px-2.5 py-1 text-xs rounded-lg bg-olive-50 dark:bg-olive-900/30 text-olive-700 dark:text-olive-300 hover:bg-olive-100 cursor-pointer"
                        title="قرأت 5 صفحات"
                      >
                        +5 ص
                      </button>
                      <button
                        onClick={() => updateProgress(b.id, 20)}
                        className="px-2.5 py-1 text-xs rounded-lg bg-olive-50 dark:bg-olive-900/30 text-olive-700 dark:text-olive-300 hover:bg-olive-100 cursor-pointer"
                        title="قرأت 20 صفحة"
                      >
                        +20 ص
                      </button>
                    </div>

                    <button
                      onClick={() => deleteBook(b.id)}
                      className="text-beige-300 hover:text-red-500 p-1.5 transition-colors cursor-pointer text-xs"
                      title="حذف الكتاب"
                    >
                      <i className="fa-solid fa-trash-can"></i>
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {filteredBooks.length === 0 && (
          <div className="text-center py-12 text-beige-400">
            <i className="fa-solid fa-book-open text-4xl mb-3 opacity-40"></i>
            <p className="font-serif text-base">لا توجد كتب مسجلة في هذا القسم.</p>
          </div>
        )}
      </Card>
    </div>
  );
};
