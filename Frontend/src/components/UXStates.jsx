import React from 'react';
import { Loader2, AlertCircle, Inbox } from 'lucide-react';

export function LoadingState({ message = "Loading...", fullScreen = false }) {
  const content = (
    <div className="flex flex-col items-center justify-center p-8 text-center animate-fade-in-up">
      <Loader2 className="w-8 h-8 text-teal-600 animate-spin mb-4" />
      <p className="text-sm font-medium text-stone-500">{message}</p>
    </div>
  );

  if (fullScreen) {
    return (
      <div className="min-h-screen bg-[var(--bg)] flex items-center justify-center w-full">
        {content}
      </div>
    );
  }

  return <div className="w-full flex justify-center py-12">{content}</div>;
}

export function EmptyState({ title = "No data found", message = "There is nothing to display right now.", action = null, icon: Icon = Inbox }) {
  return (
    <div className="flex flex-col items-center justify-center p-8 sm:p-12 text-center rounded-2xl border border-dashed border-[var(--border)] bg-[var(--surface-2)] animate-fade-in-up my-6 mx-auto max-w-lg w-full">
      <div className="w-16 h-16 rounded-full bg-[var(--surface)] text-stone-400 flex items-center justify-center mb-4 shadow-sm border border-[var(--border)]">
        <Icon className="w-8 h-8" />
      </div>
      <h3 className="text-lg font-semibold text-[var(--text)] mb-2">{title}</h3>
      <p className="text-sm text-[var(--text-muted)] max-w-sm mx-auto mb-6 leading-relaxed">
        {message}
      </p>
      {action && (
        <div className="mt-2">
          {action}
        </div>
      )}
    </div>
  );
}

export function ErrorState({ title = "Something went wrong", message = "We couldn't load this data. Please check your connection and try again.", onRetry, fullScreen = false }) {
  const content = (
    <div className="flex flex-col items-center justify-center p-8 sm:p-12 text-center rounded-2xl border border-[var(--border)] bg-red-50/50 dark:bg-red-900/10 animate-fade-in-up my-6 mx-auto max-w-lg w-full">
      <div className="w-16 h-16 rounded-full bg-red-100 dark:bg-red-900/30 text-red-500 flex items-center justify-center mb-4 shadow-sm border border-red-200 dark:border-red-800">
        <AlertCircle className="w-8 h-8" />
      </div>
      <h3 className="text-lg font-semibold text-red-700 dark:text-red-400 mb-2">{title}</h3>
      <p className="text-sm text-red-600/80 dark:text-red-400/80 max-w-sm mx-auto mb-6 leading-relaxed">
        {message}
      </p>
      {onRetry && (
        <button 
          onClick={onRetry}
          className="px-6 py-2 bg-white dark:bg-[var(--surface)] text-red-600 dark:text-red-400 text-sm font-semibold rounded-lg shadow-sm border border-red-200 dark:border-red-800 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
        >
          Try Again
        </button>
      )}
    </div>
  );

  if (fullScreen) {
    return (
      <div className="min-h-screen bg-[var(--bg)] flex items-center justify-center w-full p-4">
        {content}
      </div>
    );
  }
  return content;
}
