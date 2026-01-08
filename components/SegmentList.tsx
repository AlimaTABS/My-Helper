import React from 'react';
import { Segment } from '../types';
import { SegmentRow } from './SegmentRow';
import { Plus, Trash2, FileText } from 'lucide-react';

interface SegmentListProps {
  segments: Segment[];
  targetLanguage: string;
  onUpdate: (id: string, updates: Partial<Segment>) => void;
  onDelete: (id: string) => void;
  onRunAnalysis: (id: string) => void;
  onAddSegment: () => void;
  onClearAll: () => void;
}

export const SegmentList: React.FC<SegmentListProps> = ({
  segments,
  targetLanguage,
  onUpdate,
  onDelete,
  onRunAnalysis,
  onAddSegment,
  onClearAll,
}) => {
  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 pb-32">
      {segments.length > 0 ? (
        <>
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-sm font-bold text-slate-400 uppercase tracking-widest flex items-center gap-2">
              <FileText className="w-4 h-4" />
              Working Set ({segments.length})
            </h2>
            <button
              onClick={onClearAll}
              className="text-xs font-bold text-slate-400 hover:text-rose-600 transition-colors flex items-center gap-1.5"
            >
              <Trash2 className="w-3 h-3" />
              Clear All
            </button>
          </div>
          <div className="space-y-6">
            {segments.map((segment) => (
              <SegmentRow
                key={segment.id}
                segment={segment}
                targetLanguage={targetLanguage}
                onUpdate={onUpdate}
                onDelete={onDelete}
                onRunAnalysis={onRunAnalysis}
              />
            ))}
          </div>
        </>
      ) : (
        <div className="py-20 text-center border-2 border-dashed border-slate-200 rounded-2xl bg-white">
          <div className="bg-slate-50 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
             <FileText className="w-8 h-8 text-slate-300" />
          </div>
          <h3 className="text-lg font-bold text-slate-900">No segments yet</h3>
          <p className="text-slate-500 max-w-xs mx-auto mt-1">Start by adding a segment to begin your bilingual proofreading session.</p>
        </div>
      )}

      <div className="mt-10 flex justify-center">
        <button
          onClick={onAddSegment}
          className="group flex items-center gap-3 px-8 py-4 bg-white border-2 border-dashed border-slate-300 rounded-2xl text-slate-500 font-bold hover:border-indigo-500 hover:text-indigo-600 hover:bg-indigo-50 transition-all duration-300 shadow-sm"
        >
          <div className="bg-slate-100 rounded-full p-1.5 group-hover:bg-indigo-600 group-hover:text-white transition-all">
            <Plus className="w-5 h-5" />
          </div>
          Add New Segment
        </button>
      </div>
    </div>
  );
};