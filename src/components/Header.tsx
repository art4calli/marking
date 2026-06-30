/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState } from 'react';
import { 
  Globe, LogOut, CheckCircle, Radio, Settings, ShieldAlert, 
  MapPin, Clipboard, Check, HelpCircle, X, ExternalLink, RefreshCw 
} from 'lucide-react';
import { APPS_SCRIPT_GUIDE_AR, APPS_SCRIPT_CODE } from '../appsScriptCode';

interface HeaderProps {
  teacherName: string;
  onLogout: () => void;
  apiURL: string;
  onUpdateApiURL: (url: string) => void;
  isLoading: boolean;
  onRefresh: () => void;
}

export default function Header({ 
  teacherName, onLogout, apiURL, onUpdateApiURL, isLoading, onRefresh 
}: HeaderProps) {
  
  const [showConfig, setShowConfig] = useState(false);
  const [inputURL, setInputURL] = useState(apiURL);
  const [copiedCode, setCopiedCode] = useState(false);
  const [copiedGuide, setCopiedGuide] = useState(false);

  const handleSaveConfig = () => {
    onUpdateApiURL(inputURL.trim());
    setShowConfig(false);
    alert('✅ تم تحديث إعدادات بوابة الاتصال بنجاح! سيقوم التطبيق الآن بمحاولة الاتصال بالرابط المعتمد.');
  };

  const copyToClipboard = (text: string, isGuide: boolean) => {
    navigator.clipboard.writeText(text);
    if (isGuide) {
      setCopiedGuide(true);
      setTimeout(() => setCopiedGuide(false), 2000);
    } else {
      setCopiedCode(true);
      setTimeout(() => setCopiedCode(false), 2000);
    }
  };

  return (
    <header className="bg-[#1A1A1A] text-white py-6 px-4 md:px-8 shadow-xl font-sans text-right" style={{ direction: 'rtl' }}>
      <div className="max-w-7xl mx-auto flex flex-col md:flex-row gap-4 items-center justify-between">
        
        {/* School Logo & Title */}
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 bg-[#D4A017]/10 border border-[#D4A017]/40 rounded-full flex items-center justify-center text-[#D4A017]">
            {/* Elegant SVG Logo representation */}
            <svg viewBox="0 0 100 100" className="w-11 h-11" fill="currentColor">
              <path d="M 50 15 C 30 15 20 40 50 85 C 80 40 70 15 50 15 Z" fill="none" stroke="#D4A017" stroke-width="3"/>
              <path d="M 35 45 Q 50 30 65 45" fill="none" stroke="#198754" stroke-width="2"/>
              <circle cx="50" cy="50" r="4" fill="#D4A017"/>
            </svg>
          </div>
          <div>
            <h1 className="text-xl md:text-2xl font-bold font-sans tracking-wide text-gray-100 flex items-center gap-2">
              <span>مدرسة الخط العربي والقرآن التفاعلية</span>
            </h1>
            <p className="text-xs text-[#D4A017] font-semibold mt-1">المنصة الشاملة لتصحيح التلاوة وتدقيق كراسات الطلاب</p>
          </div>
        </div>

        {/* Connection status & Teacher panel */}
        <div className="flex flex-wrap items-center gap-3.5 justify-center">
          
          {/* Connection badge */}
          <button 
            id="config-drawer-trigger"
            onClick={() => setShowConfig(true)}
            className={`px-3.5 py-2 rounded-xl text-xs font-bold flex items-center gap-2 transition-all ${apiURL ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30' : 'bg-amber-500/10 text-amber-400 border border-amber-500/30 hover:bg-amber-500/20'}`}
          >
            <Radio size={14} className={apiURL ? "animate-pulse text-emerald-400" : "text-amber-400"} />
            <span>{apiURL ? 'اتصال حي بقوقل شيت' : 'نمط المحاكاة التفاعلية (أوفلاين)'}</span>
            <Settings size={13} className="mr-1 hover:rotate-45 transition-transform" />
          </button>

          {/* Refresh table button */}
          {apiURL && (
            <button 
              onClick={onRefresh}
              disabled={isLoading}
              className="p-2 bg-white/5 border border-white/10 hover:bg-white/10 rounded-xl transition-all disabled:opacity-40"
              title="إعادة تحميل بيانات قوقل شيت"
            >
              <RefreshCw size={14} className={isLoading ? "animate-spin" : ""} />
            </button>
          )}

          {/* Teacher account summary */}
          {teacherName && (
            <div className="flex items-center gap-3 bg-white/5 border border-white/10 px-4 py-2 rounded-xl">
              <div className="text-right">
                <div className="text-xs font-bold text-gray-200">{teacherName}</div>
                <div className="text-[10px] text-gray-400 font-medium mt-0.5 flex items-center gap-1">
                  <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full"></span>
                  <span>جلسة مصحح نشطة</span>
                </div>
              </div>
              <button 
                id="signout-btn"
                onClick={onLogout}
                className="p-1.5 bg-red-600/10 hover:bg-red-600 text-red-400 hover:text-white rounded-lg transition-colors"
                title="تسجيل الخروج من الحساب"
              >
                <LogOut size={14} />
              </button>
            </div>
          )}
        </div>

      </div>

      {/* Connection & Configuration Dialog Drawer Modal */}
      {showConfig && (
        <div id="connection-settings-modal" className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4 text-gray-900">
          <div className="w-full max-w-4xl bg-[#FCFAF5] border border-[#8C6239]/20 rounded-2xl shadow-2xl p-6 flex flex-col max-h-[90vh]">
            
            {/* Modal Title */}
            <div className="flex justify-between items-center pb-3 border-b border-gray-100">
              <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                <Globe className="text-[#198754]" size={20} />
                <span>إعدادات ربط جدول بيانات قوقل (Google Sheets)</span>
              </h3>
              <button onClick={() => setShowConfig(false)} className="p-1 hover:bg-gray-100 rounded-lg text-gray-500 transition-colors">
                <X size={20} />
              </button>
            </div>

            {/* Modal Scroll Content */}
            <div className="flex-1 overflow-auto py-4 space-y-6 text-xs text-gray-600 leading-relaxed pr-1">
              
              {/* API input field */}
              <div className="bg-white border border-gray-100 p-5 rounded-2xl shadow-inner space-y-3">
                <label className="text-xs font-bold text-gray-700 block">رابط تطبيق الويب المعتمد (Google Web App URL):</label>
                <div className="flex flex-col sm:flex-row gap-2">
                  <input 
                    id="api-url-input"
                    type="url" 
                    placeholder="انسخ رابط الـ Web app URL الذي ينتهي بـ /exec والصقه هنا..."
                    className="flex-1 px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#198754] text-left font-mono text-xs"
                    value={inputURL}
                    onChange={e => setInputURL(e.target.value)}
                  />
                  <button 
                    onClick={handleSaveConfig}
                    className="px-6 py-2.5 bg-[#198754] hover:bg-[#0f5132] text-white font-bold rounded-xl transition-colors shrink-0 text-xs"
                  >
                    حفظ وربط الجدول
                  </button>
                </div>
                <div className="text-[10px] text-gray-400 mt-1">
                  * إذا أبقيت الحقل فارغاً، سيعمل التطبيق في "نمط المحاكاة التفاعلية" الافتراضي لتجربة اللوحة وتصحيحات الخط بالكامل دون اتصال.
                </div>
              </div>

              {/* Step-by-Step Arabic Guide block */}
              <div className="bg-white border border-gray-100 p-5 rounded-2xl shadow-sm space-y-4">
                <div className="flex justify-between items-center border-b border-gray-50 pb-2">
                  <h4 className="text-sm font-bold text-gray-900 flex items-center gap-1.5">
                    <CheckCircle className="text-emerald-600" size={16} />
                    <span>خطوات إعداد خادم الكود المجاني (CORS API)</span>
                  </h4>
                  <button 
                    onClick={() => copyToClipboard(APPS_SCRIPT_GUIDE_AR, true)}
                    className="text-[11px] text-[#198754] hover:underline font-bold flex items-center gap-1"
                  >
                    {copiedGuide ? <Check size={12} /> : <Clipboard size={12} />}
                    <span>{copiedGuide ? 'تم النسخ!' : 'نسخ الدليل العربي'}</span>
                  </button>
                </div>

                <div className="whitespace-pre-wrap font-sans text-xs text-gray-600 bg-gray-50/50 p-4 rounded-xl leading-relaxed">
                  {APPS_SCRIPT_GUIDE_AR}
                </div>
              </div>

              {/* Code copy block */}
              <div className="bg-white border border-gray-100 p-5 rounded-2xl shadow-sm space-y-4">
                <div className="flex justify-between items-center border-b border-gray-50 pb-2">
                  <h4 className="text-sm font-bold text-gray-900">📄 الكود البرمجي الكامل لملف Code.gs</h4>
                  <button 
                    onClick={() => copyToClipboard(APPS_SCRIPT_CODE, false)}
                    className="px-3 py-1 bg-[#198754] hover:bg-[#0f5132] text-white font-bold rounded-lg text-[10px] flex items-center gap-1 transition-colors"
                  >
                    {copiedCode ? <Check size={12} /> : <Clipboard size={12} />}
                    <span>{copiedCode ? 'تم نسخ الكود!' : 'نسخ الكود بالكامل'}</span>
                  </button>
                </div>

                <pre className="p-4 bg-gray-900 text-emerald-400 rounded-xl font-mono text-[10px] overflow-x-auto text-left max-h-60 leading-normal select-all">
                  {APPS_SCRIPT_CODE}
                </pre>
              </div>

            </div>

            {/* Modal Actions */}
            <div className="pt-4 border-t border-gray-100 flex justify-end gap-3 shrink-0">
              <button 
                onClick={() => {
                  setInputURL('');
                  onUpdateApiURL('');
                  setShowConfig(false);
                  alert('🔄 تم إلغاء الرابط، والعودة لنمط المحاكاة التفاعلية بنجاح!');
                }}
                className="px-5 py-2 border border-gray-200 hover:bg-gray-100 text-gray-700 font-bold rounded-xl text-xs transition-colors"
              >
                إلغاء الرابط والعودة للمحاكاة
              </button>
              <button 
                onClick={() => setShowConfig(false)}
                className="px-5 py-2 bg-gray-800 hover:bg-gray-900 text-white font-bold rounded-xl text-xs transition-colors"
              >
                إغلاق النافذة
              </button>
            </div>

          </div>
        </div>
      )}

    </header>
  );
}
