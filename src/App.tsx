/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { getScriptUrl, setScriptUrl, AppScriptAPI } from './utils/api';
import { StudentLesson } from './types';
import Login from './components/Login';
import Dashboard from './components/Dashboard';
import ImageCorrector from './components/ImageCorrector';
import AudioCorrector from './components/AudioCorrector';
import { Settings, X, HelpCircle, Save, Database, Award, CheckCircle2 } from 'lucide-react';

export default function App() {
  const [teacherName, setTeacherName] = useState<string | null>(null);
  const [currentView, setCurrentView] = useState<'login' | 'dashboard' | 'image' | 'audio'>('login');
  const [selectedLesson, setSelectedLesson] = useState<StudentLesson | null>(null);
  const [scriptUrl, setScriptUrlState] = useState<string>('');
  const [showSettings, setShowSettings] = useState<boolean>(false);
  const [savedSuccess, setSavedSuccess] = useState<boolean>(false);

  useEffect(() => {
    // Restore session and URL state on startup
    const savedTeacher = localStorage.getItem('logged_in_teacher');
    if (savedTeacher) {
      setTeacherName(savedTeacher);
      setCurrentView('dashboard');
    }
    setScriptUrlState(getScriptUrl());
  }, []);

  const handleLogin = (name: string) => {
    setTeacherName(name);
    localStorage.setItem('logged_in_teacher', name);
    setCurrentView('dashboard');
  };

  const handleLogout = () => {
    setTeacherName(null);
    localStorage.removeItem('logged_in_teacher');
    setCurrentView('login');
  };

  const handleSaveSettings = (e: React.FormEvent) => {
    e.preventDefault();
    setScriptUrl(scriptUrl);
    setSavedSuccess(true);
    setTimeout(() => {
      setSavedSuccess(false);
      setShowSettings(false);
    }, 1500);
  };

  return (
    <div id="app-root" className="min-h-screen bg-stone-50 select-none antialiased">
      
      {/* Route-like coordinating view wrapper */}
      {currentView === 'login' && (
        <Login
          onLogin={handleLogin}
          scriptUrl={scriptUrl}
          onOpenSettings={() => setShowSettings(true)}
        />
      )}

      {currentView === 'dashboard' && teacherName && (
        <Dashboard
          teacherName={teacherName}
          scriptUrl={scriptUrl}
          onLogout={handleLogout}
          onOpenSettings={() => setShowSettings(true)}
          onSelectImageLesson={(lesson) => {
            setSelectedLesson(lesson);
            setCurrentView('image');
          }}
          onSelectAudioLesson={(lesson) => {
            setSelectedLesson(lesson);
            setCurrentView('audio');
          }}
        />
      )}

      {currentView === 'image' && selectedLesson && teacherName && (
        <ImageCorrector
          lesson={selectedLesson}
          teacherName={teacherName}
          scriptUrl={scriptUrl}
          onBack={() => {
            setSelectedLesson(null);
            setCurrentView('dashboard');
          }}
        />
      )}

      {currentView === 'audio' && selectedLesson && teacherName && (
        <AudioCorrector
          lesson={selectedLesson}
          teacherName={teacherName}
          scriptUrl={scriptUrl}
          onBack={() => {
            setSelectedLesson(null);
            setCurrentView('dashboard');
          }}
        />
      )}

      {/* Modern, clean Settings and Integration Help Modal */}
      {showSettings && (
        <div id="settings-modal" className="fixed inset-0 bg-stone-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl max-w-2xl w-full shadow-2xl border border-stone-100 overflow-hidden text-right" dir="rtl">
            
            {/* Modal Header */}
            <div className="px-6 py-4 bg-stone-950 text-white flex justify-between items-center">
              <div className="flex items-center gap-2">
                <Database className="w-5 h-5 text-primary-400" />
                <h3 className="font-bold text-lg">إعدادات ربط قوقل شيت (مجانياً بالكامل)</h3>
              </div>
              <button
                onClick={() => setShowSettings(false)}
                className="p-1.5 rounded-lg hover:bg-stone-800 text-stone-400 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 space-y-6">
              
              {/* Informative Help Guide */}
              <div className="bg-amber-50/50 border border-amber-100 p-4 rounded-xl space-y-3">
                <h4 className="font-bold text-sm text-amber-800 flex items-center gap-1.5">
                  <HelpCircle className="w-4 h-4 text-amber-600" />
                  <span>كيف تربط هذا الموقع الجديد بجدول بيانات قوقل شيت؟</span>
                </h4>
                <ol className="list-decimal list-inside text-xs text-amber-900/80 space-y-2 leading-relaxed">
                  <li>افتح ملف قوقل شيت (الجدول الرئيسي لدروس الطلاب).</li>
                  <li>من القائمة العلوية اختر <b>Extensions (البرمجيات)</b> ثم <b>Apps Script</b>.</li>
                  <li>انسخ كود البرمجيات الحالي الخاص بك (Code.gs) والصقه هناك.</li>
                  <li>انقر على زر <b>Deploy (نشر)</b> في الزاوية العلوية، ثم اختر <b>New Deployment (نشر جديد)</b>.</li>
                  <li>اختر النوع: <b>Web App (تطبيق ويب)</b>.</li>
                  <li>اضبط الصلاحيات كالتالي:
                    <ul className="list-disc list-inside mr-6 mt-1 text-stone-500 font-semibold space-y-0.5">
                      <li>Execute as (تشغيل باسم): <b>Me (حسابك)</b></li>
                      <li>Who has access (من لديه صلاحية الوصول): <b>Anyone (أي شخص)</b></li>
                    </ul>
                  </li>
                  <li>اضغط <b>Deploy</b>، وانسخ رابط الويب المتولد (Web App URL) والصقه في الحقل أدناه!</li>
                </ol>
              </div>

              {/* URL Form Input */}
              <form onSubmit={handleSaveSettings} className="space-y-4">
                <div className="space-y-1.5">
                  <label className="block text-xs font-bold text-stone-500">رابط ويب قوقل أب سكريبت (Apps Script Web App URL)</label>
                  <input
                    type="url"
                    value={scriptUrl}
                    onChange={(e) => setScriptUrlState(e.target.value)}
                    placeholder="https://script.google.com/macros/s/.../exec"
                    className="block w-full px-4 py-3 border border-stone-200 rounded-xl shadow-inner focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500 text-stone-800 text-sm font-mono"
                  />
                  <p className="text-[11px] text-stone-400">
                    * في حال ترك هذا الحقل فارغاً، سيعمل الموقع تلقائياً في <b>الوضع التجريبي المحاكي (Mock Mode)</b>، لتجربة صبورة الرسم والتسجيل الصوتي بدقة وببيانات حقيقية كاملة دون تفعيل قوقل شيت.
                  </p>
                </div>

                {savedSuccess && (
                  <div className="p-3 bg-green-50 border border-green-100 rounded-xl text-green-700 text-xs font-bold flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4" />
                    <span>تم حفظ الرابط وتحديث الاتصال بنجاح!</span>
                  </div>
                )}

                <button
                  type="submit"
                  className="w-full py-3 bg-primary-400 hover:bg-primary-500 text-stone-900 font-extrabold text-sm rounded-xl flex items-center justify-center gap-2 shadow-md cursor-pointer transition-colors"
                >
                  <Save className="w-4 h-4" />
                  <span>حفظ وتحديث الاتصال</span>
                </button>
              </form>

              {/* Free hosting clarification */}
              <div className="pt-4 border-t border-stone-100 text-[11px] text-stone-400 leading-relaxed">
                <b>ملاحظة بخصوص الاستضافة المجانية:</b> بما أن صفحتك تعتمد بالكامل على متصفح المدرس وترسل البيانات مباشرة لقوقل شيت، يمكنك رفع هذا الكود على <b>GitHub Pages</b> مجاناً بنسبة 100%، ولن تحتاج لأي استضافة مدفوعة أو قواعد بيانات خارجية معقدة. كما أن المشروع <b>لا يعتمد على ذكاء جيميناي</b> في التشغيل، ولن تترتب عليك أي تكاليف استخدام لاحقاً.
              </div>

            </div>

          </div>
        </div>
      )}

    </div>
  );
}
