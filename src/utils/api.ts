/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { StudentLesson, PredefinedText, WatermarkSettings, TeacherUser, SavedCorrectionData } from '../types';

// Key for local storage settings
const SCRIPT_URL_KEY = 'lesson_correction_script_url';

export function getScriptUrl(): string {
  return localStorage.getItem(SCRIPT_URL_KEY) || '';
}

export function setScriptUrl(url: string) {
  if (url) {
    localStorage.setItem(SCRIPT_URL_KEY, url);
  } else {
    localStorage.removeItem(SCRIPT_URL_KEY);
  }
}

// Default realistic mock data for testing inside the sandbox
const INITIAL_STUDENTS: StudentLesson[] = [
  {
    studentId: '1001',
    studentName: 'أحمد بن علي',
    lessonNumber: '1',
    imageSubmissionCount: 2,
    imageFileId: 'mock-img-1',
    imageMimeType: 'image/jpeg',
    audioSubmissionCount: 0,
    audioFileId: null,
    audioMimeType: null,
    additionalT: 'مبتدئ',
    additionalU: 'خط الرقعة',
    additionalV: 'حرف الألف والباء',
    additionalW: 'ممتاز',
    additionalX: '2026-06-28',
    additionalY: 'سليمان الخطاط',
    row: 2,
    isSaved: false,
  },
  {
    studentId: '1002',
    studentName: 'سارة العتيبي',
    lessonNumber: '1',
    imageSubmissionCount: 0,
    imageFileId: null,
    imageMimeType: null,
    audioSubmissionCount: 1,
    audioFileId: 'mock-audio-1',
    audioMimeType: 'audio/mpeg',
    additionalT: 'متوسط',
    additionalU: 'مخارج الحروف',
    additionalV: 'سورة الفاتحة',
    additionalW: 'جيد جداً',
    additionalX: '2026-06-29',
    additionalY: 'المعلمة مريم',
    row: 3,
    isSaved: false,
  },
  {
    studentId: '1003',
    studentName: 'محمد الشمراني',
    lessonNumber: '2',
    imageSubmissionCount: 3,
    imageFileId: 'mock-img-2',
    imageMimeType: 'image/jpeg',
    audioSubmissionCount: 0,
    audioFileId: null,
    audioMimeType: null,
    additionalT: 'مبتدئ',
    additionalU: 'خط النسخ',
    additionalV: 'الجملة الأولى',
    additionalW: 'يحتاج تحسين',
    additionalX: '2026-06-29',
    additionalY: 'سليمان الخطاط',
    row: 4,
    isSaved: true,
  },
  {
    studentId: '1004',
    studentName: 'فاطمة الزهراني',
    lessonNumber: '3',
    imageSubmissionCount: 1,
    imageFileId: 'mock-img-3',
    imageMimeType: 'image/png',
    audioSubmissionCount: 1,
    audioFileId: 'mock-audio-2',
    audioMimeType: 'audio/mpeg',
    additionalT: 'متقدم',
    additionalU: 'خط الثلث',
    additionalV: 'البسملة كاملة',
    additionalW: 'قيد المراجعة',
    additionalX: '2026-06-29',
    additionalY: 'سليمان الخطاط',
    row: 5,
    isSaved: false,
  },
  {
    studentId: '1005',
    studentName: 'خالد عبد الله',
    lessonNumber: '2',
    imageSubmissionCount: 0,
    imageFileId: null,
    imageMimeType: null,
    audioSubmissionCount: 2,
    audioFileId: 'mock-audio-3',
    audioMimeType: 'audio/wav',
    additionalT: 'مبتدئ',
    additionalU: 'تجويد',
    additionalV: 'أحكام النون الساكنة',
    additionalW: 'جيد',
    additionalX: '2026-06-29',
    additionalY: 'الشيخ عبد الرحمن',
    row: 6,
    isSaved: false,
  }
];

