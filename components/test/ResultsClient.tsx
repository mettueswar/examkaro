"use client";

import { useState } from "react";
import Link from "next/link";
import {
  CheckCircle,
  XCircle,
  MinusCircle,
  Clock,
  Trophy,
  BarChart2,
  BookOpen,
  ChevronDown,
  ChevronUp,
  ArrowRight,
  RotateCcw,
} from "lucide-react";
import { formatTime, getScoreColor, getScoreBg, cn } from "@/lib/utils";
import type { TestAttempt, MockTest, Question, QuestionAttempt } from "@/types";

interface Props {
  attempt: TestAttempt & { answers: Record<number, QuestionAttempt> };
  test: MockTest & { category_name?: string };
  questions: Question[];
}

export function ResultsClient({ attempt, test, questions }: Props) {
  const [tab, setTab] = useState<"summary" | "analysis">("summary");
  const [expandedQ, setExpandedQ] = useState<number | null>(null);
  const [filter, setFilter] = useState<
    "all" | "correct" | "incorrect" | "skipped"
  >("all");

  // FIX: Convert to Number to avoid toFixed not a function error
  const score = Number(attempt.score ?? 0);
  const totalMarks = Number(attempt.totalMarks ?? test.totalMarks ?? 0);
  const percentage =
    totalMarks > 0 ? Math.round((score / totalMarks) * 100) : 0;
  const timeTaken = attempt.timeTaken ?? 0;

  // Compute per-question result
  const questionResults = questions.map((q) => {
    const ans = attempt.answers[q.id];
    const correctOption = q.options.find((o) => o.isCorrect);
    const selected = ans?.selectedOption;
    let status: "correct" | "incorrect" | "skipped" = "skipped";
    if (selected) {
      status = selected === correctOption?.id ? "correct" : "incorrect";
    }
    return { question: q, ans, status, correctOption };
  });

  const filtered = questionResults.filter(
    (r) => filter === "all" || r.status === filter,
  );

  const summaryCards = [
    {
      label: "Score",
      value: `${score.toFixed(1)}/${totalMarks}`,
      icon: Trophy,
      color: "text-brand-600",
      bg: "bg-brand-50",
    },
    {
      label: "Correct",
      value: attempt.correct ?? 0,
      icon: CheckCircle,
      color: "text-success-600",
      bg: "bg-success-50",
    },
    {
      label: "Incorrect",
      value: attempt.incorrect ?? 0,
      icon: XCircle,
      color: "text-danger-600",
      bg: "bg-danger-50",
    },
    {
      label: "Skipped",
      value: attempt.skipped ?? 0,
      icon: MinusCircle,
      color: "text-surface-500",
      bg: "bg-surface-100",
    },
    {
      label: "Time Taken",
      value: formatTime(timeTaken),
      icon: Clock,
      color: "text-warning-500",
      bg: "bg-warning-50",
    },
    {
      label: "Accuracy",
      value: `${attempt.correct && questions.length ? Math.round((attempt.correct / questions.length) * 100) : 0}%`,
      icon: BarChart2,
      color: "text-purple-600",
      bg: "bg-purple-50",
    },
  ];

  return (
    <div>
      {/* Score Hero */}
      <div className={cn("card p-6 mb-6 border-l-4", getScoreBg(percentage))}>
        <div className="flex flex-col sm:flex-row items-center gap-6">
          <div className="relative w-28 h-28 shrink-0">
            <svg viewBox="0 0 100 100" className="w-28 h-28 -rotate-90">
              <circle
                cx="50"
                cy="50"
                r="42"
                fill="none"
                stroke="#e2e8f0"
                strokeWidth="10"
              />
              <circle
                cx="50"
                cy="50"
                r="42"
                fill="none"
                stroke={
                  percentage >= 80
                    ? "#22c55e"
                    : percentage >= 60
                      ? "#f59e0b"
                      : "#ef4444"
                }
                strokeWidth="10"
                strokeDasharray={`${2 * Math.PI * 42}`}
                strokeDashoffset={`${2 * Math.PI * 42 * (1 - percentage / 100)}`}
                strokeLinecap="round"
              />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span
                className={cn(
                  "text-2xl font-display font-bold",
                  getScoreColor(percentage),
                )}
              >
                {percentage}%
              </span>
              <span className="text-xs text-surface-500">Score</span>
            </div>
          </div>

          <div className="text-center sm:text-left">
            <h1 className="text-xl font-display font-bold text-surface-900 mb-1">
              {percentage >= 80
                ? "🎉 Excellent!"
                : percentage >= 60
                  ? "👍 Good Job!"
                  : "📚 Keep Practicing!"}
            </h1>
            <p className="text-surface-600 text-sm mb-1">{test.title}</p>
            <p className="text-surface-500 text-xs">{test.category_name}</p>
            <div className="flex items-center gap-2 mt-3">
              <Link
                href={`/tests/${test.slug}`}
                className="flex items-center gap-1.5 text-sm btn-outline py-1.5 px-3"
              >
                <RotateCcw size={13} /> Reattempt
              </Link>
              <Link
                href="/tests"
                className="flex items-center gap-1.5 text-sm btn-primary py-1.5 px-3"
              >
                More Tests <ArrowRight size={13} />
              </Link>
            </div>
          </div>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 mb-6">
        {summaryCards.map(({ label, value, icon: Icon, color, bg }) => (
          <div key={label} className="card p-3 text-center">
            <div
              className={cn(
                "w-8 h-8 rounded-lg flex items-center justify-center mx-auto mb-2",
                bg,
              )}
            >
              <Icon size={16} className={color} />
            </div>
            <div className="text-lg font-bold text-surface-900">{value}</div>
            <div className="text-xs text-surface-500">{label}</div>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div className="flex bg-surface-100 rounded-xl p-1 mb-5 w-fit">
        {(["summary", "analysis"] as const).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={cn(
              "px-5 py-1.5 text-sm font-medium rounded-lg transition-all capitalize",
              tab === t
                ? "bg-white shadow-sm text-surface-900"
                : "text-surface-500 hover:text-surface-700",
            )}
          >
            {t === "summary" ? "📊 Summary" : "📝 Question Analysis"}
          </button>
        ))}
      </div>

      {tab === "summary" ? (
        <div className="grid sm:grid-cols-2 gap-4">
          {/* Performance Bar */}
          <div className="card p-5">
            <h3 className="font-semibold text-surface-800 text-sm mb-4">
              Performance Breakdown
            </h3>
            {[
              {
                label: "Correct",
                count: attempt.correct ?? 0,
                color: "bg-success-500",
                total: questions.length,
              },
              {
                label: "Incorrect",
                count: attempt.incorrect ?? 0,
                color: "bg-danger-500",
                total: questions.length,
              },
              {
                label: "Skipped",
                count: attempt.skipped ?? 0,
                color: "bg-surface-300",
                total: questions.length,
              },
            ].map(({ label, count, color, total }) => (
              <div key={label} className="mb-3">
                <div className="flex justify-between text-xs text-surface-600 mb-1">
                  <span>{label}</span>
                  <span>
                    {count}/{total}
                  </span>
                </div>
                <div className="h-2 bg-surface-100 rounded-full overflow-hidden">
                  <div
                    className={cn("h-full rounded-full transition-all", color)}
                    style={{
                      width: `${total > 0 ? (count / total) * 100 : 0}%`,
                    }}
                  />
                </div>
              </div>
            ))}
          </div>

          {/* Time Stats */}
          <div className="card p-5">
            <h3 className="font-semibold text-surface-800 text-sm mb-4">
              Time Statistics
            </h3>
            <div className="space-y-3">
              <div className="flex justify-between text-sm">
                <span className="text-surface-600">Total Duration</span>
                <span className="font-semibold">{test.duration} min</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-surface-600">Time Taken</span>
                <span className="font-semibold">{formatTime(timeTaken)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-surface-600">Avg per Question</span>
                <span className="font-semibold">
                  {questions.length > 0
                    ? Math.round(timeTaken / questions.length)
                    : 0}
                  s
                </span>
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div>
          {/* Filter */}
          <div className="flex items-center gap-2 mb-4 flex-wrap">
            {(["all", "correct", "incorrect", "skipped"] as const).map((f) => {
              const count =
                f === "all"
                  ? questions.length
                  : questionResults.filter((r) => r.status === f).length;
              return (
                <button
                  key={f}
                  onClick={() => setFilter(f)}
                  className={cn(
                    "px-3 py-1.5 text-sm font-medium rounded-lg border transition-all capitalize",
                    filter === f
                      ? "bg-brand-500 text-white border-brand-500"
                      : "bg-white text-surface-600 border-surface-200 hover:border-surface-300",
                  )}
                >
                  {f} ({count})
                </button>
              );
            })}
          </div>

          <div className="space-y-3">
            {filtered.map(
              ({ question: q, ans, status, correctOption }, idx) => (
                <div
                  key={q.id}
                  className={cn(
                    "card overflow-hidden border-l-4",
                    status === "correct"
                      ? "border-l-success-500"
                      : status === "incorrect"
                        ? "border-l-danger-500"
                        : "border-l-surface-300",
                  )}
                >
                  <button
                    onClick={() =>
                      setExpandedQ(expandedQ === q.id ? null : q.id)
                    }
                    className="w-full flex items-center justify-between p-4 text-left"
                  >
                    <div className="flex items-center gap-3">
                      {status === "correct" ? (
                        <CheckCircle
                          size={16}
                          className="text-success-500 shrink-0"
                        />
                      ) : status === "incorrect" ? (
                        <XCircle
                          size={16}
                          className="text-danger-500 shrink-0"
                        />
                      ) : (
                        <MinusCircle
                          size={16}
                          className="text-surface-400 shrink-0"
                        />
                      )}
                      <span className="text-sm font-medium text-surface-700">
                        Q{idx + 1}.
                      </span>
                      <span
                        className="text-sm text-surface-700 line-clamp-1"
                        dangerouslySetInnerHTML={{ __html: q.text }}
                      />
                    </div>
                    {expandedQ === q.id ? (
                      <ChevronUp
                        size={15}
                        className="text-surface-400 shrink-0"
                      />
                    ) : (
                      <ChevronDown
                        size={15}
                        className="text-surface-400 shrink-0"
                      />
                    )}
                  </button>

                  {expandedQ === q.id && (
                    <div className="px-4 pb-4 border-t border-surface-100">
                      <div
                        className="text-sm text-surface-800 mb-4 mt-3"
                        dangerouslySetInnerHTML={{ __html: q.text }}
                      />
                      <div className="space-y-2">
                        {q.options.map((opt) => {
                          const isSelected = ans?.selectedOption === opt.id;
                          const isCorrect = opt.isCorrect;
                          return (
                            <div
                              key={opt.id}
                              className={cn(
                                "flex items-start gap-3 p-3 rounded-lg text-sm border",
                                isCorrect
                                  ? "bg-success-50 border-success-200 text-success-700"
                                  : isSelected
                                    ? "bg-danger-50 border-danger-200 text-danger-700"
                                    : "bg-surface-50 border-surface-100 text-surface-600",
                              )}
                            >
                              <span
                                className={cn(
                                  "w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold shrink-0",
                                  isCorrect
                                    ? "bg-success-500 text-white"
                                    : isSelected
                                      ? "bg-danger-500 text-white"
                                      : "bg-surface-300 text-surface-600",
                                )}
                              >
                                {opt.id}
                              </span>
                              <span
                                dangerouslySetInnerHTML={{ __html: opt.text }}
                              />
                              {isCorrect && (
                                <span className="ml-auto text-xs font-medium text-success-600">
                                  ✓ Correct
                                </span>
                              )}
                              {isSelected && !isCorrect && (
                                <span className="ml-auto text-xs font-medium text-danger-600">
                                  ✗ Your Answer
                                </span>
                              )}
                            </div>
                          );
                        })}
                      </div>
                      {q.explanation && (
                        <div className="mt-4 p-3 bg-blue-50 rounded-lg border border-blue-100">
                          <p className="text-xs font-semibold text-blue-700 mb-1 flex items-center gap-1">
                            <BookOpen size={12} /> Explanation
                          </p>
                          <div
                            className="text-sm text-blue-800"
                            dangerouslySetInnerHTML={{ __html: q.explanation }}
                          />
                        </div>
                      )}
                    </div>
                  )}
                </div>
              ),
            )}
          </div>
        </div>
      )}
    </div>
  );
}
