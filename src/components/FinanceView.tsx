import React, { useState } from 'react';
import { User } from 'firebase/auth';
import { Finances, Transaction } from '@/src/types';
import { Button, Card, Input, formatDate } from './CommonUI';
import { exportFinancesToGoogleSheet } from '@/src/services/googleWorkspace';
import { getAccessToken, googleSignIn } from '@/src/services/firebaseAuth';

interface Props {
  finances: Finances;
  setFinances: (finances: Finances | ((prev: Finances) => Finances)) => void;
  user: User | null;
  showToast: (msg: string, type?: 'success' | 'info' | 'error') => void;
  confirmAction: (msg: string, onConfirm: () => void) => void;
  addSyncLog?: (log: any) => void;
}

export const FinanceView: React.FC<Props> = ({
  finances,
  setFinances,
  user,
  showToast,
  confirmAction,
  addSyncLog,
}) => {
  const [amount, setAmount] = useState('');
  const [desc, setDesc] = useState('');
  const [type, setType] = useState<'income' | 'expense'>('expense');
  const [category, setCategory] = useState('طعام');
  const [exportingSheet, setExportingSheet] = useState(false);

  // Feature: Savings Goals
  const [savingsGoals, setSavingsGoals] = useState<Array<{ id: string; title: string; target: number; current: number }>>(() => {
    try {
      const saved = localStorage.getItem('asala_savings_goals');
      return saved ? JSON.parse(saved) : [
        { id: '1', title: 'صندوق الطوارئ', target: 5000, current: 1500 },
        { id: '2', title: 'ادخار رحلة عائلية', target: 3000, current: 800 },
      ];
    } catch {
      return [];
    }
  });

  const [newGoalTitle, setNewGoalTitle] = useState('');
  const [newGoalTarget, setNewGoalTarget] = useState('');
  const [depositAmount, setDepositAmount] = useState<Record<string, string>>({});

  const saveGoalsToStorage = (goals: any) => {
    setSavingsGoals(goals);
    localStorage.setItem('asala_savings_goals', JSON.stringify(goals));
  };

  const addSavingsGoal = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newGoalTitle.trim() || !newGoalTarget) return;
    const targetVal = parseFloat(newGoalTarget);
    if (isNaN(targetVal) || targetVal <= 0) return;

    const newGoal = {
      id: generateId(),
      title: newGoalTitle.trim(),
      target: targetVal,
      current: 0,
    };
    saveGoalsToStorage([...savingsGoals, newGoal]);
    setNewGoalTitle('');
    setNewGoalTarget('');
    showToast('تمت إضافة هدف الادخار');
  };

  const handleDepositToGoal = (id: string) => {
    const amt = parseFloat(depositAmount[id] || '0');
    if (isNaN(amt) || amt <= 0) return;

    const updated = savingsGoals.map((g) => (g.id === id ? { ...g, current: g.current + amt } : g));
    saveGoalsToStorage(updated);
    setDepositAmount({ ...depositAmount, [id]: '' });
    showToast(`تم إيداع ${amt} رس في هدف الادخار`);
  };

  const deleteGoal = (id: string) => {
    confirmAction('حذف هدف الادخار هذا؟', () => {
      saveGoalsToStorage(savingsGoals.filter((g) => g.id !== id));
      showToast('تم الحذف', 'info');
    });
  };

  const categories = {
    income: ['راتب', 'أعمال حرة', 'هدية', 'استثمار', 'أخرى'],
    expense: ['طعام', 'فواتير', 'تسوق', 'مواصلات', 'صحة', 'ترفيه', 'أخرى'],
  };

  const generateId = () => Math.random().toString(36).substring(2, 9) + Date.now().toString(36);

  const addTransaction = (e: React.FormEvent) => {
    e.preventDefault();
    const val = parseFloat(amount);
    if (isNaN(val) || val <= 0 || !desc.trim()) return;

    const newTx: Transaction = {
      id: generateId(),
      amount: val,
      desc: desc.trim(),
      type,
      category,
      date: new Date().toISOString(),
    };

    const newBalance = type === 'income' ? finances.balance + val : finances.balance - val;

    setFinances({
      balance: newBalance,
      budget: finances.budget || 0,
      history: [newTx, ...finances.history],
    });

    setAmount('');
    setDesc('');
    showToast('تم تسجيل العملية بنجاح');
  };

  const deleteTx = (id: string, amt: number, txType: 'income' | 'expense') => {
    confirmAction('هل أنت متأكد من حذف هذه المعاملة؟', () => {
      const newBalance = txType === 'income' ? finances.balance - amt : finances.balance + amt;
      setFinances({
        ...finances,
        balance: newBalance,
        history: finances.history.filter((t) => t.id !== id),
      });
      showToast('تم حذف المعاملة', 'info');
    });
  };

  // Export to Google Sheets
  const handleExportToSheets = async () => {
    if (finances.history.length === 0) {
      showToast('لا توجد معاملات مسجلة لتصديرها إلى جداول البيانات', 'info');
      return;
    }

    setExportingSheet(true);
    try {
      let token = getAccessToken();
      if (!token) {
        const res = await googleSignIn();
        if (!res) return;
        token = res.accessToken;
      }
      const result = await exportFinancesToGoogleSheet(finances, token);
      showToast('تم تصدير السجل المالي إلى Google Sheets بنجاح!');
      if (addSyncLog) {
        addSyncLog({
          service: 'Sheets',
          action: 'تصدير السجل المالي الشامل',
          status: 'success',
          details: `${finances.history.length} معاملة مالية مصنفة`,
          url: result.spreadsheetUrl,
        });
      }
      window.open(result.spreadsheetUrl, '_blank');
    } catch (err: any) {
      showToast(err.message || 'فشل التصدير إلى Google Sheets', 'error');
    } finally {
      setExportingSheet(false);
    }
  };

  const totalIncome = finances.history
    .filter((t) => t.type === 'income')
    .reduce((a, b) => a + b.amount, 0);

  const totalExpense = finances.history
    .filter((t) => t.type === 'expense')
    .reduce((a, b) => a + b.amount, 0);

  // Calculate expense by category for conic gradient pie chart
  const expenseByCategory: Record<string, number> = {};
  finances.history
    .filter((t) => t.type === 'expense')
    .forEach((t) => {
      expenseByCategory[t.category] = (expenseByCategory[t.category] || 0) + t.amount;
    });

  const chartColors = [
    '#86a15d',
    '#b09c71',
    '#d5cbb1',
    '#678242',
    '#3f5128',
    '#e29578',
    '#006d77',
    '#83c5be',
  ];

  let conicString = '';
  let currentPercentage = 0;
  if (totalExpense > 0) {
    Object.entries(expenseByCategory).forEach(([cat, val], index) => {
      const percent = (val / totalExpense) * 100;
      conicString += `${chartColors[index % chartColors.length]} ${currentPercentage}% ${
        currentPercentage + percent
      }%, `;
      currentPercentage += percent;
    });
    conicString = conicString.slice(0, -2);
  } else {
    conicString = '#f2efe7 0% 100%';
  }

  return (
    <div className="space-y-6 animate-fade-in max-w-6xl mx-auto pb-10">
      {/* Financial Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        <Card className="bg-olive-800 dark:bg-olive-900 border-none shadow-lg text-center md:text-right">
          <p className="text-olive-200 text-xs sm:text-sm mb-1 font-medium">الرصيد المالي الإجمالي</p>
          <h2 className="text-3xl md:text-5xl font-bold text-beige-50">
            {finances.balance.toLocaleString()} <span className="text-sm font-normal">رس</span>
          </h2>
        </Card>

        <Card className="border-green-200 dark:border-green-900/50 bg-green-50/50 dark:bg-green-950/20">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-green-100 dark:bg-green-900/50 flex items-center justify-center text-green-600 dark:text-green-400 text-xl">
              <i className="fa-solid fa-arrow-trend-up"></i>
            </div>
            <div>
              <p className="text-beige-600 dark:text-beige-400 text-xs">مجموع الدخل</p>
              <h3 className="text-2xl font-bold text-green-700 dark:text-green-400">
                +{totalIncome.toLocaleString()} <span className="text-xs font-normal">رس</span>
              </h3>
            </div>
          </div>
        </Card>

        <Card className="border-red-200 dark:border-red-900/50 bg-red-50/50 dark:bg-red-950/20">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-red-100 dark:bg-red-900/50 flex items-center justify-center text-red-600 dark:text-red-400 text-xl">
              <i className="fa-solid fa-arrow-trend-down"></i>
            </div>
            <div>
              <p className="text-beige-600 dark:text-beige-400 text-xs">مجموع المصروفات</p>
              <h3 className="text-2xl font-bold text-red-700 dark:text-red-400">
                -{totalExpense.toLocaleString()} <span className="text-xs font-normal">رس</span>
              </h3>
            </div>
          </div>
        </Card>
      </div>

      {/* Main Content Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Form & Chart */}
        <div className="lg:col-span-1 space-y-6">
          <Card title="تسجيل حركة مالية" icon="fa-solid fa-money-bill-transfer">
            <form onSubmit={addTransaction} className="space-y-4">
              <div className="flex bg-beige-100 dark:bg-dark-bg p-1 rounded-xl">
                <button
                  type="button"
                  onClick={() => {
                    setType('expense');
                    setCategory(categories.expense[0]);
                  }}
                  className={`flex-1 py-2 text-sm font-medium rounded-lg transition-all cursor-pointer ${
                    type === 'expense'
                      ? 'bg-white dark:bg-dark-surface shadow-xs text-red-600 font-bold'
                      : 'text-beige-600'
                  }`}
                >
                  مصروف (-)
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setType('income');
                    setCategory(categories.income[0]);
                  }}
                  className={`flex-1 py-2 text-sm font-medium rounded-lg transition-all cursor-pointer ${
                    type === 'income'
                      ? 'bg-white dark:bg-dark-surface shadow-xs text-green-600 font-bold'
                      : 'text-beige-600'
                  }`}
                >
                  دخل (+)
                </button>
              </div>

              <Input
                label="المبلغ (رس)"
                type="number"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="0.00"
                required
              />

              <Input
                label="البيان / الوصف"
                value={desc}
                onChange={(e) => setDesc(e.target.value)}
                placeholder="مثال: فاتورة كهرباء، مكافأة عمل..."
                required
              />

              <div>
                <label className="block text-sm text-olive-800 dark:text-beige-300 mb-1.5 font-medium">
                  التصنيف
                </label>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className="w-full bg-beige-50 dark:bg-dark-bg border border-beige-300 dark:border-dark-border text-dark dark:text-beige-50 rounded-xl px-4 py-2.5 text-sm focus:outline-none"
                >
                  {categories[type].map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
              </div>

              <Button type="submit" className="w-full" icon="fa-solid fa-check">
                حفظ الحركة المالية
              </Button>
            </form>
          </Card>

          {totalExpense > 0 && (
            <Card title="توزيع المصروفات" icon="fa-solid fa-chart-pie">
              <div className="flex justify-center mb-5">
                <div
                  className="pie-chart w-36 h-36 shadow-xs border-4 border-white dark:border-dark-surface"
                  style={{ background: `conic-gradient(${conicString})` }}
                ></div>
              </div>
              <div className="space-y-2">
                {Object.entries(expenseByCategory).map(([cat, val], i) => (
                  <div key={cat} className="flex justify-between text-xs items-center">
                    <div className="flex items-center gap-2">
                      <div
                        className="w-3 h-3 rounded-full flex-shrink-0"
                        style={{ backgroundColor: chartColors[i % chartColors.length] }}
                      ></div>
                      <span className="text-dark dark:text-beige-200">{cat}</span>
                    </div>
                    <span className="font-bold text-olive-900 dark:text-beige-50">
                      {val.toLocaleString()} رس (
                      {Math.round((val / totalExpense) * 100)}%)
                    </span>
                  </div>
                ))}
              </div>
            </Card>
          )}
        </div>

        {/* Right Column: Transactions History */}
        <div className="lg:col-span-2">
          <Card
            title="سجل المعاملات المالية"
            icon="fa-solid fa-receipt"
            action={
              <Button
                variant="secondary"
                size="sm"
                onClick={handleExportToSheets}
                loading={exportingSheet}
                icon="fa-solid fa-file-excel"
                title="تصدير السجل بالكامل إلى جدول بيانات Google Sheets حقيقي"
              >
                تصدير إلى Google Sheets
              </Button>
            }
          >
            <div className="space-y-3 max-h-[600px] overflow-y-auto pr-1">
              {finances.history.map((t) => (
                <div
                  key={t.id}
                  className="flex justify-between items-center p-3.5 border border-beige-200 dark:border-dark-border rounded-xl bg-white dark:bg-dark-surface hover:border-olive-300 dark:hover:border-olive-700 transition-all group"
                >
                  <div className="flex items-center gap-3.5">
                    <div
                      className={`w-11 h-11 rounded-xl flex items-center justify-center text-lg ${
                        t.type === 'income'
                          ? 'bg-green-50 dark:bg-green-950/40 text-green-600 dark:text-green-400'
                          : 'bg-red-50 dark:bg-red-950/40 text-red-600 dark:text-red-400'
                      }`}
                    >
                      <i
                        className={`fa-solid ${
                          t.type === 'income' ? 'fa-arrow-down' : 'fa-arrow-up'
                        }`}
                      ></i>
                    </div>
                    <div>
                      <p className="font-bold text-base text-dark dark:text-beige-50">{t.desc}</p>
                      <div className="flex gap-2 text-xs text-beige-500 mt-0.5">
                        <span>{formatDate(t.date)}</span>
                        <span>•</span>
                        <span>{t.category}</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex flex-col items-end gap-1">
                    <span
                      className={`font-bold text-base tabular-nums ${
                        t.type === 'income'
                          ? 'text-green-600 dark:text-green-400'
                          : 'text-dark dark:text-beige-50'
                      }`}
                    >
                      {t.type === 'income' ? '+' : '-'}
                      {t.amount.toLocaleString()} رس
                    </span>
                    <button
                      onClick={() => deleteTx(t.id, t.amount, t.type)}
                      className="text-beige-400 hover:text-red-500 text-xs transition-colors opacity-0 group-hover:opacity-100 cursor-pointer"
                    >
                      حذف
                    </button>
                  </div>
                </div>
              ))}

              {finances.history.length === 0 && (
                <div className="text-center text-beige-400 py-16">
                  <i className="fa-solid fa-coins text-4xl mb-3 opacity-40"></i>
                  <p className="font-serif text-lg">لا توجد حركات مالية مسجلة بعد.</p>
                </div>
              )}
            </div>
          </Card>
        </div>
      </div>

      {/* Feature: Savings Pots & Goals */}
      <Card title="صناديق الادخار والأهداف المالية" icon="fa-solid fa-piggy-bank">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <form onSubmit={addSavingsGoal} className="space-y-4">
            <h4 className="font-bold text-sm text-olive-800 dark:text-beige-300">
              إنشاء هدف ادخار جديد
            </h4>
            <Input
              label="اسم الهدف / الصندوق"
              value={newGoalTitle}
              onChange={(e) => setNewGoalTitle(e.target.value)}
              placeholder="مثال: شراء لابتوب، صندوق الطوارئ..."
              required
            />
            <Input
              label="المبلغ المستهدف (رس)"
              type="number"
              value={newGoalTarget}
              onChange={(e) => setNewGoalTarget(e.target.value)}
              placeholder="3000"
              required
            />
            <Button type="submit" icon="fa-solid fa-plus" className="w-full">
              إضافة الهدف
            </Button>
          </form>

          <div className="lg:col-span-2 grid grid-cols-1 sm:grid-cols-2 gap-4">
            {savingsGoals.map((g) => {
              const pct = Math.min(100, Math.round((g.current / g.target) * 100));
              return (
                <div
                  key={g.id}
                  className="p-4 rounded-2xl border border-beige-200 dark:border-dark-border bg-beige-50/40 dark:bg-dark-bg/40 flex flex-col justify-between"
                >
                  <div>
                    <div className="flex justify-between items-start mb-2">
                      <h5 className="font-bold text-dark dark:text-beige-50 text-base">{g.title}</h5>
                      <button
                        onClick={() => deleteGoal(g.id)}
                        className="text-beige-300 hover:text-red-500 text-xs cursor-pointer p-1"
                        title="حذف الهدف"
                      >
                        <i className="fa-solid fa-xmark"></i>
                      </button>
                    </div>

                    <div className="flex justify-between text-xs text-beige-600 dark:text-beige-400 mb-1.5">
                      <span>
                        تم ادخار {g.current.toLocaleString()} من {g.target.toLocaleString()} رس
                      </span>
                      <span className="font-bold text-olive-700 dark:text-olive-400">{pct}%</span>
                    </div>

                    <div className="w-full bg-beige-200 dark:bg-dark-border h-2.5 rounded-full overflow-hidden mb-3">
                      <div
                        className="bg-olive-600 h-full rounded-full transition-all duration-300"
                        style={{ width: `${pct}%` }}
                      ></div>
                    </div>
                  </div>

                  <div className="flex gap-2 pt-2 border-t border-beige-100 dark:border-dark-border/60">
                    <input
                      type="number"
                      placeholder="مبلغ الإيداع..."
                      value={depositAmount[g.id] || ''}
                      onChange={(e) => setDepositAmount({ ...depositAmount, [g.id]: e.target.value })}
                      className="flex-1 bg-white dark:bg-dark-surface border border-beige-300 dark:border-dark-border rounded-xl px-2.5 py-1 text-xs focus:outline-none"
                    />
                    <button
                      type="button"
                      onClick={() => handleDepositToGoal(g.id)}
                      className="px-3 py-1 bg-olive-700 text-white rounded-xl text-xs hover:bg-olive-800 cursor-pointer font-medium"
                    >
                      إيداع
                    </button>
                  </div>
                </div>
              );
            })}

            {savingsGoals.length === 0 && (
              <div className="sm:col-span-2 text-center py-8 text-beige-400">
                <p className="text-sm">لا توجد أهداف ادخار مسجلة بعد. حدد هدفك المالي الأول!</p>
              </div>
            )}
          </div>
        </div>
      </Card>
    </div>
  );
};
