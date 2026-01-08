export enum SegmentStatus {
  Pending = 'Pending',
  Reviewed = 'Reviewed',
  Approved = 'Approved',
  NeedsWork = 'Needs Work'
}

export enum SegmentCategory {
  Accuracy = 'Accuracy',
  Omission = 'Omission',
  Formatting = 'Formatting',
  Terminology = 'Terminology',
  Style = 'Style',
  None = 'None'
}

export interface WordBreakdown {
  targetWord: string;
  sourceEquivalent: string;
  context: string;
}

export interface Segment {
  id: string;
  sourceText: string;
  targetText: string;
  status: SegmentStatus;
  category: SegmentCategory;
  aiFeedback: string | null;
  wordBreakdown?: WordBreakdown[];
  isAnalyzing: boolean;
}

export type TargetLanguage = string;