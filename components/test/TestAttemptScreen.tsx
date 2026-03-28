"use client";

import { useState, useEffect, useCallback, useRef, useMemo } from "react";
import Image from "next/image";
import {
  ChevronLeft,
  ChevronRight,
  Flag,
  RotateCcw,
  CheckCircle,
  AlertCircle,
  Clock,
  Send,
  X,
  Maximize2,
  Minimize2,
  Languages,
  ChevronDown,
  Loader2,
  User,
  BookmarkPlus,
} from "lucide-react";
import { useTestAttempt } from "@/hooks/useTestAttempt";
import { useAuth } from "@/components/providers/AuthProvider";
import { formatTime, cn } from "@/lib/utils";
import type { Question, QuestionStatus, TestSection } from "@/types";
import toast from "react-hot-toast";

interface Props {
  attemptId: number;
}

const STATUS_STYLES: Record<QuestionStatus, { bg: string; label: string }> = {
  not_visited: {
    bg: "bg-surface-300 text-surface-600 border-surface-300",
    label: "Not Visited",
  },
  not_answered: {
    bg: "bg-red-500 text-white border-red-500",
    label: "Not Answered",
  },
  answered: {
    bg: "bg-green-500 text-white border-green-500",
    label: "Answered",
  },
  marked: { bg: "bg-purple-500 text-white border-purple-500", label: "Marked" },
  answered_marked: {
    bg: "bg-purple-400 text-white border-purple-400",
    label: "Answered & Marked",
  },
};

