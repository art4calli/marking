/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from 'react';
import { StudentLesson, PredefinedText, WatermarkSettings, SavedCorrectionData } from '../types';
import { AppScriptAPI } from '../utils/api';
import { 
  ArrowRight, Undo2, Redo2, Eraser, RotateCw, Sparkles, Sliders, Type, Stamp, 
  Save, Eye, EyeOff, Upload, Camera, Video, Volume2, Info, Check, Trash2, StopCircle
} from 'lucide-react';

interface ImageCorrectorProps {
  lesson: StudentLesson;
  teacherName: string;
  onBack: () => void;
  scriptUrl: string;
}

interface Point {
  x: number;
  y: number;
  pressure: number;
}

interface DrawnPath {
  points: Point[];
  lineWidth: number;
  lineColor: string;
  isChisel: boolean;
  nibAngle: number;
}

interface TextStamp {
  lines: string[];
  x: number;
  y: number;
  color: string;
  fontSize: number;
  fontFamily: string;
}

interface StickerStamp {
  x: number;
  y: number;
  base64: string;
  size: number;
}

export default function ImageCorrector({ lesson, teacherName, onBack, scriptUrl }: ImageCorrectorProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  
  // App states
  const [loading, setLoading] = useState<boolean>(true);
  const [saving, setSaving] = useState<boolean>(false);
  const [statusMessage, setStatusMessage] = useState<string>('');
  
  // Feedback States
  const [imageGrade, setImageGrade] = useState<string>('');
  const [notes, setNotes] = useState<string>('');
  
  // UI Panels
  const [activeTab, setActiveTab] = useState<'draw' | 'text' | 'sticker' | 'media'>('draw');
  const [showExtraData, setShowExtraData] = useState<boolean>(false);
  const [showOriginalMedia, setShowOriginalMedia] = useState<boolean>(false);

  // Drawing States
  const [lineWidth, setLineWidth] = useState<number>(18);
  const [lineColor, setLineColor] = useState<string>('#E11D48'); // Nice deep red
  const [isChisel, setIsChisel] = useState<boolean>(true); // Calligraphy chisel default
  const [nibAngle, setNibAngle] = useState<number>(75); // Standard calligraphy tilt (75-80 deg)
  const [fontSize, setFontSize] = useState<number>(32);
  const [fontFamily, setFontFamily] = useState<string>('Amiri');
  const [stickerSize, setStickerSize] = useState<number>(180);

  // Lists fetched from API
  const [predefinedTexts, setPredefinedTexts] = useState<PredefinedText[]>([]);
  const [stickersList, setStickersList] = useState<string[]>([]);
  const [watermarkSettings, setWatermarkSettings] = useState<WatermarkSettings | null>(null);
  
  const [selectedText, setSelectedText] = useState<string>('');
  const [selectedSticker, setSelectedSticker] = useState<string>('');

  // Canvas Viewport transform (zoom / pan)
  const [scale, setScale] = useState<number>(1);
  const [offsetX, setOffsetX] = useState<number>(0);
  const [offsetY, setOffsetY] = useState<number>(0);

  // Additional uploads (correction media)
  const [additionalImage, setAdditionalImage] = useState<string | null>(null);
  const [additionalVideo, setAdditionalVideo] = useState<string | null>(null);
  const [additionalAudio, setAdditionalAudio] = useState<string | null>(null);
  
  // Capturing / Recording States
  const [mediaRecorder, setMediaRecorder] = useState<MediaRecorder | null>(null);
  const [recordingType, setRecordingType] = useState<'none' | 'video' | 'audio'>('none');
  const [videoStream, setVideoStream] = useState<MediaStream | null>(null);
  const [audioChunks, setAudioChunks] = useState<Blob[]>([]);
  const [cameraActive, setCameraActive] = useState<boolean>(false);

  // Refs for tracking interactive drawing variables
  const isPainting = useRef<boolean>(false);
  const originalImageRef = useRef<HTMLImageElement | null>(null);
  const lastX = useRef<number | null>(null);
  const lastY = useRef<number | null>(null);
  
  // Drawing History Stack
  const [drawnPaths, setDrawnPaths] = useState<DrawnPath[]>([]);
  const [textStamps, setTextStamps] = useState<TextStamp[]>([]);
  const [stickerStamps, setStickerStamps] = useState<StickerStamp[]>([]);
  const [history, setHistory] = useState<{ type: 'path' | 'text' | 'sticker'; index: number }[]>([]);
  const [redoHistory, setRedoHistory] = useState<{ type: 'path' | 'text' | 'sticker'; data: any }[]>([]);

  // 1. Initial configuration and load student lesson image
  useEffect(() => {
    async function initAndLoad() {
      try {
        setLoading(true);
        // Fetch Settings
        const [texts, stickers, watermark] = await Promise.all([
          AppScriptAPI.getPredefinedTexts(),
          AppScriptAPI.getStickerUrls(),
          AppScriptAPI.getWatermarkSettings()
        ]);
        setPredefinedTexts(texts);
        setStickersList(stickers);
        setWatermarkSettings(watermark);

        // Fetch saved correction data if they exist
        if (lesson.isSaved) {
          const saved = await AppScriptAPI.getSavedData(lesson.row);
          setImageGrade(saved.imageGrade || '');
          setNotes(saved.notes || '');
          setAdditionalImage(saved.additionalImage || null);
          setAdditionalVideo(saved.video || null);
          setAdditionalAudio(saved.audio || null);
        }

        // Fetch original calligraphy sheet image
        if (lesson.imageFileId) {
          const base64Img = await AppScriptAPI.getMediaAsBase64(lesson.imageFileId);
          const img = new Image();
          img.onload = () => {
            originalImageRef.current = img;
            resetCanvasDimensions(img);
            setLoading(false);
          };
          img.src = base64Img;
        } else {
          // If no student image, create blank white canvas
          const canvas = canvasRef.current;
          if (canvas) {
            canvas.width = 1000;
            canvas.height = 800;
            const ctx = canvas.getContext('2d');
            if (ctx) {
              ctx.fillStyle = '#FFFFFF';
              ctx.fillRect(0, 0, 1000, 800);
            }
          }
          setLoading(false);
        }

      } catch (e) {
        console.error('Error loading data:', e);
        setStatusMessage('حدث خطأ أثناء تحميل الملفات.');
        setLoading(false);
      }
    }
    initAndLoad();
  }, [lesson, scriptUrl]);

  // Redraw whenever canvas elements modify
  useEffect(() => {
    redraw();
  }, [drawnPaths, textStamps, stickerStamps, scale, offsetX, offsetY]);

  const resetCanvasDimensions = (img: HTMLImageElement) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    // Set matching dimensions
    canvas.width = img.width;
    canvas.height = img.height;
    
    setScale(1);
    setOffsetX(0);
    setOffsetY(0);
    redraw();
  };

  // 2. Beautiful vector calligraphy segment algorithm
  const drawChiselSegment = (
    ctx: CanvasRenderingContext2D,
    p0: Point,
    p1: Point,
    nibAngleDeg: number,
    baseWidth: number,
    color: string
  ) => {
    const ang = (nibAngleDeg * Math.PI) / 180.0;
    const nibU = { x: Math.cos(ang), y: Math.sin(ang) };
    const pressure0 = p0.pressure || 1;
    const pressure1 = p1.pressure || 1;

    const dx = p1.x - p0.x;
    const dy = p1.y - p0.y;
    const dist = Math.sqrt(dx * dx + dy * dy);

    // Number of segment divisions to draw completely smooth ink flows
    const steps = Math.max(1, Math.floor(dist / 1.5));
    
    for (let i = 0; i < steps; i++) {
      const t0 = i / steps;
      const t1 = (i + 1) / steps;
      const x0 = p0.x + dx * t0;
      const y0 = p0.y + dy * t0;
      const x1 = p0.x + dx * t1;
      const y1 = p0.y + dy * t1;
      const pr = pressure0 * (1 - t0) + pressure1 * t0;
      const w = baseWidth * pr;
      const half = w / 2;

      const left0 = { x: x0 + nibU.x * half, y: y0 + nibU.y * half };
      const right0 = { x: x0 - nibU.x * half, y: y0 - nibU.y * half };
      const left1 = { x: x1 + nibU.x * half, y: y1 + nibU.y * half };
      const right1 = { x: x1 - nibU.x * half, y: y1 - nibU.y * half };

      ctx.fillStyle = color;
      ctx.beginPath();
      ctx.moveTo(left0.x, left0.y);
      ctx.lineTo(left1.x, left1.y);
      ctx.lineTo(right1.x, right1.y);
      ctx.lineTo(right0.x, right0.y);
      ctx.closePath();
      ctx.fill();
    }
  };

  // 3. Main canvas redraw routine (scales, pans, drawing paths, text and stickers)
  const redraw = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.save();
    
    // Apply viewport modifications (zooming & panning)
    ctx.translate(offsetX, offsetY);
    ctx.scale(scale, scale);

    // Draw Student Calligraphy Image as background
    if (originalImageRef.current) {
      ctx.drawImage(originalImageRef.current, 0, 0);
    } else {
      ctx.fillStyle = '#FFFFFF';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
    }

    // Render Drawn Calligraphy paths (Standard vs Chisel Ink)
    drawnPaths.forEach(path => {
      if (path.isChisel) {
        for (let i = 0; i < path.points.length - 1; i++) {
          drawChiselSegment(ctx, path.points[i], path.points[i + 1], path.nibAngle, path.lineWidth, path.lineColor);
        }
      } else {
        ctx.beginPath();
        ctx.lineWidth = path.lineWidth;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        ctx.strokeStyle = path.lineColor;
        path.points.forEach((point, index) => {
          if (index === 0) {
            ctx.moveTo(point.x, point.y);
          } else {
            ctx.lineTo(point.x, point.y);
          }
        });
        ctx.stroke();
      }
    });

    // Render Sticker stamps
    stickerStamps.forEach(sticker => {
      const img = new Image();
      img.src = sticker.base64;
      // Drawing synchronous is fine since it's cached in memory base64
      try {
        ctx.drawImage(img, sticker.x, sticker.y, sticker.size, sticker.size);
      } catch (e) {
        console.error('Error drawing sticker stamp', e);
      }
    });

    // Render Calligraphy Predefined Texts / Emojis / Feedback stamps
    textStamps.forEach(text => {
      ctx.save();
      ctx.direction = (text.fontFamily === 'Amiri') ? 'rtl' : 'ltr';
      ctx.textAlign = (ctx.direction === 'rtl') ? 'right' : 'left';
      ctx.font = `bold ${text.fontSize}px ${text.fontFamily}`;
      
      const lineHeight = text.fontSize * 1.3;
      const maxWidth = Math.max(...text.lines.map(line => ctx.measureText(line).width));
      const padding = 16;
      
      // Draw background tag bubble for outstanding visibility on handwritten sheets
      const rectWidth = maxWidth + padding * 2;
      const rectX = (ctx.direction === 'rtl') ? text.x - maxWidth - padding : text.x - padding;
      const rectY = text.y - (text.fontSize * 0.8) - padding;
      const rectHeight = text.lines.length * lineHeight + padding * 2;
      
      // Beautiful rounded pill frame for correction comments
      ctx.fillStyle = 'rgba(255, 255, 255, 0.94)';
      ctx.strokeStyle = text.color;
      ctx.lineWidth = 3;
      
      // Round rect
      ctx.beginPath();
      const r = 12; // rounded radius
      ctx.roundRect ? ctx.roundRect(rectX, rectY, rectWidth, rectHeight, r) : ctx.rect(rectX, rectY, rectWidth, rectHeight);
      ctx.fill();
      ctx.stroke();

      // Write feedback phrases
      ctx.fillStyle = '#1C1917'; // Elegant charcoal stone font
      text.lines.forEach((line, idx) => {
        ctx.fillText(line, text.x, text.y + idx * lineHeight);
      });
      ctx.restore();
    });

    ctx.restore();
  };

  // 4. Touch and mouse drawing handlers
  const getCanvasCoordinates = (e: React.MouseEvent | React.TouchEvent | any): { x: number; y: number } => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;

    let clientX = 0;
    let clientY = 0;

    if (e.touches && e.touches.length > 0) {
      clientX = e.touches[0].clientX;
      clientY = e.touches[0].clientY;
    } else {
      clientX = e.clientX;
      clientY = e.clientY;
    }

    const x = (clientX - rect.left) * scaleX;
    const y = (clientY - rect.top) * scaleY;

    // Adjust coordinate system for standard zoom/pan viewport transform offsets
    return {
      x: x / scale - offsetX / scale,
      y: y / scale - offsetY / scale
    };
  };

  const handleStartDraw = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    e.preventDefault();
    const pos = getCanvasCoordinates(e);

    if (activeTab === 'text') {
      if (!selectedText) {
        setStatusMessage('يرجى اختيار العبارة أو النص أولاً لوضعه على اللوحة.');
        return;
      }
      const newText: TextStamp = {
        lines: selectedText.split('\n'),
        x: pos.x,
        y: pos.y,
        color: lineColor,
        fontSize: fontSize,
        fontFamily: fontFamily
      };
      setTextStamps(prev => [...prev, newText]);
      setHistory(prev => [...prev, { type: 'text', index: textStamps.length }]);
      setRedoHistory([]);
      return;
    }

    if (activeTab === 'sticker') {
      if (!selectedSticker) {
        setStatusMessage('يرجى اختيار الشعار أو الملصق أولاً لوضعه على اللوحة.');
        return;
      }
      const newSticker: StickerStamp = {
        x: pos.x - stickerSize / 2,
        y: pos.y - stickerSize / 2,
        base64: selectedSticker,
        size: stickerSize
      };
      setStickerStamps(prev => [...prev, newSticker]);
      setHistory(prev => [...prev, { type: 'sticker', index: stickerStamps.length }]);
      setRedoHistory([]);
      return;
    }

    // Default: Drawing Standard or Chisel Pen path
    isPainting.current = true;
    const newPath: DrawnPath = {
      points: [{ x: pos.x, y: pos.y, pressure: 1 }],
      lineWidth,
      lineColor,
      isChisel,
      nibAngle
    };

    setDrawnPaths(prev => [...prev, newPath]);
    setHistory(prev => [...prev, { type: 'path', index: drawnPaths.length }]);
    setRedoHistory([]);
  };

  const handleDraw = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    if (!isPainting.current || activeTab !== 'draw') return;
    e.preventDefault();
    const pos = getCanvasCoordinates(e);

    setDrawnPaths(prev => {
      if (prev.length === 0) return prev;
      const updated = [...prev];
      const currentPath = updated[updated.length - 1];
      
      // Calculate realistic calligraphy pressure mapping based on ink speeds
      let pressure = 1;
      if (lastX.current !== null && lastY.current !== null) {
        const dx = pos.x - lastX.current;
        const dy = pos.y - lastY.current;
        const velocity = Math.sqrt(dx * dx + dy * dy);
        // Swift calligraphy strokes have thinner ink trails, slower strokes hold deeper ink
        pressure = Math.max(0.4, Math.min(1.4, 12 / (velocity + 6)));
      }

      currentPath.points.push({ x: pos.x, y: pos.y, pressure });
      return updated;
    });

    lastX.current = pos.x;
    lastY.current = pos.y;
  };

  const handleStopDraw = () => {
    isPainting.current = false;
    lastX.current = null;
    lastY.current = null;
  };

  // 5. Drawing Board utility controls
  const handleUndo = () => {
    if (history.length === 0) return;
    const updatedHistory = [...history];
    const lastAction = updatedHistory.pop()!;
    
    setHistory(updatedHistory);

    if (lastAction.type === 'path') {
      const paths = [...drawnPaths];
      const removed = paths.splice(lastAction.index, 1)[0];
      setDrawnPaths(paths);
      setRedoHistory(prev => [...prev, { type: 'path', data: removed }]);
    } else if (lastAction.type === 'text') {
      const texts = [...textStamps];
      const removed = texts.splice(lastAction.index, 1)[0];
      setTextStamps(texts);
      setRedoHistory(prev => [...prev, { type: 'text', data: removed }]);
    } else if (lastAction.type === 'sticker') {
      const stickers = [...stickerStamps];
      const removed = stickers.splice(lastAction.index, 1)[0];
      setStickerStamps(stickers);
      setRedoHistory(prev => [...prev, { type: 'sticker', data: removed }]);
    }
  };

  const handleRedo = () => {
    if (redoHistory.length === 0) return;
    const updatedRedo = [...redoHistory];
    const redoAction = updatedRedo.pop()!;
    setRedoHistory(updatedRedo);

    if (redoAction.type === 'path') {
      setDrawnPaths(prev => [...prev, redoAction.data]);
      setHistory(prev => [...prev, { type: 'path', index: drawnPaths.length }]);
    } else if (redoAction.type === 'text') {
      setTextStamps(prev => [...prev, redoAction.data]);
      setHistory(prev => [...prev, { type: 'text', index: textStamps.length }]);
    } else if (redoAction.type === 'sticker') {
      setStickerStamps(prev => [...prev, redoAction.data]);
      setHistory(prev => [...prev, { type: 'sticker', index: stickerStamps.length }]);
    }
  };

  const handleClear = () => {
    if (window.confirm('هل تريد بالتأكيد تفريغ كافة تصحيحات صبورة الرسم؟')) {
      setDrawnPaths([]);
      setTextStamps([]);
      setStickerStamps([]);
      setHistory([]);
      setRedoHistory([]);
    }
  };

  // Helper: Rotate points 90 degrees around center (very important for student calligraphy phone photos)
  const rotatePoint = (x: number, y: number, cx: number, cy: number): { x: number; y: number } => {
    const dx = x - cx;
    const dy = y - cy;
    return {
      x: -dy + cx,
      y: dx + cy
    };
  };

  const handleRotate = async () => {
    if (!originalImageRef.current) return;
    setStatusMessage('جاري تدوير الصبورة...');

    const img = originalImageRef.current;
    const tempCanvas = document.createElement('canvas');
    const tempCtx = tempCanvas.getContext('2d')!;
    
    // Reverse dimensions
    tempCanvas.width = img.height;
    tempCanvas.height = img.width;

    tempCtx.translate(tempCanvas.width / 2, tempCanvas.height / 2);
    tempCtx.rotate((90 * Math.PI) / 180);
    tempCtx.drawImage(img, -img.width / 2, -img.height / 2);

    const rotatedImg = new Image();
    rotatedImg.onload = () => {
      const oldWidth = img.width;
      const oldHeight = img.height;
      const cx = oldWidth / 2;
      const cy = oldHeight / 2;

      // Map paths and texts to new 90 degree coordinate bounds
      const rotatedPaths = drawnPaths.map(path => ({
        ...path,
        points: path.points.map(pt => rotatePoint(pt.x, pt.y, cx, cy))
      }));

      const rotatedTexts = textStamps.map(txt => {
        const pt = rotatePoint(txt.x, txt.y, cx, cy);
        return { ...txt, x: pt.x, y: pt.y };
      });

      const rotatedStickers = stickerStamps.map(st => {
        const pt = rotatePoint(st.x + st.size / 2, st.y + st.size / 2, cx, cy);
        return { ...st, x: pt.x - st.size / 2, y: pt.y - st.size / 2 };
      });

      originalImageRef.current = rotatedImg;
      setDrawnPaths(rotatedPaths);
      setTextStamps(rotatedTexts);
      setStickerStamps(rotatedStickers);
      
      const canvas = canvasRef.current!;
      canvas.width = rotatedImg.width;
      canvas.height = rotatedImg.height;
      
      setStatusMessage('');
      redraw();
    };
    rotatedImg.src = tempCanvas.toDataURL();
  };

  // 6. Camera Photo & Recording Correction Videos
  const handleUploadImage = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      setAdditionalImage(event.target?.result as string);
    };
    reader.readAsDataURL(file);
  };

  const startCameraCapture = async () => {
    try {
      setCameraActive(true);
      const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: false });
      setVideoStream(stream);
      const videoElem = document.getElementById('camera-preview') as HTMLVideoElement;
      if (videoElem) videoElem.srcObject = stream;
    } catch (err) {
      console.error(err);
      setStatusMessage('الكاميرا غير متاحة، يرجى تفعيل الصلاحيات.');
    }
  };

  const takePhoto = () => {
    const videoElem = document.getElementById('camera-preview') as HTMLVideoElement;
    if (!videoElem || !videoStream) return;

    const tempCanvas = document.createElement('canvas');
    tempCanvas.width = videoElem.videoWidth;
    tempCanvas.height = videoElem.videoHeight;
    tempCanvas.getContext('2d')?.drawImage(videoElem, 0, 0);

    const dataURL = tempCanvas.toDataURL('image/jpeg', 0.85);
    setAdditionalImage(dataURL);

    // Stop camera
    videoStream.getTracks().forEach(track => track.stop());
    setVideoStream(null);
    setCameraActive(false);
  };

  const startVideoRecording = async () => {
    try {
      setRecordingType('video');
      const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
      setVideoStream(stream);
      const videoElem = document.getElementById('video-record-preview') as HTMLVideoElement;
      if (videoElem) videoElem.srcObject = stream;

      const chunks: Blob[] = [];
      const recorder = new MediaRecorder(stream);
      recorder.ondataavailable = (e) => chunks.push(e.data);
      recorder.onstop = () => {
        const blob = new Blob(chunks, { type: 'video/mp4' });
        const reader = new FileReader();
        reader.onload = () => {
          setAdditionalVideo(reader.result as string);
        };
        reader.readAsDataURL(blob);
      };

      recorder.start();
      setMediaRecorder(recorder);
    } catch (err) {
      console.error(err);
      setStatusMessage('تعذر تفعيل الكاميرا لتسجيل الفيديو.');
      setRecordingType('none');
    }
  };

  const stopVideoRecording = () => {
    if (mediaRecorder && mediaRecorder.state !== 'inactive') {
      mediaRecorder.stop();
    }
    if (videoStream) {
      videoStream.getTracks().forEach(track => track.stop());
      setVideoStream(null);
    }
    setRecordingType('none');
  };

  const startAudioRecording = async () => {
    try {
      setRecordingType('audio');
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      setVideoStream(stream);

      const chunks: Blob[] = [];
      const recorder = new MediaRecorder(stream);
      recorder.ondataavailable = (e) => chunks.push(e.data);
      recorder.onstop = () => {
        const blob = new Blob(chunks, { type: 'audio/mp3' });
        const reader = new FileReader();
        reader.onload = () => {
          setAdditionalAudio(reader.result as string);
        };
        reader.readAsDataURL(blob);
      };

      recorder.start();
      setMediaRecorder(recorder);
    } catch (err) {
      console.error(err);
      setStatusMessage('تعذر تفعيل الميكروفون لتسجيل الصوت.');
      setRecordingType('none');
    }
  };

  const stopAudioRecording = () => {
    if (mediaRecorder && mediaRecorder.state !== 'inactive') {
      mediaRecorder.stop();
    }
    if (videoStream) {
      videoStream.getTracks().forEach(track => track.stop());
      setVideoStream(null);
    }
    setRecordingType('none');
  };

  // 7. Dynamic high-quality watermark generator & save operation
  const handleSave = async () => {
    if (!canvasRef.current) return;
    try {
      setSaving(true);
      setStatusMessage('جاري تطبيق مصفوفة العلامات المائية وضغط وحفظ الملفات للشيت...');

      const canvas = canvasRef.current;
      const ctx = canvas.getContext('2d')!;

      // Render the correction canvas to image
      // Let's create a secondary canvas specifically to apply watermarks permanently on the exported file
      const exportCanvas = document.createElement('canvas');
      exportCanvas.width = canvas.width;
      exportCanvas.height = canvas.height;
      const exportCtx = exportCanvas.getContext('2d')!;

      // Copy drawing state onto export
      exportCtx.drawImage(canvas, 0, 0);

      // Apply gorgeous watermark if configured
      if (watermarkSettings && watermarkSettings.textPrefix) {
        const dateStr = new Date().toISOString().split('T')[0];
        const watermarkText = `${watermarkSettings.textPrefix} ${teacherName} | الطالب: ${lesson.studentName} (#${lesson.studentId}) | درس: ${lesson.additionalV || lesson.lessonNumber} | التاريخ: ${dateStr}`;
        
        exportCtx.save();
        exportCtx.direction = 'rtl';
        exportCtx.font = `bold ${watermarkSettings.fontSize || 22}px Amiri, sans-serif`;
        
        const padding = 16;
        const textWidth = exportCtx.measureText(watermarkText).width;
        const textHeight = watermarkSettings.fontSize;
        
        let tx = padding;
        let ty = exportCanvas.height - padding;
        let rx = padding;
        let ry = exportCanvas.height - padding - textHeight - 12;

        if (watermarkSettings.textPosition === 'bottom-right') {
          tx = exportCanvas.width - padding;
          rx = exportCanvas.width - textWidth - padding * 2;
        }

        // Draw translucent container bubble
        exportCtx.fillStyle = 'rgba(255, 255, 255, 0.75)';
        exportCtx.beginPath();
        exportCtx.roundRect ? exportCtx.roundRect(rx - 8, ry, textWidth + 24, textHeight + 20, 8) : exportCtx.rect(rx - 8, ry, textWidth + 24, textHeight + 20);
        exportCtx.fill();

        // Print Text
        exportCtx.fillStyle = '#1A1A1A';
        exportCtx.textAlign = watermarkSettings.textPosition === 'bottom-right' ? 'right' : 'left';
        exportCtx.fillText(watermarkText, tx, ty - 4);
        exportCtx.restore();
      }

      // Convert export to dataURL
      const canvasBase64 = exportCanvas.toDataURL('image/jpeg', 0.9);

      const cleanStudentName = lesson.studentName.replace(/[^a-zA-Z0-9\u0600-\u06FF]/g, '_');
      const canvasFilename = `تصحيح_الخط_${cleanStudentName}_صف_${lesson.row}.jpg`;
      const imageFilename = `مرفق_إضافي_${cleanStudentName}_صف_${lesson.row}.jpg`;
      const videoFilename = `فيديو_تصحيح_${cleanStudentName}_صف_${lesson.row}.mp4`;
      const audioFilename = `تسجيل_صوت_${cleanStudentName}_صف_${lesson.row}.mp3`;

      // Save to Sheet (via our AppScriptAPI)
      await AppScriptAPI.saveAllMedia(
        canvasBase64,
        canvasFilename,
        additionalImage,
        imageFilename,
        additionalVideo,
        videoFilename,
        additionalAudio,
        audioFilename,
        lesson.row,
        notes,
        imageGrade,
        ''
      );

      setStatusMessage('✅ تم حفظ كافة ملفات التصحيح والدرجات بنجاح في قوقل شيت!');
      setTimeout(() => {
        onBack();
      }, 1500);

    } catch (e) {
      console.error(e);
      setStatusMessage('حدث خطأ أثناء الاتصال وحفظ الملفات بالشيت.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div id="image-corrector" className="min-h-screen bg-stone-100 flex flex-col font-sans">
      
      {/* Top Bar Navigation */}
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
              <span className="text-xs font-bold text-purple-600 bg-purple-50 px-2 py-0.5 rounded-md">لوحة الرسم والتصحيح</span>
              <span className="text-xs text-stone-400">صف الشيت: {lesson.row}</span>
            </div>
            <h2 className="text-lg font-bold text-stone-900 mt-0.5">تصحيح خط: {lesson.studentName}</h2>
          </div>
        </div>

        {/* Quick Save Panel */}
        <div className="flex items-center gap-3 w-full sm:w-auto">
          <button
            onClick={() => setShowExtraData(!showExtraData)}
            className="flex-1 sm:flex-none px-4 py-2.5 text-xs font-bold rounded-xl border border-stone-200 text-stone-700 hover:bg-stone-50 flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
          >
            <Info className="w-4 h-4" />
            <span>{showExtraData ? 'إخفاء بيانات الطالب' : 'إظهار بيانات الطالب'}</span>
          </button>
          
          <button
            onClick={handleSave}
            disabled={saving}
            className="flex-1 sm:flex-none px-6 py-2.5 bg-purple-600 hover:bg-purple-700 text-white font-bold text-sm rounded-xl flex items-center justify-center gap-2 shadow-md cursor-pointer transition-colors disabled:opacity-50"
          >
            <Save className="w-4 h-4" />
            <span>{saving ? 'جاري الحفظ...' : 'حفظ التصحيح'}</span>
          </button>
        </div>
      </div>

      {/* Student data popup */}
      {showExtraData && (
        <div className="bg-stone-900 text-stone-100 p-6 shadow-inner border-b border-stone-800 flex flex-wrap gap-6 text-sm">
          <div>
            <span className="text-stone-400 text-xs block">اسم الطالب</span>
            <span className="font-bold text-base mt-0.5 block">{lesson.studentName}</span>
          </div>
          <div>
            <span className="text-stone-400 text-xs block">رقم الطالب</span>
            <span className="font-mono font-bold text-base mt-0.5 block">#{lesson.studentId}</span>
          </div>
          <div>
            <span className="text-stone-400 text-xs block">الدرس الحالي</span>
            <span className="font-bold text-base mt-0.5 block">{lesson.additionalU || 'خط الرقعة'}</span>
          </div>
          <div>
            <span className="text-stone-400 text-xs block">العنوان</span>
            <span className="font-bold text-base mt-0.5 block">{lesson.additionalV || 'حروف مفرقة'}</span>
          </div>
          <div>
            <span className="text-stone-400 text-xs block">ملاحظات سابقة بالشيت</span>
            <span className="font-bold text-base mt-0.5 block">{lesson.additionalW || 'لا يوجد'}</span>
          </div>
        </div>
      )}

      {/* Workspace Area: Left Canvas, Right Toolbar */}
      <div className="flex-1 flex flex-col lg:flex-row overflow-hidden relative">
        
        {/* Workspace Canvas Block */}
        <div className="flex-1 flex flex-col p-4 md:p-6 overflow-auto items-center justify-center bg-stone-200/50 relative">
          
          {loading ? (
            <div className="text-center space-y-3">
              <div className="inline-block animate-spin rounded-full h-8 w-8 border-4 border-purple-600 border-t-transparent" />
              <p className="text-stone-500 font-bold">جاري تحميل صورة كراسة الخط والستيكرات...</p>
            </div>
          ) : (
            <div className="relative shadow-2xl rounded-xl overflow-hidden border border-stone-300 max-w-full bg-white flex items-center justify-center">
              {/* Whiteboard canvas container */}
              <canvas
                ref={canvasRef}
                onMouseDown={handleStartDraw}
                onMouseMove={handleDraw}
                onMouseUp={handleStopDraw}
                onMouseLeave={handleStopDraw}
                onTouchStart={handleStartDraw}
                onTouchMove={handleDraw}
                onTouchEnd={handleStopDraw}
                className="block max-w-full cursor-crosshair touch-none select-none bg-stone-50"
              />
            </div>
          )}

          {/* Quick status toast */}
          {statusMessage && (
            <div className="absolute bottom-6 left-1/2 -translate-x-1/2 bg-stone-900 text-stone-100 px-6 py-3 rounded-2xl shadow-xl text-xs font-semibold flex items-center gap-2 border border-stone-850">
              <Sparkles className="w-4 h-4 text-primary-400 shrink-0" />
              <p>{statusMessage}</p>
            </div>
          )}
        </div>

        {/* Workspace Toolbar Control Right Block */}
        <div className="w-full lg:w-96 bg-white border-t lg:border-t-0 lg:border-r border-stone-200 flex flex-col overflow-y-auto">
          
          {/* Section Selector Tabs */}
          <div className="flex border-b border-stone-200 bg-stone-50/50">
            <button
              onClick={() => setActiveTab('draw')}
              className={`flex-1 py-3 text-xs font-bold border-b-2 flex flex-col items-center gap-1 transition-colors cursor-pointer ${activeTab === 'draw' ? 'border-purple-600 text-purple-600' : 'border-transparent text-stone-500 hover:text-stone-800'}`}
            >
              <Sliders className="w-4 h-4" />
              <span>أدوات الرسم</span>
            </button>
            <button
              onClick={() => setActiveTab('text')}
              className={`flex-1 py-3 text-xs font-bold border-b-2 flex flex-col items-center gap-1 transition-colors cursor-pointer ${activeTab === 'text' ? 'border-purple-600 text-purple-600' : 'border-transparent text-stone-500 hover:text-stone-800'}`}
            >
              <Type className="w-4 h-4" />
              <span>عبارات جاهزة</span>
            </button>
            <button
              onClick={() => setActiveTab('sticker')}
              className={`flex-1 py-3 text-xs font-bold border-b-2 flex flex-col items-center gap-1 transition-colors cursor-pointer ${activeTab === 'sticker' ? 'border-purple-600 text-purple-600' : 'border-transparent text-stone-500 hover:text-stone-800'}`}
            >
              <Stamp className="w-4 h-4" />
              <span>أختام / ملصقات</span>
            </button>
            <button
              onClick={() => setActiveTab('media')}
              className={`flex-1 py-3 text-xs font-bold border-b-2 flex flex-col items-center gap-1 transition-colors cursor-pointer ${activeTab === 'media' ? 'border-purple-600 text-purple-600' : 'border-transparent text-stone-500 hover:text-stone-800'}`}
            >
              <Camera className="w-4 h-4" />
              <span>تسجيل الملاحظات</span>
            </button>
          </div>

          <div className="p-6 flex-1 space-y-6">
            
            {/* Draw Pen Tools panel */}
            {activeTab === 'draw' && (
              <div className="space-y-6">
                
                {/* Pencil style selector (standard vs calligraphy chisel) */}
                <div className="space-y-2">
                  <label className="text-xs font-semibold text-stone-400 block">أسلوب القلم</label>
                  <div className="grid grid-cols-2 gap-2 bg-stone-100 p-1 rounded-xl">
                    <button
                      onClick={() => setIsChisel(true)}
                      className={`py-2 text-xs font-bold rounded-lg cursor-pointer transition-all ${isChisel ? 'bg-white shadow-sm text-purple-700' : 'text-stone-500 hover:text-stone-900'}`}
                    >
                      🖋️ قلم مشطوف (خط عربي)
                    </button>
                    <button
                      onClick={() => setIsChisel(false)}
                      className={`py-2 text-xs font-bold rounded-lg cursor-pointer transition-all ${!isChisel ? 'bg-white shadow-sm text-purple-700' : 'text-stone-500 hover:text-stone-900'}`}
                    >
                      ✏️ قلم مدبب (تصحيح عادي)
                    </button>
                  </div>
                </div>

                {/* Nib Chisel Angle */}
                {isChisel && (
                  <div className="space-y-2">
                    <div className="flex justify-between text-xs font-semibold text-stone-600">
                      <span>زاوية الشطفة</span>
                      <span className="font-mono">{nibAngle}°</span>
                    </div>
                    <input
                      type="range"
                      min="0"
                      max="180"
                      value={nibAngle}
                      onChange={(e) => setNibAngle(Number(e.target.value))}
                      className="w-full h-1 bg-stone-200 rounded-lg appearance-none cursor-pointer accent-purple-600"
                    />
                  </div>
                )}

                {/* Brush Width */}
                <div className="space-y-2">
                  <div className="flex justify-between text-xs font-semibold text-stone-600">
                    <span>سمك القلم</span>
                    <span className="font-mono">{lineWidth}px</span>
                  </div>
                  <input
                    type="range"
                    min="4"
                    max="100"
                    value={lineWidth}
                    onChange={(e) => setLineWidth(Number(e.target.value))}
                    className="w-full h-1 bg-stone-200 rounded-lg appearance-none cursor-pointer accent-purple-600"
                  />
                  {/* Realtime Pen preview */}
                  <div className="flex justify-center items-center py-4 bg-stone-50 border border-stone-100 rounded-xl">
                    <div 
                      className="rounded-full bg-purple-600 transition-all"
                      style={{ 
                        width: `${lineWidth}px`, 
                        height: `${lineWidth}px`,
                        backgroundColor: lineColor,
                        transform: isChisel ? `rotate(${nibAngle}deg) scaleX(0.25)` : 'none'
                      }}
                    />
                  </div>
                </div>

                {/* Traditional Inks color palette */}
                <div className="space-y-2">
                  <label className="text-xs font-semibold text-stone-400 block">لون الحبر الكلاسيكي</label>
                  <div className="flex flex-wrap gap-2.5">
                    {[
                      { hex: '#E11D48', label: 'أحمر إنذار' },
                      { hex: '#1C1917', label: 'أسود فحمي' },
                      { hex: '#16A34A', label: 'أخضر ياقوتي' },
                      { hex: '#D97706', label: 'أصفر ذهبي' },
                      { hex: '#2563EB', label: 'أزرق ملكي' },
                    ].map(ink => (
                      <button
                        key={ink.hex}
                        onClick={() => setLineColor(ink.hex)}
                        className={`w-10 h-10 rounded-full border-2 transition-all flex items-center justify-center cursor-pointer ${lineColor === ink.hex ? 'border-stone-900 scale-110 shadow-md' : 'border-transparent'}`}
                        style={{ backgroundColor: ink.hex }}
                        title={ink.label}
                      >
                        {lineColor === ink.hex && <Check className="w-5 h-5 text-white stroke-[3px]" />}
                      </button>
                    ))}
                    {/* Custom Color Picker */}
                    <input
                      type="color"
                      value={lineColor}
                      onChange={(e) => setLineColor(e.target.value)}
                      className="w-10 h-10 rounded-full border-2 border-stone-200 cursor-pointer overflow-hidden shadow-sm"
                    />
                  </div>
                </div>

                {/* Operations */}
                <div className="space-y-2 pt-4 border-t border-stone-100">
                  <label className="text-xs font-semibold text-stone-400 block">إجراءات الصبورة</label>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      onClick={handleUndo}
                      className="py-2.5 px-3 rounded-xl border border-stone-200 hover:bg-stone-50 text-stone-700 text-xs font-bold flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                    >
                      <Undo2 className="w-4 h-4 text-purple-600" />
                      <span>تراجع</span>
                    </button>
                    <button
                      onClick={handleRedo}
                      className="py-2.5 px-3 rounded-xl border border-stone-200 hover:bg-stone-50 text-stone-700 text-xs font-bold flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                    >
                      <Redo2 className="w-4 h-4 text-purple-600" />
                      <span>إعادة</span>
                    </button>
                    <button
                      onClick={handleRotate}
                      className="py-2.5 px-3 rounded-xl border border-stone-200 hover:bg-stone-50 text-stone-700 text-xs font-bold flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                    >
                      <RotateCw className="w-4 h-4 text-purple-600" />
                      <span>تدوير الصورة</span>
                    </button>
                    <button
                      onClick={handleClear}
                      className="py-2.5 px-3 rounded-xl border border-red-100 bg-red-50 hover:bg-red-100 text-red-700 text-xs font-bold flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                    >
                      <Eraser className="w-4 h-4" />
                      <span>مسح الكل</span>
                    </button>
                  </div>
                </div>

              </div>
            )}

            {/* Quick pre-defined text stamper */}
            {activeTab === 'text' && (
              <div className="space-y-4">
                <div className="p-3 bg-stone-50 border border-stone-100 rounded-xl text-xs text-stone-500 leading-relaxed flex gap-2">
                  <Info className="w-4 h-4 text-purple-500 shrink-0 mt-0.5" />
                  <span>اختر العبارة المطلوبة من الأسفل، ثم انقر على صبورة الرسم في المكان المناسب لختمها وحفظها فوق كراسة الطالب.</span>
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-semibold text-stone-400 block">الحجم والخط للختم</label>
                  <div className="grid grid-cols-2 gap-2">
                    <select
                      value={fontSize}
                      onChange={(e) => setFontSize(Number(e.target.value))}
                      className="p-2.5 border border-stone-200 rounded-xl text-xs font-semibold bg-white"
                    >
                      <option value="20">صغير جداً (20px)</option>
                      <option value="28">صغير (28px)</option>
                      <option value="36">متوسط (36px)</option>
                      <option value="48">كبير (48px)</option>
                      <option value="64">ضخم (64px)</option>
                    </select>
                    <select
                      value={fontFamily}
                      onChange={(e) => setFontFamily(e.target.value)}
                      className="p-2.5 border border-stone-200 rounded-xl text-xs font-semibold bg-white"
                    >
                      <option value="Amiri">خط أميري (عربي)</option>
                      <option value="Tajawal">خط تجول (حديث)</option>
                    </select>
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-semibold text-stone-400 block">العبارات المتاحة للختم</label>
                  <div className="space-y-2">
                    {predefinedTexts.map((item, idx) => (
                      <button
                        key={idx}
                        onClick={() => setSelectedText(item.phrase)}
                        className={`w-full text-right p-3 rounded-xl border text-xs leading-relaxed transition-all cursor-pointer ${selectedText === item.phrase ? 'bg-purple-50 border-purple-500 text-purple-800 font-semibold' : 'bg-white border-stone-200 text-stone-700 hover:bg-stone-50'}`}
                      >
                        <span className="font-bold block text-stone-900 mb-0.5">{item.title}</span>
                        <span>{item.phrase}</span>
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* Traditional Stamps Seals panel */}
            {activeTab === 'sticker' && (
              <div className="space-y-4">
                <div className="p-3 bg-stone-50 border border-stone-100 rounded-xl text-xs text-stone-500 leading-relaxed flex gap-2">
                  <Info className="w-4 h-4 text-purple-500 shrink-0 mt-0.5" />
                  <span>اختر الختم أو التقييم المطلوب من الأسفل، ثم انقر على الصبورة لختمها.</span>
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-semibold text-stone-400 block">حجم الختم</label>
                  <select
                    value={stickerSize}
                    onChange={(e) => setStickerSize(Number(e.target.value))}
                    className="w-full p-2.5 border border-stone-200 rounded-xl text-xs font-semibold bg-white"
                  >
                    <option value="100">صغير جداً (100px)</option>
                    <option value="180">صغير (180px)</option>
                    <option value="260">متوسط (260px)</option>
                    <option value="360">كبير (360px)</option>
                  </select>
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-semibold text-stone-400 block">الملصقات المتوفرة بالشيت</label>
                  <div className="grid grid-cols-3 gap-3">
                    {stickersList.map((stickerUrl, idx) => (
                      <button
                        key={idx}
                        onClick={() => setSelectedSticker(stickerUrl)}
                        className={`p-2 rounded-xl border bg-white transition-all overflow-hidden flex items-center justify-center cursor-pointer ${selectedSticker === stickerUrl ? 'border-purple-500 ring-2 ring-purple-100 scale-105' : 'border-stone-200 hover:border-stone-300'}`}
                      >
                        <img src={stickerUrl} alt="Sticker Seal" className="max-h-16 object-contain" />
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* Media Uploads / Grading / Notes */}
            {activeTab === 'media' && (
              <div className="space-y-6">
                
                {/* Grading form */}
                <div className="space-y-4">
                  <div className="space-y-2">
                    <label className="text-xs font-semibold text-stone-700 block">الدرجة والتقييم للرسم / الصورة</label>
                    <input
                      type="text"
                      dir="rtl"
                      value={imageGrade}
                      onChange={(e) => setImageGrade(e.target.value)}
                      placeholder="أدخل درجة الطالب (مثال: ممتاز، 10/10)"
                      className="block w-full px-4 py-2.5 border border-stone-300 rounded-xl shadow-sm focus:outline-none focus:ring-2 focus:ring-purple-500 text-stone-900 text-sm"
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="text-xs font-semibold text-stone-700 block">الملاحظات والتوجيهات</label>
                    <textarea
                      dir="rtl"
                      rows={3}
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                      placeholder="اكتب التوجيهات أو الملاحظات التي ستظهر للطالب في الشيت..."
                      className="block w-full px-4 py-2.5 border border-stone-300 rounded-xl shadow-sm focus:outline-none focus:ring-2 focus:ring-purple-500 text-stone-900 text-sm"
                    />
                  </div>
                </div>

                {/* Additional file attachment controls */}
                <div className="space-y-4 pt-4 border-t border-stone-100">
                  <label className="text-xs font-semibold text-stone-400 block">مرفقات التصحيح الإضافية (اختياري)</label>
                  
                  {/* Image attachment */}
                  <div className="space-y-2">
                    <span className="text-xs font-semibold text-stone-600 block">1. صورة تصحيح إضافية</span>
                    
                    {additionalImage ? (
                      <div className="relative rounded-xl overflow-hidden border border-stone-200">
                        <img src={additionalImage} alt="Additional attachment" className="max-h-32 w-full object-cover" />
                        <button
                          onClick={() => setAdditionalImage(null)}
                          className="absolute top-2 right-2 p-1.5 rounded-lg bg-red-600 text-white shadow hover:bg-red-700 transition-colors cursor-pointer"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    ) : (
                      <div className="flex gap-2">
                        {cameraActive ? (
                          <div className="w-full space-y-2">
                            <video id="camera-preview" autoplay playsinline className="w-full max-h-48 bg-black rounded-xl" />
                            <button
                              onClick={takePhoto}
                              className="w-full py-2 bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs rounded-xl flex items-center justify-center gap-1.5 cursor-pointer"
                            >
                              <Camera className="w-4 h-4" />
                              <span>التقاط صورة الآن</span>
                            </button>
                          </div>
                        ) : (
                          <>
                            <button
                              onClick={startCameraCapture}
                              className="flex-1 py-2.5 px-3 rounded-xl border border-stone-200 hover:bg-stone-50 text-stone-700 text-xs font-bold flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                            >
                              <Camera className="w-4 h-4 text-purple-600" />
                              <span>تصوير كاميرا</span>
                            </button>
                            <label className="flex-1 py-2.5 px-3 rounded-xl border border-stone-200 hover:bg-stone-50 text-stone-700 text-xs font-bold flex items-center justify-center gap-1.5 transition-colors cursor-pointer text-center">
                              <Upload className="w-4 h-4 text-purple-600 shrink-0" />
                              <span>رفع ملف</span>
                              <input type="file" accept="image/*" onChange={handleUploadImage} className="hidden" />
                            </label>
                          </>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Video attachment */}
                  <div className="space-y-2">
                    <span className="text-xs font-semibold text-stone-600 block">2. فيديو تصحيح من المدرس</span>
                    
                    {additionalVideo ? (
                      <div className="relative rounded-xl overflow-hidden border border-stone-200">
                        <video src={additionalVideo} controls className="max-h-32 w-full bg-black" />
                        <button
                          onClick={() => setAdditionalVideo(null)}
                          className="absolute top-2 right-2 p-1.5 rounded-lg bg-red-600 text-white shadow hover:bg-red-700 transition-colors cursor-pointer"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    ) : (
                      <div className="space-y-2">
                        {recordingType === 'video' ? (
                          <div className="space-y-2">
                            <video id="video-record-preview" autoplay playsinline muted className="w-full max-h-32 bg-black rounded-xl" />
                            <button
                              onClick={stopVideoRecording}
                              className="w-full py-2.5 bg-red-600 hover:bg-red-700 text-white font-bold text-xs rounded-xl flex items-center justify-center gap-1.5 cursor-pointer"
                            >
                              <StopCircle className="w-4 h-4" />
                              <span>إيقاف وحفظ الفيديو</span>
                            </button>
                          </div>
                        ) : (
                          <button
                            onClick={startVideoRecording}
                            className="w-full py-2.5 px-3 rounded-xl border border-stone-200 hover:bg-stone-50 text-stone-700 text-xs font-bold flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                          >
                            <Video className="w-4 h-4 text-purple-600" />
                            <span>تسجيل فيديو تصحيح مباشر</span>
                          </button>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Audio Feedback */}
                  <div className="space-y-2">
                    <span className="text-xs font-semibold text-stone-600 block">3. تسجيل صوتي من المدرس</span>

                    {additionalAudio ? (
                      <div className="relative rounded-xl p-3 bg-stone-50 border border-stone-200 flex items-center gap-2">
                        <audio src={additionalAudio} controls className="w-full" />
                        <button
                          onClick={() => setAdditionalAudio(null)}
                          className="p-1.5 rounded-lg bg-red-600 text-white hover:bg-red-700 transition-colors cursor-pointer"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    ) : (
                      <div className="space-y-2">
                        {recordingType === 'audio' ? (
                          <button
                            onClick={stopAudioRecording}
                            className="w-full py-2.5 bg-red-600 hover:bg-red-700 text-white font-bold text-xs rounded-xl flex items-center justify-center gap-1.5 cursor-pointer"
                          >
                            <StopCircle className="w-4 h-4 animate-pulse" />
                            <span>إيقاف وحفظ التسجيل الصوتي</span>
                          </button>
                        ) : (
                          <button
                            onClick={startAudioRecording}
                            className="w-full py-2.5 px-3 rounded-xl border border-stone-200 hover:bg-stone-50 text-stone-700 text-xs font-bold flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                          >
                            <Volume2 className="w-4 h-4 text-purple-600" />
                            <span>بدء تسجيل صوتي</span>
                          </button>
                        )}
                      </div>
                    )}
                  </div>

                </div>

              </div>
            )}

          </div>
        </div>

      </div>

    </div>
  );
}
