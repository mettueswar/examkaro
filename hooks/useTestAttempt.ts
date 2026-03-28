'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import toast from 'react-hot-toast';
import type { Question, TestAttempt, MockTest, QuestionAttempt, QuestionStatus } from '@/types';

interface AttemptData {
  attempt: TestAttempt;
  questions: Question[];
  test: MockTest;
}

export function useTestAttempt(attemptId: number) {
  const router = useRouter();
  const [data, setData] = useState<AttemptData | null>(null);
  const [answers, setAnswers] = useState<Record<number, QuestionAttempt>>({});
  const [currentIndex, setCurrentIndexRaw] = useState(0);
  const [timeLeft, setTimeLeft] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [loading, setLoading] = useState(true);
  const timerRef = useRef<ReturnType<typeof setInterval>>();
  const saveQueue = useRef<Map<number, ReturnType<typeof setTimeout>>>(new Map());

  // ── Load attempt ──────────────────────────────────────────────────────────
  useEffect(() => {
    const load = async () => {
      try {
        const res = await fetch(`/api/attempts/${attemptId}`);
        const json = await res.json();
        if (!json.success) throw new Error(json.error || 'Not found');

        const { attempt, questions, test } = json.data;
        setData({ attempt, questions, test });
        setAnswers(attempt.answers || {});

        const elapsed = Math.floor((Date.now() - new Date(attempt.startTime).getTime()) / 1000);
        const total = test.duration * 60;
        setTimeLeft(Math.max(0, total - elapsed));
      } catch (err) {
        toast.error('Failed to load test. Redirecting...');
        router.push('/dashboard');
      } finally {
        setLoading(false);
      }
    };
    load();
    return () => clearInterval(timerRef.current);
  }, [attemptId, router]);

  // ── Timer ────────────────────────────────────────────────────────────────
  useEffect(() => {
    if (loading || !data || timeLeft <= 0) return;
    timerRef.current = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) {
          clearInterval(timerRef.current);
          void doSubmit(true);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(timerRef.current);
  }, [loading, data?.test.id]);

  // ── Debounced server save ─────────────────────────────────────────────────
  const scheduleSave = useCallback((questionId: number, ans: QuestionAttempt) => {
    const existing = saveQueue.current.get(questionId);
    if (existing) clearTimeout(existing);
    const t = setTimeout(async () => {
      await fetch('/api/attempts/save', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          attemptId,
          questionId,
          selectedOption: ans.selectedOption,
          markedForReview: ans.markedForReview,
          timeSpent: ans.timeSpent,
        }),
      }).catch(() => {});
      saveQueue.current.delete(questionId);
    }, 400);
    saveQueue.current.set(questionId, t);
  }, [attemptId]);

  // ── Select option ─────────────────────────────────────────────────────────
  const selectOption = useCallback((questionId: number, optionId: string) => {
    setAnswers(prev => {
      const existing = prev[questionId];
      const newAns: QuestionAttempt = {
        questionId,
        selectedOption: optionId,
        status: existing?.markedForReview ? 'answered_marked' : 'answered',
        timeSpent: (existing?.timeSpent || 0),
        markedForReview: existing?.markedForReview || false,
      };
      scheduleSave(questionId, newAns);
      return { ...prev, [questionId]: newAns };
    });
  }, [scheduleSave]);

  // ── Clear answer ──────────────────────────────────────────────────────────
  const clearAnswer = useCallback((questionId: number) => {
    setAnswers(prev => {
      const existing = prev[questionId];
      const newAns: QuestionAttempt = {
        questionId,
        selectedOption: undefined,
        status: existing?.markedForReview ? 'marked' : 'not_answered',
        timeSpent: existing?.timeSpent || 0,
        markedForReview: existing?.markedForReview || false,
      };
      scheduleSave(questionId, newAns);
      return { ...prev, [questionId]: newAns };
    });
  }, [scheduleSave]);

  // ── Toggle mark for review ────────────────────────────────────────────────
  const toggleMark = useCallback((questionId: number) => {
    setAnswers(prev => {
      const existing = prev[questionId];
      const marked = !existing?.markedForReview;
      const status: QuestionStatus = existing?.selectedOption
        ? (marked ? 'answered_marked' : 'answered')
        : (marked ? 'marked' : 'not_answered');
      const newAns: QuestionAttempt = {
        questionId,
        selectedOption: existing?.selectedOption,
        status,
        timeSpent: existing?.timeSpent || 0,
        markedForReview: marked,
      };
      scheduleSave(questionId, newAns);
      return { ...prev, [questionId]: newAns };
    });
  }, [scheduleSave]);

  // ── Navigate ──────────────────────────────────────────────────────────────
  const navigateTo = useCallback((index: number) => {
    if (!data) return;
    const currentQ = data.questions[currentIndex];
    if (currentQ && !answers[currentQ.id]) {
      setAnswers(prev => ({
        ...prev,
        [currentQ.id]: {
          questionId: currentQ.id,
          status: 'not_answered',
          timeSpent: 0,
          markedForReview: false,
        },
      }));
    }
    setCurrentIndexRaw(Math.max(0, Math.min(index, (data?.questions.length ?? 1) - 1)));
  }, [data, currentIndex, answers]);

  // ── Submit ────────────────────────────────────────────────────────────────
  const doSubmit = async (auto = false) => {
    if (submitting) return;
    setSubmitting(true);
    clearInterval(timerRef.current);
    // Flush all pending saves
    saveQueue.current.forEach((t) => clearTimeout(t));
    saveQueue.current.clear();
    try {
      const res = await fetch('/api/attempts', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ attemptId }),
      });
      const json = await res.json();
      if (!json.success) throw new Error(json.error);
      if (auto) toast.success('Time up! Test submitted automatically.');
      router.push(`/results/${attemptId}`);
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Submission failed. Try again.');
      setSubmitting(false);
    }
  };

  // ── Computed stats ────────────────────────────────────────────────────────
  const stats = {
    answered: Object.values(answers).filter(a => a.selectedOption).length,
    notAnswered: Object.values(answers).filter(a => !a.selectedOption && a.status !== 'not_visited').length,
    marked: Object.values(answers).filter(a => a.markedForReview).length,
    notVisited: (data?.questions.length ?? 0) - Object.keys(answers).length,
  };

  return {
    data,
    loading,
    answers,
    currentIndex,
    timeLeft,
    submitting,
    stats,
    selectOption,
    clearAnswer,
    toggleMark,
    navigateTo,
    submit: () => doSubmit(false),
  };
}
