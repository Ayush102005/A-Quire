import React from 'react';
import { Camera, Shield, X, HelpCircle, Eye } from 'lucide-react';

export const GazePermissionModal = ({ isOpen, onClose, onAccept }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-900/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white rounded-2xl shadow-xl max-w-md w-full overflow-hidden flex flex-col">
        {/* Header */}
        <div className="px-6 py-4 border-b border-stone-100 flex items-center justify-between bg-stone-50/50">
          <div className="flex items-center gap-2 text-stone-800">
            <Camera className="w-5 h-5 text-indigo-600" />
            <h2 className="font-semibold text-lg">Enable Focus Tracking</h2>
          </div>
          <button 
            onClick={onClose}
            className="text-stone-400 hover:text-stone-600 transition-colors p-1 rounded-lg hover:bg-stone-100"
            aria-label="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 flex flex-col gap-5 text-stone-600 text-sm">
          <p className="text-base text-stone-800 font-medium">
            A-Quire can use your webcam to provide a more responsive learning experience.
          </p>

          <div className="flex items-start gap-3">
            <div className="p-2 bg-indigo-50 text-indigo-600 rounded-lg shrink-0 mt-0.5">
              <Eye className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-medium text-stone-800 mb-0.5">How it works</h3>
              <p>We track your general gaze to see if you are looking at the lesson. If you look away while the video plays, the AI mentor can gently offer help.</p>
            </div>
          </div>

          <div className="flex items-start gap-3">
            <div className="p-2 bg-emerald-50 text-emerald-600 rounded-lg shrink-0 mt-0.5">
              <Shield className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-medium text-stone-800 mb-0.5">Privacy First</h3>
              <p>No video or images are ever recorded, saved, or sent to the server. Only simple coordinate numbers are used locally on your device.</p>
            </div>
          </div>

          <div className="flex items-start gap-3">
            <div className="p-2 bg-amber-50 text-amber-600 rounded-lg shrink-0 mt-0.5">
              <HelpCircle className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-medium text-stone-800 mb-0.5">Completely Optional</h3>
              <p>Tracking measures basic engagement, not intelligence or emotion. You can turn it off at any time, and all learning features will still work perfectly.</p>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-stone-100 flex items-center justify-end gap-3 bg-stone-50/50">
          <button 
            onClick={onClose}
            className="px-4 py-2 text-stone-600 font-medium hover:bg-stone-200 bg-stone-100 rounded-xl transition-colors"
          >
            Not right now
          </button>
          <button 
            onClick={() => {
              onAccept();
              onClose();
            }}
            className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-medium rounded-xl transition-colors shadow-sm"
          >
            Allow camera access
          </button>
        </div>
      </div>
    </div>
  );
};

export default GazePermissionModal;
