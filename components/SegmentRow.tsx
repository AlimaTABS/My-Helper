import React from 'react';
import { Trash2, Sparkles, CheckCircle, AlertCircle, Clock, BookOpen } from 'lucide-react';
import { Segment, SegmentStatus, SegmentCategory } from '../types';

interface SegmentRowProps {
  segment: Segment;
  targetLanguage: string;
  onUpdate: (id: string, updates: Partial<Segment>) => void;
  onDelete: (id: string) => void;
  onRunAnalysis: (id: string) => void;
}

export const SegmentRow: React.FC<SegmentRowProps> = ({
  segment,
  targetLanguage,
  onUpdate,
  onDelete,
  onRunAnalysis,
}) => {
  const getStatusStyle = (status: SegmentStatus) => {
    switch (status) {
      case SegmentStatus.Approved: return 'bg-emerald-50 text-emerald-700 border-emerald-100';
      case SegmentStatus.NeedsWork: return 'bg-rose-50 text-rose-700 border-rose-100';
      case SegmentStatus.Reviewed: return 'bg-indigo-50 text-indigo-700 border-indigo-100';
      default: return 'bg-slate-50 text-slate-600 border-slate-100';
    }
  };

  const StatusIcon = {
    [SegmentStatus.Approved]: CheckCircle,
    [SegmentStatus.NeedsWork]: AlertCircle,
    [SegmentStatus.Reviewed]: CheckCircle,
    [SegmentStatus.Pending]: Clock,
  }[segment.status];

  return (
    <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden transition-all duration-200 animate-slideIn mb-10 group">
      
      {/* 3-Panel Main Comparison Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-3 divide-y lg:divide-y-0 lg:divide-x divide-slate-100 min-h-[260px]">
        
        {/* Panel 1: Source */}
        <div className="p-6 flex flex-col">
          <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.15em] mb-4">
            1. English Source
          </label>
          <textarea
            className="flex-1 w-full text-[15px] text-slate-800 bg-transparent border-none focus:ring-0 outline-none resize-none leading-relaxed placeholder-slate-300 font-medium"
            placeholder="Type English source text..."
            value={segment.sourceText}
            onChange={(e) => onUpdate(segment.id, { sourceText: e.target.value })}
          />
        </div>

        {/* Panel 2: Target */}
        <div className="p-6 flex flex-col border-l border-slate-100">
          <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.15em] mb-4">
            2. {targetLanguage} Translation
          </label>
          <textarea
            className="flex-1 w-full text-[15px] text-slate-800 bg-transparent border-none focus:ring-0 outline-none resize-none leading-relaxed placeholder-slate-300 font-medium"
            placeholder={`Enter ${targetLanguage} translation...`}
            value={segment.targetText}
            onChange={(e) => onUpdate(segment.id, { targetText: e.target.value })}
            dir={['Arabic', 'Urdu', 'Persian', 'Hebrew'].includes(targetLanguage) ? 'rtl' : 'ltr'}
          />
        </div>

        {/* Panel 3: Breakdown */}
        <div className="p-6 flex flex-col bg-slate-50/20">
          <div className="flex items-center justify-between mb-4">
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.15em]">
              3. Word by Word Mapping
            </label>
            <div className="text-[10px] font-black text-emerald-600 flex items-center gap-1.5 uppercase tracking-tighter">
               <BookOpen className="w-3.5 h-3.5" /> Auto-Generated
            </div>
          </div>
          
          <div className="flex-1 border border-slate-200 rounded-xl bg-white overflow-hidden shadow-inner flex flex-col min-h-[150px]">
            <div className="overflow-y-auto max-h-[200px] custom-scrollbar h-full">
              {segment.wordBreakdown && segment.wordBreakdown.length > 0 ? (
                <table className="w-full text-left text-[11px] border-collapse bg-white">
                  <thead className="sticky top-0 bg-white border-b border-slate-200 shadow-sm z-10">
                    <tr>
                      <th className="px-3 py-3 font-bold text-slate-400 uppercase tracking-tight">TARGET</th>
                      <th className="px-3 py-3 font-bold text-slate-400 uppercase tracking-tight">SOURCE</th>
                      <th className="px-3 py-3 font-bold text-slate-400 uppercase tracking-tight">ROLE</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50">
                    {segment.wordBreakdown.map((item, idx) => (
                      <tr 
                        key={idx} 
                        className="hover:bg-indigo-50 transition-all duration-150 cursor-default"
                      >
                        <td className="px-3 py-3 font-bold text-slate-900">{item.targetWord}</td>
                        <td className="px-3 py-3 text-slate-700 font-medium">{item.sourceEquivalent}</td>
                        <td className="px-3 py-3 text-slate-500 italic leading-snug">{item.context}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              ) : (
                <div className="h-full flex flex-col items-center justify-center p-8 text-slate-300 bg-white">
                   <div className="text-[10px] font-black uppercase tracking-[0.3em] opacity-40">Empty</div>
                   <p className="text-[9px] text-center mt-2 opacity-50 font-bold uppercase leading-relaxed">
                     {segment.isAnalyzing ? "Processing Mapping..." : "Run check to see breakdown"}
                   </p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Control Strip */}
      <div className="bg-slate-50 border-t border-slate-100 p-4 flex flex-wrap items-center justify-between gap-6">
        <div className="flex items-center gap-6">
          <div className={`flex items-center gap-2.5 px-4 py-1.5 rounded-xl text-xs font-bold border transition-all shadow-sm ${getStatusStyle(segment.status)}`}>
            <StatusIcon className="w-4 h-4" />
            {segment.status}
          </div>

          <div className="flex items-center gap-3">
            <span className="text-[10px] text-slate-400 font-black uppercase tracking-widest">Category:</span>
            <select
              value={segment.category}
              onChange={(e) => onUpdate(segment.id, { category: e.target.value as SegmentCategory })}
              className="bg-white border border-slate-200 text-slate-700 text-xs font-bold rounded-lg py-1.5 px-3 focus:ring-2 focus:ring-indigo-500/10 outline-none shadow-sm cursor-pointer"
            >
              {Object.values(SegmentCategory).map((cat) => (
                <option key={cat} value={cat}>{cat}</option>
              ))}
            </select>
          </div>
        </div>

        <div className="flex items-center gap-4">
            <button
                onClick={() => onRunAnalysis(segment.id)}
                disabled={segment.isAnalyzing || !segment.sourceText || !segment.targetText}
                className={`flex items-center gap-2.5 px-8 py-3 rounded-xl text-xs font-black text-white transition-all uppercase tracking-widest
                    ${segment.isAnalyzing 
                        ? 'bg-indigo-400 cursor-wait' 
                        : 'bg-indigo-600 hover:bg-indigo-700 active:scale-95 shadow-lg shadow-indigo-100'
                    } disabled:opacity-50 disabled:cursor-not-allowed`}
            >
                {segment.isAnalyzing ? (
                    <>
                        <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                        Analyzing...
                    </>
                ) : (
                    <>
                        <Sparkles className="w-4 h-4" />
                        Check Translation
                    </>
                )}
            </button>

            <button
                onClick={() => onDelete(segment.id)}
                className="p-2.5 text-slate-300 hover:text-rose-600 transition-colors rounded-xl hover:bg-rose-50"
            >
                <Trash2 className="w-5 h-5" />
            </button>
        </div>
      </div>

      {segment.aiFeedback && (
        <div className={`p-8 border-t border-slate-100 animate-fadeIn ${segment.aiFeedback.includes("429") ? 'bg-rose-50' : 'bg-indigo-50/30'}`}>
            <div className="flex items-start gap-5">
                <div className={`mt-1 p-2.5 rounded-2xl shadow-xl ${segment.aiFeedback.includes("429") ? 'bg-rose-600' : 'bg-indigo-600'}`}>
                    {segment.aiFeedback.includes("429") ? <Clock className="w-4 h-4 text-white" /> : <Sparkles className="w-4 h-4 text-white" />}
                </div>
                <div className="flex-1">
                    <h4 className={`text-[11px] font-black mb-4 uppercase tracking-[0.2em] border-b pb-2 ${segment.aiFeedback.includes("429") ? 'text-rose-900 border-rose-200' : 'text-indigo-900 border-indigo-100'}`}>
                        {segment.aiFeedback.includes("429") ? 'System Alert: Quota Limit' : 'Semantic Audit Results'}
                    </h4>
                    <div className={`text-sm leading-relaxed whitespace-pre-line font-medium ${segment.aiFeedback.includes("429") ? 'text-rose-800' : 'text-slate-700'}`}>
                        {segment.aiFeedback}
                    </div>
                </div>
            </div>
        </div>
      )}
    </div>
  );
};
