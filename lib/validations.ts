import { z } from "zod";

// ─── Auth ─────────────────────────────────────────────────────────────────────
export const loginSchema = z.object({
  idToken: z.string().min(1, "ID token required"),
});

export const registerSchema = z.object({
  idToken: z.string().min(1),
  name: z.string().min(2, "Name must be at least 2 characters").max(100),
});

// ─── Category ────────────────────────────────────────────────────────────────
export const categorySchema = z.object({
  name: z.string().min(2).max(100),
  nameHindi: z.string().max(100).nullish(),
  slug: z
    .string()
    .regex(/^[a-z0-9-]+$/, "Slug must be lowercase alphanumeric with hyphens")
    .nullish(),
  description: z.string().max(1000).nullish(),
  icon: z.string().max(50).nullish(),
  color: z
    .string()
    .regex(/^#[0-9a-fA-F]{6}$/, "Invalid hex color")
    .nullish(),
  parentId: z.number().int().positive().nullish(),
  orderIndex: z.number().int().min(0).default(0).optional(),
});

// ─── Mock Test ────────────────────────────────────────────────────────────────
export const mockTestSchema = z.object({
  title: z.string().min(3).max(500),
  titleHindi: z.string().max(500).nullish(),
  slug: z
    .string()
    .regex(/^[a-z0-9-]+$/)
    .optional(),
  description: z.string().max(2000).nullish(),
  categoryId: z.number().int().positive(),
  type: z.enum(["free", "premium"]),
  language: z.enum(["hindi", "english", "both"]),
  duration: z.number().int().min(5).max(360),
  negativeMarking: z.number().min(0).max(1).default(0.25),
  passingMarks: z.number().min(0).nullish(),
  difficulty: z.enum(["easy", "medium", "hard"]),
  instructions: z.string().nullish(),
  instructionsHindi: z.string().nullish(),
  isActive: z.boolean().default(true),
});

// ─── Question ────────────────────────────────────────────────────────────────
const optionSchema = z.object({
  id: z.enum(["A", "B", "C", "D", "E"]),
  text: z.string().min(1),
  textHindi: z.string().nullish(),
  isCorrect: z.boolean(),
  image: z.string().url().nullish(),
});

const optionsArray = z
  .array(optionSchema)
  .min(2)
  .max(5)
  .refine(
    (opts) => opts.filter((o) => o.isCorrect).length === 1,
    "Exactly one option must be correct",
  );

export const questionSchema = z.object({
  testId: z.number().int().positive(),
  sectionId: z.number().int().positive().nullable().optional(),
  subject: z.string().max(100).trim().nullish(),
  text: z.string().min(1),
  textHindi: z.string().nullish(),
  type: z.enum(["mcq", "true_false", "fill_blank"]),
  options: optionsArray,
  explanation: z.string().nullish(),
  explanationHindi: z.string().nullish(),
  image: z.string().url().nullish(),
  marks: z.coerce.number().min(0).max(10).default(1),
  negativeMarks: z.coerce.number().min(0).max(5).default(0.25),
  difficulty: z.enum(["easy", "medium", "hard"]).default("medium"),
  tags: z.array(z.string()).nullish(),
  orderIndex: z.number().int().min(0).default(0).optional(),
});

// separate schema for PUT where options is optional
export const questionUpdateSchema = questionSchema.extend({
  options: optionsArray.nullish(), // optional for PUT
});

// ─── Package ──────────────────────────────────────────────────────────────────
export const packageSchema = z.object({
  name: z.string().min(3).max(255),
  slug: z
    .string()
    .regex(/^[a-z0-9-]+$/)
    .optional(),
  description: z.string().max(2000).optional(),
  price: z.number().min(0),
  discountedPrice: z.number().min(0).optional(),
  validityDays: z.number().int().min(1).max(3650).default(365),
  testIds: z.array(z.number().int().positive()),
  /** Max mock tests unlocked from testIds (first N in order). Null/omit = all selected tests. */
  mockTestAccessLimit: z.number().int().positive().max(10_000).nullish(),
  categoryIds: z.array(z.number().int().positive()).optional(),
  features: z.array(z.string()).default([]),
  isActive: z.boolean().default(true),
});

// ─── Payment ──────────────────────────────────────────────────────────────────
export const createOrderSchema = z.object({
  packageId: z.number().int().positive(),
});

export const verifyPaymentSchema = z.object({
  orderId: z.string().min(1),
  paymentId: z.string().min(1),
  signature: z.string().min(1),
  packageId: z.number().int().positive(),
});

// ─── Test Attempt ─────────────────────────────────────────────────────────────
export const startAttemptSchema = z.object({
  testId: z.number().int().positive(),
  language: z.enum(["hindi", "english"]),
});

export const saveAnswerSchema = z.object({
  attemptId: z.number().int().positive(),
  questionId: z.number().int().positive(),
  selectedOption: z.string().optional(),
  markedForReview: z.boolean().default(false),
  timeSpent: z.number().int().min(0),
});

export const submitAttemptSchema = z.object({
  attemptId: z.number().int().positive(),
});

// ─── News ─────────────────────────────────────────────────────────────────────
export const newsSchema = z.object({
  title: z.string().min(3).max(500),
  slug: z
    .string()
    .regex(/^[a-z0-9-]+$/)
    .optional(),
  content: z.string().min(10),
  excerpt: z.string().max(500).optional(),
  featuredImage: z.string().url().optional(),
  categoryId: z.number().int().positive().optional(),
  tags: z.array(z.string()).optional(),
  published: z.boolean().default(false),
});

// ─── Profile ──────────────────────────────────────────────────────────────────
export const updateProfileSchema = z.object({
  name: z.string().min(2).max(100).optional(),
  phone: z
    .string()
    .regex(/^[6-9]\d{9}$/, "Invalid Indian phone number")
    .optional(),
  avatar: z.string().url().optional(),
});

// ─── Pagination ───────────────────────────────────────────────────────────────
export const paginationSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  search: z.string().optional(),
  sort: z.string().optional(),
  order: z.enum(["asc", "desc"]).default("desc"),
});
