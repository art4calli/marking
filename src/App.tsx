/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect } from 'react';
import { StudentItem, WatermarkSettings } from './types';
import { MOCK_STUDENT_DATA, DEFAULT_WATERMARK } from './mockData';
import Header from './components/Header';
import StudentTable from './components/StudentTable';
import Whiteboard from './components/Whiteboard';
import AudioLesson from './components/AudioLesson';
import LoginModal from './components/LoginModal';
import { 
  Users, CheckCircle2, Clock, BookOpen, AlertCircle, Info, Flame 
} from 'lucide-react';

export default function App() {
  // Authentication & Configuration States
  const [activeTeacher, setActiveTeacher] = useState<string | null>(null);
  // رابط Google Apps Script Web App المعتمد الخاص بك لربط التطبيق تلقائياً بقوقل شيت عند رفعه على GitHub Pages
  const DEFAULT_APPS_SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbwwYeXuyEasDAYYVsK5qkRb08Eph2fjxN6JDZbhy7D9sJB9wBY_ea0o8FwDakuhx8RNgg/exec';

  const [apiURL, setApiURL] = useState<string>(DEFAULT_APPS_SCRIPT_URL);
  const [students, setStudents] = useState<StudentItem[]>(MOCK_STUDENT_DATA);
  const [watermarkSettings, setWatermarkSettings] = useState<WatermarkSettings>(DEFAULT_WATERMARK);
  
  // Navigation States
  const [selectedStudent, setSelectedStudent] = useState<StudentItem | null>(null);
  const [activeLessonMode, setActiveLessonMode] = useState<'image' | 'audio' | null>(null);

  // Loading & error handling
  const [loading, setLoading] = useState(false);
  const [errorNotice, setErrorNotice] = useState('');

  // 1. Initial Load: Auth session, API URL config, and local data sync
  useEffect(() => {
    // Check if deviceId is stored, if not generate one
    if (!localStorage.getItem('deviceId')) {
      const devId = 'device_' + Math.random().toString(36).substring(2, 11);
      localStorage.setItem('deviceId', devId);
    }

    const savedTeacher = localStorage.getItem('loggedInUser');
    if (savedTeacher) {
      setActiveTeacher(savedTeacher);
    }

    const savedApiURL = localStorage.getItem('googleSheetsApiURL');
    if (savedApiURL !== null) {
      setApiURL(savedApiURL);
    } else {
      setApiURL(DEFAULT_APPS_SCRIPT_URL);
    }

    // Sync students from localStorage if they have done mock edits
    const savedStudents = localStorage.getItem('calligraphyStudentsProgress');
    if (savedStudents) {
      try {
        setStudents(JSON.parse(savedStudents));
      } catch (e) {
        setStudents(MOCK_STUDENT_DATA);
      }
    }
  }, []);

  // 2. Fetch live data when connected to Google Sheets Apps Script API URL
  useEffect(() => {
    if (apiURL && activeTeacher) {
      refreshData();
    }
  }, [apiURL, activeTeacher]);

  const refreshData = async () => {
    if (!apiURL) return;
    setLoading(true);
    setErrorNotice('');
    try {
      // 1. Fetch live student table
      const resTable = await fetch(`${apiURL}?action=getTableData`);
      if (!resTable.ok) throw new Error('فشل الاستجابة من الخادم');
      const tableData = await resTable.json();
      
      if (Array.isArray(tableData)) {
        setStudents(tableData);
        localStorage.setItem('calligraphyStudentsProgress', JSON.stringify(tableData));
      }

      // 2. Fetch custom watermark settings from Google Sheets Settings tab
      const resWatermark = await fetch(`${apiURL}?action=getWatermarkSettings`);
      if (resWatermark.ok) {
        const markData = await resWatermark.json();
        if (markData && !markData.error) {
          setWatermarkSettings(markData);
        }
      }
    } catch (err: any) {
      console.error('Failed to fetch from real API', err);
      setErrorNotice('تعذر الاتصال ببوابة قوقل شيت الحالية. تأكد من صحة الرابط ومنحه صلاحية الوصول (Anyone). تم تفعيل نمط المحاكاة التفاعلية مؤقتاً.');
    } finally {
      setLoading(false);
    }
  };

  const handleLoginSuccess = (teacherName: string) => {
    setActiveTeacher(teacherName);
  };

  const handleLogout = () => {
    if (window.confirm('هل تريد تسجيل الخروج وإنهاء جلسة المصحح الحالية؟')) {
      localStorage.removeItem('loggedInUser');
      setActiveTeacher(null);
      setSelectedStudent(null);
      setActiveLessonMode(null);
    }
  };

  const handleUpdateApiURL = (url: string) => {
    localStorage.setItem('googleSheetsApiURL', url);
    setApiURL(url);
    if (!url) {
      // Revert to default mock data if connection cleared
      setStudents(MOCK_STUDENT_DATA);
      localStorage.setItem('calligraphyStudentsProgress', JSON.stringify(MOCK_STUDENT_DATA));
      setWatermarkSettings(DEFAULT_WATERMARK);
      setErrorNotice('');
    }
  };

  // Sync corrections saved from whiteboard or audio panels
  const handleSaveCorrectionSuccess = (updatedStudent: StudentItem) => {
    const updatedList = students.map(s => 
      s.studentId === updatedStudent.studentId && s.lessonNumber === updatedStudent.lessonNumber
        ? updatedStudent
        : s
    );
    setStudents(updatedList);
    localStorage.setItem('calligraphyStudentsProgress', JSON.stringify(updatedList));

    // Return to main dashboard list
    setSelectedStudent(null);
    setActiveLessonMode(null);
  };

  // Stats calculation
  const totalSubmissions = students.length;
  const pendingCorrections = students.filter(s => !s.isSaved).length;
  const completedCorrections = students.filter(s => s.isSaved).length;

  return (
    <div className="min-h-screen bg-[#FDFBF7] flex flex-col font-sans" style={{ direction: 'rtl' }}>
      
      {/* 1. School Header Top Bar */}
      <Header 
        teacherName={activeTeacher || ''} 
        onLogout={handleLogout}
        apiURL={apiURL}
        onUpdateApiURL={handleUpdateApiURL}
        isLoading={loading}
        onRefresh={refreshData}
      />

      {/* 2. Main Dashboard & Workspace Frame */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 md:p-8 space-y-6">
        
        {/* Connection Notice banner */}
        {errorNotice && (
          <div className="p-4 bg-amber-50 border border-amber-200 text-amber-800 rounded-2xl flex items-center gap-3 text-xs font-bold shadow-sm">
            <AlertCircle size={18} className="shrink-0 text-amber-600 animate-bounce" />
            <span>{errorNotice}</span>
          </div>
        )}

        {/* If Not Logged In, Render School Secure Portal Login Panel */}
        {!activeTeacher ? (
          <LoginModal 
            onLoginSuccess={handleLoginSuccess} 
            apiURL={apiURL}
          />
        ) : selectedStudent && activeLessonMode ? (
          
          /* 3. Render active grading workspace (Whiteboard for images, Audio player for audio lessons) */
          activeLessonMode === 'image' ? (
            <Whiteboard 
              student={selectedStudent} 
              teacherName={activeTeacher} 
              watermarkSettings={watermarkSettings}
              apiURL={apiURL}
              onBack={() => { setSelectedStudent(null); setActiveLessonMode(null); }}
              onSaveSuccess={handleSaveCorrectionSuccess}
            />
          ) : (
            <AudioLesson 
              student={selectedStudent} 
              teacherName={activeTeacher} 
              apiURL={apiURL}
              onBack={() => { setSelectedStudent(null); setActiveLessonMode(null); }}
              onSaveSuccess={handleSaveCorrectionSuccess}
            />
          )

        ) : (

          /* 4. Main Teacher Dashboard landing view (stats cards + list of students homework) */
          <div className="space-y-6">
            
            {/* Quick stats grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
              
              {/* Card total */}
              <div className="bg-white border border-gray-100 rounded-2xl shadow-sm p-5 flex items-center gap-4 text-right">
                <div className="w-12 h-12 bg-gray-50 border text-gray-700 flex items-center justify-center rounded-xl shrink-0">
                  <Users size={22} />
                </div>
                <div>
                  <div className="text-[11px] text-gray-400 font-bold">إجمالي كراسات الطلاب</div>
                  <div className="text-2xl font-black text-gray-900 mt-1">{totalSubmissions} طالب</div>
                </div>
              </div>

              {/* Card pending */}
              <div className="bg-white border border-gray-100 rounded-2xl shadow-sm p-5 flex items-center gap-4 text-right">
                <div className="w-12 h-12 bg-amber-50 border border-amber-100 text-amber-600 flex items-center justify-center rounded-xl shrink-0">
                  <Clock size={22} />
                </div>
                <div>
                  <div className="text-[11px] text-amber-600 font-bold">بانتظار التصحيح المباشر</div>
                  <div className="text-2xl font-black text-amber-700 mt-1">{pendingCorrections} كراسة</div>
                </div>
              </div>

              {/* Card completed */}
              <div className="bg-white border border-gray-100 rounded-2xl shadow-sm p-5 flex items-center gap-4 text-right">
                <div className="w-12 h-12 bg-emerald-50 border border-emerald-100 text-[#198754] flex items-center justify-center rounded-xl shrink-0">
                  <CheckCircle2 size={22} />
                </div>
                <div>
                  <div className="text-[11px] text-[#198754] font-bold">تم حفظها وتوثيقها بالكامل</div>
                  <div className="text-2xl font-black text-emerald-800 mt-1">{completedCorrections} واجب</div>
                </div>
              </div>

              {/* Card active teacher sessions */}
              <div className="bg-white border border-gray-100 rounded-2xl shadow-sm p-5 flex items-center gap-4 text-right">
                <div className="w-12 h-12 bg-blue-50 border border-blue-100 text-blue-600 flex items-center justify-center rounded-xl shrink-0">
                  <BookOpen size={22} />
                </div>
                <div>
                  <div className="text-[11px] text-blue-600 font-bold">الحلقات التعليمية النشطة</div>
                  <div className="text-2xl font-black text-blue-800 mt-1">4 حلقات</div>
                </div>
              </div>

            </div>

            {/* Submissions list */}
            <div className="space-y-4">
              <div className="flex justify-between items-center px-1">
                <div>
                  <h2 className="text-lg font-extrabold text-gray-900">سجل استلام واجبات الطلاب</h2>
                  <p className="text-xs text-gray-400 mt-0.5">انقر على "بدء التصحيح" لفتح كراسة الطالب أو ملف الاستماع</p>
                </div>
                {apiURL ? (
                  <span className="text-[10px] text-emerald-600 bg-emerald-100/40 px-3 py-1 rounded-full font-bold">
                    أنت متصل بالجدول الحي
                  </span>
                ) : (
                  <span className="text-[10px] text-amber-600 bg-amber-50 px-3 py-1 rounded-full font-bold animate-pulse">
                    وضع تجريبي تفاعلي كامل
                  </span>
                )}
              </div>

              {/* Student table component */}
              <StudentTable 
                students={students} 
                onSelectStudent={(student, mode) => {
                  setSelectedStudent(student);
                  setActiveLessonMode(mode);
                }}
                onEditSaved={(student, mode) => {
                  setSelectedStudent(student);
                  setActiveLessonMode(mode);
                }}
              />
            </div>

            {/* Decorative Tips info */}
            <div className="bg-[#198754]/5 border border-[#198754]/10 rounded-2xl p-5 flex items-start gap-4 text-xs text-gray-600">
              <Info size={18} className="text-[#198754] shrink-0 mt-0.5" />
              <div className="space-y-1 leading-relaxed">
                <div className="font-bold text-gray-900">نظام تصحيح الخط العربي والقرآن الحديث:</div>
                <p>مرحباً بك يا فضيلة المعلم في البوابة الذكية للمدرسة. تحتوي هذه اللوحة على أدوات رسم متطورة صُممت خصيصاً بمقاييس هندسية مشطوفة لمحاكاة قلم الخط العربي التقليدي (قصبة الخط)، لمساعدتك في توضيح زوايا الحروف وسمك السطور بدقة متناهية. لحفظ عملك، يرجى ملء درجة السطر وإرفاق أي ميديا شرح تلاها ثم النقر على زر الحفظ لربطها فوراً بجدولك.</p>
              </div>
            </div>

          </div>
        )}
      </main>

      {/* 5. Minimal footer */}
      <footer className="py-6 border-t border-gray-100 text-center text-xs text-gray-400 font-medium">
        <span>© 2026 مدرسة الخط العربي والقرآن الكريم التفاعلية. جميع الحقوق محفوظة مجاناً للمعلمين.</span>
      </footer>
    </div>
  );
}
