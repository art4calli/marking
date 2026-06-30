/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from 'react';
import { StudentLesson, SavedCorrectionData } from '../types';
import { AppScriptAPI } from '../utils/api';
import { 
  ArrowRight, Save, Play, Pause, Mic, Square, Trash2, Award, 
  Smile, Volume2, Info, MessageSquare, Check, Sparkles
} from 'lucide-react';

interface AudioCorrectorProps {
  lesson: StudentLesson;
  teacherName: string;
  onBack: () => void;
  scriptUrl: string;
}

const EMOJIS = ['⭐', '👏', '🕌', '🌸', '✏️', '📚', '🕌', '👑', '💖', '👍', '👌', '🎯'];

export default function AudioCorrector({ lesson, teacherName, onBack, scriptUrl }: AudioCorrectorProps) {
  const [loading, setLoading] = useState<boolean>(true);
  const [saving, setSaving] = useState<boolean>(false);
  const [statusMessage, setStatusMessage] = useState<string>('');

  // Audio Lesson Data States
  const [studentAudioUrl, setStudentAudioUrl] = useState<string>('');
  const [audioGrade, setAudioGrade] = useState<string>('');
  const [notes, setNotes] = useState<string>('');
  const [teacherAudio, setTeacherAudio] = useState<string | null>(null);

  // Recording State
  const [isRecording, setIsRecording] = useState<boolean>(false);
  const [recordingDuration, setRecordingDuration] = useState<number>(0);
  const [mediaRecorder, setMediaRecorder] = useState<MediaRecorder | null>(null);
  const [audioStream, setAudioStream] = useState<MediaStream | null>(null);

  const recordingIntervalRef = useRef<any>(null);

  useEffect(() => {
    async function fetchAudioAndSaved() {
      try {
        setLoading(true);

        // 1. Fetch original student audio base64 link
        if (lesson.audioFileId) {
          const url = await AppScriptAPI.getMockAsset(lesson.audioFileId);
          // Fallback to Base64 read if it's a real Drive file
          if (url) {
            setStudentAudioUrl(url);
          } else {
            const base64Audio = await AppScriptAPI.getMediaAsBase64(lesson.audioFileId);
            setStudentAudioUrl(base64Audio);
          }
        }

        // 2. Fetch existing saved correction if there is one
        if (lesson.isSaved) {
          const saved = await AppScriptAPI.getSavedData(lesson.row);
          setAudioGrade(saved.audioGrade || '');
          setNotes(saved.notes || '');
          setTeacherAudio(saved.audio || null);
        }

      } catch (e) {
        console.error('Error fetching audio info:', e);
        setStatusMessage('حدث خطأ أثناء تحميل الملف الصوتي للطالب.');
      } finally {
        setLoading(false);
      }
    }
    fetchAudioAndSaved();
  }, [lesson, scriptUrl]);

  // Handle timer for vocal recording
  useEffect(() => {
    if (isRecording) {
      recordingIntervalRef.current = setInterval(() => {
        setRecordingDuration(prev => prev + 1);
      }, 1000);
    } else {
      if (recordingIntervalRef.current) {
        clearInterval(recordingIntervalRef.current);
      }
      setRecordingDuration(0);
    }

    return () => {
      if (recordingIntervalRef.current) {
        clearInterval(recordingIntervalRef.current);
      }
    };
  }, [isRecording]);

  const startVoiceRecording = async () => {
    try {
      setIsRecording(true);
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      setAudioStream(stream);

      const chunks: Blob[] = [];
      const recorder = new MediaRecorder(stream);
      recorder.ondataavailable = (e) => chunks.push(e.data);
      recorder.onstop = () => {
        const blob = new Blob(chunks, { type: 'audio/mp3' });
        const reader = new FileReader();
        reader.onload = () => {
          setTeacherAudio(reader.result as string);
        };
        reader.readAsDataURL(blob);
      };

      recorder.start();
      setMediaRecorder(recorder);
    } catch (err) {
      console.error(err);
      setStatusMessage('عذراً، تعذر الوصول إلى الميكروفون للغرفة الصوتية.');
      setIsRecording(false);
    }
  };

  const stopVoiceRecording = () => {
    if (mediaRecorder && mediaRecorder.state !== 'inactive') {
      mediaRecorder.stop();
    }
    if (audioStream) {
      audioStream.getTracks().forEach(track => track.stop());
    }
    setIsRecording(false);
  };

  const appendEmoji = (emoji: string) => {
    setNotes(prev => prev + ' ' + emoji);
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      setStatusMessage('جاري حفظ علامات الصوت والملفات بقوقل شيت...');

      const cleanStudentName = lesson.studentName.replace(/[^a-zA-Z0-9\u0600-\u06FF]/g, '_');
      const audioFilename = `رد_صوتي_${cleanStudentName}_صف_${lesson.row}.mp3`;

      await AppScriptAPI.saveAllMedia(
        null,
        '',
        null,
        '',
        null,
        '',
        teacherAudio,
        audioFilename,
        lesson.row,
        notes,
        '',
        audioGrade
      );

      setStatusMessage('✅ تم حفظ التصحيح الصوتي وتعديل الشيت بنجاح!');
      setTimeout(() => {
        onBack();
      }, 1500);

    } catch (e) {
      console.error(e);
      setStatusMessage('حدث خطأ أثناء حفظ التصحيح الصوتي.');
    } finally {
      setSaving(false);
    }
  };

  const formatDuration = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div id="audio-corrector" className="min-h-screen bg-stone-100 flex flex-col font-sans">
      
      {/* Top Navigation Bar */}
      <div className="bg-white border-b border-stone-200 px-6 py-4 flex flex-col sm:flex-row justify-between items-center gap-4 shadow-sm z-20">
        <div className="flex items-center gap-4">
          <button
            onClick={onBack}
            className="p-2.5 rounded-xl border border-stone-200 hover:bg-stone-50 text-stone-600 transition-colors flex items-center justify-center cursor-pointer"
            title="العودة للرئيسية"
          >
            <ArrowRight className="w-5 h-5" />
          </button>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-blue-600 bg-blue-50 px-2 py-0.5 rounded-md">التصحيح الصوتي</span>
              <span className="text-xs text-stone-400">صف الشيت: {lesson.row}</span>
            </div>
            <h2 className="text-lg font-bold text-stone-900 mt-0.5">مراجعة تلاوة / درس: {lesson.studentName}</h2>
          </div>
        </div>

        <button
          onClick={handleSave}
          disabled={saving}
          className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold text-sm rounded-xl flex items-center justify-center gap-2 shadow-md cursor-pointer transition-colors disabled:opacity-50 w-full sm:w-auto"
        >
          <Save className="w-4 h-4" />
          <span>{saving ? 'جاري الحفظ...' : 'حفظ التقييم الصوتي'}</span>
        </button>
      </div>

      <div className="max-w-4xl mx-auto w-full px-4 py-8 space-y-6 flex-1">
        
        {loading ? (
          <div className="text-center py-20 bg-white rounded-2xl border border-stone-200 shadow-sm space-y-3">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-4 border-blue-600 border-t-transparent" />
            <p className="text-stone-500 font-bold">جاري إحضار الملف الصوتي من غوغل درايف...</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-start">
            
            {/* Left Block: Audio Players & Microphone */}
            <div className="space-y-6">
              
              {/* Student Submission Card */}
              <div className="bg-white rounded-2xl p-6 border border-stone-200 shadow-sm space-y-4">
                <div className="flex items-center gap-2 text-stone-400 text-xs font-bold">
                  <Volume2 className="w-4 h-4 text-blue-500" />
                  <span>تلاوة / مشاركة الطالب المرسلة</span>
                </div>

                <div className="space-y-1">
                  <h3 className="text-base font-bold text-stone-950">{lesson.studentName}</h3>
                  <p className="text-xs text-stone-500">الدرس: {lesson.additionalV || `درس رقم ${lesson.lessonNumber}`}</p>
                </div>

                {studentAudioUrl ? (
                  <div className="p-4 bg-blue-50/50 rounded-xl border border-blue-100">
                    <audio src={studentAudioUrl} controls className="w-full" />
                  </div>
                ) : (
                  <div className="p-4 bg-red-50 text-red-700 rounded-xl text-xs font-semibold">
                    تعذر تحميل رابط الملف الصوتي الخاص بالطالب من غوغل درايف.
                  </div>
                )}
              </div>

              {/* Teacher Response Audio Recorder */}
              <div className="bg-white rounded-2xl p-6 border border-stone-200 shadow-sm space-y-4">
                <div className="flex items-center gap-2 text-stone-400 text-xs font-bold">
                  <Mic className="w-4 h-4 text-blue-500" />
                  <span>تسجيل رد صندلي / صوتي من المدرس</span>
                </div>

                {teacherAudio ? (
                  <div className="space-y-3">
                    <p className="text-xs text-green-600 font-bold flex items-center gap-1">
                      <Check className="w-4 h-4" />
                      <span>تم تسجيل ردك الصوتي بنجاح. يمكنك الاستماع له أدناه:</span>
                    </p>
                    <div className="p-4 bg-stone-50 rounded-xl border border-stone-200 flex items-center gap-2">
                      <audio src={teacherAudio} controls className="w-full" />
                      <button
                        onClick={() => setTeacherAudio(null)}
                        className="p-2 bg-red-50 hover:bg-red-100 text-red-600 rounded-lg transition-colors cursor-pointer"
                        title="حذف التسجيل"
                      >
                        <Trash2 className="w-4.5 h-4.5" />
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center py-6 border-2 border-dashed border-stone-200 rounded-2xl space-y-4">
                    {isRecording ? (
                      <div className="flex flex-col items-center space-y-2">
                        <div className="flex items-center gap-2 text-red-600 font-bold text-sm animate-pulse">
                          <Square className="w-3.5 h-3.5 fill-red-600" />
                          <span>جاري التسجيل الصوتي المباشر...</span>
                        </div>
                        <span className="text-2xl font-black font-mono text-stone-900">{formatDuration(recordingDuration)}</span>
                        <button
                          onClick={stopVoiceRecording}
                          className="px-6 py-2.5 bg-red-600 hover:bg-red-700 text-white font-bold text-sm rounded-xl flex items-center gap-1.5 shadow-md cursor-pointer mt-3"
                        >
                          <Square className="w-4 h-4 fill-white" />
                          <span>إنهاء وحفظ الرد</span>
                        </button>
                      </div>
                    ) : (
                      <button
                        onClick={startVoiceRecording}
                        className="p-6 rounded-full bg-blue-100 hover:bg-blue-200 text-blue-600 shadow-inner hover:scale-105 transition-all cursor-pointer"
                        title="اضغط لبدء تسجيل صوتي"
                      >
                        <Mic className="w-10 h-10" />
                      </button>
                    )}
                    {!isRecording && (
                      <p className="text-xs text-stone-400">انقر على الميكروفون لتسجيل شرحك الصوتي للطالب.</p>
                    )}
                  </div>
                )}
              </div>

            </div>

            {/* Right Block: Grades, Written Notes, Emojis */}
            <div className="space-y-6">
              
              {/* Grading Input */}
              <div className="bg-white rounded-2xl p-6 border border-stone-200 shadow-sm space-y-4">
                <div className="flex items-center gap-2 text-stone-400 text-xs font-bold">
                  <Award className="w-4 h-4 text-blue-500" />
                  <span>الدرجات والتقييم الصوتي</span>
                </div>

                <div className="space-y-2">
                  <input
                    type="text"
                    dir="rtl"
                    value={audioGrade}
                    onChange={(e) => setAudioGrade(e.target.value)}
                    placeholder="ضع درجة الطالب هنا (مثال: 95/100، أو ممتاز جداً)"
                    className="block w-full px-4 py-3 border border-stone-200 rounded-xl shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 text-stone-900 font-bold"
                  />
                </div>
              </div>

              {/* Feedback and Emojis Panel */}
              <div className="bg-white rounded-2xl p-6 border border-stone-200 shadow-sm space-y-4">
                <div className="flex items-center gap-2 text-stone-400 text-xs font-bold">
                  <MessageSquare className="w-4 h-4 text-blue-500" />
                  <span>التوجيه المكتوب والأوسمة التعبيرية</span>
                </div>

                {/* Emoji Picker */}
                <div className="space-y-2">
                  <span className="text-xs font-semibold text-stone-500 block">إضافة أوسمة تشجيعية سريعة للطالب:</span>
                  <div className="flex flex-wrap gap-2">
                    {EMOJIS.map(emoji => (
                      <button
                        key={emoji}
                        onClick={() => appendEmoji(emoji)}
                        className="w-10 h-10 text-xl bg-stone-50 hover:bg-blue-50 hover:scale-110 active:scale-95 border border-stone-200/60 rounded-xl transition-all flex items-center justify-center cursor-pointer"
                      >
                        {emoji}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="space-y-2 pt-2">
                  <textarea
                    dir="rtl"
                    rows={4}
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="اكتب التوجيهات أو الملاحظات التي ستظهر للطالب في الشيت..."
                    className="block w-full px-4 py-3 border border-stone-200 rounded-xl shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 text-stone-900 text-sm"
                  />
                </div>
              </div>

            </div>

          </div>
        )}

        {statusMessage && (
          <div className="bg-stone-900 text-stone-100 p-4 rounded-xl shadow-lg text-xs font-semibold flex items-center justify-center gap-2 border border-stone-800">
            <Sparkles className="w-4 h-4 text-amber-400 animate-pulse" />
            <p>{statusMessage}</p>
          </div>
        )}

      </div>
    </div>
  );
}
