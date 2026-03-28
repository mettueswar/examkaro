'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  ArrowLeft, ArrowRight, RotateCcw, CheckCircle, XCircle,
  Minus, Shuffle, Eye, EyeOff, Trophy,
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface Flashcard {
  id: number;
  front: string;
  back: string;
  frontHindi?: string;
  backHindi?: string;
  hint?: string;
  difficulty: string;
}

interface Deck {
  id: number;
  title: string;
  cardCount: number;
  language: string;
}

interface Props {
  deckId: number;
  onExit: () => void;
}

export function FlashcardStudy({ deckId, onExit }: Props) {
  const [deck, setDeck] = useState<Deck | null>(null);
  const [cards, setCards] = useState<Flashcard[]>([]);
  const [currentIdx, setCurrentIdx] = useState(0);
  const [flipped, setFlipped] = useState(false);
  const [showHindi, setShowHindi] = useState(false);
  const [loading, setLoading] = useState(true);
  const [results, setResults] = useState<Record<number, 'easy' | 'medium' | 'hard'>>({});
  const [done, setDone] = useState(false);
  const [shuffled, setShuffled] = useState(false);

  useEffect(() => {
    const load = async () => {
      const res = await fetch(`/api/ai/flashcards?deckId=${deckId}`);
      const json = await res.json();
      if (json.success) {
        setDeck(json.data.deck);
        setCards(json.data.cards);
      }
      setLoading(false);
    };
    load();
  }, [deckId]);

  const currentCard = cards[currentIdx];
  const progress = Math.round(((currentIdx + 1) / Math.max(cards.length, 1)) * 100);
  const answered = Object.keys(results).length;

  const handleRate = (rating: 'easy' | 'medium' | 'hard') => {
    setResults(r => ({ ...r, [currentCard.id]: rating }));
    if (currentIdx + 1 >= cards.length) {
      setDone(true);
    } else {
      setCurrentIdx(i => i + 1);
      setFlipped(false);
    }
  };

  const handleShuffle = () => {
    setCards(c => [...c].sort(() => Math.random() - 0.5));
    setCurrentIdx(0);
    setFlipped(false);
    setResults({});
    setShuffled(true);
  };

  const handleRestart = () => {
    setCurrentIdx(0);
    setFlipped(false);
    setResults({});
    setDone(false);
  };

  if (loading) {
    return (
      <div className="min-h-[400px] flex items-center justify-center">
        <div className="w-10 h-10 border-4 border-violet-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (done) {
    const easy = Object.values(results).filter(r => r === 'easy').length;
    const medium = Object.values(results).filter(r => r === 'medium').length;
    const hard = Object.values(results).filter(r => r === 'hard').length;

    return (
      <div className="max-w-lg mx-auto py-12 text-center">
        <div className="w-20 h-20 bg-violet-100 rounded-full flex items-center justify-center mx-auto mb-5">
          <Trophy size={36} className="text-violet-600" />
        </div>
        <h2 className="text-2xl font-display font-bold text-surface-900 mb-2">Session Complete!</h2>
        <p className="text-surface-500 mb-6">You reviewed all {cards.length} cards in <strong>{deck?.title}</strong></p>

        <div className="grid grid-cols-3 gap-4 mb-8">
          <div className="bg-green-50 border border-green-200 rounded-2xl p-4">
            <div className="text-3xl font-bold text-green-600">{easy}</div>
            <div className="text-sm text-green-600 font-medium mt-1">Easy</div>
          </div>
          <div className="bg-orange-50 border border-orange-200 rounded-2xl p-4">
            <div className="text-3xl font-bold text-orange-500">{medium}</div>
            <div className="text-sm text-orange-500 font-medium mt-1">Medium</div>
          </div>
          <div className="bg-red-50 border border-red-200 rounded-2xl p-4">
            <div className="text-3xl font-bold text-red-500">{hard}</div>
            <div className="text-sm text-red-500 font-medium mt-1">Hard</div>
          </div>
        </div>

        <div className="flex gap-3 justify-center">
          <button onClick={handleRestart} className="flex items-center gap-2 btn-primary px-6 py-2.5">
            <RotateCcw size={15} /> Study Again
          </button>
          <button onClick={onExit} className="btn-secondary px-6 py-2.5">Exit</button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto">
      {/* Header */}
      <div className="flex items-center gap-3 mb-5">
        <button onClick={onExit} className="p-2 hover:bg-surface-100 rounded-xl transition-colors">
          <ArrowLeft size={18} className="text-surface-600" />
        </button>
        <div className="flex-1">
          <h2 className="font-bold text-surface-900 text-sm">{deck?.title}</h2>
          <p className="text-xs text-surface-400">{currentIdx + 1} of {cards.length} cards</p>
        </div>
        <button
          onClick={() => setShowHindi(h => !h)}
          className={cn('flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg font-medium transition-colors',
            showHindi ? 'bg-orange-100 text-orange-700' : 'border border-surface-200 text-surface-500 hover:bg-surface-50'
          )}
        >
          {showHindi ? <Eye size={12} /> : <EyeOff size={12} />}
          {showHindi ? 'Hindi On' : 'Hindi Off'}
        </button>
        <button onClick={handleShuffle} className="p-2 text-surface-400 hover:text-violet-600 hover:bg-violet-50 rounded-xl transition-colors" title="Shuffle">
          <Shuffle size={16} />
        </button>
      </div>

      {/* Progress bar */}
      <div className="h-2 bg-surface-100 rounded-full mb-6 overflow-hidden">
        <div
          className="h-full bg-gradient-to-r from-violet-500 to-indigo-500 rounded-full transition-all duration-500"
          style={{ width: `${progress}%` }}
        />
      </div>

      {/* Flashcard — 3D flip */}
      <div
        className="cursor-pointer mb-6"
        onClick={() => setFlipped(f => !f)}
        style={{ perspective: '1000px' }}
      >
        <div
          className="relative transition-transform duration-500"
          style={{
            transformStyle: 'preserve-3d',
            transform: flipped ? 'rotateY(180deg)' : 'rotateY(0deg)',
            minHeight: '280px',
          }}
        >
          {/* Front */}
          <div
            className="absolute inset-0 bg-white rounded-2xl border-2 border-violet-200 shadow-elevated p-6 flex flex-col items-center justify-center text-center"
            style={{ backfaceVisibility: 'hidden' }}
          >
            <div className="w-8 h-8 bg-violet-100 rounded-xl flex items-center justify-center mb-4">
              <span className="text-violet-600 font-bold text-xs">FRONT</span>
            </div>
            <p className="text-lg font-semibold text-surface-800 leading-relaxed">{currentCard?.front}</p>
            {showHindi && currentCard?.frontHindi && (
              <p className="text-sm text-surface-500 mt-3 italic">{currentCard.frontHindi}</p>
            )}
            {currentCard?.hint && (
              <p className="text-xs text-surface-400 mt-4 border-t border-surface-100 pt-3">
                💡 Hint: {currentCard.hint}
              </p>
            )}
            <p className="text-xs text-surface-300 mt-6">Click to reveal answer</p>
          </div>

          {/* Back */}
          <div
            className="absolute inset-0 bg-gradient-to-br from-violet-50 to-indigo-50 rounded-2xl border-2 border-violet-400 shadow-elevated p-6 flex flex-col items-center justify-center text-center"
            style={{ backfaceVisibility: 'hidden', transform: 'rotateY(180deg)' }}
          >
            <div className="w-8 h-8 bg-violet-500 rounded-xl flex items-center justify-center mb-4">
              <span className="text-white font-bold text-xs">BACK</span>
            </div>
            <p className="text-base text-surface-700 leading-relaxed">{currentCard?.back}</p>
            {showHindi && currentCard?.backHindi && (
              <p className="text-sm text-surface-500 mt-3 italic border-t border-violet-100 pt-3">{currentCard.backHindi}</p>
            )}
          </div>
        </div>
      </div>

      {/* Rating buttons (only show after flip) */}
      {flipped ? (
        <div className="space-y-3">
          <p className="text-center text-sm text-surface-500 font-medium">How well did you know this?</p>
          <div className="grid grid-cols-3 gap-3">
            <button onClick={() => handleRate('hard')} className="flex flex-col items-center gap-1.5 p-3 bg-red-50 hover:bg-red-100 border-2 border-red-200 hover:border-red-400 rounded-xl transition-all">
              <XCircle size={20} className="text-red-500" />
              <span className="text-sm font-semibold text-red-600">Hard</span>
              <span className="text-xs text-red-400">Didn't know</span>
            </button>
            <button onClick={() => handleRate('medium')} className="flex flex-col items-center gap-1.5 p-3 bg-orange-50 hover:bg-orange-100 border-2 border-orange-200 hover:border-orange-400 rounded-xl transition-all">
              <Minus size={20} className="text-orange-500" />
              <span className="text-sm font-semibold text-orange-600">Medium</span>
              <span className="text-xs text-orange-400">Partially knew</span>
            </button>
            <button onClick={() => handleRate('easy')} className="flex flex-col items-center gap-1.5 p-3 bg-green-50 hover:bg-green-100 border-2 border-green-200 hover:border-green-400 rounded-xl transition-all">
              <CheckCircle size={20} className="text-green-500" />
              <span className="text-sm font-semibold text-green-600">Easy</span>
              <span className="text-xs text-green-400">Knew it!</span>
            </button>
          </div>
        </div>
      ) : (
        <div className="flex items-center justify-center gap-4">
          <button
            onClick={() => { if (currentIdx > 0) { setCurrentIdx(i => i - 1); setFlipped(false); } }}
            disabled={currentIdx === 0}
            className="flex items-center gap-2 btn-outline text-sm disabled:opacity-40 px-5 py-2.5"
          >
            <ArrowLeft size={15} /> Previous
          </button>
          <button
            onClick={() => setFlipped(true)}
            className="flex items-center gap-2 bg-violet-600 hover:bg-violet-700 text-white font-semibold px-6 py-2.5 rounded-xl transition-all"
          >
            Flip Card <ArrowRight size={15} />
          </button>
        </div>
      )}

      {/* Mini progress dots */}
      <div className="flex justify-center gap-1 mt-6 flex-wrap">
        {cards.slice(0, 30).map((c, i) => (
          <div key={c.id} className={cn(
            'w-2 h-2 rounded-full transition-all',
            i === currentIdx ? 'bg-violet-600 w-4' :
            results[c.id] === 'easy' ? 'bg-green-400' :
            results[c.id] === 'medium' ? 'bg-orange-400' :
            results[c.id] === 'hard' ? 'bg-red-400' :
            'bg-surface-200'
          )} />
        ))}
        {cards.length > 30 && <span className="text-xs text-surface-400">+{cards.length - 30}</span>}
      </div>
    </div>
  );
}
