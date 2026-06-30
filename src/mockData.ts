/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { StudentItem, TeacherUser, PredefinedText, WatermarkSettings } from './types';

// Mock student submissions
export const MOCK_STUDENT_DATA: StudentItem[] = [
  {
    studentId: "1001",
    studentName: "عبد الله أحمد الودعاني",
    lessonNumber: "1",
    imageSubmissionCount: 2,
    imageFileId: "mock_image_1",
    imageMimeType: "image/jpeg",
    audioSubmissionCount: 0,
    audioFileId: null,
    audioMimeType: null,
    additionalT: "النسخ",
    additionalU: "ممتاز",
    additionalV: "مكتمل",
    additionalW: "مقرر الفصل الأول",
    additionalX: "الدرس الثاني",
    additionalY: "حلقة عاصم بن أبي النجود",
    row: 2,
    isSaved: false
  },
  {
    studentId: "1002",
    studentName: "سليمان يوسف الخالدي",
    lessonNumber: "2",
    imageSubmissionCount: 1,
    imageFileId: "mock_image_2",
    imageMimeType: "image/jpeg",
    audioSubmissionCount: 0,
    audioFileId: null,
    audioMimeType: null,
    additionalT: "الرقعة",
    additionalU: "جيد جداً",
    additionalV: "مستمر",
    additionalW: "مقرر الخط العربي",
    additionalX: "الحروف الصاعدة",
    additionalY: "حلقة ابن البواب",
    row: 3,
    isSaved: false
  },
  {
    studentId: "1003",
    studentName: "عمر فاروق الشمري",
    lessonNumber: "3",
    imageSubmissionCount: 0,
    imageFileId: null,
    imageMimeType: null,
    audioSubmissionCount: 3,
    audioFileId: "mock_audio_1",
    audioMimeType: "audio/mpeg",
    additionalT: "التجويد والقرآن",
    additionalU: "يحتاج لمراجعة الغنة",
    additionalV: "مستمر",
    additionalW: "جزء عم",
    additionalX: "سورة النبأ",
    additionalY: "حلقة حفص بن سليمان",
    row: 4,
    isSaved: false
  },
  {
    studentId: "1004",
    studentName: "خالد سعيد الغامدي",
    lessonNumber: "1",
    imageSubmissionCount: 3,
    imageFileId: "mock_image_3",
    imageMimeType: "image/png",
    audioSubmissionCount: 0,
    audioFileId: null,
    audioMimeType: null,
    additionalT: "الديواني",
    additionalU: "مستوى متقدم",
    additionalV: "مكتمل",
    additionalW: "جماليات الخط العربي",
    additionalX: "تراكيب البسملة",
    additionalY: "حلقة ياقوت المستعصمي",
    row: 5,
    isSaved: true,
    notes: "رسم رائع للحروف واتزان في الميل والسطر. ممتاز يا خالد!",
    imageGrade: "95",
  },
  {
    studentId: "1005",
    studentName: "عبد الرحمن فيصل العتيبي",
    lessonNumber: "4",
    imageSubmissionCount: 0,
    imageFileId: null,
    imageMimeType: null,
    audioSubmissionCount: 1,
    audioFileId: "mock_audio_2",
    audioMimeType: "audio/mp3",
    additionalT: "الحفظ والتلاوة",
    additionalU: "مستوى رائع",
    additionalV: "مكتمل",
    additionalW: "سورة الملك",
    additionalX: "الآيات 1-10",
    additionalY: "حلقة قالون عن نافع",
    row: 6,
    isSaved: false
  }
];

// Mock teachers / school users
export const MOCK_TEACHERS: TeacherUser[] = [
  {
    username: "الأستاذ سليمان الخطاط",
    password: "123",
    status: "نعم",
    allowedDevices: 3,
    devices: [
      { deviceId: "dev-1", location: "الرياض، المملكة العربية السعودية" }
    ]
  },
  {
    username: "الأستاذ عبد الرحمن المقرئ",
    password: "456",
    status: "نعم",
    allowedDevices: 2,
    devices: []
  },
  {
    username: "الأستاذ علي بن مسعود",
    password: "abc",
    status: "لا", // Banned
    allowedDevices: 1,
    devices: []
  }
];

