/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export interface StudentItem {
  studentId: string | number;
  studentName: string;
  lessonNumber: string | number;
  imageSubmissionCount: number;
  imageFileId: string | null;
  imageMimeType: string | null;
  audioSubmissionCount: number;
  audioFileId: string | null;
  audioMimeType: string | null;
  additionalT: string;
  additionalU: string;
  additionalV: string;
  additionalW: string;
  additionalX: string;
  additionalY: string;
  row: number;
  isSaved: boolean;
  notes?: string;
  imageGrade?: string;
  audioGrade?: string;
}

export interface TeacherUser {
  username: string;
  password?: string;
  status: string; // 'نعم' or 'لا'
  allowedDevices?: number;
  devices?: { deviceId: string; location: string }[];
}

export interface PredefinedText {
  title: string;
  phrase: string;
}

export interface WatermarkSettings {
  logoUrl: string;
  opacity: number;
  sizeFactor: number;
  logoPosition: 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right' | 'center';
  textPrefix: string;
  fontSize: number;
  textPosition: 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right' | 'center';
}

export interface DrawingPoint {
  x: number;
  y: number;
  pressure?: number;
}

export interface DrawingPath {
  points: DrawingPoint[];
  lineWidth: number;
  lineColor: string;
  isChisel: boolean;
  nibAngle: number;
}

export interface StickerItem {
  x: number;
  y: number;
  base64: string;
  size: number;
  fileId?: string;
}

export interface TextItem {
  lines: string[];
  x: number;
  y: number;
  color: string;
  fontSize: number;
  fontFamily: string;
  background: {
    enabled: boolean;
    color: string;
  };
}

export interface HistoryItem {
  type: 'path' | 'sticker' | 'text';
  data: DrawingPath | StickerItem | TextItem;
  index: number;
}
