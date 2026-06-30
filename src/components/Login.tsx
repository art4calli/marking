/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { AppScriptAPI } from '../utils/api';
import { TeacherUser } from '../types';
import { LogIn, User, ShieldAlert, Award, ArrowLeftRight } from 'lucide-react';

interface LoginProps {
  onLogin: (username: string) => void;
  scriptUrl: string;
  onOpenSettings: () => void;
}

export default function Login({ onLogin, scriptUrl, onOpenSettings }: LoginProps) {
  const [teachers, setTeachers] = useState<TeacherUser[]>([]);
  const [selectedTeacher, setSelectedTeacher] = useState<string>('');
  const [customTeacher, setCustomTeacher] = useState<string>('');
  const [useCustom, setUseCustom] = useState<boolean>(false);
  const [error, setError] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    async function fetchTeachers() {
      try {
        setLoading(true);
        const list = await AppScriptAPI.getUsers();
        setTeachers(list);
        if (list.length > 0) {
          setSelectedTeacher(list[0].username);
        }
      } catch (e) {
        console.error('Error fetching teachers:', e);
        setError('تعذر جلب قائمة المعلمين. يرجى التأكد من اتصال الإنترنت أو إعدادات الربط.');
      } finally {
        setLoading(false);
      }
    }
    fetchTeachers();
  }, [scriptUrl]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    const teacherName = useCustom ? customTeacher.trim() : selectedTeacher;

    if (!teacherName) {
      setError('يرجى اختيار أو كتابة اسم المعلم للدخول.');
      return;
    }

    // If selected from list, verify status
    const verifiedUser = teachers.find(t => t.username === teacherName);
    if (verifiedUser && verifiedUser.status === 'لا') {
      setError('عذراً، هذا الحساب محظور من دخول النظام حالياً.');
      return;
    }

    onLogin(teacherName);
  };

  return (
    <div id="login-container" className="min-h-screen flex items-center justify-center bg-gradient-to-br from-stone-900 via-stone-850 to-stone-950 px-4 py-12 relative overflow-hidden font-sans">
      {/* Decorative Arabic Calligraphy BG elements */}
      <div className="absolute top-10 right-10 w-96 h-96 bg-primary-500/5 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-10 left-10 w-96 h-96 bg-primary-600/5 rounded-full blur-3xl pointer-events-none" />

      <div id="login-card" className="max-w-md w-full bg-white/95 backdrop-blur-md rounded-2xl shadow-2xl border border-stone-200/50 p-8 relative z-10 transition-all duration-300 hover:shadow-primary-500/10">
        
        {/* App Logo & Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-primary-100 text-primary-600 mb-4 shadow-inner">
            <Award className="w-8 h-8" />
          </div>
          <h1 className="text-3xl font-extrabold text-stone-900 tracking-tight font-sans">بوابة تصحيح الدروس</h1>
          <p className="text-stone-500 mt-2 text-sm leading-relaxed">
            النظام الحديث لمراجعة وتقييم مشاركات الطلاب (الخط العربي وتلاوة القرآن الكريّم)
          </p>
        </div>

        {error && (
          <div id="login-error" className="mb-6 p-4 rounded-xl bg-red-50 border border-red-100 text-red-700 text-sm flex items-start gap-3">
            <ShieldAlert className="w-5 h-5 shrink-0 text-red-500 mt-0.5" />
            <p className="font-medium">{error}</p>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-2">
            <div className="flex justify-between items-center">
              <label className="block text-sm font-semibold text-stone-700">اختر حساب المعلم</label>
              <button
                type="button"
                onClick={() => setUseCustom(!useCustom)}
                className="text-xs text-primary-600 hover:text-primary-700 font-bold flex items-center gap-1 focus:outline-none"
              >
                <ArrowLeftRight className="w-3.5 h-3.5" />
                {useCustom ? 'اختر من القائمة' : 'كتابة اسم مخصص'}
              </button>
            </div>

            {useCustom ? (
              <div className="relative">
                <span className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none text-stone-400">
                  <User className="w-5 h-5" />
                </span>
                <input
                  type="text"
                  dir="rtl"
                  value={customTeacher}
                  onChange={(e) => setCustomTeacher(e.target.value)}
                  placeholder="اكتب اسمك الكامل هنا..."
                  className="block w-full pr-10 pl-3 py-3 border border-stone-300 rounded-xl shadow-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500 text-stone-850 text-base"
                />
              </div>
            ) : (
              <div className="relative">
                <span className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none text-stone-400">
                  <User className="w-5 h-5" />
                </span>
                {loading ? (
                  <div className="block w-full pr-10 pl-3 py-3 border border-stone-200 rounded-xl bg-stone-50 text-stone-500 text-sm">
                    جاري تحميل قائمة المعلمين...
                  </div>
                ) : (
                  <select
                    dir="rtl"
                    value={selectedTeacher}
                    onChange={(e) => setSelectedTeacher(e.target.value)}
                    className="block w-full pr-10 pl-3 py-3 border border-stone-300 rounded-xl shadow-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500 text-stone-850 text-base bg-white"
                  >
                    {teachers.map((teacher, index) => (
                      <option key={index} value={teacher.username}>
                        {teacher.username} {teacher.status === 'لا' ? '(محظور)' : ''}
                      </option>
                    ))}
                    {teachers.length === 0 && (
                      <option value="">لا يوجد معلمون مسجلون (وضع تجريبي متاح)</option>
                    )}
                  </select>
                )}
              </div>
            )}
          </div>

          <button
            type="submit"
            className="w-full flex justify-center items-center gap-2 py-3 px-4 border border-transparent rounded-xl shadow-md text-base font-bold text-stone-900 bg-primary-400 hover:bg-primary-500 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 transition-colors duration-200"
          >
            <LogIn className="w-5 h-5" />
            دخول للوحة التحكم
          </button>
        </form>

        <div className="mt-8 pt-6 border-t border-stone-100 text-center">
          <p className="text-xs text-stone-400">
            أو يمكنك ضبط إعدادات الربط المباشر مع قوقل شيت من هنا:
          </p>
          <button
            onClick={onOpenSettings}
            className="mt-2 text-sm text-stone-500 hover:text-primary-600 font-bold transition-colors"
          >
            إعدادات الربط بقوقل شيت (GAS Script Web App URL)
          </button>
        </div>

      </div>
    </div>
  );
}