// Predefined feedback phrases
export const MOCK_PREDEFINED_TEXTS: PredefinedText[] = [
  { title: "تشجيعي: ممتاز وخط رائع", phrase: "ممتاز جداً! خط رائع وقواعد منضبطة.\nاستمر وبانتظار تمرينك القادم." },
  { title: "تشجيعي: أحسنت كتابة مميزة", phrase: "أحسنت كتابة مميزة تظهر شغفك.\nانتبه فقط لميزان الحروف." },
  { title: "تعديل: انتبه للسطر والارتفاع", phrase: "محاولة جيدة، لكن يرجى الانتباه للسطر\nوعدم النزول إلا في الحروف الهابطة المحددة." },
  { title: "تعديل: أعد كتابة التمرين", phrase: "الكتابة تحتاج لتركيز ومراعاة للنسب.\nيرجى إعادة التمرين مع مراجعة الشرح الفيديوي." },
  { title: "قرآن: تلاوة خاشعة ممتازة", phrase: "ما شاء الله! تلاوة خاشعة منضبطة بأحكام التجويد.\nفتح الله عليك وزادك توفيقاً." },
  { title: "قرآن: تنبيه لحكم الغنة", phrase: "تلاوة طيبة ومباركة.\nيرجى الانتباه لزمن الغنة في النون والميم المشددتين." }
];

// Predefined sticker seals (Base64 SVG golden calligraphy seals)
export const MOCK_STICKERS = [
  {
    id: "sticker_excellent",
    name: "ختم ممتاز (ذهبي)",
    // Custom golden circular calligraphy seal
    base64: `data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="100" height="100" viewBox="0 0 100 100">
      <circle cx="50" cy="50" r="46" fill="none" stroke="%23D4A017" stroke-width="3" stroke-dasharray="1 1"/>
      <circle cx="50" cy="50" r="42" fill="none" stroke="%23D4A017" stroke-width="2"/>
      <circle cx="50" cy="50" r="38" fill="%23FFFDF9" stroke="%23D4A017" stroke-width="1"/>
      <text x="50" y="46" font-family="Amiri, Georgia, serif" font-size="13" font-weight="bold" fill="%23D4A017" text-anchor="middle">مُـمْـتَـاز</text>
      <text x="50" y="62" font-family="Amiri, Georgia, serif" font-size="10" fill="%23198754" text-anchor="middle">الأستاذ سليمان</text>
      <circle cx="50" cy="50" r="2" fill="%23D4A017"/>
      <path d="M 30 50 Q 50 35 70 50" fill="none" stroke="%23D4A017" stroke-width="1" stroke-dasharray="2 2"/>
      <path d="M 30 50 Q 50 65 70 50" fill="none" stroke="%23D4A017" stroke-width="1" stroke-dasharray="2 2"/>
    </svg>`
  },
  {
    id: "sticker_creative",
    name: "ختم مبدع (زمردي)",
    base64: `data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="100" height="100" viewBox="0 0 100 100">
      <rect x="8" y="8" width="84" height="84" rx="10" fill="%23F4FAF6" stroke="%23198754" stroke-width="2"/>
      <rect x="12" y="12" width="76" height="76" rx="8" fill="none" stroke="%23198754" stroke-width="1" stroke-dasharray="4 2"/>
      <text x="50" y="48" font-family="Amiri, Georgia, serif" font-size="14" font-weight="bold" fill="%23198754" text-anchor="middle">مُـبْـدِع</text>
      <text x="50" y="64" font-family="Amiri, Georgia, serif" font-size="8" fill="%23D4A017" text-anchor="middle">وسام التميز</text>
      <path d="M 25 25 L 35 25 L 35 35" fill="none" stroke="%23198754" stroke-width="1.5"/>
      <path d="M 75 25 L 65 25 L 65 35" fill="none" stroke="%23198754" stroke-width="1.5"/>
      <path d="M 25 75 L 35 75 L 35 65" fill="none" stroke="%23198754" stroke-width="1.5"/>
      <path d="M 75 75 L 65 75 L 65 65" fill="none" stroke="%23198754" stroke-width="1.5"/>
    </svg>`
  },
  {
    id: "sticker_good",
    name: "ختم حسن جداً (ياقوتي)",
    base64: `data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="100" height="100" viewBox="0 0 100 100">
      <polygon points="50,5 95,50 50,95 5,50" fill="%23FFFDFD" stroke="%23DC3545" stroke-width="2"/>
      <polygon points="50,11 89,50 50,89 11,50" fill="none" stroke="%23DC3545" stroke-width="1" stroke-dasharray="3 3"/>
      <text x="50" y="46" font-family="Amiri, Georgia, serif" font-size="11" font-weight="bold" fill="%23DC3545" text-anchor="middle">حَسَنٌ جِدّاً</text>
      <text x="50" y="60" font-family="Amiri, Georgia, serif" font-size="8" fill="%23D4A017" text-anchor="middle">ثابر واجتهد</text>
    </svg>`
  }
];

