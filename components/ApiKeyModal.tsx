import React, { useState, useEffect } from 'react';
import { Key, Save, X, ExternalLink, Trash2 } from 'lucide-react';

interface ApiKeyModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (key: string) => void;
  currentKey: string;
}

export const ApiKeyModal: React.FC<ApiKeyModalProps> = ({ isOpen, onClose, onSave, currentKey }) => {
  const [keyInput, setKeyInput] = useState(currentKey);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    setKeyInput(currentKey);
  }, [currentKey, isOpen]);

  if (!isOpen) return null;

  const handleSave = () => {
    onSave(keyInput.trim());
    onClose();
  };

  const handleClear = () => {
    setKeyInput('');
    onSave('');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-fadeIn">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-md overflow-hidden">
        <div className="p-4 border-b border-gray-100 flex justify-between items-center bg-gray-50">
          <div className="flex items-center gap-2 text-indigo-700">
            <Key className="w-5 h-5" />
            <h3 className="font-bold">API Key Configuration</h3>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X className="w-5 h-5" />
          </button>
        </div>
        
        <div className="p-6 space-y-4">
          <div className="bg-blue-50 text-blue-800 text-sm p-3 rounded-lg border border-blue-100">
            <p>To use this app, you need your own Google Gemini API Key. Your key is stored locally in your browser and is never sent to our servers.</p>
          </div>

          <div className="space-y-2">
            <label className="block text-sm font-medium text-gray-700">Google Gemini API Key</label>
            <div className="relative">
              <input
                type={isVisible ? "text" : "password"}
                value={keyInput}
                onChange={(e) => setKeyInput(e.target.value)}
                placeholder="AIza..."
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none pr-10"
              />
              <button
                type="button"
                onClick={() => setIsVisible(!isVisible)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-gray-500 hover:text-indigo-600 font-medium"
              >
                {isVisible ? 'HIDE' : 'SHOW'}
              </button>
            </div>
            <a 
              href="https://aistudio.google.com/app/apikey" 
              target="_blank" 
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 text-xs text-indigo-600 hover:text-indigo-800"
            >
              Get a free API key here <ExternalLink className="w-3 h-3" />
            </a>
          </div>

          <div className="pt-4 flex gap-3">
             {currentKey && (
                <button
                  onClick={handleClear}
                  className="px-4 py-2 text-red-600 bg-red-50 hover:bg-red-100 rounded-lg text-sm font-medium flex items-center gap-2 transition-colors"
                >
                  <Trash2 className="w-4 h-4" /> Remove
                </button>
             )}
            <button
              onClick={handleSave}
              className="flex-1 bg-indigo-600 text-white px-4 py-2 rounded-lg text-sm font-bold hover:bg-indigo-700 shadow-sm transition-all flex items-center justify-center gap-2"
            >
              <Save className="w-4 h-4" /> Save Key
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};