export function TestAttemptScreen({ attemptId }: Props) {
  const { user } = useAuth();
  const {
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
    submit,
  } = useTestAttempt(attemptId);

  const [filterKey, setFilterKey] = useState("all");
  const [language, setLanguage] = useState<"english" | "hindi">("english");
  const [translating, setTranslating] = useState(false);
  const [translatedQ, setTranslatedQ] = useState("");
  const [translatedOpts, setTranslatedOpts] = useState<Record<string, string>>(
    {},
  );
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [fullscreen, setFullscreen] = useState(false);
  const [bookmarking, setBookmarking] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const translateTimer = useRef<ReturnType<typeof setTimeout>>();

  // ─── FIX 3a: Proper browser Fullscreen API ────────────────────────────────
  const toggleFullscreen = useCallback(async () => {
    try {
      if (!document.fullscreenElement) {
        await (
          containerRef.current ?? document.documentElement
        ).requestFullscreen();
        setFullscreen(true);
      } else {
        await document.exitFullscreen();
        setFullscreen(false);
      }
    } catch {
      // Fallback: just toggle CSS class if browser blocks fullscreen
      setFullscreen((f) => !f);
    }
  }, []);

  // Sync state when user presses Escape
  useEffect(() => {
    const handler = () => {
      if (!document.fullscreenElement) setFullscreen(false);
    };
    document.addEventListener("fullscreenchange", handler);
    return () => document.removeEventListener("fullscreenchange", handler);
  }, []);

  const sections = data?.test
    ? ((
        data as {
          attempt: unknown;
          questions: unknown[];
          test: { language: string };
          sections?: TestSection[];
        }
      ).sections ?? [])
    : ([] as TestSection[]);
  const allQuestions = (data?.questions ?? []) as Question[];

  const subjectOptions = useMemo(() => {
    const m = new Map<string, number>();
    for (const q of allQuestions) {
      const s = (q.subject || "").trim();
      if (!s) continue;
      m.set(s, (m.get(s) || 0) + 1);
    }
    // FIX 3b: Sort subjects ascending (a-z)
    return [...m.entries()].sort((a, b) => a[0].localeCompare(b[0]));
  }, [allQuestions]);

  // FIX 3b: Sort filtered questions ascending by order_index
  const filteredQuestions = useMemo(() => {
    let result: Question[];
    if (filterKey === "all") {
      result = allQuestions;
    } else if (filterKey.startsWith("sec:")) {
      const sid = parseInt(filterKey.slice(4), 10);
      result = Number.isNaN(sid)
        ? allQuestions
        : allQuestions.filter((q) => q.sectionId === sid);
    } else if (filterKey.startsWith("subj:")) {
      const name = decodeURIComponent(filterKey.slice(5));
      result = allQuestions.filter((q) => (q.subject || "").trim() === name);
    } else {
      result = allQuestions;
    }
    // Sort ascending by orderIndex
    return [...result].sort(
      (a, b) => (a.orderIndex ?? 0) - (b.orderIndex ?? 0),
    );
  }, [allQuestions, filterKey]);

  const filterSummary = useMemo(() => {
    if (filterKey === "all") {
      return sections.length > 0
        ? `All subjects · ${allQuestions.length} questions`
        : `All questions · ${allQuestions.length}`;
    }
    if (filterKey.startsWith("sec:")) {
      const sid = parseInt(filterKey.slice(4), 10);
      const s = sections.find((x) => x.id === sid);
      return s
        ? `${s.name} · ${filteredQuestions.length} questions`
        : "Subject";
    }
    if (filterKey.startsWith("subj:")) {
      const name = decodeURIComponent(filterKey.slice(5));
      return `${name} · ${filteredQuestions.length} questions`;
    }
    return `All questions · ${allQuestions.length}`;
  }, [filterKey, allQuestions.length, filteredQuestions.length, sections]);

  const showSubjectFilter = sections.length > 0 || subjectOptions.length > 0;

  useEffect(() => {
    setFilterKey("all");
  }, [attemptId]);

  const currentFilteredIndex = filteredQuestions.findIndex(
    (q) => q.id === allQuestions[currentIndex]?.id,
  );
  const currentQ =
    filteredQuestions[currentFilteredIndex >= 0 ? currentFilteredIndex : 0] ??
    allQuestions[currentIndex];

  const doTranslate = useCallback(
    async (q: typeof currentQ, lang: "english" | "hindi") => {
      if (!q || lang === "english") {
        setTranslatedQ("");
        setTranslatedOpts({});
        return;
      }
      if (q.textHindi) {
        setTranslatedQ(q.textHindi);
        return;
      }
      setTranslating(true);
      try {
        const res = await fetch("/api/translate", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            text: q.text.replace(/<[^>]+>/g, ""),
            from: "en",
            to: "hi",
          }),
        });
        const json = await res.json();
        if (json.success) setTranslatedQ(json.data.translated);

        const optResults: Record<string, string> = {};
        await Promise.all(
          q.options.map(async (opt) => {
            if (opt.textHindi) {
              optResults[opt.id] = opt.textHindi;
              return;
            }
            const r = await fetch("/api/translate", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ text: opt.text, from: "en", to: "hi" }),
            });
            const j = await r.json();
            if (j.success) optResults[opt.id] = j.data.translated;
          }),
        );
        setTranslatedOpts(optResults);
      } catch {
        /* silent */
      } finally {
        setTranslating(false);
      }
    },
    [],
  );

  useEffect(() => {
    clearTimeout(translateTimer.current);
    if (language === "hindi") {
      translateTimer.current = setTimeout(
        () => doTranslate(currentQ, "hindi"),
        400,
      );
    } else {
      setTranslatedQ("");
      setTranslatedOpts({});
    }
    return () => clearTimeout(translateTimer.current);
  }, [currentQ?.id, language, doTranslate]);

  const handleBookmark = async () => {
    if (!currentQ) return;
    setBookmarking(true);
    try {
      await fetch("/api/bookmarks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ questionId: currentQ.id }),
      });
      toast.success("Question bookmarked!");
    } finally {
      setBookmarking(false);
    }
  };

  const navigateFiltered = (filteredIdx: number) => {
    const q = filteredQuestions[filteredIdx];
    if (!q) return;
    const globalIdx = allQuestions.findIndex((aq) => aq.id === q.id);
    if (globalIdx >= 0) navigateTo(globalIdx);
  };

  if (loading || !data) {
    return (
      <div className="min-h-screen bg-slate-100 flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-slate-500 text-sm font-medium">Loading test...</p>
        </div>
      </div>
    );
  }

  const { test } = data;
  const qText =
    language === "hindi" && translatedQ ? translatedQ : (currentQ?.text ?? "");
  const options = currentQ?.options ?? [];
  const currentAns = answers[currentQ?.id];
  const globalCurrentIdx = allQuestions.findIndex((q) => q.id === currentQ?.id);

  return (
    <div
      ref={containerRef}
      className={cn(
        "flex flex-col bg-slate-100",
        fullscreen ? "fixed inset-0 z-50" : "min-h-screen",
      )}
    >
      {/* ══════════ TOP HEADER BAR ══════════ */}
      <header className="bg-blue-700 text-white px-4 py-2 flex items-center justify-between shrink-0 shadow-md">
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-7 h-7 bg-white/20 rounded-lg flex items-center justify-center shrink-0">
            <span className="text-xs font-bold">EK</span>
          </div>
          <div className="min-w-0">
            <p className="text-sm font-bold leading-none hidden sm:block">
              Online Assessment Platform
            </p>
            <p className="text-xs text-blue-200 truncate">{test.title}</p>
          </div>
        </div>

        <div className="flex items-center gap-3 shrink-0">
          <div
            className={cn(
              "flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-mono font-bold border",
              timeLeft < 300
                ? "bg-red-600 border-red-400 animate-pulse"
                : timeLeft < 600
                  ? "bg-orange-500 border-orange-400"
                  : "bg-white/10 border-white/20",
            )}
          >
            <Clock size={14} />
            <span>Time Left · {formatTime(timeLeft)}</span>
          </div>
          {/* FIX 3a: use toggleFullscreen with browser API */}
          <button
            onClick={toggleFullscreen}
            className="p-1.5 hover:bg-white/10 rounded-lg transition-colors"
            title={fullscreen ? "Exit Fullscreen" : "Enter Fullscreen"}
          >
            {fullscreen ? <Minimize2 size={16} /> : <Maximize2 size={16} />}
          </button>
        </div>
      </header>

      {/* ══════════ MAIN 3-COLUMN LAYOUT ══════════ */}
      <div className="flex flex-1 overflow-hidden">
        {/* ── LEFT: QUESTION PANEL ─────────────────────────────────────────── */}
        <main className="flex-1 flex flex-col overflow-hidden bg-white border-r border-slate-200">
          {/* Subject filter + Translation bar */}
          <div className="border-b border-slate-200 bg-slate-50 px-4 py-2 flex items-center gap-3 flex-wrap shrink-0">
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold text-slate-500 whitespace-nowrap">
                Subject:
              </span>
              {showSubjectFilter ? (
                <div className="relative">
                  <select
                    value={filterKey}
                    onChange={(e) => {
                      const val = e.target.value;
                      setFilterKey(val);
                      // Navigate to first question of the selected subject/section
                      if (val === "all") {
                        navigateTo(0);
                        return;
                      }
                      if (val.startsWith("sec:")) {
                        const sid = parseInt(val.slice(4), 10);
                        // Get sorted questions for this section
                        const sectionQs = allQuestions
                          .filter((q) => q.sectionId === sid)
                          .sort(
                            (a, b) => (a.orderIndex ?? 0) - (b.orderIndex ?? 0),
                          );
                        if (sectionQs.length > 0)
                          navigateTo(allQuestions.indexOf(sectionQs[0]));
                        return;
                      }
                      if (val.startsWith("subj:")) {
                        const name = decodeURIComponent(val.slice(5));
                        const subjQs = allQuestions
                          .filter((q) => (q.subject || "").trim() === name)
                          .sort(
                            (a, b) => (a.orderIndex ?? 0) - (b.orderIndex ?? 0),
                          );
                        if (subjQs.length > 0)
                          navigateTo(allQuestions.indexOf(subjQs[0]));
                      }
                    }}
                    className="appearance-none bg-white border border-slate-200 rounded-lg pl-3 pr-8 py-1.5 text-sm font-medium text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500/30 cursor-pointer max-w-[min(100vw-8rem,20rem)]"
                  >
                    <option value="all">
                      {sections.length > 0
                        ? `All subjects (${allQuestions.length} Qs)`
                        : `All questions (${allQuestions.length} Qs)`}
                    </option>
                    {sections.map((s) => (
                      <option key={s.id} value={`sec:${s.id}`}>
                        {s.name} ({s.questionCount} Qs)
                      </option>
                    ))}
                    {sections.length === 0 &&
                      subjectOptions.map(([name, count]) => (
                        <option
                          key={name}
                          value={`subj:${encodeURIComponent(name)}`}
                        >
                          {name} ({count} Qs)
                        </option>
                      ))}
                  </select>
                  <ChevronDown
                    size={13}
                    className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none"
                  />
                </div>
              ) : (
                <span className="text-sm text-slate-600">
                  Single paper ({allQuestions.length} Qs)
                </span>
              )}
            </div>

            <div className="flex-1" />

            {/* Language toggle */}
            <div className="flex items-center gap-1.5 bg-white border border-slate-200 rounded-lg p-1">
              {(["english", "hindi"] as const).map((lang) => (
                <button
                  key={lang}
                  onClick={() => setLanguage(lang)}
                  className={cn(
                    "px-3 py-1 text-xs font-semibold rounded-md transition-all flex items-center gap-1.5",
                    language === lang
                      ? "bg-blue-600 text-white shadow-sm"
                      : "text-slate-500 hover:text-slate-700",
                  )}
                >
                  {lang === "english" ? "🇬🇧 English" : "🇮🇳 हिंदी"}
                  {lang === "hindi" && translating && (
                    <Loader2 size={10} className="animate-spin" />
                  )}
                </button>
              ))}
            </div>

            <span className="text-xs text-slate-400 hidden sm:block">
              View in:{" "}
              <strong className="text-slate-600">
                {language === "hindi" ? "HINDI" : "ENGLISH"}
              </strong>
            </span>
          </div>

          {/* Question header */}
          <div className="px-5 pt-4 pb-2 flex items-center gap-3 shrink-0">
            <span className="text-sm font-bold text-slate-700">
              Question No. {(globalCurrentIdx >= 0 ? globalCurrentIdx : 0) + 1}
            </span>
            <span className="badge bg-blue-50 text-blue-600 text-xs">
              +{currentQ?.marks ?? 1} Mark
            </span>
            {(currentQ?.negativeMarks ?? 0) > 0 && (
              <span className="badge bg-red-50 text-red-600 text-xs">
                -{currentQ?.negativeMarks} Wrong
              </span>
            )}
            {currentAns?.markedForReview && (
              <span className="badge bg-purple-100 text-purple-700 text-xs flex items-center gap-1">
                <Flag size={9} /> Marked
              </span>
            )}
            <div className="flex-1" />
            <button
              onClick={handleBookmark}
              disabled={bookmarking}
              className="flex items-center gap-1.5 text-xs text-slate-500 hover:text-blue-600 hover:bg-blue-50 px-2 py-1 rounded-lg transition-colors"
            >
              <BookmarkPlus size={13} />
              <span className="hidden sm:inline">Bookmark</span>
            </button>
          </div>

          {/* Scrollable question content */}
          <div className="flex-1 overflow-y-auto px-5 py-2">
            {currentQ?.image && (
              <div className="mb-4">
                <img
                  src={currentQ.image}
                  alt="Question"
                  className="max-h-48 rounded-lg border border-slate-200 object-contain"
                />
              </div>
            )}

            <div
              className="text-slate-800 text-[15px] leading-relaxed mb-6"
              dangerouslySetInnerHTML={{ __html: qText }}
            />

            <div className="space-y-3 pb-4">
              {options.map((opt) => {
                const optText =
                  language === "hindi" && translatedOpts[opt.id]
                    ? translatedOpts[opt.id]
                    : opt.text;
                const isSelected = currentAns?.selectedOption === opt.id;

                return (
                  <button
                    key={opt.id}
                    onClick={() => selectOption(currentQ.id, opt.id)}
                    className={cn(
                      "w-full text-left flex items-start gap-3 p-4 rounded-xl border-2 transition-all group",
                      isSelected
                        ? "border-blue-500 bg-blue-50 shadow-sm"
                        : "border-slate-200 hover:border-blue-300 hover:bg-blue-50/50 bg-white",
                    )}
                  >
                    <span
                      className={cn(
                        "w-7 h-7 rounded-full border-2 flex items-center justify-center text-xs font-bold shrink-0 mt-0.5 transition-all",
                        isSelected
                          ? "border-blue-500 bg-blue-500 text-white"
                          : "border-slate-300 text-slate-500 group-hover:border-blue-300",
                      )}
                    >
                      {opt.id}
                    </span>
                    <span
                      className={cn(
                        "leading-relaxed text-sm",
                        isSelected
                          ? "text-blue-700 font-medium"
                          : "text-slate-700",
                      )}
                      dangerouslySetInnerHTML={{ __html: optText }}
                    />
                  </button>
                );
              })}
            </div>
          </div>

          {/* ── BOTTOM ACTION BAR ──────────────────────────────────────────── */}
          <div className="border-t border-slate-200 bg-white px-5 py-3 flex items-center justify-between gap-2 shrink-0">
            <div className="flex items-center gap-2">
              <button
                onClick={() => {
                  toggleMark(currentQ.id);
                  const nextIdx =
                    (globalCurrentIdx >= 0 ? globalCurrentIdx : 0) + 1;
                  if (nextIdx < allQuestions.length) navigateTo(nextIdx);
                }}
                className={cn(
                  "flex items-center gap-1.5 text-sm font-semibold px-4 py-2 rounded-lg border-2 transition-all",
                  currentAns?.markedForReview
                    ? "bg-purple-600 text-white border-purple-600"
                    : "border-purple-400 text-purple-600 hover:bg-purple-50",
                )}
              >
                <Flag size={13} />
                <span className="hidden sm:inline">Mark &amp; Next</span>
              </button>

              <button
                onClick={() => clearAnswer(currentQ.id)}
                disabled={!currentAns?.selectedOption}
                className="flex items-center gap-1.5 text-sm font-medium border border-slate-200 hover:bg-slate-50 px-3 py-2 rounded-lg transition-colors text-slate-600 disabled:opacity-40"
              >
                <RotateCcw size={13} />
                <span className="hidden sm:inline">Clear Response</span>
              </button>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => {
                  const prev =
                    (globalCurrentIdx >= 0 ? globalCurrentIdx : 0) - 1;
                  if (prev >= 0) navigateTo(prev);
                }}
                disabled={globalCurrentIdx <= 0}
                className="flex items-center gap-1 border border-slate-200 text-slate-600 hover:bg-slate-50 px-3 py-2 rounded-lg text-sm font-medium disabled:opacity-40 transition-all"
              >
                <ChevronLeft size={15} /> Prev
              </button>

              {globalCurrentIdx < allQuestions.length - 1 ? (
                <button
                  onClick={() =>
                    navigateTo(
                      (globalCurrentIdx >= 0 ? globalCurrentIdx : 0) + 1,
                    )
                  }
                  className="flex items-center gap-1 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-semibold transition-all shadow-sm"
                >
                  Save &amp; Next <ChevronRight size={15} />
                </button>
              ) : (
                <button
                  onClick={() => setConfirmOpen(true)}
                  className="flex items-center gap-1.5 bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg text-sm font-semibold transition-all shadow-sm"
                >
                  <Send size={13} /> Submit Test
                </button>
              )}
            </div>
          </div>
        </main>

        {/* ── RIGHT: PROFILE + QUESTION PALETTE SIDEBAR ──────────────────── */}
        <aside className="hidden lg:flex flex-col w-72 bg-slate-50 border-l border-slate-200 shrink-0 overflow-hidden">
          {/* Candidate Profile Card */}
          <div className="bg-white border-b border-slate-200 p-4">
            <div className="flex items-center gap-3">
              {user?.avatar ? (
                <Image
                  src={user.avatar}
                  alt={user.name || "User"}
                  width={44}
                  height={44}
                  className="rounded-full ring-2 ring-blue-100"
                />
              ) : (
                <div className="w-11 h-11 bg-blue-600 rounded-full flex items-center justify-center ring-2 ring-blue-100 shrink-0">
                  <User size={20} className="text-white" />
                </div>
              )}
              <div className="min-w-0">
                <p className="font-bold text-slate-800 text-sm truncate">
                  {user?.name || "Candidate"}
                </p>
                <p className="text-xs text-slate-400 truncate">{user?.email}</p>
              </div>
            </div>

            <div className="grid grid-cols-4 gap-1 mt-3">
              {[
                {
                  label: "Done",
                  count: stats.answered,
                  color: "text-green-600 bg-green-50",
                },
                {
                  label: "Skip",
                  count: stats.notAnswered,
                  color: "text-red-600 bg-red-50",
                },
                {
                  label: "Mark",
                  count: stats.marked,
                  color: "text-purple-600 bg-purple-50",
                },
                {
                  label: "New",
                  count: stats.notVisited,
                  color: "text-slate-500 bg-slate-100",
                },
              ].map(({ label, count, color }) => (
                <div
                  key={label}
                  className={cn("rounded-lg p-1.5 text-center", color)}
                >
                  <div className="text-base font-bold leading-none">
                    {count}
                  </div>
                  <div className="text-xs mt-0.5 font-medium opacity-80">
                    {label}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Subject info */}
          <div className="px-4 py-2.5 bg-blue-50 border-b border-blue-100">
            <p className="text-xs text-blue-600 font-semibold">
              {filterSummary}
            </p>
            <p className="text-xs text-slate-500 mt-0.5">Question Palette</p>
          </div>

          {/* Question Number Grid — scrollable */}
          <div className="flex-1 overflow-y-auto p-3">
            <div className="grid grid-cols-5 gap-1.5">
              {filteredQuestions.map((q, idx) => {
                const status: QuestionStatus =
                  answers[q.id]?.status ?? "not_visited";
                const globalIdx = allQuestions.findIndex(
                  (aq) => aq.id === q.id,
                );
                const isCurrent = q.id === currentQ?.id;

                return (
                  <button
                    key={q.id}
                    onClick={() => navigateTo(globalIdx)}
                    title={STATUS_STYLES[status].label}
                    className={cn(
                      "w-full aspect-square rounded-lg text-xs font-bold border-2 transition-all hover:scale-105 hover:shadow-sm relative",
                      STATUS_STYLES[status].bg,
                      isCurrent &&
                        "ring-2 ring-offset-1 ring-blue-500 scale-105 shadow-md",
                    )}
                  >
                    {idx + 1}
                    {answers[q.id]?.markedForReview &&
                      status === "answered_marked" && (
                        <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-yellow-400 rounded-full border border-white" />
                      )}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Legend */}
          <div className="border-t border-slate-200 bg-white px-4 py-3">
            <p className="text-xs font-semibold text-slate-500 mb-2">Legend</p>
            <div className="grid grid-cols-2 gap-x-2 gap-y-1.5">
              {[
                { status: "answered" as QuestionStatus, label: "Answered" },
                {
                  status: "not_answered" as QuestionStatus,
                  label: "Not Answered",
                },
                { status: "marked" as QuestionStatus, label: "Marked" },
                {
                  status: "not_visited" as QuestionStatus,
                  label: "Not Visited",
                },
              ].map(({ status, label }) => (
                <div key={status} className="flex items-center gap-1.5">
                  <div
                    className={cn(
                      "w-5 h-5 rounded flex items-center justify-center text-xs font-bold border-2 shrink-0",
                      STATUS_STYLES[status].bg,
                    )}
                  >
                    •
                  </div>
                  <span className="text-xs text-slate-600 leading-none">
                    {label}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Submit button */}
          <div className="p-3 bg-white border-t border-slate-200">
            <button
              onClick={() => setConfirmOpen(true)}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-2.5 rounded-xl flex items-center justify-center gap-2 transition-all shadow-sm text-sm"
            >
              <Send size={14} /> Submit Test
            </button>
          </div>
        </aside>
      </div>

      {/* ── Mobile: floating palette button ─────────────────────────────── */}
      <MobilePalette
        filteredQuestions={filteredQuestions}
        allQuestions={allQuestions}
        answers={answers}
        currentQ={currentQ}
        stats={stats}
        user={user}
        filterSummary={filterSummary}
        navigateTo={navigateTo}
        onSubmit={() => setConfirmOpen(true)}
      />

      {/* ══════════ SUBMIT CONFIRMATION MODAL ══════════ */}
      {confirmOpen && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            onClick={() => !submitting && setConfirmOpen(false)}
          />
          <div className="relative bg-white rounded-2xl p-6 w-full max-w-sm shadow-2xl">
            <div className="text-center mb-5">
              <div className="w-16 h-16 bg-orange-50 rounded-2xl flex items-center justify-center mx-auto mb-3">
                <AlertCircle size={32} className="text-orange-500" />
              </div>
              <h3 className="font-bold text-slate-900 text-xl">Submit Test?</h3>
              <p className="text-sm text-slate-500 mt-1">
                You cannot change answers after submitting.
              </p>
            </div>

            <div className="grid grid-cols-3 gap-3 mb-5">
              {[
                {
                  label: "Answered",
                  count: stats.answered,
                  color: "bg-green-50 text-green-700 border-green-200",
                },
                {
                  label: "Skipped",
                  count: stats.notAnswered + stats.notVisited,
                  color: "bg-red-50 text-red-700 border-red-200",
                },
                {
                  label: "Marked",
                  count: stats.marked,
                  color: "bg-purple-50 text-purple-700 border-purple-200",
                },
              ].map(({ label, count, color }) => (
                <div
                  key={label}
                  className={cn("rounded-xl p-3 text-center border", color)}
                >
                  <div className="text-2xl font-bold leading-none">{count}</div>
                  <div className="text-xs mt-1 font-medium">{label}</div>
                </div>
              ))}
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => setConfirmOpen(false)}
                disabled={submitting}
                className="flex-1 border border-slate-200 text-slate-700 font-semibold py-2.5 rounded-xl hover:bg-slate-50 transition-all"
              >
                Review More
              </button>
              <button
                onClick={async () => {
                  setConfirmOpen(false);
                  await submit();
                }}
                disabled={submitting}
                className="flex-1 bg-green-600 hover:bg-green-700 text-white font-bold py-2.5 rounded-xl flex items-center justify-center gap-2 transition-all"
              >
                {submitting ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />{" "}
                    Submitting...
                  </>
                ) : (
                  <>
                    <CheckCircle size={16} /> Submit
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Mobile Palette Component ─────────────────────────────────────────────────
function MobilePalette({
  filteredQuestions,
  allQuestions,
  answers,
  currentQ,
  stats,
  user,
  filterSummary,
  navigateTo,
  onSubmit,
}: {
  filteredQuestions: Question[];
  allQuestions: Question[];
  answers: Record<number, import("@/types").QuestionAttempt>;
  currentQ: Question | undefined;
  stats: {
    answered: number;
    notAnswered: number;
    marked: number;
    notVisited: number;
  };
  user: import("@/types").User | null;
  filterSummary: string;
  navigateTo: (idx: number) => void;
  onSubmit: () => void;
}) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="lg:hidden fixed bottom-4 right-4 z-40 bg-blue-600 text-white w-14 h-14 rounded-full shadow-xl flex items-center justify-center"
      >
        <span className="text-xs font-bold leading-tight text-center">
          Q<br />
          List
        </span>
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-end justify-center lg:hidden">
          <div
            className="absolute inset-0 bg-black/50"
            onClick={() => setOpen(false)}
          />
          <div className="relative bg-white rounded-t-2xl w-full max-h-[80vh] flex flex-col shadow-2xl">
            <div className="flex items-center justify-between px-5 py-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                {user?.avatar ? (
                  <Image
                    src={user.avatar}
                    alt=""
                    width={32}
                    height={32}
                    className="rounded-full"
                  />
                ) : (
                  <div className="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center">
                    <User size={14} className="text-white" />
                  </div>
                )}
                <span className="font-semibold text-slate-800 text-sm">
                  {user?.name}
                </span>
              </div>
              <button
                onClick={() => setOpen(false)}
                className="p-1.5 hover:bg-slate-100 rounded-lg"
              >
                <X size={16} />
              </button>
            </div>

            <p className="px-4 pt-3 text-xs font-semibold text-slate-600">
              {filterSummary}
            </p>
            <div className="grid grid-cols-4 gap-2 p-4 border-b border-slate-100">
              {[
                {
                  label: "Answered",
                  count: stats.answered,
                  cls: "bg-green-50 text-green-700",
                },
                {
                  label: "Not Ans.",
                  count: stats.notAnswered,
                  cls: "bg-red-50 text-red-700",
                },
                {
                  label: "Marked",
                  count: stats.marked,
                  cls: "bg-purple-50 text-purple-700",
                },
                {
                  label: "Unvisited",
                  count: stats.notVisited,
                  cls: "bg-slate-100 text-slate-600",
                },
              ].map(({ label, count, cls }) => (
                <div
                  key={label}
                  className={cn("rounded-xl p-2 text-center", cls)}
                >
                  <div className="text-lg font-bold leading-none">{count}</div>
                  <div className="text-xs mt-0.5">{label}</div>
                </div>
              ))}
            </div>

            <div className="flex-1 overflow-y-auto p-4">
              <div className="grid grid-cols-7 gap-2">
                {filteredQuestions.map((q, idx) => {
                  const status: QuestionStatus =
                    answers[q.id]?.status ?? "not_visited";
                  const globalIdx = allQuestions.findIndex(
                    (aq) => aq.id === q.id,
                  );
                  return (
                    <button
                      key={q.id}
                      onClick={() => {
                        navigateTo(globalIdx);
                        setOpen(false);
                      }}
                      className={cn(
                        "w-full aspect-square rounded-lg text-xs font-bold border-2 transition-all",
                        STATUS_STYLES[status].bg,
                        q.id === currentQ?.id &&
                          "ring-2 ring-offset-1 ring-blue-500 scale-110",
                      )}
                    >
                      {idx + 1}
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="p-4 border-t border-slate-100">
              <button
                onClick={() => {
                  setOpen(false);
                  onSubmit();
                }}
                className="w-full bg-green-600 text-white font-bold py-3 rounded-xl flex items-center justify-center gap-2"
              >
                <Send size={15} /> Submit Test
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
