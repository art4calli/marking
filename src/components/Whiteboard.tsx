/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useRef, useEffect } from 'react';
import { 
  DrawingPath, DrawingPoint, StickerItem, TextItem, HistoryItem, 
  StudentItem, PredefinedText, WatermarkSettings 
} from '../types';
import { 
  MOCK_PREDEFINED_TEXTS, MOCK_STICKERS, generateMockCalligraphy 
} from '../mockData';
import { 
  Undo2, Redo2, Trash2, RotateCw, RefreshCw, ZoomIn, ZoomOut, 
  Move, Pencil, Stamp, Type, ArrowLeft, Save, Sparkles, Check, 
  FolderOpen, AlertCircle, Info, Image as ImageIcon, CheckCircle, Flame,
  Video, X
} from 'lucide-react';

interface WhiteboardProps {
  student: StudentItem;
  teacherName: string;
  watermarkSettings: WatermarkSettings;
  apiURL: string;
  onBack: () => void;
  onSaveSuccess: (updatedStudent: StudentItem) => void;
}

export default function Whiteboard({ 
  student, teacherName, watermarkSettings, apiURL, onBack, onSaveSuccess 
}: WhiteboardProps) {
  
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);

  // Drawing State
  const [painting, setPainting] = useState(false);
  const [currentMode, setCurrentMode] = useState<'draw' | 'pan' | 'sticker' | 'text'>('draw');
  const [isChiselMode, setIsChiselMode] = useState(true);
  const [lineWidth, setLineWidth] = useState(24);
  const [lineColor, setLineColor] = useState('#D32F2F'); // Beautiful classical red correction ink
  const [nibAngle, setNibAngle] = useState(75); // Caligraphy Thuluth/Naskh angle is around 70-80 degrees
  
  // Canvas State (Zoom & Pan)
  const [scale, setScale] = useState(1);
  const [offsetX, setOffsetX] = useState(0);
  const [offsetY, setOffsetY] = useState(0);
  const [dragStart, setDragStart] = useState<{ x: number; y: number } | null>(null);

  // Vector data stacks
  const [drawnPaths, setDrawnPaths] = useState<DrawingPath[]>([]);
  const [stickers, setStickers] = useState<StickerItem[]>([]);
  const [texts, setTexts] = useState<TextItem[]>([]);
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [redoHistory, setRedoHistory] = useState<HistoryItem[]>([]);

  // Selection presets
  const [selectedSticker, setSelectedSticker] = useState<string>(MOCK_STICKERS[0].base64);
  const [selectedText, setSelectedText] = useState<string>(MOCK_PREDEFINED_TEXTS[0].phrase);
  const [fontSize, setFontSize] = useState(32);
  const [fontFamily, setFontFamily] = useState('Amiri');
  const [stickerSize, setStickerSize] = useState(120);

  // Media capture feedback references
  const [additionalImage, setAdditionalImage] = useState<string | null>(null);
  const [additionalVideo, setAdditionalVideo] = useState<string | null>(null);
  const [additionalAudio, setAdditionalAudio] = useState<string | null>(null);

  // Grading details
  const [grade, setGrade] = useState('');
  const [notes, setNotes] = useState('');
  
  // Image Loading State
  const [bgImage, setBgImage] = useState<HTMLImageElement | null>(null);
  const [imageError, setImageError] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveStatus, setSaveStatus] = useState('');
  const [originalMediaUrl, setOriginalMediaUrl] = useState<string | null>(null);
  const [showOriginalMedia, setShowOriginalMedia] = useState(false);

  // Trace variables for drawing smooth vector lines
  const lastPointRef = useRef<DrawingPoint | null>(null);

  // Load the background student submission image
  useEffect(() => {
    loadImage();
  }, [student]);

  const loadImage = async () => {
    setImageError(false);
    const img = new Image();
    img.crossOrigin = 'anonymous';

    // If real API fileId exists, load from Google Drive Base64 via Apps Script
    if (apiURL && student.imageFileId && !student.imageFileId.startsWith('mock_')) {
      try {
        setSaveStatus('جاري تحميل صورة كراسة الطالب من قوقل درايف...');
        const response = await fetch(`${apiURL}?action=getMediaAsBase64&fileId=${student.imageFileId}`);
        const data = await response.json();
        if (data.base64) {
          img.src = data.base64;
          setOriginalMediaUrl(data.base64);
        } else {
          throw new Error('No base64 image returned');
        }
      } catch (err) {
        console.error('Failed to load image from API, fallback to local gen', err);
        img.src = generateMockCalligraphy(student.studentId.toString());
      } finally {
        setSaveStatus('');
      }
    } else {
      // Simulator Mode: generate a high fidelity vector mock calligraphy sheet based on the student's ID!
      img.src = generateMockCalligraphy(student.studentId.toString());
      setOriginalMediaUrl(img.src);
    }

    img.onload = () => {
      setBgImage(img);
      resetZoomAndPan(img);
    };

    img.onerror = () => {
      setImageError(true);
      // Fallback generator
      const fallbackImg = new Image();
      fallbackImg.src = generateMockCalligraphy('default');
      fallbackImg.onload = () => {
        setBgImage(fallbackImg);
        resetZoomAndPan(fallbackImg);
      };
    };
  };

  const resetZoomAndPan = (img: HTMLImageElement) => {
    if (!containerRef.current) return;
    const containerWidth = containerRef.current.clientWidth;
    const containerHeight = containerRef.current.clientHeight || 500;
    
    // Scale to fit screen elegantly
    const scaleX = containerWidth / img.width;
    const scaleY = containerHeight / img.height;
    const fitScale = Math.min(scaleX, scaleY, 1) * 0.95;

    setScale(fitScale);
    setOffsetX((containerWidth - img.width * fitScale) / 2);
    setOffsetY((containerHeight - img.height * fitScale) / 2);
  };

  // Canvas drawing handler
  useEffect(() => {
    drawCanvas();
  }, [bgImage, scale, offsetX, offsetY, drawnPaths, stickers, texts, currentMode]);

  const drawCanvas = () => {
    const canvas = canvasRef.current;
    if (!canvas || !bgImage) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Set high-DPI scaling
    canvas.width = bgImage.width;
    canvas.height = bgImage.height;

    // Clear Canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Save Context for Zoom/Pan Transformation
    ctx.save();
    
    // Draw Background
    ctx.drawImage(bgImage, 0, 0);

    // Draw Drawn Paths (Vector lines)
    drawnPaths.forEach(path => {
      if (path.isChisel) {
        // High fidelity simulated calligraphy chisel strokes!
        for (let i = 0; i < path.points.length - 1; i++) {
          drawChiselSegment(ctx, path.points[i], path.points[i + 1], path.nibAngle, path.lineWidth, path.lineColor);
        }
      } else {
        // Standard rounded brush
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

    // Draw Stamps/Stickers
    stickers.forEach(sticker => {
      const img = new Image();
      img.src = sticker.base64;
      if (img.complete) {
        ctx.drawImage(img, sticker.x - sticker.size/2, sticker.y - sticker.size/2, sticker.size, sticker.size);
      } else {
        img.onload = () => drawCanvas();
      }
    });

    // Draw Texts
    texts.forEach(text => {
      ctx.save();
      ctx.direction = 'rtl';
      ctx.textAlign = 'right';
      ctx.font = `bold ${text.fontSize}px 'Amiri', 'Tajawal', serif`;
      
      const lineHeight = text.fontSize * 1.3;
      
      // Calculate background bounding box
      let maxLineWidth = 0;
      text.lines.forEach(line => {
        const metrics = ctx.measureText(line);
        if (metrics.width > maxLineWidth) maxLineWidth = metrics.width;
      });

      const padding = 12;
      const rectWidth = maxLineWidth + padding * 2;
      const rectHeight = text.lines.length * lineHeight + padding * 2;

      // Draw background plate with classical parchment/paper color
      if (text.background.enabled) {
        ctx.fillStyle = text.background.color;
        ctx.shadowColor = 'rgba(0,0,0,0.1)';
        ctx.shadowBlur = 8;
        ctx.shadowOffsetY = 4;
        ctx.beginPath();
        // Rounded corners
        const rx = text.x - rectWidth;
        const ry = text.y - text.fontSize;
        ctx.roundRect(rx, ry, rectWidth, rectHeight, 10);
        ctx.fill();
        ctx.strokeStyle = 'rgba(140, 98, 57, 0.3)';
        ctx.lineWidth = 1;
        ctx.stroke();
      }

      // Draw text strokes
      ctx.shadowColor = 'transparent';
      ctx.fillStyle = text.color;
      text.lines.forEach((line, index) => {
        ctx.fillText(line, text.x - padding, text.y + (index + 0.5) * lineHeight);
      });

      ctx.restore();
    });

    ctx.restore();
  };

  // Calligraphy Chisel Stroke interpolation helper
  // Draws filled polygon trapezoids for smooth calligraphic ink flow
  const drawChiselSegment = (
    ctx: CanvasRenderingContext2D, 
    p0: DrawingPoint, 
    p1: DrawingPoint, 
    angleDeg: number, 
    baseWidth: number, 
    color: string
  ) => {
    const angleRad = (angleDeg * Math.PI) / 180.0;
    const nibVector = { x: Math.cos(angleRad), y: Math.sin(angleRad) };
    
    const dx = p1.x - p0.x;
    const dy = p1.y - p0.y;
    const dist = Math.sqrt(dx*dx + dy*dy);
    
    // Number of interpolated steps to ensure a completely smooth continuous stroke
    const steps = Math.max(1, Math.floor(dist / 1.5));
    
    ctx.fillStyle = color;
    
    for (let i = 0; i < steps; i++) {
      const t0 = i / steps;
      const t1 = (i + 1) / steps;
      
      const x0 = p0.x + dx * t0;
      const y0 = p0.y + dy * t0;
      const x1 = p0.x + dx * t1;
      const y1 = p0.y + dy * t1;
      
      const w = baseWidth;
      const half = w / 2;
      
      // Calculate 4 corners of the trapezoid polygon representing the calligraphy nib
      const left0 = { x: x0 + nibVector.x * half, y: y0 + nibVector.y * half };
      const right0 = { x: x0 - nibVector.x * half, y: y0 - nibVector.y * half };
      const left1 = { x: x1 + nibVector.x * half, y: y1 + nibVector.y * half };
      const right1 = { x: x1 - nibVector.x * half, y: y1 - nibVector.y * half };
      
      ctx.beginPath();
      ctx.moveTo(left0.x, left0.y);
      ctx.lineTo(left1.x, left1.y);
      ctx.lineTo(right1.x, right1.y);
      ctx.lineTo(right0.x, right0.y);
      ctx.closePath();
      ctx.fill();
    }
  };

  // Convert client cursor coordinates to zoomed/panned Canvas coordinates
  const getCanvasCoords = (clientX: number, clientY: number): { x: number; y: number } => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    
    // Scale of client CSS size to canvas internal dimensions
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    
    const x = (clientX - rect.left) * scaleX;
    const y = (clientY - rect.top) * scaleY;
    
    return { x, y };
  };

  // Mouse & Touch Interaction Handlers
  const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (currentMode === 'pan') {
      setDragStart({ x: e.clientX, y: e.clientY });
      return;
    }

    const coords = getCanvasCoords(e.clientX, e.clientY);

    if (currentMode === 'sticker') {
      // Place sticker stamp
      const newSticker: StickerItem = {
        x: coords.x,
        y: coords.y,
        base64: selectedSticker,
        size: stickerSize
      };
      const updated = [...stickers, newSticker];
      setStickers(updated);
      setHistory(prev => [...prev, { type: 'sticker', data: newSticker, index: updated.length - 1 }]);
      setRedoHistory([]);
      return;
    }

    if (currentMode === 'text') {
      // Place feedback text stamp
      const newText: TextItem = {
        lines: selectedText.split('\n'),
        x: coords.x,
        y: coords.y,
        color: lineColor,
        fontSize: fontSize,
        fontFamily: fontFamily,
        background: { enabled: true, color: '#FFFDF6' }
      };
      const updated = [...texts, newText];
      setTexts(updated);
      setHistory(prev => [...prev, { type: 'text', data: newText, index: updated.length - 1 }]);
      setRedoHistory([]);
      return;
    }

    if (currentMode === 'draw') {
      setPainting(true);
      const startPoint: DrawingPoint = { x: coords.x, y: coords.y, pressure: 1 };
      lastPointRef.current = startPoint;

      const newPath: DrawingPath = {
        points: [startPoint],
        lineWidth,
        lineColor,
        isChisel: isChiselMode,
        nibAngle
      };
      
      setDrawnPaths(prev => [...prev, newPath]);
    }
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (currentMode === 'pan' && dragStart) {
      const dx = e.clientX - dragStart.x;
      const dy = e.clientY - dragStart.y;
      setOffsetX(prev => prev + dx);
      setOffsetY(prev => prev + dy);
      setDragStart({ x: e.clientX, y: e.clientY });
      return;
    }

    if (currentMode === 'draw' && painting && lastPointRef.current) {
      const coords = getCanvasCoords(e.clientX, e.clientY);
      const nextPoint: DrawingPoint = { x: coords.x, y: coords.y, pressure: 1 };
      
      // Append point to active path
      setDrawnPaths(prev => {
        const copy = [...prev];
        if (copy.length > 0) {
          copy[copy.length - 1].points.push(nextPoint);
        }
        return copy;
      });
      lastPointRef.current = nextPoint;
    }
  };

  const handleMouseUp = () => {
    if (painting && currentMode === 'draw') {
      const paths = [...drawnPaths];
      if (paths.length > 0) {
        setHistory(prev => [...prev, { type: 'path', data: paths[paths.length - 1], index: paths.length - 1 }]);
        setRedoHistory([]);
      }
    }
    setPainting(false);
    setDragStart(null);
    lastPointRef.current = null;
  };

  // Touch handlers for mobile/tablet calligraphy grading!
  const handleTouchStart = (e: React.TouchEvent<HTMLCanvasElement>) => {
    if (e.touches.length === 2) {
      // Pinch/Pan touch mode initiated by 2 fingers
      setPainting(false);
      const t1 = e.touches[0];
      const t2 = e.touches[1];
      const dist = Math.hypot(t2.clientX - t1.clientX, t2.clientY - t1.clientY);
      const midX = (t1.clientX + t2.clientX) / 2;
      const midY = (t1.clientY + t2.clientY) / 2;
      
      // Store reference
      (e as any).lastTouchDist = dist;
      (e as any).lastTouchMid = { x: midX, y: midY };
      return;
    }

    if (e.touches.length === 1) {
      const touch = e.touches[0];
      if (currentMode === 'pan') {
        setDragStart({ x: touch.clientX, y: touch.clientY });
        return;
      }

      const coords = getCanvasCoords(touch.clientX, touch.clientY);

      if (currentMode === 'sticker') {
        const newSticker: StickerItem = {
          x: coords.x,
          y: coords.y,
          base64: selectedSticker,
          size: stickerSize
        };
        const updated = [...stickers, newSticker];
        setStickers(updated);
        setHistory(prev => [...prev, { type: 'sticker', data: newSticker, index: updated.length - 1 }]);
        setRedoHistory([]);
        return;
      }

      if (currentMode === 'text') {
        const newText: TextItem = {
          lines: selectedText.split('\n'),
          x: coords.x,
          y: coords.y,
          color: lineColor,
          fontSize: fontSize,
          fontFamily: fontFamily,
          background: { enabled: true, color: '#FFFDF6' }
        };
        const updated = [...texts, newText];
        setTexts(updated);
        setHistory(prev => [...prev, { type: 'text', data: newText, index: updated.length - 1 }]);
        setRedoHistory([]);
        return;
      }

      if (currentMode === 'draw') {
        setPainting(true);
        const startPoint: DrawingPoint = { x: coords.x, y: coords.y, pressure: touch.force || 1 };
        lastPointRef.current = startPoint;

        const newPath: DrawingPath = {
          points: [startPoint],
          lineWidth,
          lineColor,
          isChisel: isChiselMode,
          nibAngle
        };
        setDrawnPaths(prev => [...prev, newPath]);
      }
    }
  };

  const handleTouchMove = (e: React.TouchEvent<HTMLCanvasElement>) => {
    if (e.touches.length === 2) {
      e.preventDefault();
      const t1 = e.touches[0];
      const t2 = e.touches[1];
      const dist = Math.hypot(t2.clientX - t1.clientX, t2.clientY - t1.clientY);
      const midX = (t1.clientX + t2.clientX) / 2;
      const midY = (t1.clientY + t2.clientY) / 2;
      
      const lastDist = (e as any).lastTouchDist || dist;
      const lastMid = (e as any).lastTouchMid || { x: midX, y: midY };

      const scaleChange = dist / lastDist;
      const newScale = Math.min(Math.max(scale * scaleChange, 0.4), 5);
      
      const dx = midX - lastMid.x;
      const dy = midY - lastMid.y;
      
      setOffsetX(prev => prev + dx);
      setOffsetY(prev => prev + dy);
      setScale(newScale);

      (e as any).lastTouchDist = dist;
      (e as any).lastTouchMid = { x: midX, y: midY };
      return;
    }

    if (e.touches.length === 1) {
      const touch = e.touches[0];
      if (currentMode === 'pan' && dragStart) {
        const dx = touch.clientX - dragStart.x;
        const dy = touch.clientY - dragStart.y;
        setOffsetX(prev => prev + dx);
        setOffsetY(prev => prev + dy);
        setDragStart({ x: touch.clientX, y: touch.clientY });
        return;
      }

      if (currentMode === 'draw' && painting && lastPointRef.current) {
        const coords = getCanvasCoords(touch.clientX, touch.clientY);
        const nextPoint: DrawingPoint = { x: coords.x, y: coords.y, pressure: touch.force || 1 };
        
        setDrawnPaths(prev => {
          const copy = [...prev];
          if (copy.length > 0) {
            copy[copy.length - 1].points.push(nextPoint);
          }
          return copy;
        });
        lastPointRef.current = nextPoint;
      }
    }
  };

  const handleTouchEnd = () => {
    handleMouseUp();
  };

  // Undo / Redo
  const handleUndo = () => {
    if (history.length === 0) return;
    const lastAction = history[history.length - 1];
    const newHistory = history.slice(0, -1);
    
    setHistory(newHistory);
    setRedoHistory(prev => [...prev, lastAction]);

    if (lastAction.type === 'path') {
      setDrawnPaths(prev => prev.slice(0, -1));
    } else if (lastAction.type === 'sticker') {
      setStickers(prev => prev.slice(0, -1));
    } else if (lastAction.type === 'text') {
      setTexts(prev => prev.slice(0, -1));
    }
  };

  const handleRedo = () => {
    if (redoHistory.length === 0) return;
    const nextAction = redoHistory[redoHistory.length - 1];
    setRedoHistory(prev => prev.slice(0, -1));
    setHistory(prev => [...prev, nextAction]);

    if (nextAction.type === 'path') {
      setDrawnPaths(prev => [...prev, nextAction.data as DrawingPath]);
    } else if (nextAction.type === 'sticker') {
      setStickers(prev => [...prev, nextAction.data as StickerItem]);
    } else if (nextAction.type === 'text') {
      setTexts(prev => [...prev, nextAction.data as TextItem]);
    }
  };

  const handleClear = () => {
    if (window.confirm('هل أنت متأكد من رغبتك في مسح كافة التصحيحات والرسومات على هذه الكراسة؟')) {
      setDrawnPaths([]);
      setStickers([]);
      setTexts([]);
      setHistory([]);
      setRedoHistory([]);
    }
  };

  // Canvas 90 degrees rotation (Classic app feature)
  // Rotates background image, drawings, stickers, and texts altogether!
  const handleRotate90 = () => {
    if (!bgImage) return;
    setSaveStatus('جاري تدوير الصورة والأدلة المتجهة...');

    // Rotate background image via canvas helper
    const tempCanvas = document.createElement('canvas');
    const tempCtx = tempCanvas.getContext('2d')!;
    tempCanvas.width = bgImage.height;
    tempCanvas.height = bgImage.width;
    
    tempCtx.translate(tempCanvas.width / 2, tempCanvas.height / 2);
    tempCtx.rotate(Math.PI / 2);
    tempCtx.drawImage(bgImage, -bgImage.width / 2, -bgImage.height / 2);

    const rotatedImg = new Image();
    rotatedImg.src = tempCanvas.toDataURL('image/jpeg', 0.95);
    rotatedImg.onload = () => {
      // Recalculate vector coordinates around old center
      const cx = bgImage.width / 2;
      const cy = bgImage.height / 2;

      // Coordinate translation function for 90 degree clockwise rotation around center
      const rotPoint = (pt: DrawingPoint) => {
        const dx = pt.x - cx;
        const dy = pt.y - cy;
        // x' = cy - y + cx; y' = x - cx + cy
        return {
          x: cy - dy + (rotatedImg.width / 2 - cy),
          y: dx + cy + (rotatedImg.height / 2 - cx),
          pressure: pt.pressure
        };
      };

      // Rotate drawn paths
      const newPaths = drawnPaths.map(path => ({
        ...path,
        points: path.points.map(rotPoint)
      }));
      setDrawnPaths(newPaths);

      // Rotate stickers
      const newStickers = stickers.map(sticker => {
        const rot = rotPoint({ x: sticker.x, y: sticker.y });
        return {
          ...sticker,
          x: rot.x,
          y: rot.y
        };
      });
      setStickers(newStickers);

      // Rotate texts
      const newTexts = texts.map(text => {
        const rot = rotPoint({ x: text.x, y: text.y });
        return {
          ...text,
          x: rot.x,
          y: rot.y
        };
      });
      setTexts(newTexts);

      setBgImage(rotatedImg);
      setSaveStatus('');
    };
  };

  // Watermark drawing & final assembly
  const assembleFinalImageWithWatermark = async (): Promise<string> => {
    const tempCanvas = document.createElement('canvas');
    const tempCtx = tempCanvas.getContext('2d')!;
    
    if (!bgImage) throw new Error('No background loaded');
    tempCanvas.width = bgImage.width;
    tempCanvas.height = bgImage.height;

    // 1. Draw entire canvas layers as normal
    tempCtx.drawImage(bgImage, 0, 0);

    drawnPaths.forEach(path => {
      if (path.isChisel) {
        for (let i = 0; i < path.points.length - 1; i++) {
          drawChiselSegment(tempCtx, path.points[i], path.points[i + 1], path.nibAngle, path.lineWidth, path.lineColor);
        }
      } else {
        tempCtx.beginPath();
        tempCtx.lineWidth = path.lineWidth;
        tempCtx.lineCap = 'round';
        tempCtx.lineJoin = 'round';
        tempCtx.strokeStyle = path.lineColor;
        path.points.forEach((point, index) => {
          if (index === 0) {
            tempCtx.moveTo(point.x, point.y);
          } else {
            tempCtx.lineTo(point.x, point.y);
          }
        });
        tempCtx.stroke();
      }
    });

    stickers.forEach(sticker => {
      const img = new Image();
      img.src = sticker.base64;
      if (img.complete) {
        tempCtx.drawImage(img, sticker.x - sticker.size/2, sticker.y - sticker.size/2, sticker.size, sticker.size);
      }
    });

    texts.forEach(text => {
      tempCtx.save();
      tempCtx.direction = 'rtl';
      tempCtx.textAlign = 'right';
      tempCtx.font = `bold ${text.fontSize}px 'Amiri', serif`;
      const lineHeight = text.fontSize * 1.3;
      let maxLineWidth = 0;
      text.lines.forEach(line => {
        const m = tempCtx.measureText(line);
        if (m.width > maxLineWidth) maxLineWidth = m.width;
      });
      const padding = 12;
      const rectWidth = maxLineWidth + padding * 2;
      const rectHeight = text.lines.length * lineHeight + padding * 2;
      if (text.background.enabled) {
        tempCtx.fillStyle = text.background.color;
        tempCtx.beginPath();
        tempCtx.roundRect(text.x - rectWidth, text.y - text.fontSize, rectWidth, rectHeight, 10);
        tempCtx.fill();
      }
      tempCtx.fillStyle = text.color;
      text.lines.forEach((line, index) => {
        tempCtx.fillText(line, text.x - padding, text.y + (index + 0.5) * lineHeight);
      });
      tempCtx.restore();
    });

    // 2. Add Watermark Label (Arabic context)
    if (watermarkSettings.textPrefix) {
      tempCtx.save();
      tempCtx.direction = 'rtl';
      tempCtx.font = `${watermarkSettings.fontSize * 1.5}px 'Tajawal', Arial, sans-serif`;
      
      const dateStr = new Date().toLocaleDateString('ar-SA', { year: 'numeric', month: 'long', day: 'numeric' });
      const markText = `${watermarkSettings.textPrefix} | الكراسة: ${student.studentName} (رقم ${student.studentId}) | درس: ${student.lessonNumber} | التاريخ: ${dateStr}`;
      
      tempCtx.fillStyle = 'rgba(255, 255, 255, 0.75)';
      const textWidth = tempCtx.measureText(markText).width;
      const labelHeight = watermarkSettings.fontSize * 2.5;

      // Position watermark
      let x = 30;
      let y = tempCanvas.height - labelHeight - 30;
      if (watermarkSettings.textPosition === 'top-right') {
        x = tempCanvas.width - textWidth - 50;
        y = 30;
      } else if (watermarkSettings.textPosition === 'bottom-right') {
        x = tempCanvas.width - textWidth - 50;
        y = tempCanvas.height - labelHeight - 30;
      } else if (watermarkSettings.textPosition === 'center') {
        x = (tempCanvas.width - textWidth) / 2;
        y = (tempCanvas.height - labelHeight) / 2;
      }

      // Draw light backplate for watermark readability
      tempCtx.beginPath();
      tempCtx.roundRect(x - 20, y - 5, textWidth + 40, labelHeight, 8);
      tempCtx.fill();

      // Write text in solid ink charcoal color
      tempCtx.fillStyle = '#111111';
      tempCtx.fillText(markText, x + textWidth, y + labelHeight * 0.7);
      tempCtx.restore();
    }

    return tempCanvas.toDataURL('image/jpeg', 0.9);
  };

  // Final Action: Save Correction to Google Sheets or simulator
  const handleSaveCorrection = async () => {
    setSaving(true);
    setSaveStatus('جاري تجميع الصورة المعدلة وإضافة علامة مائية للتوثيق...');

    try {
      const compiledImageBase64 = await assembleFinalImageWithWatermark();
      
      if (apiURL && apiURL.startsWith('http')) {
        setSaveStatus('جاري رفع الملفات وتحديث جدول بيانات قوقل شيت (Google Sheets)...');
        const response = await fetch(apiURL, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            action: 'saveAllMedia',
            canvasBase64: compiledImageBase64,
            canvasFilename: `تصحيح_${student.studentName}_درس_${student.lessonNumber}.jpg`,
            imageBase64: additionalImage || '',
            imageFilename: `إضافي_${student.studentName}_درس_${student.lessonNumber}.jpg`,
            videoBase64: additionalVideo || '',
            videoFilename: `فيديو_${student.studentName}_درس_${student.lessonNumber}.webm`,
            audioBase64: additionalAudio || '',
            audioFilename: `صوت_${student.studentName}_درس_${student.lessonNumber}.webm`,
            row: student.row,
            notes: notes || 'تم التصحيح والتقييم',
            imageGrade: grade || '100',
            audioGrade: ''
          })
        });
        
        const result = await response.json();
        if (result.error) {
          throw new Error(result.error);
        }
      }

      // Simulator Success Callback
      setTimeout(() => {
        const updatedStudent: StudentItem = {
          ...student,
          isSaved: true,
          notes: notes || 'تم التصحيح والتقييم على اللوحة الذكية',
          imageGrade: grade || '100'
        };
        
        onSaveSuccess(updatedStudent);
        setSaving(false);
        setSaveStatus('');
        alert('✅ تم حفظ التصحيح وإرسال الدرجة بنجاح إلى جدول البيانات وقوقل درايف!');
      }, 1500);

    } catch (err: any) {
      console.error(err);
      alert(`⚠️ حدث خطأ أثناء الحفظ: ${err.message || err}`);
      setSaving(false);
      setSaveStatus('');
    }
  };

  // Trigger media fallbacks (file uploads) if camera/mic modal is closed
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>, mediaType: 'image' | 'video' | 'audio') => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onloadend = () => {
      const base64 = reader.result as string;
      if (mediaType === 'image') setAdditionalImage(base64);
      if (mediaType === 'video') setAdditionalVideo(base64);
      if (mediaType === 'audio') setAdditionalAudio(base64);
    };
    reader.readAsDataURL(file);
  };

  return (
    <div id="whiteboard-view" className="flex flex-col lg:flex-row gap-6 text-right font-sans min-h-[85vh]" style={{ direction: 'rtl' }}>
      
      {/* Right control board (Tools and feedback grading inputs) */}
      <div id="control-board" className="w-full lg:w-96 flex flex-col gap-6 order-2 lg:order-1 shrink-0">
        
        {/* Navigation details card */}
        <div className="bg-white border border-gray-100 rounded-2xl shadow-sm p-5 space-y-4">
          <div className="flex items-center justify-between">
            <button 
              onClick={onBack}
              className="px-4 py-2 bg-gray-50 border border-gray-100 hover:bg-gray-100 text-gray-700 font-medium rounded-xl flex items-center gap-2 text-xs transition-colors"
            >
              <ArrowLeft size={14} />
              <span>رجوع للجدول</span>
            </button>
            <div className="flex items-center gap-2 text-xs text-amber-600 font-medium bg-amber-50 px-3 py-1 rounded-full">
              <Sparkles size={12} />
              <span>تصحيح كراسة رسم الطالب</span>
            </div>
          </div>

          <div className="border-t border-gray-50 pt-3 flex flex-col gap-1">
            <h4 className="text-sm text-gray-400 font-medium">اسم الطالب</h4>
            <div className="text-base font-bold text-gray-900">{student.studentName}</div>
            <div className="flex justify-between text-xs text-gray-500 mt-1">
              <span>رقم الطالب: {student.studentId}</span>
              <span>الدرس: {student.lessonNumber}</span>
              <span>الإرسالات: {student.imageSubmissionCount} مرات</span>
            </div>
          </div>
        </div>

        {/* Dynamic Grading Form */}
        <div className="bg-white border border-gray-100 rounded-2xl shadow-sm p-6 space-y-5">
          <h3 className="text-base font-bold text-gray-900 border-b border-gray-50 pb-2 flex items-center gap-2">
            <CheckCircle size={18} className="text-[#198754]" />
            <span>الدرجة والملاحظات</span>
          </h3>

          <div className="space-y-4">
            <div className="space-y-1">
              <label className="text-xs font-bold text-gray-600">رصد درجة السطر (من 100)</label>
              <input 
                id="whiteboard-grade"
                type="number" 
                max="100" 
                min="0"
                placeholder="أدخل درجة الطالب، مثلاً: 95"
                className="w-full px-4 py-3 bg-gray-50 border border-gray-100 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#198754]"
                value={grade}
                onChange={e => setGrade(e.target.value)}
              />
            </div>

            <div className="space-y-1">
              <div className="flex justify-between items-center mb-1">
                <label className="text-xs font-bold text-gray-600">العبارات الجاهزة للتصحيح</label>
                <span className="text-[10px] text-gray-400">انقر لوضعها كملصق</span>
              </div>
              <select 
                className="w-full px-3 py-2 bg-gray-50 border border-gray-100 rounded-xl text-xs"
                value={selectedText}
                onChange={e => {
                  setSelectedText(e.target.value);
                  setCurrentMode('text');
                }}
              >
                {MOCK_PREDEFINED_TEXTS.map((t, idx) => (
                  <option key={idx} value={t.phrase}>{t.title}</option>
                ))}
              </select>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-bold text-gray-600">ملاحظات المعلم المكتوبة</label>
              <textarea 
                id="whiteboard-notes"
                rows={3}
                placeholder="اكتب توجيهاتك لتصحيح مواضع الميل ووزن الحروف هنا..."
                className="w-full px-4 py-3 bg-gray-50 border border-gray-100 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#198754] text-xs resize-none"
                value={notes}
                onChange={e => setNotes(e.target.value)}
              />
            </div>
          </div>
        </div>

        {/* Media Attachments & Explainers (Picture / Video / Audio) */}
        <div className="bg-white border border-gray-100 rounded-2xl shadow-sm p-6 space-y-4">
          <h3 className="text-base font-bold text-gray-900 border-b border-gray-50 pb-2 flex items-center gap-2">
            <Flame size={18} className="text-amber-500" />
            <span>إضافة شرح توضيحي ميديا</span>
          </h3>
          <p className="text-xs text-gray-500">يمكنك تسجيل شرح بالفيديو أو الصوت ليوضح مواضع تصحيح الحروف للطالب.</p>
          
          <div className="grid grid-cols-2 gap-2 text-xs">
            {/* Additional photo */}
            <div className="flex flex-col gap-1">
              <span className="text-[10px] text-gray-400">صورة توضيحية</span>
              <input 
                type="file" 
                accept="image/*" 
                className="hidden" 
                id="add-img-file" 
                onChange={e => handleFileChange(e, 'image')}
              />
              <button 
                onClick={() => document.getElementById('add-img-file')?.click()}
                className={`py-2 px-3 border border-dashed rounded-xl font-medium flex items-center justify-center gap-1.5 transition-colors ${additionalImage ? 'border-[#198754] bg-[#198754]/5 text-[#198754]' : 'border-gray-200 hover:bg-gray-50'}`}
              >
                <ImageIcon size={14} />
                <span>{additionalImage ? 'مرفق صورة ✓' : 'رفع صورة'}</span>
              </button>
            </div>

            {/* Additional video */}
            <div className="flex flex-col gap-1">
              <span className="text-[10px] text-gray-400">فيديو توضيحي</span>
              <input 
                type="file" 
                accept="video/*" 
                className="hidden" 
                id="add-video-file" 
                onChange={e => handleFileChange(e, 'video')}
              />
              <button 
                onClick={() => document.getElementById('add-video-file')?.click()}
                className={`py-2 px-3 border border-dashed rounded-xl font-medium flex items-center justify-center gap-1.5 transition-colors ${additionalVideo ? 'border-[#198754] bg-[#198754]/5 text-[#198754]' : 'border-gray-200 hover:bg-gray-50'}`}
              >
                <Video size={14} />
                <span>{additionalVideo ? 'مرفق فيديو ✓' : 'رفع فيديو'}</span>
              </button>
            </div>
          </div>

          {/* Previews */}
          {(additionalImage || additionalVideo) && (
            <div className="p-3 bg-gray-50 rounded-xl space-y-2.5 text-xs text-gray-600">
              <span className="font-bold">معاينة الملفات الإضافية:</span>
              <div className="flex flex-wrap gap-2">
                {additionalImage && (
                  <div className="relative group w-16 h-16 border rounded-lg overflow-hidden shrink-0">
                    <img src={additionalImage} className="w-full h-full object-cover" />
                    <button onClick={() => setAdditionalImage(null)} className="absolute inset-0 bg-black/60 text-white font-bold opacity-0 group-hover:opacity-100 flex items-center justify-center text-[10px] transition-opacity">حذف</button>
                  </div>
                )}
                {additionalVideo && (
                  <div className="relative group w-16 h-16 border rounded-lg overflow-hidden shrink-0 bg-black flex items-center justify-center">
                    <Video size={16} className="text-white" />
                    <button onClick={() => setAdditionalVideo(null)} className="absolute inset-0 bg-black/60 text-white font-bold opacity-0 group-hover:opacity-100 flex items-center justify-center text-[10px] transition-opacity">حذف</button>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Save Correction Action Button */}
        <button
          id="whiteboard-save-btn"
          onClick={handleSaveCorrection}
          className="w-full py-4 bg-[#198754] hover:bg-[#0f5132] text-white font-bold text-lg rounded-2xl shadow-xl shadow-[#198754]/20 flex items-center justify-center gap-2 transition-all hover:scale-[1.01] active:scale-[0.99] disabled:bg-gray-300 disabled:shadow-none"
          disabled={saving}
        >
          {saving ? (
            <>
              <svg className="animate-spin h-6 w-6 text-white" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
              </svg>
              <span>جاري الحفظ والرفع...</span>
            </>
          ) : (
            <>
              <Save size={22} />
              <span>حفظ واعتماد التقييم الحالي</span>
            </>
          )}
        </button>

        {saveStatus && (
          <div className="p-3 bg-amber-50 border border-amber-100 rounded-xl flex items-center gap-2 text-xs text-amber-700 animate-pulse">
            <RefreshCw className="animate-spin shrink-0 text-amber-600" size={14} />
            <span>{saveStatus}</span>
          </div>
        )}
      </div>

      {/* Left Main Board: Interactive whiteboard & toolbar */}
      <div id="whiteboard-container" className="flex-1 bg-white border border-gray-100 rounded-2xl shadow-sm overflow-hidden flex flex-col order-1 lg:order-2">
        
        {/* Whiteboard Toolbar */}
        <div id="whiteboard-toolbar" className="bg-gray-50 border-b border-gray-100 p-4 flex flex-wrap gap-4 items-center justify-between">
          
          {/* Mode Switchers */}
          <div className="flex items-center gap-1 bg-white border rounded-xl p-1 shadow-sm shrink-0">
            <button 
              id="tool-draw-btn"
              onClick={() => setCurrentMode('draw')}
              className={`p-2 rounded-lg flex items-center gap-1.5 text-xs font-semibold transition-all ${currentMode === 'draw' ? 'bg-[#198754] text-white' : 'text-gray-600 hover:bg-gray-50'}`}
              title="قلم الرسم والخط العربي"
            >
              <Pencil size={15} />
              <span>لوحة الكتابة</span>
            </button>
            <button 
              id="tool-pan-btn"
              onClick={() => setCurrentMode('pan')}
              className={`p-2 rounded-lg flex items-center gap-1.5 text-xs font-semibold transition-all ${currentMode === 'pan' ? 'bg-gray-800 text-white' : 'text-gray-600 hover:bg-gray-50'}`}
              title="أداة تحريك اللوحة ودرجها"
            >
              <Move size={15} />
              <span>أداة اليد للتكبير</span>
            </button>
            <button 
              id="tool-sticker-btn"
              onClick={() => setCurrentMode('sticker')}
              className={`p-2 rounded-lg flex items-center gap-1.5 text-xs font-semibold transition-all ${currentMode === 'sticker' ? 'bg-[#198754] text-white' : 'text-gray-600 hover:bg-gray-50'}`}
              title="أختام وأوسمة التقييم"
            >
              <Stamp size={15} />
              <span>الأختام</span>
            </button>
            <button 
              id="tool-text-btn"
              onClick={() => setCurrentMode('text')}
              className={`p-2 rounded-lg flex items-center gap-1.5 text-xs font-semibold transition-all ${currentMode === 'text' ? 'bg-[#198754] text-white' : 'text-gray-600 hover:bg-gray-50'}`}
              title="نص جاهز"
            >
              <Type size={15} />
              <span>ملاحظة جاهزة</span>
            </button>
          </div>

          {/* Contextual tool settings */}
          {currentMode === 'draw' && (
            <div className="flex flex-wrap items-center gap-4 text-xs font-medium text-gray-700">
              <div className="flex items-center gap-2">
                <span>نمط الفرشاة:</span>
                <button 
                  onClick={() => setIsChiselMode(true)}
                  className={`px-3 py-1.5 rounded-lg border text-[11px] transition-colors ${isChiselMode ? 'bg-[#198754]/10 border-[#198754] text-[#198754] font-bold' : 'bg-white border-gray-100 hover:bg-gray-50'}`}
                >
                  قلم مشطوف (خط عربي)
                </button>
                <button 
                  onClick={() => setIsChiselMode(false)}
                  className={`px-3 py-1.5 rounded-lg border text-[11px] transition-colors ${!isChiselMode ? 'bg-[#198754]/10 border-[#198754] text-[#198754] font-bold' : 'bg-white border-gray-100 hover:bg-gray-50'}`}
                >
                  فرشاة دائرية عادية
                </button>
              </div>

              <div className="flex items-center gap-1.5">
                <span>عرض القلم:</span>
                <input 
                  type="range" 
                  min="4" 
                  max="80" 
                  className="w-20 h-1.5 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-[#198754]"
                  value={lineWidth}
                  onChange={e => setLineWidth(Number(e.target.value))}
                />
                <span className="font-bold text-gray-900 font-mono text-xs">{lineWidth}px</span>
              </div>

              {isChiselMode && (
                <div className="flex items-center gap-1.5">
                  <span>زاوية القلم:</span>
                  <input 
                    type="range" 
                    min="0" 
                    max="180" 
                    className="w-20 h-1.5 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-amber-600"
                    value={nibAngle}
                    onChange={e => setNibAngle(Number(e.target.value))}
                  />
                  <span className="font-bold text-amber-600 font-mono text-xs">{nibAngle}°</span>
                </div>
              )}

              <div className="flex items-center gap-1.5">
                <span>اللون:</span>
                <input 
                  type="color" 
                  className="w-8 h-8 rounded-lg cursor-pointer border-0 bg-transparent"
                  value={lineColor}
                  onChange={e => setLineColor(e.target.value)}
                />
              </div>
            </div>
          )}

          {currentMode === 'sticker' && (
            <div className="flex items-center gap-4 text-xs font-medium text-gray-700">
              <div className="flex items-center gap-2">
                <span>اختر الختم:</span>
                <div className="flex gap-2.5">
                  {MOCK_STICKERS.map((st) => (
                    <button 
                      key={st.id}
                      onClick={() => setSelectedSticker(st.base64)}
                      className={`p-1 border rounded-lg hover:border-amber-500 transition-colors bg-white ${selectedSticker === st.base64 ? 'border-[#198754] ring-2 ring-[#198754]/10' : 'border-gray-200'}`}
                      title={st.name}
                    >
                      <img src={st.base64} className="w-12 h-12 object-contain" />
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex items-center gap-2">
                <span>حجم الختم:</span>
                <select 
                  className="bg-white border rounded-lg px-2.5 py-1.5 text-xs"
                  value={stickerSize}
                  onChange={e => setStickerSize(Number(e.target.value))}
                >
                  <option value={70}>صغير</option>
                  <option value={120}>متوسط (رسمي)</option>
                  <option value={180}>كبير</option>
                  <option value={240}>كبير جداً</option>
                </select>
              </div>
            </div>
          )}

          {currentMode === 'text' && (
            <div className="flex flex-wrap items-center gap-4 text-xs font-medium text-gray-700">
              <div className="flex items-center gap-2">
                <span>اختر الملاحظة:</span>
                <select 
                  className="bg-white border rounded-lg px-2.5 py-1.5 text-xs w-48"
                  value={selectedText}
                  onChange={e => setSelectedText(e.target.value)}
                >
                  {MOCK_PREDEFINED_TEXTS.map((t, idx) => (
                    <option key={idx} value={t.phrase}>{t.title}</option>
                  ))}
                </select>
              </div>

              <div className="flex items-center gap-2">
                <span>حجم الخط:</span>
                <select 
                  className="bg-white border rounded-lg px-2.5 py-1.5 text-xs"
                  value={fontSize}
                  onChange={e => setFontSize(Number(e.target.value))}
                >
                  <option value={20}>20px</option>
                  <option value={26}>26px</option>
                  <option value={32}>32px</option>
                  <option value={44}>44px</option>
                  <option value={60}>60px</option>
                </select>
              </div>

              <div className="flex items-center gap-2">
                <span>خط الكتابة:</span>
                <select 
                  className="bg-white border rounded-lg px-2.5 py-1.5 text-xs"
                  value={fontFamily}
                  onChange={e => setFontFamily(e.target.value)}
                >
                  <option value="Amiri">الأميري الكلاسيكي</option>
                  <option value="Tajawal">التاجوال الحديث</option>
                </select>
              </div>
            </div>
          )}

          {/* Action Tools (Undo, Redo, Rotate, Zoom) */}
          <div className="flex items-center gap-1.5 shrink-0">
            <button 
              onClick={handleUndo} 
              disabled={history.length === 0}
              className="p-2 bg-white border border-gray-100 hover:bg-gray-100 text-gray-600 rounded-xl transition-all hover:scale-105 active:scale-95 disabled:opacity-40 disabled:scale-100"
              title="تراجع خطوة"
            >
              <Undo2 size={15} />
            </button>
            <button 
              onClick={handleRedo} 
              disabled={redoHistory.length === 0}
              className="p-2 bg-white border border-gray-100 hover:bg-gray-100 text-gray-600 rounded-xl transition-all hover:scale-105 active:scale-95 disabled:opacity-40 disabled:scale-100"
              title="إعادة خطوة"
            >
              <Redo2 size={15} />
            </button>
            <button 
              onClick={handleRotate90}
              className="p-2 bg-white border border-gray-100 hover:bg-gray-100 text-gray-600 rounded-xl transition-all hover:scale-105 active:scale-95"
              title="تدوير الكراسة 90 درجة يميناً"
            >
              <RotateCw size={15} />
            </button>
            <button 
              onClick={handleClear}
              className="p-2 bg-white border border-red-50 hover:bg-red-100 text-red-600 rounded-xl transition-all hover:scale-105 active:scale-95"
              title="مسح لوحة التصحيح بالكامل"
            >
              <Trash2 size={15} />
            </button>
            
            <div className="h-5 w-px bg-gray-200 mx-1"></div>

            <button 
              onClick={() => setScale(prev => Math.min(prev * 1.2, 5))}
              className="p-2 bg-white border border-gray-100 hover:bg-gray-100 text-gray-600 rounded-xl transition-colors"
              title="تكبير اللوحة"
            >
              <ZoomIn size={15} />
            </button>
            <button 
              onClick={() => setScale(prev => Math.max(prev / 1.2, 0.4))}
              className="p-2 bg-white border border-gray-100 hover:bg-gray-100 text-gray-600 rounded-xl transition-colors"
              title="تصغير اللوحة"
            >
              <ZoomOut size={15} />
            </button>
            <button 
              onClick={() => bgImage && resetZoomAndPan(bgImage)}
              className="p-2 bg-white border border-gray-100 hover:bg-gray-100 text-gray-600 rounded-xl text-xs font-bold transition-colors"
              title="إعادة تعيين الحجم التلقائي"
            >
              ملائمة الشاشة
            </button>

            {originalMediaUrl && (
              <button 
                onClick={() => setShowOriginalMedia(!showOriginalMedia)}
                className="p-2 bg-amber-50 hover:bg-amber-100 border border-amber-200 text-amber-700 font-bold rounded-xl text-xs transition-colors"
                title="فتح كراسة الطالب الأصلية"
              >
                الكراسة الأصلية
              </button>
            )}
          </div>
        </div>

        {/* Board Canvas Area Container */}
        <div 
          ref={containerRef}
          id="canvas-stage" 
          className="flex-1 min-h-[480px] bg-gray-900 overflow-hidden relative cursor-crosshair flex items-center justify-center p-4"
        >
          {/* Zoom & Pan Stage wrapper */}
          <div 
            className="origin-center select-none"
            style={{
              transform: `translate(${offsetX}px, ${offsetY}px) scale(${scale})`,
              transition: dragStart || painting ? 'none' : 'transform 0.15s cubic-bezier(0.1, 0.8, 0.2, 1)'
            }}
          >
            <canvas
              ref={canvasRef}
              className="max-w-none shadow-2xl rounded-sm"
              style={{
                pointerEvents: currentMode === 'pan' && !dragStart ? 'none' : 'auto',
                touchAction: 'none'
              }}
              onMouseDown={handleMouseDown}
              onMouseMove={handleMouseMove}
              onMouseUp={handleMouseUp}
              onMouseLeave={handleMouseUp}
              onTouchStart={handleTouchStart}
              onTouchMove={handleTouchMove}
              onTouchEnd={handleTouchEnd}
            />
          </div>

          {/* Quick Hand/Zoom Indicator */}
          <div className="absolute bottom-4 right-4 bg-black/75 backdrop-blur-md text-white text-[11px] font-bold px-3 py-1.5 rounded-full flex items-center gap-1.5 shadow">
            {currentMode === 'pan' ? (
              <>
                <Move size={12} className="text-amber-400" />
                <span>أنت في نمط التكبير والسحب. اسحب اللوحة بإصبعين أو الفأرة.</span>
              </>
            ) : (
              <>
                <Pencil size={12} className="text-[#198754]" />
                <span>نمط الرسم والكتابة نشط. استخدم أداة اليد للتكبير والتنقل.</span>
              </>
            )}
            <span className="bg-white/10 px-1.5 py-0.5 rounded font-mono">{(scale * 100).toFixed(0)}%</span>
          </div>
        </div>

        {/* Modal: Original student homework viewer to compare changes side-by-side! */}
        {showOriginalMedia && originalMediaUrl && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4">
            <div className="w-full max-w-4xl bg-white rounded-2xl overflow-hidden shadow-2xl flex flex-col max-h-[90vh]">
              <div className="p-4 bg-gray-50 border-b flex justify-between items-center">
                <span className="font-bold text-gray-900">الكراسة الأصلية المرسلة من الطالب (قبل التعديل والتصحيح)</span>
                <button 
                  onClick={() => setShowOriginalMedia(false)}
                  className="p-1 hover:bg-gray-200 rounded-lg text-gray-500 transition-colors"
                >
                  <X size={20} />
                </button>
              </div>
              <div className="flex-1 overflow-auto bg-gray-100 p-4 flex items-center justify-center">
                <img src={originalMediaUrl} className="max-w-full max-h-[70vh] object-contain shadow-md rounded-lg" alt="Original Student Submission" />
              </div>
              <div className="p-4 bg-gray-50 border-t flex justify-end">
                <button 
                  onClick={() => setShowOriginalMedia(false)}
                  className="px-5 py-2 bg-gray-800 text-white rounded-xl font-bold hover:bg-gray-900 transition-colors"
                >
                  العودة للوحة التصحيح
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
