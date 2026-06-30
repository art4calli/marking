/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { StudentItem } from '../types';
import { 
  Search, Eye, Edit3, Image as ImageIcon, Volume2, HelpCircle, 
  CheckCircle, Clock, BookOpen, ChevronRight, Filter, EyeOff 
} from 'lucide-react';

interface StudentTableProps {
  students: StudentItem[];
  onSelectStudent: (student: StudentItem, mode: 'image' | 'audio') => void;
  onEditSaved: (student: StudentItem, mode: 'image' | 'audio') => void;
}

export default function StudentTable({ students, onSelectStudent, onEditSaved }: StudentTableProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [showSavedOnly, setShowSavedOnly] = useState<boolean | null>(null); // null = All, false = Pending only, true = Saved only

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchQuery(e.target.value);
  };

  // Filter logic
  const filteredStudents = students.filter(student => {
    // Search filter
    const query = searchQuery.toLowerCase().trim();
    const matchesSearch = 
      student.studentName.toLowerCase().includes(query) ||
      student.studentId.toString().includes(query) ||
      student.lessonNumber.toString().includes(query);

    // Save status filter
    if (showSavedOnly === true) {
      return matchesSearch && student.isSaved;
    }
    if (showSavedOnly === false) {
      return matchesSearch && !student.isSaved;
    }
    return matchesSearch;
  });

  return (
    <div id="student-table-container" className="bg-white border border-gray-100 rounded-2xl shadow-sm overflow-hidden text-right font-sans" style={{ direction: 'rtl' }}>
      
      {/* Search & Filter Header */}
      <div className="p-6 bg-gray-50 border-b border-gray-100 flex flex-col md:flex-row gap-4 items-center justify-between">
        
        {/* Search Bar */}
        <div className="relative w-full md:w-96">
          <input
            id="student-search-input"
            type="text"
            className="w-full pr-10 pl-4 py-2.5 bg-white border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#198754] text-xs font-semibold"
            placeholder="البحث باسم الطالب، رقم الهوية، أو رقم الدرس..."
            value={searchQuery}
            onChange={handleSearchChange}
          />
          <Search size={16} className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
        </div>

        {/* Filter Toggle Buttons */}
        <div className="flex items-center gap-1 bg-white border rounded-xl p-1 shadow-sm shrink-0 w-full md:w-auto">
          <button
            id="filter-all-btn"
            onClick={() => setShowSavedOnly(null)}
            className={`flex-1 md:flex-none px-4 py-1.5 rounded-lg text-xs font-bold transition-all ${showSavedOnly === null ? 'bg-[#198754] text-white shadow' : 'text-gray-600 hover:bg-gray-50'}`}
          >
            إظهار الكل ({students.length})
          </button>
          <button
            id="filter-pending-btn"
            onClick={() => setShowSavedOnly(false)}
            className={`flex-1 md:flex-none px-4 py-1.5 rounded-lg text-xs font-bold transition-all ${showSavedOnly === false ? 'bg-amber-600 text-white shadow' : 'text-gray-600 hover:bg-gray-50'}`}
          >
            بانتظار التصحيح ({students.filter(s => !s.isSaved).length})
          </button>
          <button
            id="filter-saved-btn"
            onClick={() => setShowSavedOnly(true)}
            className={`flex-1 md:flex-none px-4 py-1.5 rounded-lg text-xs font-bold transition-all ${showSavedOnly === true ? 'bg-emerald-700 text-white shadow' : 'text-gray-600 hover:bg-gray-50'}`}
          >
            المكتملة ({students.filter(s => s.isSaved).length})
          </button>
        </div>
      </div>

      {/* Responsive Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-right border-collapse">
          <thead>
            <tr className="bg-gray-50/50 text-gray-400 text-xs font-bold border-b border-gray-100">
              <th className="py-4 px-6">رقم الطالب</th>
              <th className="py-4 px-6">اسم الطالب</th>
              <th className="py-4 px-6 text-center">نوع الدرس</th>
              <th className="py-4 px-6 text-center">رقم الدرس</th>
              <th className="py-4 px-6 text-center">مرات الإرسال</th>
              <th className="py-4 px-6 text-center">حالة التقييم</th>
              <th className="py-4 px-6 text-center">الدرجة</th>
              <th className="py-4 px-6 text-center">الإجراءات</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100 text-sm">
            {filteredStudents.length > 0 ? (
              filteredStudents.map((student) => {
                const isAudio = student.audioFileId !== null;
                const submissionCount = isAudio ? student.audioSubmissionCount : student.imageSubmissionCount;

                return (
                  <tr 
                    key={`${student.studentId}_${student.lessonNumber}`}
                    className={`hover:bg-gray-50/50 transition-colors ${student.isSaved ? 'bg-emerald-50/20' : ''}`}
                  >
                    {/* ID */}
                    <td className="py-4 px-6 font-mono text-xs text-gray-400 font-bold">
                      {student.studentId}
                    </td>

                    {/* Name */}
                    <td className="py-4 px-6 font-bold text-gray-900">
                      {student.studentName}
                    </td>

                    {/* Lesson Type */}
                    <td className="py-4 px-6 text-center">
                      <div className="inline-flex items-center gap-1.5 justify-center">
                        {isAudio ? (
                          <span className="bg-blue-50 text-blue-700 text-xs font-bold px-2.5 py-1 rounded-lg flex items-center gap-1">
                            <Volume2 size={13} />
                            <span>تلاوة صوتية</span>
                          </span>
                        ) : (
                          <span className="bg-emerald-50 text-emerald-700 text-xs font-bold px-2.5 py-1 rounded-lg flex items-center gap-1">
                            <ImageIcon size={13} />
                            <span>كراسة صورة</span>
                          </span>
                        )}
                      </div>
                    </td>

                    {/* Lesson number */}
                    <td className="py-4 px-6 text-center font-bold text-gray-600">
                      الدرس {student.lessonNumber}
                    </td>

                    {/* Submissions count */}
                    <td className="py-4 px-6 text-center">
                      <span className="bg-gray-100 text-gray-600 text-xs font-semibold px-2 py-0.5 rounded-full">
                        {submissionCount} مرات
                      </span>
                    </td>

                    {/* Save Status Badge */}
                    <td className="py-4 px-6 text-center">
                      <div className="flex justify-center">
                        {student.isSaved ? (
                          <span className="bg-emerald-100 text-emerald-800 text-xs font-extrabold px-3 py-1 rounded-full flex items-center gap-1">
                            <CheckCircle size={12} />
                            <span>تم الحفظ</span>
                          </span>
                        ) : (
                          <span className="bg-amber-100 text-amber-800 text-xs font-extrabold px-3 py-1 rounded-full flex items-center gap-1 animate-pulse">
                            <Clock size={12} />
                            <span>معلّق</span>
                          </span>
                        )}
                      </div>
                    </td>

                    {/* Grade */}
                    <td className="py-4 px-6 text-center font-bold font-mono">
                      {student.isSaved ? (
                        <span className="text-emerald-700 bg-emerald-50 px-2 py-1 rounded text-xs font-extrabold">
                          {student.imageGrade || student.audioGrade || '100'} / 100
                        </span>
                      ) : (
                        <span className="text-gray-300">-</span>
                      )}
                    </td>

                    {/* Actions */}
                    <td className="py-4 px-6 text-center">
                      <div className="flex justify-center gap-2">
                        {student.isSaved ? (
                          <button
                            id={`edit-btn-${student.studentId}`}
                            onClick={() => onEditSaved(student, isAudio ? 'audio' : 'image')}
                            className="px-3.5 py-1.5 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl text-xs font-bold flex items-center gap-1 transition-colors"
                          >
                            <Edit3 size={13} />
                            <span>تعديل التقييم</span>
                          </button>
                        ) : (
                          <button
                            id={`grade-btn-${student.studentId}`}
                            onClick={() => onSelectStudent(student, isAudio ? 'audio' : 'image')}
                            className="px-3.5 py-1.5 bg-[#198754] hover:bg-[#0f5132] text-white rounded-xl text-xs font-bold flex items-center gap-1 shadow-md hover:shadow-lg transition-all"
                          >
                            <BookOpen size={13} />
                            <span>بدء التصحيح</span>
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })
            ) : (
              <tr>
                <td colSpan={8} className="py-12 text-center text-gray-400 font-medium">
                  <div className="flex flex-col items-center justify-center gap-2">
                    <EyeOff size={32} className="text-gray-300" />
                    <span>لا توجد نتائج مطابقة لبحثك الحالي</span>
                  </div>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Table Footer Stats */}
      <div className="p-4 bg-gray-50 border-t border-gray-100 text-xs text-gray-500 flex justify-between font-medium">
        <span>إجمالي المسجلين في هذه الصفحة: {filteredStudents.length} طلاب</span>
        <span className="text-[#198754] font-bold">بوابة تصحيح المعلمين المعتمدة</span>
      </div>
    </div>
  );
}
