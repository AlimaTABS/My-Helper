import React from 'react';
import { Languages, ShieldCheck, Key, AlertCircle } from 'lucide-react';
import { TARGET_LANGUAGES } from '../constants';

interface HeaderProps {
  selectedLanguage: string;
  onLanguageChange: (lang: string) => void;
  onOpenApiKeyModal: () => void;
  hasKey: boolean;
}

export const Header: React.FC<HeaderProps> = ({ 
  selectedLanguage, 
  onLanguageChange, 
  onOpenApiKeyModal,
  hasKey 
}) => {
  return (
    <header className="sticky top-0 z-50 bg-white border-b border-slate-200 shadow-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="bg-indigo-600 p-2 rounded-xl shadow-md">
            <ShieldCheck className="w-6 h-6 text-white" />
          </div>
          <div className="hidden xs:block">
            <h1 className="text-xl font-black text-slate-900 tracking-tight leading-none">SGC</h1>
            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">Proofreader</p>
          </div>
        </div>

        <div className="flex items-center gap-2 sm:gap-4">
          <button
            onClick={onOpenApiKeyModal}
            className={`flex items-center gap-2 px-3 py-2 rounded-xl border transition-all shadow-sm ${
              hasKey 
                ? 'bg-emerald-50 border-emerald-200 text-emerald-700 hover:bg-emerald-100' 
                : 'bg-rose-50 border-rose-200 text-rose-700 hover:bg-rose-100 animate-pulse'
            }`}
          >
            {hasKey ? <Key className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
            <span className="text-xs font-black uppercase tracking-tight">
              API Key
            </span>
          </button>

          <div className="flex items-center gap-2 bg-slate-50 px-3 py-2 rounded-xl border border-slate-200">
            <Languages className="w-4 h-4 text-slate-400 hidden xs:block" />
            <select
              value={selectedLanguage}
              onChange={(e) => onLanguageChange(e.target.value)}
              className="bg-transparent border-none text-xs font-black text-slate-700 focus:ring-0 cursor-pointer outline-none uppercase tracking-tight"
            >
              {TARGET_LANGUAGES.map((lang) => (
                <option key={lang} value={lang}>
                  {lang}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>
    </header>
  );
};