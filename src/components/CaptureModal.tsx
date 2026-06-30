/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useRef, useEffect } from 'react';
import { Camera, Video, Mic, StopCircle, Check, X, RotateCcw } from 'lucide-react';

interface CaptureModalProps {
  type: 'image' | 'video' | 'audio';
  onClose: () => void;
  onCapture: (base64Data: string, file: File) => void;
}

export default function CaptureModal({ type, onClose, onCapture }: CaptureModalProps) {
  const [permissionError, setPermissionError] = useState('');
  const [isRecording, setIsRecording] = useState(false);
  const [recordedChunks, setRecordedChunks] = useState<Blob[]>([]);
  const [recordingSeconds, setRecordingSeconds] = useState(0);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [tempBlob, setTempBlob] = useState<Blob | null>(null);

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    startSource();
    return () => {
      stopSource();
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [type]);

  const startSource = async () => {
    setPermissionError('');
    try {
      const constraints: MediaStreamConstraints = {
        video: type === 'image' || type === 'video',
        audio: type === 'audio' || type === 'video',
      };

      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      streamRef.current = stream;

      if (videoRef.current && (type === 'image' || type === 'video')) {
        videoRef.current.srcObject = stream;
        videoRef.current.play();
      }
    } catch (err: any) {
      console.error('Error accessing media devices:', err);
      setPermissionError('عذراً، لم نتمكن من الوصول للكاميرا أو الميكروفون. يرجى التأكد من توصيلها ومنح المتصفح إذن الوصول.');
    }
  };

  const stopSource = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
  };

  // Image capture
  const handleTakePhoto = () => {
    if (!videoRef.current) return;
    const canvas = document.createElement('canvas');
    canvas.width = videoRef.current.videoWidth;
    canvas.height = videoRef.current.videoHeight;
    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.drawImage(videoRef.current, 0, 0, canvas.width, canvas.height);
      const dataUrl = canvas.toDataURL('image/jpeg', 0.85);
      setPreviewUrl(dataUrl);

      canvas.toBlob((blob) => {
        if (blob) {
          setTempBlob(blob);
        }
      }, 'image/jpeg', 0.85);
    }
  };

  // Video recording
  const handleStartVideoRecording = () => {
    if (!streamRef.current) return;
    setRecordedChunks([]);
    const mediaRecorder = new MediaRecorder(streamRef.current, {
      mimeType: 'video/webm;codecs=vp8,opus'
    });
    mediaRecorderRef.current = mediaRecorder;

    mediaRecorder.ondataavailable = (e) => {
      if (e.data && e.data.size > 0) {
        setRecordedChunks(prev => [...prev, e.data]);
      }
    };

    mediaRecorder.onstop = () => {
      // Finished
    };

    mediaRecorder.start(10); // collect 10ms data chunks
    setIsRecording(true);
    setRecordingSeconds(0);
    timerRef.current = setInterval(() => {
      setRecordingSeconds(prev => prev + 1);
    }, 1000);
  };

  const handleStopVideoRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      if (timerRef.current) clearInterval(timerRef.current);

      // We wait briefly for the last chunk
      setTimeout(() => {
        setIsRecording(false);
      }, 100);
    }
  };

  // Convert chunks to video preview URL
  useEffect(() => {
    if (!isRecording && recordedChunks.length > 0 && type === 'video') {
      const blob = new Blob(recordedChunks, { type: 'video/webm' });
      setTempBlob(blob);
      setPreviewUrl(URL.createObjectURL(blob));
    }
  }, [recordedChunks, isRecording, type]);

  // Audio recording
  const handleStartAudioRecording = () => {
    if (!streamRef.current) return;
    setRecordedChunks([]);
    const mediaRecorder = new MediaRecorder(streamRef.current, {
      mimeType: 'audio/webm'
    });
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
  };

  const handleStopAudioRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      if (timerRef.current) clearInterval(timerRef.current);
    }
  };

  useEffect(() => {
    if (!isRecording && recordedChunks.length > 0 && type === 'audio') {
      const blob = new Blob(recordedChunks, { type: 'audio/webm' });
      setTempBlob(blob);
      setPreviewUrl(URL.createObjectURL(blob));
    }
  }, [recordedChunks, isRecording, type]);

  const handleSave = () => {
    if (!tempBlob) return;
    const reader = new FileReader();
    reader.onloadend = () => {
      const base64String = reader.result as string;
      const extension = type === 'image' ? 'jpg' : type === 'video' ? 'webm' : 'webm';
      const file = new File([tempBlob], `feedback_${Date.now()}.${extension}`, {
        type: tempBlob.type
      });
      onCapture(base64String, file);
    };
    reader.readAsDataURL(tempBlob);
  };

  const resetRecording = () => {
    setPreviewUrl(null);
    setTempBlob(null);
    setRecordedChunks([]);
    setRecordingSeconds(0);
    startSource();
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div id="capture-modal" className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
      <div 
        className="w-full max-w-lg bg-[#FCFAF5] border border-[#8C6239]/20 rounded-2xl shadow-2xl p-6 text-right"
        style={{ direction: 'rtl' }}
      >
        <div className="flex justify-between items-center mb-4 pb-2 border-b border-gray-100">
          <h3 className="text-lg font-bold text-gray-900">
            {type === 'image' && 'التقاط صورة من الكاميرا'}
            {type === 'video' && 'تسجيل فيديو توضيحي'}
            {type === 'audio' && 'تسجيل تعليق صوتي'}
          </h3>
          <button onClick={onClose} className="p-1 hover:bg-gray-100 rounded-lg text-gray-500 transition-colors">
            <X size={20} />
          </button>
        </div>

        {permissionError ? (
          <div className="p-4 bg-red-50 border border-red-200 rounded-xl text-center text-red-600 text-sm my-6">
            <p className="mb-4">{permissionError}</p>
            <div className="flex gap-3 justify-center">
              <button 
                onClick={startSource} 
                className="px-4 py-2 bg-[#198754] text-white rounded-lg hover:bg-[#0f5132] text-xs transition-colors"
              >
                إعادة المحاولة
              </button>
              <button 
                onClick={onClose} 
                className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 text-xs transition-colors"
              >
                إغلاق
              </button>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            {/* Live Feed / Preview Stage */}
            <div className="relative bg-black rounded-xl overflow-hidden aspect-video flex items-center justify-center shadow-inner border border-gray-100">
              {previewUrl ? (
                // Captured Preview
                type === 'image' ? (
                  <img src={previewUrl} className="w-full h-full object-contain" alt="Captured" />
                ) : type === 'video' ? (
                  <video src={previewUrl} controls className="w-full h-full object-contain" />
                ) : (
                  <div className="flex flex-col items-center justify-center p-6 text-white w-full">
                    <Mic size={48} className="text-[#198754] animate-pulse mb-3" />
                    <p className="text-sm font-medium mb-3">تم تسجيل الصوت بنجاح</p>
                    <audio src={previewUrl} controls className="w-full max-w-sm" />
                  </div>
                )
              ) : (
                // Live Stream
                (type === 'image' || type === 'video') ? (
                  <video 
                    ref={videoRef} 
                    className="w-full h-full object-cover scale-x-[-1]" 
                    muted 
                    playsInline 
                  />
                ) : (
                  <div className="flex flex-col items-center justify-center p-6 text-white">
                    <Mic size={48} className={isRecording ? "text-red-500 animate-bounce" : "text-gray-400"} />
                    <p className="text-sm font-medium mt-3">
                      {isRecording ? "جاري تسجيل تعليقك الصوتي الآن..." : "الميكروفون جاهز للتسجيل"}
                    </p>
                    {isRecording && (
                      <span className="text-xl font-mono text-red-500 font-bold mt-2">
                        {formatTime(recordingSeconds)}
                      </span>
                    )}
                  </div>
                )
              )}

              {/* Recording Red Indicator */}
              {isRecording && (type === 'video' || type === 'image') && (
                <div className="absolute top-4 right-4 flex items-center gap-1.5 bg-red-600 text-white text-xs font-bold px-2.5 py-1 rounded-full animate-pulse shadow">
                  <span className="w-2 h-2 bg-white rounded-full"></span>
                  <span>{formatTime(recordingSeconds)}</span>
                </div>
              )}
            </div>

            {/* Controller Buttons */}
            <div className="flex justify-center gap-4 py-2">
              {!previewUrl ? (
                // Live Controls
                type === 'image' ? (
                  <button 
                    onClick={handleTakePhoto}
                    className="px-6 py-3 bg-[#198754] hover:bg-[#0f5132] text-white rounded-xl shadow-lg font-medium flex items-center gap-2 transition-all hover:scale-[1.02]"
                  >
                    <Camera size={20} />
                    <span>التقاط الصورة الآن</span>
                  </button>
                ) : type === 'video' ? (
                  !isRecording ? (
                    <button 
                      onClick={handleStartVideoRecording}
                      className="px-6 py-3 bg-red-600 hover:bg-red-700 text-white rounded-xl shadow-lg font-medium flex items-center gap-2 transition-all hover:scale-[1.02]"
                    >
                      <Video size={20} />
                      <span>بدء تسجيل فيديو</span>
                    </button>
                  ) : (
                    <button 
                      onClick={handleStopVideoRecording}
                      className="px-6 py-3 bg-gray-800 hover:bg-gray-900 text-white rounded-xl shadow-lg font-medium flex items-center gap-2 transition-all animate-pulse"
                    >
                      <StopCircle size={20} className="text-red-500" />
                      <span>إنهاء وحفظ التسجيل</span>
                    </button>
                  )
                ) : (
                  // Audio Controls
                  !isRecording ? (
                    <button 
                      onClick={handleStartAudioRecording}
                      className="px-6 py-3 bg-[#198754] hover:bg-[#0f5132] text-white rounded-xl shadow-lg font-medium flex items-center gap-2 transition-all hover:scale-[1.02]"
                    >
                      <Mic size={20} />
                      <span>بدء تسجيل الصوت</span>
                    </button>
                  ) : (
                    <button 
                      onClick={handleStopAudioRecording}
                      className="px-6 py-3 bg-gray-800 hover:bg-gray-900 text-white rounded-xl shadow-lg font-medium flex items-center gap-2 transition-all animate-pulse"
                    >
                      <StopCircle size={20} className="text-red-500" />
                      <span>إنهاء وحفظ التسجيل</span>
                    </button>
                  )
                )
              ) : (
                // Captured state options
                <div className="flex gap-3 w-full">
                  <button 
                    onClick={handleSave}
                    className="flex-1 py-3 bg-[#198754] hover:bg-[#0f5132] text-white rounded-xl shadow-lg font-medium flex items-center justify-center gap-2 transition-colors"
                  >
                    <Check size={20} />
                    <span>اعتماد واستخدام هذا الملف</span>
                  </button>
                  <button 
                    onClick={resetRecording}
                    className="px-4 py-3 bg-gray-100 hover:bg-gray-200 text-gray-700 border border-gray-200 rounded-xl font-medium flex items-center justify-center gap-2 transition-colors"
                  >
                    <RotateCcw size={18} />
                    <span>إعادة التصوير</span>
                  </button>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
