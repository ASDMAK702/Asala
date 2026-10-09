import { Finances, Habit, JournalEntry, Task, VisionGoal } from '@/src/types';

// Helper to handle API response and friendly error messages
async function handleResponse<T>(res: Response, serviceName: string): Promise<T> {
  if (!res.ok) {
    const errorBody = await res.text();
    let message = `فشل في الاتصال بخدمة ${serviceName} (${res.status})`;
    try {
      const parsed = JSON.parse(errorBody);
      if (parsed.error?.message) {
        message = `${serviceName}: ${parsed.error.message}`;
      }
    } catch {
      // use generic message
    }
    throw new Error(message);
  }
  return res.json() as Promise<T>;
}

/* =========================================================================
   1. GOOGLE DRIVE (النسخ الاحتياطي والاستعادة السحابية)
   ========================================================================= */

export async function backupToDrive(
  data: {
    tasks: Task[];
    habits: Habit[];
    journal: JournalEntry[];
    finances: Finances;
    vision: VisionGoal[];
    settings: any;
    waterGlasses?: number;
    exportedAt: string;
  },
  token: string
): Promise<{ fileId: string; name: string; webViewLink?: string; modifiedTime: string }> {
  // First, check if backup file already exists
  const searchUrl = `https://www.googleapis.com/drive/v3/files?q=name='asala_life_os_backup.json' and trashed=false&fields=files(id,name,webViewLink,modifiedTime)`;
  const searchRes = await fetch(searchUrl, {
    headers: { Authorization: `Bearer ${token}` },
  });
  const searchData = await handleResponse<{ files: Array<{ id: string; name: string; webViewLink?: string; modifiedTime: string }> }>(
    searchRes,
    'Google Drive'
  );

  const existingFile = searchData.files && searchData.files.length > 0 ? searchData.files[0] : null;

  const fileMetadata = {
    name: 'asala_life_os_backup.json',
    description: 'النسخة الاحتياطية السحابية الشاملة لتطبيق أصالة - Life OS',
    mimeType: 'application/json',
  };

  const boundary = '-------314159265358979323846';
  const delimiter = `\r\n--${boundary}\r\n`;
  const closeDelimiter = `\r\n--${boundary}--`;

  const multipartRequestBody =
    delimiter +
    'Content-Type: application/json; charset=UTF-8\r\n\r\n' +
    JSON.stringify(fileMetadata) +
    delimiter +
    'Content-Type: application/json; charset=UTF-8\r\n\r\n' +
    JSON.stringify(data, null, 2) +
    closeDelimiter;

  let uploadUrl = 'https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id,name,webViewLink,modifiedTime';
  let method = 'POST';

  if (existingFile) {
    uploadUrl = `https://www.googleapis.com/upload/drive/v3/files/${existingFile.id}?uploadType=multipart&fields=id,name,webViewLink,modifiedTime`;
    method = 'PATCH';
  }

  const uploadRes = await fetch(uploadUrl, {
    method,
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': `multipart/related; boundary=${boundary}`,
    },
    body: multipartRequestBody,
  });

  const uploadResult = await handleResponse<{
    id: string;
    name: string;
    webViewLink?: string;
    modifiedTime: string;
  }>(uploadRes, 'Google Drive');

  return {
    fileId: uploadResult.id,
    name: uploadResult.name,
    webViewLink: uploadResult.webViewLink || `https://drive.google.com/file/d/${uploadResult.id}/view`,
    modifiedTime: uploadResult.modifiedTime || new Date().toISOString(),
  };
}

export async function fetchDriveBackups(token: string): Promise<Array<{ id: string; name: string; modifiedTime: string; webViewLink?: string }>> {
  const url = `https://www.googleapis.com/drive/v3/files?q=name='asala_life_os_backup.json' and trashed=false&fields=files(id,name,modifiedTime,size,webViewLink)&orderBy=modifiedTime desc`;
  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${token}` },
  });
  const data = await handleResponse<{ files: Array<{ id: string; name: string; modifiedTime: string; webViewLink?: string }> }>(
    res,
    'Google Drive'
  );
  return data.files || [];
}

export async function restoreFromDrive(fileId: string, token: string): Promise<any> {
  const url = `https://www.googleapis.com/drive/v3/files/${fileId}?alt=media`;
  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) {
    throw new Error(`تعذر استرجاع ملف النسخة الاحتياطية (${res.status})`);
  }
  return res.json();
}

/* =========================================================================
   2. GOOGLE CALENDAR (مزامنة المهام والمواعيد والتركيز)
   ========================================================================= */

