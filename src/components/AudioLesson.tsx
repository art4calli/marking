/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useRef, useEffect } from 'react';
import { StudentItem } from '../types';
import { 
  Play, Pause, Mic, Square, Trash2, ArrowLeft, Save, Sparkles, 
  Volume2, Smile, FileAudio, AlertTriangle, CheckCircle, RefreshCw 
} from 'lucide-react';

interface AudioLessonProps {
  student: StudentItem;
  teacherName: string;
  apiURL: string;
  onBack: () => void;
  onSaveSuccess: (updatedStudent: StudentItem) => void;
}

const SHI_EMOJIS = ['⭐', '👏', '🎉', '📖', '💡', '🌸', '🌹', '❤️', '🏆', '👌', '🎯', '✨'];

export default function AudioLesson({ student, teacherName, apiURL, onBack, onSaveSuccess }: AudioLessonProps) {
  const [isPlayingStudent, setIsPlayingStudent] = useState(false);
  const [studentAudioUrl, setStudentAudioUrl] = useState<string | null>(null);

  // Teacher feedback audio state
  const [isRecording, setIsRecording] = useState(false);
  const [recordedChunks, setRecordedChunks] = useState<Blob[]>([]);
  const [recordingSeconds, setRecordingSeconds] = useState(0);
  const [feedbackAudioUrl, setFeedbackAudioUrl] = useState<string | null>(null);
  const [feedbackBlob, setFeedbackBlob] = useState<Blob | null>(null);
  const [isPlayingFeedback, setIsPlayingFeedback] = useState(false);

  // Inputs
  const [audioGrade, setAudioGrade] = useState('');
  const [notes, setNotes] = useState('');

  // Save states
  const [saving, setSaving] = useState(false);
  const [saveStatus, setSaveStatus] = useState('');

  // Audio elements references
  const studentAudioRef = useRef<HTMLAudioElement | null>(null);
  const feedbackAudioRef = useRef<HTMLAudioElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    loadStudentAudio();
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      stopSource();
    };
  }, [student]);

  const loadStudentAudio = async () => {
    // If real API fileId exists, load from Google Drive Base64
    if (apiURL && student.audioFileId && !student.audioFileId.startsWith('mock_')) {
      try {
        setSaveStatus('جاري تحميل الملف الصوتي للطالب من قوقل درايف...');
        const response = await fetch(`${apiURL}?action=getMediaAsBase64&fileId=${student.audioFileId}`);
        const data = await response.json();
        if (data.base64) {
          setStudentAudioUrl(data.base64);
        } else {
          throw new Error('No base64 data returned');
        }
      } catch (err) {
        console.error('Failed to load audio from API, fallback to local gen', err);
        setStudentAudioUrl('mock_student_reading.mp3'); // Fallback template
      } finally {
        setSaveStatus('');
      }
    } else {
      // Offline Simulation: Load a friendly synthetic audio or direct file
      setStudentAudioUrl('mock_student_reading.mp3');
    }
  };

  const handlePlayStudent = () => {
    if (studentAudioRef.current) {
      if (isPlayingStudent) {
        studentAudioRef.current.pause();
        setIsPlayingStudent(false);
      } else {
        studentAudioRef.current.play();
        setIsPlayingStudent(true);
      }
    }
  };

  const handleStudentAudioEnded = () => {
    setIsPlayingStudent(false);
  };

  const handlePlayFeedback = () => {
    if (feedbackAudioRef.current) {
      if (isPlayingFeedback) {
        feedbackAudioRef.current.pause();
        setIsPlayingFeedback(false);
      } else {
        feedbackAudioRef.current.play();
        setIsPlayingFeedback(true);
      }
    }
  };

  const handleFeedbackAudioEnded = () => {
    setIsPlayingFeedback(false);
  };

  // Start Mic Audio Recording
  const handleStartRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      setRecordedChunks([]);
      setFeedbackAudioUrl(null);
      setFeedbackBlob(null);

      const mediaRecorder = new MediaRecorder(stream, { mimeType: 'audio/webm' });
      mediaRecorderRef.current = mediaRecorder;

      mediaRecorder.ondataavailable = (e) => {
        if (e.data && e.data.size > 0) {
          setRecordedChunks(prev => [...prev, e.data]);
        }
      };

      mediaRecorder.start(10);
      setIsRecording(true);
      setRecordingSeconds(0);
      timerRef.current = setInterval(() => {
        setRecordingSeconds(prev => prev + 1);
      }, 1000);

    } catch (err) {
      console.error('Mic access error:', err);
      alert('⚠️ تعذر تشغيل الميكروفون. يرجى التحقق من التوصيل وإعطاء صلاحية للمتصفح.');
    }
  };

  const handleStopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      if (timerRef.current) clearInterval(timerRef.current);
      stopSource();
    }
  };

  const stopSource = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
  };

  // Process recorded chunks
  useEffect(() => {
    if (!isRecording && recordedChunks.length > 0) {
      const blob = new Blob(recordedChunks, { type: 'audio/webm' });
      setFeedbackBlob(blob);
      setFeedbackAudioUrl(URL.createObjectURL(blob));
    }
  }, [recordedChunks, isRecording]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setFeedbackBlob(file);
    const reader = new FileReader();
    reader.onloadend = () => {
      setFeedbackAudioUrl(reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  // Append emoji to written teacher notes
  const appendEmoji = (emoji: string) => {
    setNotes(prev => prev + emoji);
  };

  // Save the entire evaluation
  const handleSaveAudioGrading = async () => {
    setSaving(true);
    setSaveStatus('جاري تجميع درجات الصوت والتعليق الصوتي المرفق...');

    try {
      let feedbackBase64 = '';
      if (feedbackBlob) {
        feedbackBase64 = await new Promise<string>((resolve) => {
          const r = new FileReader();
          r.onloadend = () => resolve(r.result as string);
          r.readAsDataURL(feedbackBlob);
        });
      }

      if (apiURL && apiURL.startsWith('http')) {
        setSaveStatus('جاري إرسال التقييم الصوتي لجدول بيانات قوقل شيت...');
        const response = await fetch(apiURL, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            action: 'saveAllMedia',
            canvasBase64: '',
            canvasFilename: '',
            imageBase64: '',
            imageFilename: '',
            videoBase64: '',
            videoFilename: '',
            audioBase64: feedbackBase64,
            audioFilename: `صوت_تصحيح_${student.studentName}_درس_${student.lessonNumber}.webm`,
            row: student.row,
            notes: notes || 'تم تقييم التلاوة والاستماع الصوتي',
            imageGrade: '',
            audioGrade: audioGrade || '100'
          })
        });

        const result = await response.json();
        if (result.error) throw new Error(result.error);
      }

      setTimeout(() => {
        const updatedStudent: StudentItem = {
          ...student,
          isSaved: true,
          notes: notes || 'تم تقييم التلاوة بنجاح والاستماع وتوجيه الطالب',
          audioGrade: audioGrade || '100'
        };

        onSaveSuccess(updatedStudent);
        setSaving(false);
        setSaveStatus('');
        alert('✅ تم حفظ تقييم الدرس الصوتي وإرسال الدرجات والملاحظات بنجاح!');
      }, 1500);

    } catch (err: any) {
      console.error(err);
      alert(`⚠️ حدث خطأ أثناء الحفظ: ${err.message || err}`);
      setSaving(false);
      setSaveStatus('');
    }
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div id="audio-lesson-view" className="max-w-4xl mx-auto space-y-6 text-right font-sans" style={{ direction: 'rtl' }}>
      
      {/* Header controls */}
      <div className="bg-white border border-gray-100 rounded-2xl shadow-sm p-5 flex items-center justify-between">
        <button 
          onClick={onBack}
          className="px-4 py-2 bg-gray-50 border border-gray-100 hover:bg-gray-100 text-gray-700 font-medium rounded-xl flex items-center gap-2 text-xs transition-colors"
        >
          <ArrowLeft size={14} />
          <span>رجوع للجدول</span>
        </button>
        <div className="flex flex-col text-left">
          <div className="text-sm font-bold text-gray-900">{student.studentName}</div>
          <div className="text-[11px] text-gray-500 mt-0.5">تصحيح تلاوة الطالب | الدرس: {student.lessonNumber}</div>
        </div>
      </div>

      {/* Grid of Audio playing & recording */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        
        {/* Playback student's audio */}
        <div className="bg-white border border-gray-100 rounded-2xl shadow-sm p-6 flex flex-col items-center justify-between min-h-[280px]">
          <div className="w-full border-b border-gray-50 pb-2 mb-4">
            <h3 className="text-base font-bold text-gray-900 flex items-center gap-2">
              <Volume2 size={18} className="text-[#198754]" />
              <span>استماع تلاوة الطالب</span>
            </h3>
          </div>

          <div className="flex flex-col items-center gap-4 py-4">
            <div className={`w-20 h-20 rounded-full flex items-center justify-center transition-all ${isPlayingStudent ? 'bg-[#198754]/15 text-[#198754] scale-105' : 'bg-gray-100 text-gray-400'}`}>
              <FileAudio size={40} className={isPlayingStudent ? 'animate-pulse' : ''} />
            </div>
            
            {studentAudioUrl ? (
              <button
                id="play-student-audio-btn"
                onClick={handlePlayStudent}
                className={`px-6 py-2.5 rounded-full font-bold text-sm flex items-center gap-2 shadow-md transition-all active:scale-95 ${isPlayingStudent ? 'bg-gray-800 text-white hover:bg-gray-900' : 'bg-[#198754] text-white hover:bg-[#0f5132]'}`}
              >
                {isPlayingStudent ? (
                  <>
                    <Pause size={16} />
                    <span>إيقاف مؤقت</span>
                  </>
                ) : (
                  <>
                    <Play size={16} />
                    <span>استماع للتلاوة</span>
                  </>
                )}
              </button>
            ) : (
              <div className="text-xs text-amber-600 animate-pulse bg-amber-50 px-3 py-1 rounded-full">
                ⏳ جاري تجهيز تلاوة الطالب...
              </div>
            )}
            
            {/* Native hidden audio player */}
            {studentAudioUrl && (
              <audio 
                ref={studentAudioRef} 
                src={studentAudioUrl} 
                onEnded={handleStudentAudioEnded}
                className="hidden"
              />
            )}
          </div>

          <div className="w-full text-center text-xs text-gray-400 bg-gray-50 p-3 rounded-xl">
            نوع التلاوة: {student.additionalT || "حفظ مباشر"} | عدد مرات الإرسال: {student.audioSubmissionCount} مرات
          </div>
        </div>

        {/* Record teacher feedback */}
        <div className="bg-white border border-gray-100 rounded-2xl shadow-sm p-6 flex flex-col items-center justify-between min-h-[280px]">
          <div className="w-full border-b border-gray-50 pb-2 mb-4">
            <h3 className="text-base font-bold text-gray-900 flex items-center gap-2">
              <Mic size={18} className="text-red-500" />
              <span>تسجيل رد صوتي تصحيحي</span>
            </h3>
          </div>

          <div className="flex flex-col items-center gap-4 py-4 w-full">
            {isRecording ? (
              <div className="flex flex-col items-center gap-2">
                <div className="w-16 h-16 bg-red-50 border border-red-200 rounded-full flex items-center justify-center text-red-500 animate-pulse shadow-md">
                  <Square size={24} fill="currentColor" onClick={handleStopRecording} className="cursor-pointer" />
                </div>
                <span className="text-sm font-bold text-red-600 animate-pulse font-mono">{formatTime(recordingSeconds)}</span>
                <span className="text-[11px] text-gray-400">جاري تسجيل توجيهك الصوتي للطالب...</span>
              </div>
            ) : feedbackAudioUrl ? (
              <div className="flex flex-col items-center gap-3 w-full px-4">
                <div className="flex items-center gap-2 justify-center">
                  <button 
                    onClick={handlePlayFeedback}
                    className="p-3 bg-gray-800 text-white rounded-full hover:bg-gray-900 transition-colors shadow"
                  >
                    {isPlayingFeedback ? <Pause size={18} /> : <Play size={18} />}
                  </button>
                  <button 
                    onClick={() => { setFeedbackAudioUrl(null); setFeedbackBlob(null); }}
                    className="p-3 bg-red-50 text-red-600 hover:bg-red-100 rounded-full transition-colors border border-red-100"
                    title="حذف التسجيل الحالي"
                  >
                    <Trash2 size={18} />
                  </button>
                </div>
                <span className="text-xs text-gray-500 font-medium">معاينة تسجيل الرد الصوتي للمصحح</span>
                <audio 
                  ref={feedbackAudioRef} 
                  src={feedbackAudioUrl} 
                  onEnded={handleFeedbackAudioEnded}
                  className="hidden"
                />
              </div>
            ) : (
              <div className="flex flex-col items-center gap-3">
                <button 
                  id="record-teacher-audio-btn"
                  onClick={handleStartRecording}
                  className="w-16 h-16 bg-red-600 hover:bg-red-700 text-white rounded-full flex items-center justify-center shadow-lg hover:scale-105 active:scale-95 transition-all"
                  title="اضغط للتسجيل الفوري"
                >
                  <Mic size={26} />
                </button>
                <span className="text-xs text-gray-500 font-bold">انقر فوق الميكروفون للبدء بالتسجيل فوراً</span>
                <span className="text-[10px] text-gray-400">أو يمكنك رفع ملف جاهز من جهازك:</span>
                <input 
                  type="file" 
                  accept="audio/*" 
                  className="hidden" 
                  id="teacher-audio-file" 
                  onChange={handleFileChange}
                />
                <button 
                  onClick={() => document.getElementById('teacher-audio-file')?.click()}
                  className="px-4 py-1.5 border border-dashed rounded-lg text-xs font-semibold text-gray-500 hover:bg-gray-50"
                >
                  اختيار ملف صوتي
                </button>
              </div>
            )}
          </div>

          <div className="w-full text-center text-xs text-gray-400 bg-gray-50 p-3 rounded-xl flex items-center justify-center gap-1.5">
            <Sparkles size={12} className="text-amber-500" />
            <span>يمكنك تسجيل نطق الكلمة لتوجيه مخارج الحروف الصحيحة</span>
          </div>
        </div>

      </div>

      {/* Grading Inputs, Emojis and notes */}
      <div className="bg-white border border-gray-100 rounded-2xl shadow-sm p-6 space-y-6">
        
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          {/* Grade field */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-gray-700">رصد درجة التلاوة (من 100)</label>
            <input 
              id="audio-grade-input"
              type="number" 
              max="100" 
              min="0"
              placeholder="درجة الطالب، مثلاً: 98"
              className="w-full px-4 py-3 bg-gray-50 border border-gray-100 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#198754]"
              value={audioGrade}
              onChange={e => setAudioGrade(e.target.value)}
            />
          </div>

          {/* Feedback notes with quick Emoji insertion */}
          <div className="md:col-span-3 space-y-1.5">
            <div className="flex justify-between items-center">
              <label className="text-xs font-bold text-gray-700">الملاحظات والتوجيه المكتوب</label>
              
              {/* Emoji bar */}
              <div className="flex items-center gap-1.5">
                <Smile size={14} className="text-amber-500" />
                <div className="flex gap-1 overflow-x-auto max-w-[200px] py-1">
                  {SHI_EMOJIS.map(emoji => (
                    <button 
                      key={emoji}
                      onClick={() => appendEmoji(emoji)}
                      className="text-sm hover:scale-125 transition-transform"
                    >
                      {emoji}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <textarea 
              id="audio-notes-input"
              rows={3}
              placeholder="اكتب توجيهات التلاوة للطالب، مثلاً: تلاوة مباركة ما شاء الله، انتبه فقط لزمن الغنة..."
              className="w-full px-4 py-3 bg-gray-50 border border-gray-100 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#198754] text-xs resize-none"
              value={notes}
              onChange={e => setNotes(e.target.value)}
            />
          </div>
        </div>

        {/* Save button */}
        <div className="pt-4 border-t border-gray-50 flex flex-col md:flex-row gap-4 items-center justify-between">
          <div className="text-xs text-gray-500 flex items-center gap-1.5">
            <AlertTriangle size={14} className="text-amber-500 shrink-0" />
            <span>سيتم حفظ الدرجة مباشرة في ورقة قوقل شيت وتحميل التسجيل الصوتي في مجلد قوقل درايف.</span>
          </div>

          <div className="flex gap-3 w-full md:w-auto">
            <button
              onClick={onBack}
              className="flex-1 md:flex-initial px-6 py-3 bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold rounded-xl text-sm transition-colors text-center"
            >
              إلغاء والعودة
            </button>
            <button
              id="audio-save-btn"
              onClick={handleSaveAudioGrading}
              className="flex-2 md:flex-initial px-8 py-3 bg-[#198754] hover:bg-[#0f5132] text-white font-bold rounded-xl text-sm shadow-md flex items-center justify-center gap-2 transition-all hover:scale-[1.01] active:scale-[0.99] disabled:bg-gray-300"
              disabled={saving}
            >
              {saving ? (
                <>
                  <svg className="animate-spin h-5 w-5 text-white" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                  <span>جاري الحفظ...</span>
                </>
              ) : (
                <>
                  <Save size={16} />
                  <span>اعتماد وحفظ التقييم الصوتي</span>
                </>
              )}
            </button>
          </div>
        </div>

        {saveStatus && (
          <div className="p-3 bg-amber-50 border border-amber-100 rounded-xl flex items-center gap-2 text-xs text-amber-700 animate-pulse">
            <RefreshCw className="animate-spin shrink-0 text-amber-600" size={14} />
            <span>{saveStatus}</span>
          </div>
        )}
      </div>

    </div>
  );
}