const PREDEFINED_TEXTS: PredefinedText[] = [
  { title: 'ثناء ممتاز', phrase: 'ما شاء الله! كتابة رائعة جداً، أبدعت في ضبط موازين الحروف والمسافات.' },
  { title: 'تنبيه لسطر الكتابة', phrase: 'انتبه لخط القاعدة (السطر)، بعض الحروف هبطت أكثر من المعتاد.' },
  { title: 'ميلان الحروف', phrase: 'أحسنت! حاول ضبط زاوية ميلان الحروف لتكون متناسقة ومتوازية.' },
  { title: 'تلاوة ممتازة', phrase: 'قراءة خاشعة وتطبيق سليم لأحكام التجويد ومخارج الحروف، بارك الله فيك.' },
  { title: 'ملاحظة الغنة', phrase: 'قراءة جيدة، يرجى التركيز أكثر على إعطاء الغنة حقها بمقدار حركتين.' }
];

const WATERMARK_SETTINGS: WatermarkSettings = {
  logoUrl: 'https://images.unsplash.com/photo-1579783902614-a3fb3927b6a5?q=80&w=200&auto=format&fit=crop',
  opacity: 0.6,
  sizeFactor: 0.5,
  logoPosition: 'bottom-right',
  textPrefix: 'مدرسة الخط العربي والقرآن الكريّم - مصحح:',
  fontSize: 24,
  textPosition: 'bottom-left'
};

const TEACHERS: TeacherUser[] = [
  { username: 'سليمان الخطاط', status: 'نعم' },
  { username: 'الشيخ عبد الرحمن', status: 'نعم' },
  { username: 'المعلمة مريم', status: 'نعم' },
  { username: 'مستخدم محظور', status: 'لا' }
];

// Load from local storage or defaults
function loadData<T>(key: string, defaultValue: T): T {
  const saved = localStorage.getItem(key);
  if (saved) {
    try {
      return JSON.parse(saved) as T;
    } catch (e) {
      return defaultValue;
    }
  }
  return defaultValue;
}

function saveData<T>(key: string, data: T) {
  localStorage.setItem(key, JSON.stringify(data));
}

export class AppScriptAPI {
  // Check if we should use real API or Mock
  static isConfigured(): boolean {
    return getScriptUrl().trim() !== '';
  }

  // Helper to execute Google Apps Script web app requests (mocked or real)
  private static async request(action: string, params: Record<string, any> = {}): Promise<any> {
    const url = getScriptUrl();
    if (!url) {
      throw new Error('لم يتم تهيئة رابط Google Apps Script بعد.');
    }

    const queryParams = new URLSearchParams({ action, ...params });
    const response = await fetch(`${url}?${queryParams.toString()}`, {
      method: 'GET',
      mode: 'cors'
    });
    return response.json();
  }

  // 1. Get profile and contact data
  static async getData(): Promise<{ profile: string[][]; contact: string[][] }> {
    if (!this.isConfigured()) {
      return {
        profile: [
          ['الشعار', 'مدرسة الخط العربي والقرآن', 'https://images.unsplash.com/photo-1561070791-26c113006238?q=80&w=600&auto=format&fit=crop'],
          ['الوصف', 'لوحة التصحيح الذكية التفاعلية لتطوير مهارات الطلاب']
        ],
        contact: [
          ['https://facebook.com', 'https://instagram.com', 'https://youtube.com', 'https://line.me']
        ]
      };
    }
    // Real AppScript could fetch via doGet parameter
    return this.request('getData');
  }

  // 2. Get students table data
  static async getTableData(): Promise<StudentLesson[]> {
    if (!this.isConfigured()) {
      return loadData<StudentLesson[]>('lessons_data', INITIAL_STUDENTS);
    }
    // For real Apps Script, it responds with tableData
    return this.request('getTableData');
  }

  // 3. Get predefined feedback phrases
  static async getPredefinedTexts(): Promise<PredefinedText[]> {
    if (!this.isConfigured()) {
      return loadData<PredefinedText[]>('predefined_texts', PREDEFINED_TEXTS);
    }
    return this.request('getPredefinedTexts');
  }

  // 4. Get sticker URLs
  static async getStickerUrls(): Promise<string[]> {
    if (!this.isConfigured()) {
      return [
        'https://images.unsplash.com/photo-1599687351724-dfa3c4ff81b1?q=80&w=150&auto=format&fit=crop', // A nice badge
        'https://images.unsplash.com/photo-1594744803329-e58b31de215f?q=80&w=150&auto=format&fit=crop', // Star badge
        'https://images.unsplash.com/photo-1579783900882-c0d3dad7b119?q=80&w=150&auto=format&fit=crop', // Award sticker
      ];
    }
    return this.request('getStickerUrls');
  }