export async function addTaskToCalendar(
  task: Task,
  token: string
): Promise<{ eventId: string; htmlLink: string }> {
  const dateStr = task.dueDate || new Date().toISOString().split('T')[0];
  
  const eventBody = {
    summary: `[أصالة] ${task.title}`,
    description: `مهمة مسجلة في نظام أصالة\nالتصنيف: ${task.category}\nالأولوية: ${task.priority}\nالحالة: ${task.completed ? 'مكتملة' : 'قيد الإنجاز'}\n${
      task.subtasks?.length ? `الخطوات الفرعية:\n${task.subtasks.map((s) => `• ${s.title} (${s.completed ? 'منجز' : 'بانتظار'})`).join('\n')}` : ''
    }`,
    start: {
      date: dateStr,
    },
    end: {
      date: dateStr,
    },
    colorId: task.priority === 'عالية' ? '11' : task.priority === 'متوسطة' ? '5' : '2',
    reminders: {
      useDefault: true,
    },
  };

  const url = 'https://www.googleapis.com/calendar/v3/calendars/primary/events';
  const res = await fetch(url, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(eventBody),
  });

  const data = await handleResponse<{ id: string; htmlLink: string }>(res, 'Google Calendar');
  return {
    eventId: data.id,
    htmlLink: data.htmlLink,
  };
}

export async function addFocusSessionToCalendar(
  minutes: number,
  modeName: string,
  token: string
): Promise<{ eventId: string; htmlLink: string }> {
  const now = new Date();
  const startTime = new Date(now.getTime() - minutes * 60000);
  
  const eventBody = {
    summary: `[أصالة] ${modeName} (${minutes} دقيقة)`,
    description: `جلسة إنجاز وتركيز مسجلة عبر تطبيق أصالة\nالمدة: ${minutes} دقيقة\nالتاريخ: ${now.toLocaleDateString('ar-SA')}`,
    start: {
      dateTime: startTime.toISOString(),
    },
    end: {
      dateTime: now.toISOString(),
    },
    colorId: '9', // Blueberry / Focus
  };

  const url = 'https://www.googleapis.com/calendar/v3/calendars/primary/events';
  const res = await fetch(url, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(eventBody),
  });

  const data = await handleResponse<{ id: string; htmlLink: string }>(res, 'Google Calendar');
  return {
    eventId: data.id,
    htmlLink: data.htmlLink,
  };
}

/* =========================================================================
   3. GOOGLE SHEETS (تصدير المعاملات المالية والميزانية)
   ========================================================================= */

export async function exportFinancesToGoogleSheet(
  finances: Finances,
  token: string
): Promise<{ spreadsheetId: string; spreadsheetUrl: string }> {
  const title = `تقرير أصالة المالي - ${new Date().toLocaleDateString('ar-SA')}`;

  // Create empty spreadsheet
  const createRes = await fetch('https://sheets.googleapis.com/v4/spreadsheets', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      properties: {
        title,
        locale: 'ar_SA',
      },
      sheets: [
        {
          properties: {
            title: 'المعاملات المالية',
            rightToLeft: true,
          },
        },
      ],
    }),
  });

  const sheetData = await handleResponse<{ spreadsheetId: string; spreadsheetUrl: string }>(
    createRes,
    'Google Sheets'
  );
  const spreadsheetId = sheetData.spreadsheetId;

  // Prepare row data
  const headers = ['التاريخ', 'الوصف', 'النوع', 'التصنيف', 'المبلغ (رس)'];
  const rows = finances.history.map((tx) => [
    new Date(tx.date).toLocaleDateString('ar-SA'),
    tx.desc,
    tx.type === 'income' ? 'دخل (+)' : 'مصروف (-)',
    tx.category,
    tx.amount,
  ]);

  const totalIncome = finances.history
    .filter((t) => t.type === 'income')
    .reduce((sum, t) => sum + t.amount, 0);
  const totalExpense = finances.history
    .filter((t) => t.type === 'expense')
    .reduce((sum, t) => sum + t.amount, 0);

  const summaryRows = [
    ['', '', '', '', ''],
    ['ملخص الحساب:', '', '', '', ''],
    ['إجمالي الدخل', '', '', '', totalIncome],
    ['إجمالي المصروفات', '', '', '', totalExpense],
    ['الرصيد المتبقي', '', '', '', finances.balance],
  ];

  const allRows = [headers, ...rows, ...summaryRows];

  // Update sheet values
  const updateUrl = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/المعاملات المالية!A1?valueInputOption=USER_ENTERED`;
  const updateRes = await fetch(updateUrl, {
    method: 'PUT',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      range: 'المعاملات المالية!A1',
      majorDimension: 'ROWS',
      values: allRows,
    }),
  });

  await handleResponse(updateRes, 'Google Sheets');

  return {
    spreadsheetId,
    spreadsheetUrl: sheetData.spreadsheetUrl || `https://docs.google.com/spreadsheets/d/${spreadsheetId}/edit`,
  };
}

