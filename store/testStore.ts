import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import type { Question, QuestionAttempt, TestSection, MockTest } from '@/types';

interface TestStore {
  // Active test state
  attemptId: number | null;
  test: MockTest | null;
  questions: Question[];
  sections: TestSection[];
  answers: Record<number, QuestionAttempt>;
  currentIndex: number;
  language: 'english' | 'hindi';
  timeLeft: number;
  isPaused: boolean;
  isSubmitted: boolean;

  // Actions
  initTest: (params: {
    attemptId: number;
    test: MockTest;
    questions: Question[];
    sections: TestSection[];
    answers: Record<number, QuestionAttempt>;
    language: 'english' | 'hindi';
    timeLeft: number;
  }) => void;
  setAnswer: (questionId: number, answer: Partial<QuestionAttempt>) => void;
  setCurrentIndex: (index: number) => void;
  setLanguage: (lang: 'english' | 'hindi') => void;
  tickTimer: () => void;
  setPaused: (paused: boolean) => void;
  markSubmitted: () => void;
  reset: () => void;
}

const initialState = {
  attemptId: null,
  test: null,
  questions: [],
  sections: [],
  answers: {},
  currentIndex: 0,
  language: 'english' as const,
  timeLeft: 0,
  isPaused: false,
  isSubmitted: false,
};

export const useTestStore = create<TestStore>()(
  persist(
    (set, get) => ({
      ...initialState,

      initTest: ({ attemptId, test, questions, sections, answers, language, timeLeft }) => {
        set({ attemptId, test, questions, sections, answers, language, timeLeft, isSubmitted: false });
      },

      setAnswer: (questionId, answer) => {
        const existing = get().answers[questionId] || {
          questionId,
          status: 'not_visited' as const,
          timeSpent: 0,
          markedForReview: false,
        };
        set(state => ({
          answers: {
            ...state.answers,
            [questionId]: { ...existing, ...answer },
          },
        }));
      },

      setCurrentIndex: (index) => {
        const { questions, answers } = get();
        const q = questions[get().currentIndex];
        // Mark current question as "not_answered" if first visit
        if (q && !answers[q.id]) {
          set(state => ({
            answers: {
              ...state.answers,
              [q.id]: {
                questionId: q.id,
                status: 'not_answered',
                timeSpent: 0,
                markedForReview: false,
              },
            },
          }));
        }
        set({ currentIndex: index });
      },

      setLanguage: (language) => set({ language }),

      tickTimer: () => {
        const { timeLeft, isPaused, isSubmitted } = get();
        if (isPaused || isSubmitted) return;
        set({ timeLeft: Math.max(0, timeLeft - 1) });
      },

      setPaused: (isPaused) => set({ isPaused }),

      markSubmitted: () => set({ isSubmitted: true }),

      reset: () => set(initialState),
    }),
    {
      name: 'examkaro-test-session',
      storage: createJSONStorage(() => sessionStorage),
      // Only persist answers and index across page refreshes
      partialize: (state) => ({
        attemptId: state.attemptId,
        answers: state.answers,
        currentIndex: state.currentIndex,
        language: state.language,
      }),
    }
  )
);

// ─── Selector hooks ────────────────────────────────────────────────────────
export const useCurrentQuestion = () =>
  useTestStore(s => s.questions[s.currentIndex] ?? null);

export const useQuestionStatus = (questionId: number) =>
  useTestStore(s => s.answers[questionId]?.status ?? 'not_visited');

export const useTestStats = () =>
  useTestStore(s => {
    const vals = Object.values(s.answers);
    return {
      answered: vals.filter(a => a.selectedOption).length,
      notAnswered: vals.filter(a => !a.selectedOption && a.status !== 'not_visited').length,
      marked: vals.filter(a => a.markedForReview).length,
      notVisited: s.questions.length - vals.length,
    };
  });