  // 5. Get watermark settings
  static async getWatermarkSettings(): Promise<WatermarkSettings> {
    if (!this.isConfigured()) {
      return WATERMARK_SETTINGS;
    }
    return this.request('getWatermarkSettings');
  }

  // 6. Get teachers list
  static async getUsers(): Promise<TeacherUser[]> {
    if (!this.isConfigured()) {
      return TEACHERS;
    }
    return this.request('getUsers');
  }

  // 7. Get saved correction details for specific row
  static async getSavedData(row: number): Promise<SavedCorrectionData> {
    if (!this.isConfigured()) {
      const savedCorrections = loadData<Record<number, SavedCorrectionData>>('saved_corrections', {});
      return savedCorrections[row] || {
        notes: '',
        imageGrade: '',
        modifiedImage: null,
        audioGrade: '',
        additionalImage: null,
        video: null,
        audio: null
      };
    }
    return this.request('getSavedData', { row });
  }

  // 7b. Convert Drive file to Base64 (or mock fallback)
  static async getMediaAsBase64(fileId: string): Promise<string> {
    if (!this.isConfigured()) {
      return this.getMockAsset(fileId) || 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=';
    }
    return this.request('getMediaAsBase64', { fileId });
  }

  // 8. Save all correction media & update sheet row
  static async saveAllMedia(
    canvasBase64: string | null,
    canvasFilename: string,
    imageBase64: string | null,
    imageFilename: string,
    videoBase64: string | null,
    videoFilename: string,
    audioBase64: string | null,
    audioFilename: string,
    row: number,
    notes: string,
    imageGrade: string,
    audioGrade: string
  ): Promise<{ modified?: string; image?: string; video?: string; audio?: string }> {
    if (!this.isConfigured()) {
      // Simulate saving in local storage
      const lessons = loadData<StudentLesson[]>('lessons_data', INITIAL_STUDENTS);
      const index = lessons.findIndex(l => l.row === row);
      if (index !== -1) {
        lessons[index].isSaved = true;
        lessons[index].imageSubmissionCount += (canvasBase64 ? 1 : 0);
        saveData('lessons_data', lessons);
      }

      const savedCorrections = loadData<Record<number, SavedCorrectionData>>('saved_corrections', {});
      savedCorrections[row] = {
        notes,
        imageGrade,
        modifiedImage: canvasBase64,
        audioGrade,
        additionalImage: imageBase64,
        video: videoBase64,
        audio: audioBase64
      };
      saveData('saved_corrections', savedCorrections);

      // Return simulated file links
      return {
        modified: canvasBase64 || undefined,
        image: imageBase64 || undefined,
        video: videoBase64 || undefined,
        audio: audioBase64 || undefined
      };
    }

    // In a real deployed server or Apps Script, we'd send via POST (or CORS GET with big payload if needed)
    // Here we simulate the AppScript webapp call or direct API if they integrated it
    const payload = {
      action: 'saveAllMedia',
      canvasBase64,
      canvasFilename,
      imageBase64,
      imageFilename,
      videoBase64,
      videoFilename,
      audioBase64,
      audioFilename,
      row,
      notes,
      imageGrade,
      audioGrade
    };

    const url = getScriptUrl();
    const response = await fetch(url, {
      method: 'POST',
      body: JSON.stringify(payload),
      headers: {
        'Content-Type': 'text/plain;charset=utf-8', // Apps script accepts POST easily with text/plain to bypass complex pre-flights
      }
    });
    return response.json();
  }

  // Mock Assets helper (to return nice sample images/audios for testing canvas/audio features)
  static getMockAsset(assetId: string): string {
    const assets: Record<string, string> = {
      'mock-img-1': 'https://images.unsplash.com/photo-1561344640-2453889cda5b?q=80&w=800&auto=format&fit=crop', // Nice calligraphy stroke
      'mock-img-2': 'https://images.unsplash.com/photo-1544816155-12df9643f363?q=80&w=800&auto=format&fit=crop', // Writing sheet
      'mock-img-3': 'https://images.unsplash.com/photo-1506784983877-45594efa4cbe?q=80&w=800&auto=format&fit=crop', // Blueprint sheet
      'mock-audio-1': 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3', // Audio player test
      'mock-audio-2': 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-2.mp3',
      'mock-audio-3': 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-3.mp3'
    };
    return assets[assetId] || '';
  }
}
