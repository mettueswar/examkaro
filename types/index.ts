// ─── User ───────────────────────────────────────────────────────────────────
export type UserPlan = 'free' | 'premium' | 'super';
export type SubscriptionBilling = 'monthly' | 'quarterly' | 'yearly';

export interface User {
  id: number;
  uid: string;
  name: string;
  email: string;
  phone?: string;
  avatar?: string;
  role: 'user' | 'admin' | 'moderator';
  plan: UserPlan;
  planExpiry?: Date | string;
  isActive?: boolean;
  lastLogin?: Date | string;
  createdAt: Date | string;
  updatedAt?: Date | string;
}

// ─── Category ─────────────────────────────────────────────────────────────────
export interface Category {
  id: number;
  name: string;
  nameHindi?: string;
  slug: string;
  description?: string;
  icon?: string;
  color?: string;
  parentId?: number;
  children?: Category[];
  testCount?: number;
  createdAt?: Date | string;
}

// ─── Mock Test ────────────────────────────────────────────────────────────────
export type TestLanguage = 'hindi' | 'english' | 'both';
export type TestType = 'free' | 'premium';
export type DifficultyLevel = 'easy' | 'medium' | 'hard';

export interface MockTest {
  id: number;
  title: string;
  titleHindi?: string;
  slug: string;
  description?: string;
  categoryId: number;
  category?: Category;
  type: TestType;
  language: TestLanguage;
  duration: number;
  totalQuestions: number;
  totalMarks: number;
  negativeMarking: number;
  passingMarks?: number;
  difficulty: DifficultyLevel;
  instructions?: string;
  instructionsHindi?: string;
  isActive: boolean;
  attemptCount: number;
  createdAt?: Date | string;
  updatedAt?: Date | string;
}

// ─── Question ─────────────────────────────────────────────────────────────────
export type QuestionType = 'mcq' | 'true_false' | 'fill_blank';

export interface Option {
  id: string;
  text: string;
  textHindi?: string;
  isCorrect: boolean;
  image?: string;
}

export interface Question {
  id: number;
  testId: number;
  sectionId?: number;
  text: string;
  textHindi?: string;
  type: QuestionType;
  options: Option[];
  explanation?: string;
  explanationHindi?: string;
  image?: string;
  marks: number;
  negativeMarks: number;
  difficulty: DifficultyLevel;
  tags?: string[];
  orderIndex: number;
  subject?: string; // for subject-based filtering
}

// ─── Test Section ─────────────────────────────────────────────────────────────
export interface TestSection {
  id: number;
  testId: number;
  name: string;
  nameHindi?: string;
  questionCount: number;
  timeLimit?: number;
  orderIndex?: number;
}

// ─── Test Attempt ─────────────────────────────────────────────────────────────
export type QuestionStatus = 'not_visited' | 'not_answered' | 'answered' | 'marked' | 'answered_marked';

export interface QuestionAttempt {
  questionId: number;
  selectedOption?: string;
  status: QuestionStatus;
  timeSpent: number;
  markedForReview: boolean;
}

export interface TestAttempt {
  id: number;
  userId: number;
  testId: number;
  test?: MockTest;
  answers: Record<number, QuestionAttempt>;
  startTime: Date | string;
  endTime?: Date | string;
  submittedAt?: Date | string;
  score?: number;
  totalMarks?: number;
  correct?: number;
  incorrect?: number;
  skipped?: number;
  timeTaken?: number;
  rank?: number;
  percentile?: number;
  language?: 'hindi' | 'english';
  status: 'in_progress' | 'submitted' | 'expired';
}

// ─── Package ──────────────────────────────────────────────────────────────────
export interface Package {
  id: number;
  name: string;
  slug: string;
  description?: string;
  price: number;
  discountedPrice?: number;
  validityDays: number;
  testIds: number[];
  tests?: MockTest[];
  categoryIds?: number[];
  isActive: boolean;
  features: string[];
  planType?: UserPlan;
  billing?: SubscriptionBilling;
  createdAt?: Date | string;
}

// ─── Payment ──────────────────────────────────────────────────────────────────
export type PaymentStatus = 'pending' | 'success' | 'failed' | 'refunded';

export interface Payment {
  id: number;
  userId: number;
  packageId?: number;
  orderId: string;
  paymentId?: string;
  amount: number;
  currency: string;
  status: PaymentStatus;
  metadata?: Record<string, unknown>;
  createdAt?: Date | string;
}

// ─── News ─────────────────────────────────────────────────────────────────────
export interface NewsArticle {
  id: number;
  title: string;
  slug: string;
  content: string;
  excerpt?: string;
  featuredImage?: string;
  authorId: number;
  author?: User;
  categoryId?: number;
  tags?: string[];
  published: boolean;
  publishedAt?: Date | string;
  viewCount: number;
  createdAt?: Date | string;
  updatedAt?: Date | string;
}

// ─── API Response ─────────────────────────────────────────────────────────────
export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  message?: string;
  error?: string;
  pagination?: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

// ─── Auth ─────────────────────────────────────────────────────────────────────
export interface AuthPayload {
  userId: number;
  uid: string;
  email: string;
  role: User['role'];
  plan: UserPlan;
}

// ─── Test State ───────────────────────────────────────────────────────────────
export interface TestState {
  attemptId: number;
  testId: number;
  currentQuestionIndex: number;
  currentSectionIndex: number;
  answers: Record<number, QuestionAttempt>;
  timeLeft: number;
  language: 'hindi' | 'english';
  sections: TestSection[];
  questions: Question[];
  isSubmitting: boolean;
  isPaused: boolean;
}

// ─── AI Study Material ────────────────────────────────────────────────────────
export type SourceType = 'pdf' | 'docx' | 'website' | 'youtube' | 'text';

export interface StudyMaterial {
  id: number;
  userId: number;
  title: string;
  sourceType: SourceType;
  sourceUrl?: string;
  content: string;
  summary?: string;
  wordCount?: number;
  status: 'processing' | 'ready' | 'error';
  errorMessage?: string;
  createdAt?: Date | string;
}

// ─── Flashcard ────────────────────────────────────────────────────────────────
export interface FlashcardDeck {
  id: number;
  userId: number;
  materialId?: number;
  title: string;
  description?: string;
  cardCount: number;
  lastStudied?: Date | string;
  createdAt?: Date | string;
}

export interface Flashcard {
  id: number;
  deckId: number;
  front: string;
  back: string;
  hint?: string;
  difficulty: 'easy' | 'medium' | 'hard';
  timesReviewed: number;
  timesCorrect: number;
  nextReview?: Date | string;
  createdAt?: Date | string;
}

// ─── AI Quiz ──────────────────────────────────────────────────────────────────
export interface AIQuiz {
  id: number;
  userId: number;
  materialId?: number;
  title: string;
  description?: string;
  questionCount: number;
  timeLimit?: number;
  questions: AIQuizQuestion[];
  attempts: number;
  createdAt?: Date | string;
}

export interface AIQuizQuestion {
  id: string;
  text: string;
  options: { id: string; text: string }[];
  correctOption: string;
  explanation?: string;
}

// ─── Subscription ─────────────────────────────────────────────────────────────
export interface SubscriptionPlan {
  id: string;
  name: string;
  billing: SubscriptionBilling;
  price: number;
  features: string[];
  aiCallsPerMonth: number;
  storageGb: number;
}
