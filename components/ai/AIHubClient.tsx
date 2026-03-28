'use client';

import { useState } from 'react';
import { Brain, Layers, BookOpen, Crown, Zap, Upload } from 'lucide-react';
import { MaterialUploader } from '@/components/ai/MaterialUploader';
import { FlashcardGenerator } from '@/components/ai/FlashcardGenerator';
import { QuizGenerator } from '@/components/ai/QuizGenerator';
import { FlashcardStudy } from '@/components/ai/FlashcardStudy';
import { AISubscriptionGate } from '@/components/ai/AISubscriptionGate';
import { cn } from '@/lib/utils';

type Tab = 'materials' | 'flashcards' | 'quizzes' | 'study';

interface Props {
  isSuper: boolean;
  subscription: Record<string, unknown> | null;
}

export function AIHubClient({ isSuper, subscription }: Props) {
  const [activeTab, setActiveTab] = useState<Tab>('materials');
  const [studyDeckId, setStudyDeckId] = useState<number | null>(null);

  const tabs = [
    { id: 'materials' as Tab, label: 'Study Materials', icon: Upload, desc: 'Upload PDF, DOCX, URLs, YouTube' },
    { id: 'flashcards' as Tab, label: 'Flashcards', icon: Layers, desc: 'AI-generated flashcard decks' },
    { id: 'quizzes' as Tab, label: 'AI Quizzes', icon: Brain, desc: 'Auto-generated MCQ quizzes' },
    { id: 'study' as Tab, label: 'Study Mode', icon: BookOpen, desc: 'Review your flashcards' },
  ];

  // If studying a specific deck, show full-screen study mode
  if (activeTab === 'study' && studyDeckId) {
    return (
      <FlashcardStudy
        deckId={studyDeckId}
        onExit={() => { setStudyDeckId(null); setActiveTab('flashcards'); }}
      />
    );
  }

  return (
    <div>
      {/* Header */}
      <div className="mb-7 flex items-start justify-between gap-4 flex-wrap">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <div className="w-9 h-9 bg-gradient-to-br from-violet-600 to-indigo-600 rounded-xl flex items-center justify-center">
              <Brain size={18} className="text-white" />
            </div>
            <h1 className="text-2xl font-display font-bold text-surface-900">AI Study Hub</h1>
          </div>
          <p className="text-surface-500 text-sm">Generate flashcards and quizzes from any study material using Gemini AI</p>
        </div>

        {isSuper && subscription && (
          <div className="flex items-center gap-2 bg-gradient-to-r from-violet-50 to-indigo-50 border border-violet-200 px-4 py-2 rounded-xl">
            <Crown size={15} className="text-violet-600" />
            <div>
              <p className="text-xs font-bold text-violet-700">
                {String(subscription.planName)} Active
              </p>
              <p className="text-xs text-violet-500">
                {String(subscription.creditsUsed ?? 0)}/{String(subscription.aiCreditsPerMonth)} AI credits used
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-surface-100 rounded-2xl p-1.5 mb-6 overflow-x-auto">
        {tabs.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            onClick={() => setActiveTab(id)}
            className={cn(
              'flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold transition-all whitespace-nowrap',
              activeTab === id
                ? 'bg-white shadow-sm text-violet-700'
                : 'text-surface-500 hover:text-surface-700'
            )}
          >
            <Icon size={15} />
            {label}
          </button>
        ))}
      </div>

      {/* Content */}
      {!isSuper ? (
        <AISubscriptionGate />
      ) : (
        <>
          {activeTab === 'materials' && <MaterialUploader />}
          {activeTab === 'flashcards' && (
            <FlashcardGenerator onStudy={(id) => { setStudyDeckId(id); setActiveTab('study'); }} />
          )}
          {activeTab === 'quizzes' && <QuizGenerator />}
          {activeTab === 'study' && (
            <FlashcardGenerator onStudy={(id) => { setStudyDeckId(id); }} showDecksOnly />
          )}
        </>
      )}
    </div>
  );
}
