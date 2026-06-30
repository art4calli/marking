/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { StudentLesson } from '../types';
import { AppScriptAPI } from '../utils/api';
import { 
  Search, CheckCircle2, AlertCircle, FileText, Image as ImageIcon, Volume2, 
  HelpCircle, LogOut, Settings, Award, Users, BookOpen, ChevronLeft
} from 'lucide-react';

interface DashboardProps {
  teacherName: string;
  onLogout: () => void;
  onOpenSettings: () => void;
  onSelectImageLesson: (lesson: StudentLesson) => void;
  onSelectAudioLesson: (lesson: StudentLesson) => void;
  scriptUrl: string;
}

export default function Dashboard({
  teacherName,
  onLogout,
  onOpenSettings,
  onSelectImageLesson,
  onSelectAudioLesson,
  scriptUrl
}: DashboardProps) {
  const [lessons, setLessons] = useState<StudentLesson[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'pending' | 'corrected'>('all');
  const [typeFilter, setTypeFilter] = useState<'all' | 'image' | 'audio'>('all');

  useEffect(() => {
    async function fetchLessons() {
      try {
        setLoading(true);
        const data = await AppScriptAPI.getTableData();
        setLessons(data);
      } catch (e) {
        console.error('Error fetching lessons:', e);
      } finally {
        setLoading(false);
      }
    }
    fetchLessons();
  }, [scriptUrl]);

  // Calculations for stats
  const totalCount = lessons.length;
  const correctedCount = lessons.filter(l => l.isSaved).length;
  const pendingCount = totalCount - correctedCount;
  const imageCount = lessons.filter(l => l.imageFileId).length;
  const audioCount = lessons.filter(l => l.audioFileId).length;

  const filteredLessons = lessons.filter(item => {
    const matchesSearch = 
      item.studentId.toString().toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.studentName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (item.additionalU && item.additionalU.toLowerCase().includes(searchTerm.toLowerCase())) ||
      item.lessonNumber.toString().includes(searchTerm);

    const matchesStatus = 
      statusFilter === 'all' || 
      (statusFilter === 'corrected' && item.isSaved) || 
      (statusFilter === 'pending' && !item.isSaved);

    const matchesType = 
      typeFilter === 'all' || 
      (typeFilter === 'image' && item.imageFileId) || 
      (typeFilter === 'audio' && item.audioFileId);

    return matchesSearch && matchesStatus && matchesType;
  });

  return (
    <div id="dashboard-container" className="min-h-screen bg-stone-50 text-stone-900 pb-16 font-sans">
      
      {/* Header bar */}
      <header className="bg-stone-900 text-stone-100 border-b border-stone-800 shadow-xl sticky top-0 z-30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex flex-col sm:flex-row justify-between items-center gap-4">
          
          <div className="flex items-center gap-3">
            <div className="bg-primary-500 text-stone-900 p-2 rounded-xl shadow-md">
              <Award className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-xl font-bold tracking-wide">مدرسة الخط العربي والقرآن</h1>
              <p className="text-xs text-stone-400">مرحباً بك، الأستاذ: {teacherName}</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={onOpenSettings}
              className="p-2.5 rounded-xl bg-stone-850 hover:bg-stone-800 border border-stone-800 hover:border-stone-700 transition-all text-stone-300 flex items-center gap-1 text-sm font-semibold cursor-pointer"
              title="إعدادات الربط"
            >
              <Settings className="w-4 h-4" />
              <span>إعدادات الشيت</span>
            </button>
            <button
              onClick={onLogout}
              className="p-2.5 rounded-xl bg-red-950/40 hover:bg-red-950/60 border border-red-900/40 hover:border-red-900/60 text-red-400 transition-all flex items-center gap-1 text-sm font-semibold cursor-pointer"
            >
              <LogOut className="w-4 h-4" />
              <span>خروج</span>
            </button>
          </div>

        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
        
        {/* Banner with Stats */}
        <div id="stats-grid" className="grid grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
          
          <div className="bg-white p-5 rounded-2xl shadow-sm border border-stone-200/60 flex items-center justify-between transition-transform duration-200 hover:-translate-y-1">
            <div className="space-y-1">
              <span className="text-xs font-semibold text-stone-400">إجمالي المشاركات</span>
              <p className="text-3xl font-black text-stone-900 font-mono">{totalCount}</p>
            </div>
            <div className="p-3 bg-stone-100 rounded-xl text-stone-600">
              <Users className="w-6 h-6" />
            </div>
          </div>

          <div className="bg-white p-5 rounded-2xl shadow-sm border border-stone-200/60 flex items-center justify-between transition-transform duration-200 hover:-translate-y-1">
            <div className="space-y-1">
              <span className="text-xs font-semibold text-stone-400">بانتظار التصحيح</span>
              <p className="text-3xl font-black text-amber-600 font-mono">{pendingCount}</p>
            </div>
            <div className="p-3 bg-amber-50 rounded-xl text-amber-600">
              <AlertCircle className="w-6 h-6" />
            </div>
          </div>

          <div className="bg-white p-5 rounded-2xl shadow-sm border border-stone-200/60 flex items-center justify-between transition-transform duration-200 hover:-translate-y-1">
            <div className="space-y-1">
              <span className="text-xs font-semibold text-stone-400">تم تصحيحها</span>
              <p className="text-3xl font-black text-green-600 font-mono">{correctedCount}</p>
            </div>
            <div className="p-3 bg-green-50 rounded-xl text-green-600">
              <CheckCircle2 className="w-6 h-6" />
            </div>
          </div>

          <div className="bg-white p-5 rounded-2xl shadow-sm border border-stone-200/60 flex items-center justify-between transition-transform duration-200 hover:-translate-y-1">
            <div className="space-y-1">
              <span className="text-xs font-semibold text-stone-400">صوتية / صور</span>
              <p className="text-2xl font-black text-stone-900 font-mono">
                <span className="text-blue-600">{audioCount}</span>
                <span className="text-stone-300 mx-1">/</span>
                <span className="text-purple-600">{imageCount}</span>
              </p>
            </div>
            <div className="p-3 bg-stone-100 rounded-xl text-stone-600">
              <BookOpen className="w-6 h-6" />
            </div>
          </div>

        </div>

        {/* Filter and Search Bar */}
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-stone-200/60 flex flex-col md:flex-row justify-between items-center gap-4">
          
          <div className="relative w-full md:max-w-md">
            <span className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none text-stone-400">
              <Search className="w-5 h-5" />
            </span>
            <input
              type="text"
              dir="rtl"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="ابحث برقم الطالب، الاسم، أو اسم الدرس..."
              className="block w-full pr-10 pl-3 py-3 border border-stone-200 rounded-xl shadow-inner focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500 text-stone-850 text-sm bg-stone-50/50"
            />
          </div>

          <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
            
            {/* Type filter */}
            <div className="flex bg-stone-100 p-1 rounded-xl w-full sm:w-auto">
              <button
                onClick={() => setTypeFilter('all')}
                className={`flex-1 sm:flex-none px-4 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer ${typeFilter === 'all' ? 'bg-white shadow-sm text-stone-900' : 'text-stone-500 hover:text-stone-900'}`}
              >
                كل الدروس
              </button>
              <button
                onClick={() => setTypeFilter('image')}
                className={`flex-1 sm:flex-none px-4 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer ${typeFilter === 'image' ? 'bg-white shadow-sm text-purple-700' : 'text-stone-500 hover:text-stone-900'}`}
              >
                دروس الصور
              </button>
              <button
                onClick={() => setTypeFilter('audio')}
                className={`flex-1 sm:flex-none px-4 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer ${typeFilter === 'audio' ? 'bg-white shadow-sm text-blue-700' : 'text-stone-500 hover:text-stone-900'}`}
              >
                دروس الصوت
              </button>
            </div>

            {/* Status filter */}
            <div className="flex bg-stone-100 p-1 rounded-xl w-full sm:w-auto">
              <button
                onClick={() => setStatusFilter('all')}
                className={`flex-1 sm:flex-none px-4 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer ${statusFilter === 'all' ? 'bg-white shadow-sm text-stone-900' : 'text-stone-500 hover:text-stone-900'}`}
              >
                الكل
              </button>
              <button
                onClick={() => setStatusFilter('pending')}
                className={`flex-1 sm:flex-none px-4 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer ${statusFilter === 'pending' ? 'bg-white shadow-sm text-amber-700' : 'text-stone-500 hover:text-stone-900'}`}
              >
                غير المصحح
              </button>
              <button
                onClick={() => setStatusFilter('corrected')}
                className={`flex-1 sm:flex-none px-4 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer ${statusFilter === 'corrected' ? 'bg-white shadow-sm text-green-700' : 'text-stone-500 hover:text-stone-900'}`}
              >
                المصحح
              </button>
            </div>

          </div>

        </div>

        {/* Lessons List Grid */}
        {loading ? (
          <div className="text-center py-20 bg-white rounded-2xl border border-stone-200/60 shadow-sm space-y-3">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-4 border-primary-500 border-t-transparent" />
            <p className="text-stone-500 font-bold text-sm">جاري تحميل مشاركات الطلاب من الشيت...</p>
          </div>
        ) : filteredLessons.length === 0 ? (
          <div className="text-center py-20 bg-white rounded-2xl border border-stone-200/60 shadow-sm space-y-3">
            <HelpCircle className="w-12 h-12 text-stone-300 mx-auto" />
            <p className="text-stone-500 font-bold text-base">لا توجد مشاركات مطابقة لخيارات البحث الحالية</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredLessons.map((lesson) => {
              const isAudio = !!lesson.audioFileId;
              const isImage = !!lesson.imageFileId;

              return (
                <div
                  key={lesson.row}
                  className={`bg-white rounded-2xl border transition-all duration-300 overflow-hidden flex flex-col h-full ${
                    lesson.isSaved 
                      ? 'border-green-100 shadow-sm hover:shadow-green-100/40 hover:-translate-y-0.5' 
                      : 'border-stone-200/60 shadow-md hover:shadow-lg hover:-translate-y-1'
                  }`}
                >
                  {/* Card top banner status */}
                  <div className={`px-4 py-2 flex justify-between items-center text-xs font-bold ${
                    lesson.isSaved 
                      ? 'bg-green-50/50 text-green-700' 
                      : 'bg-amber-50/50 text-amber-700'
                  }`}>
                    <span className="flex items-center gap-1.5">
                      {lesson.isSaved ? (
                        <>
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          <span>تم حفظ التصحيح</span>
                        </>
                      ) : (
                        <>
                          <AlertCircle className="w-3.5 h-3.5 animate-pulse" />
                          <span>بانتظار التصحيح</span>
                        </>
                      )}
                    </span>
                    <span className="text-stone-400 font-mono">صف {lesson.row}</span>
                  </div>

                  {/* Body Info */}
                  <div className="p-6 flex-1 space-y-4">
                    <div className="space-y-1">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-primary-600 bg-primary-50 px-2 py-0.5 rounded-md">رقم الطالب: #{lesson.studentId}</span>
                        {isImage && (
                          <span className="inline-flex items-center gap-1 text-xs text-purple-600 bg-purple-50 px-2.5 py-1 rounded-full font-bold">
                            <ImageIcon className="w-3 h-3" />
                            صورة
                          </span>
                        )}
                        {isAudio && (
                          <span className="inline-flex items-center gap-1 text-xs text-blue-600 bg-blue-50 px-2.5 py-1 rounded-full font-bold">
                            <Volume2 className="w-3 h-3" />
                            صوت
                          </span>
                        )}
                      </div>
                      <h3 className="text-lg font-bold text-stone-900 pt-1 leading-snug">{lesson.studentName}</h3>
                    </div>

                    <div className="grid grid-cols-2 gap-3 pt-2 text-xs border-t border-stone-100">
                      <div>
                        <span className="text-stone-400 block">نوع الدرس</span>
                        <span className="font-bold text-stone-700 block mt-0.5">{lesson.additionalU || 'عام'}</span>
                      </div>
                      <div>
                        <span className="text-stone-400 block">عنوان الدرس</span>
                        <span className="font-bold text-stone-700 block mt-0.5 truncate" title={lesson.additionalV || ''}>
                          {lesson.additionalV || `درس رقم ${lesson.lessonNumber}`}
                        </span>
                      </div>
                      <div>
                        <span className="text-stone-400 block">مرات الإرسال</span>
                        <span className="font-mono font-bold text-stone-700 block mt-0.5">
                          {isImage ? lesson.imageSubmissionCount : lesson.audioSubmissionCount} مرات
                        </span>
                      </div>
                      <div>
                        <span className="text-stone-400 block">المستوى الحالي</span>
                        <span className="font-bold text-stone-700 block mt-0.5">{lesson.additionalT || 'مبتدئ'}</span>
                      </div>
                    </div>
                  </div>

                  {/* Bottom Action Button */}
                  <div className="p-4 bg-stone-50 border-t border-stone-100 flex items-center gap-2">
                    {isImage && (
                      <button
                        onClick={() => onSelectImageLesson(lesson)}
                        className="w-full py-2.5 px-4 rounded-xl text-sm font-bold bg-purple-600 hover:bg-purple-700 text-white flex items-center justify-center gap-1.5 shadow-md cursor-pointer transition-colors"
                      >
                        <ImageIcon className="w-4 h-4" />
                        <span>فتح صبورة الرسم والتصحيح</span>
                        <ChevronLeft className="w-4 h-4 mr-auto" />
                      </button>
                    )}
                    {isAudio && (
                      <button
                        onClick={() => onSelectAudioLesson(lesson)}
                        className="w-full py-2.5 px-4 rounded-xl text-sm font-bold bg-blue-600 hover:bg-blue-700 text-white flex items-center justify-center gap-1.5 shadow-md cursor-pointer transition-colors"
                      >
                        <Volume2 className="w-4 h-4" />
                        <span>الاستماع والرد الصوتي</span>
                        <ChevronLeft className="w-4 h-4 mr-auto" />
                      </button>
                    )}
                  </div>

                </div>
              );
            })}
          </div>
        )}

      </main>
    </div>
  );
}