/* =========================================================================
   4. GOOGLE DOCS (تصدير تدوينات اليوميات ورؤية العام)
   ========================================================================= */

export async function exportJournalToGoogleDoc(
  entries: JournalEntry[],
  token: string,
  singleEntryId?: string
): Promise<{ documentId: string; documentUrl: string }> {
  const filtered = singleEntryId ? entries.filter((e) => e.id === singleEntryId) : entries;
  const title = singleEntryId
    ? `تدوينة أصالة - ${new Date().toLocaleDateString('ar-SA')}`
    : `مساحة البوح - سجل يوميات أصالة الكامل (${new Date().toLocaleDateString('ar-SA')})`;

  // 1. Create document
  const createRes = await fetch('https://docs.googleapis.com/v1/documents', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ title }),
  });

  const docData = await handleResponse<{ documentId: string }>(createRes, 'Google Docs');
  const documentId = docData.documentId;

  // 2. Prepare text content
  let content = `نظام أصالة | مساحة البوح والتأملات\nتاريخ التصدير: ${new Date().toLocaleDateString('ar-SA', { dateStyle: 'full' })}\n\n`;
  content += '══════════════════════════════════════════════════\n\n';

  filtered.forEach((entry, idx) => {
    content += `التدوينة رقم ${idx + 1} — ${new Date(entry.date).toLocaleDateString('ar-SA', { dateStyle: 'full' })}\n`;
    content += `الحالة الشعورية: ${entry.mood} | عدد الكلمات: ${entry.wordCount}\n\n`;
    content += `${entry.text}\n\n`;
    content += '──────────────────────────────────────────────────\n\n';
  });

  // 3. Batch insert text
  const updateUrl = `https://docs.googleapis.com/v1/documents/${documentId}:batchUpdate`;
  const updateRes = await fetch(updateUrl, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      requests: [
        {
          insertText: {
            location: { index: 1 },
            text: content,
          },
        },
      ],
    }),
  });

  await handleResponse(updateRes, 'Google Docs');

  return {
    documentId,
    documentUrl: `https://docs.google.com/document/d/${documentId}/edit`,
  };
}

export async function exportVisionToGoogleDoc(
  visionGoals: VisionGoal[],
  token: string,
  year: number = new Date().getFullYear()
): Promise<{ documentId: string; documentUrl: string }> {
  const title = `رؤية عام ${year} والأهداف الكبرى - أصالة`;

  // Create document
  const createRes = await fetch('https://docs.googleapis.com/v1/documents', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ title }),
  });

  const docData = await handleResponse<{ documentId: string }>(createRes, 'Google Docs');
  const documentId = docData.documentId;

  let content = `وثيقة رؤية عام ${year} والأهداف الكبرى\nنظام أصالة المتكامل لإدارة الحياة\nتاريخ الإنشاء: ${new Date().toLocaleDateString('ar-SA', { dateStyle: 'full' })}\n\n`;
  content += '══════════════════════════════════════════════════\n\n';

  const categories = ['شخصي', 'مهني', 'مالي', 'صحي', 'علمي'];
  categories.forEach((cat) => {
    const goals = visionGoals.filter((g) => g.category === cat);
    content += `【 مجال: ${cat} 】\n`;
    if (goals.length === 0) {
      content += '  (لا توجد أهداف مسجلة بعد)\n\n';
    } else {
      goals.forEach((g) => {
        content += `  [${g.completed ? '✔ تم الإنجاز' : '○ قيد العمل'}] ${g.text}\n`;
      });
      content += '\n';
    }
  });

  const totalGoals = visionGoals.length;
  const completedGoals = visionGoals.filter((g) => g.completed).length;
  const percentage = totalGoals > 0 ? Math.round((completedGoals / totalGoals) * 100) : 0;
  content += `──────────────────────────────────────────────────\n`;
  content += `معدل إنجاز الرؤية الكلية: ${percentage}% (${completedGoals} من ${totalGoals} أهداف منجزة)\n`;

  const updateUrl = `https://docs.googleapis.com/v1/documents/${documentId}:batchUpdate`;
  const updateRes = await fetch(updateUrl, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      requests: [
        {
          insertText: {
            location: { index: 1 },
            text: content,
          },
        },
      ],
    }),
  });

  await handleResponse(updateRes, 'Google Docs');

  return {
    documentId,
    documentUrl: `https://docs.google.com/document/d/${documentId}/edit`,
  };
}