// Default Watermark Settings
export const DEFAULT_WATERMARK: WatermarkSettings = {
  logoUrl: "https://example.com/logo.png",
  opacity: 0.6,
  sizeFactor: 0.8,
  logoPosition: 'top-right',
  textPrefix: "مدرسة الخط العربي والقرآن - تصحيح المعلم",
  fontSize: 16,
  textPosition: 'bottom-left'
};

// Generates a mock calligraphy image dynamically inside a Canvas to serve as the student's submission!
// This makes the Simulator incredibly high-fidelity and fully offline-capable without relying on external hotlinks.
export function generateMockCalligraphy(seed: string): string {
  const canvas = document.createElement('canvas');
  canvas.width = 1000;
  canvas.height = 750;
  const ctx = canvas.getContext('2d')!;

  // Drawing paper background texture
  ctx.fillStyle = "#FAF6EE"; // Creamy vintage paper
  ctx.fillRect(0, 0, 1000, 750);

  // Decorative border
  ctx.strokeStyle = "#8C6239";
  ctx.lineWidth = 4;
  ctx.strokeRect(20, 20, 960, 710);
  ctx.strokeStyle = "#8C6239";
  ctx.lineWidth = 1;
  ctx.strokeRect(26, 26, 948, 698);

  // Draw some guide lines (سطور)
  ctx.strokeStyle = "rgba(140, 98, 57, 0.15)";
  ctx.lineWidth = 2;
  const sLines = [220, 370, 520, 670];
  sLines.forEach(y => {
    ctx.beginPath();
    ctx.moveTo(40, y);
    ctx.lineTo(960, y);
    ctx.stroke();
  });

  // Calligraphy text
  ctx.fillStyle = "#1E1E1E"; // Charcoal ink
  ctx.font = "italic 44px 'Amiri', Georgia, serif";
  ctx.direction = "rtl";
  ctx.textAlign = "center";

  if (seed.includes("1")) {
    ctx.fillText("بِسْمِ اللَّهِ الرَّحْمَنِ الرَّحِيمِ", 500, 180);
    ctx.font = "32px 'Amiri', serif";
    ctx.fillText("كتابة الطالب: عبد الله الودعاني - خط النسخ - ميزان النقط", 500, 330);
    // Draw some calligraphy guide marks (نقاط خط النسخ)
    ctx.fillStyle = "#B22222"; // Red ink for guide marks
    ctx.font = "bold 24px 'Amiri', serif";
    ctx.fillText("♦♦♦", 500, 410);
    ctx.fillText("♦♦♦♦", 500, 480);
  } else if (seed.includes("2")) {
    ctx.fillText("رَبِّ يَسِّرْ وَلَا تُعَسِّرْ وَتَمِّمْ بِالْخَيْرِ", 500, 180);
    ctx.font = "32px 'Amiri', serif";
    ctx.fillText("كتابة الطالب: سليمان الخالدي - خط الرقعة - الميل والارتكاز", 500, 330);
    ctx.fillStyle = "#B22222";
    ctx.font = "bold 24px 'Amiri', serif";
    ctx.fillText("♦♦", 460, 410);
    ctx.fillText("♦♦", 540, 410);
  } else if (seed.includes("3")) {
    ctx.fillText("نْ وَالْقَلَمِ وَمَا يَسْطُرُونَ", 500, 180);
    ctx.font = "32px 'Amiri', serif";
    ctx.fillText("كتابة الطالب: خالد الغامدي - تراكيب خط الثلث", 500, 330);
    ctx.fillStyle = "#B22222";
    ctx.font = "bold 24px 'Amiri', serif";
    ctx.fillText("♦♦♦♦♦", 500, 430);
  } else {
    ctx.fillText("الْحَمْدُ لِلَّهِ رَبِّ الْعَالَمِينَ", 500, 180);
    ctx.font = "32px 'Amiri', serif";
    ctx.fillText("تمرين عام في الخط العربي وقواعد السطر", 500, 330);
  }

  // Draw some subtle ink splashes or sketch elements
  ctx.strokeStyle = "rgba(30, 30, 30, 0.4)";
  ctx.lineWidth = 3;
  ctx.beginPath();
  // Simulated student's letter writing
  ctx.moveTo(350, 490);
  ctx.quadraticCurveTo(400, 520, 450, 490);
  ctx.quadraticCurveTo(500, 460, 550, 500);
  ctx.stroke();

  return canvas.toDataURL('image/jpeg', 0.9);
}
