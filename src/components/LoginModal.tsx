/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { MOCK_TEACHERS } from '../mockData';
import { TeacherUser } from '../types';
import { Shield, Lock, User, MapPin, Smartphone, AlertTriangle } from 'lucide-react';

interface LoginModalProps {
  onLoginSuccess: (username: string) => void;
  apiURL: string;
}

export default function LoginModal({ onLoginSuccess, apiURL }: LoginModalProps) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username.trim() || !password.trim()) {
      setError('يرجى إدخال اسم المستخدم وكلمة المرور');
      return;
    }

    setLoading(true);
    setError('');

    // If a real API URL is set, we can simulate connecting or perform a real fetch request!
    if (apiURL && apiURL.startsWith('http')) {
      try {
        const response = await fetch(apiURL, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            action: 'loginUser',
            username,
            password,
            deviceId: localStorage.getItem('deviceId') || 'web-browser',
            lat: 24.7136, // Riyadh coordinates as default
            lng: 46.6753
          })
        });
        const result = await response.json();
        if (result.success) {
          localStorage.setItem('loggedInUser', username);
          onLoginSuccess(username);
          setLoading(false);
          return;
        } else {
          setError(result.message || 'فشل تسجيل الدخول من خادم قوقل شيت');
          setLoading(false);
          return;
        }
      } catch (err: any) {
        console.warn('Real API failed, falling back to simulator', err);
      }
    }

    // Interactive Simulator Mode Login Logic
    setTimeout(() => {
      const teacher = MOCK_TEACHERS.find(
        t => t.username === username.trim() && t.password === password.trim()
      );

      if (!teacher) {
        setError('اسم المستخدم أو كلمة المرور غير صحيحة');
        setLoading(false);
        return;
      }

      if (teacher.status === 'لا') {
        setError('عذراً، هذا الحساب تم إيقافه أو منعه من الدخول من قِبل الإدارة');
        setLoading(false);
        return;
      }

      // Geolocation and device check simulation
      navigator.geolocation.getCurrentPosition(
        (position) => {
          completeSimulatedLogin(teacher, `${position.coords.latitude.toFixed(4)}, ${position.coords.longitude.toFixed(4)}`);
        },
        () => {
          completeSimulatedLogin(teacher, 'الرياض، المملكة العربية السعودية (موقع تقريبي)');
        }
      );
    }, 1000);
  };

  const completeSimulatedLogin = (teacher: TeacherUser, locationName: string) => {
    let deviceId = localStorage.getItem('deviceId');
    if (!deviceId) {
      deviceId = 'device_' + Math.random().toString(36).substring(2, 9);
      localStorage.setItem('deviceId', deviceId);
    }

    const maxAllowed = teacher.allowedDevices || 2;
    const currentDevices = teacher.devices || [];

    // Check if device is already registered
    const isDeviceRegistered = currentDevices.some(d => d.deviceId === deviceId);

    if (!isDeviceRegistered && currentDevices.length >= maxAllowed) {
      setError(`خطأ الأجهزة: لقد تجاوزت الحد الأقصى للأجهزة المسموحة لهذا الحساب (${maxAllowed} أجهزة). يرجى مراجعة الدعم الفني لإعادة تعيين أجهزتك.`);
      setLoading(false);
      return;
    }

    // Register device if new
    if (!isDeviceRegistered) {
      currentDevices.push({ deviceId: deviceId!, location: locationName });
      teacher.devices = currentDevices;
    }

    localStorage.setItem('loggedInUser', teacher.username);
    onLoginSuccess(teacher.username);
    setLoading(false);
  };

  return (
    <div id="login-modal-container" className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div 
        id="login-card" 
        className="w-full max-w-md bg-[#FCFAF5] border border-[#8C6239]/20 rounded-2xl shadow-2xl p-8 text-right font-sans"
        style={{ direction: 'rtl' }}
      >
        <div className="flex flex-col items-center mb-6">
          <div className="w-16 h-16 bg-[#198754]/10 text-[#198754] flex items-center justify-center rounded-full mb-3">
            <Shield size={32} />
          </div>
          <h2 className="text-2xl font-bold text-gray-900 font-sans">بوابة تصحيح المعلمين</h2>
          <p className="text-sm text-gray-500 mt-1">يرجى تسجيل الدخول للوصول إلى قائمة الطلاب واللوحة الذكية</p>
        </div>

        <form onSubmit={handleLogin} className="space-y-5">
          <div className="space-y-1">
            <label className="text-sm font-medium text-gray-700 block">اسم المعلم</label>
            <div className="relative">
              <input
                id="username-input"
                type="text"
                className="w-full pr-10 pl-4 py-3 bg-white border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#198754] text-right font-sans"
                placeholder="مثال: الأستاذ سليمان الخطاط"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                disabled={loading}
              />
              <User size={18} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400" />
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-sm font-medium text-gray-700 block">كلمة المرور</label>
            <div className="relative">
              <input
                id="password-input"
                type="password"
                className="w-full pr-10 pl-4 py-3 bg-white border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#198754] text-right font-sans"
                placeholder="••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                disabled={loading}
              />
              <Lock size={18} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400" />
            </div>
          </div>

          {error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-xl flex items-start gap-2.5 text-xs text-red-600">
              <AlertTriangle size={16} className="shrink-0 mt-0.5 text-red-500" />
              <span>{error}</span>
            </div>
          )}

          <button
            id="login-submit-btn"
            type="submit"
            className="w-full py-3 bg-[#198754] hover:bg-[#0f5132] text-white font-medium rounded-xl shadow-lg shadow-[#198754]/20 transition-all active:scale-[0.98] flex items-center justify-center gap-2 disabled:bg-gray-400 disabled:shadow-none"
            disabled={loading}
          >
            {loading ? (
              <>
                <svg className="animate-spin h-5 w-5 text-white" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>
                <span>جاري التحقق والدخول...</span>
              </>
            ) : (
              <span>تسجيل الدخول الآمن</span>
            )}
          </button>
        </form>

        <div className="mt-6 pt-6 border-t border-gray-100 flex flex-col items-center gap-3 text-center">
          <div className="flex items-center gap-2 text-[11px] text-gray-400">
            <Smartphone size={12} />
            <span>نظام قفل الأجهزة المتعددة نشط (Device Lock)</span>
          </div>
          <div className="flex items-center gap-2 text-[11px] text-gray-400">
            <MapPin size={12} />
            <span>يتم تسجيل الموقع الجغرافي للمعلم عند تسجيل الدخول لأمان الحساب</span>
          </div>
          <div className="text-[10px] text-[#198754] font-medium mt-1 bg-[#198754]/5 px-3 py-1 rounded-full">
            💡 تلميح للتجربة: اسم المستخدم <span className="underline">الأستاذ سليمان الخطاط</span> وكلمة المرور <span className="underline">123</span>
          </div>
        </div>
      </div>
    </div>
  );
}
