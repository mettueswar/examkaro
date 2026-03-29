"use client";

import { useState, useEffect, useCallback } from "react";
import {
  Layers,
  Trash2,
  Play,
  Loader2,
  Sparkles,
  ChevronDown,
} from "lucide-react";
import toast from "react-hot-toast";

interface Deck {
  id: number;
  title: string;
  cardCount: number;
  language: string;
  // FIX: DB column is "studied_count" → camelCase "studiedCount", NOT "studyCount"
  studiedCount: number;
  createdAt: string;
}

interface Material {
  id: number;
  title: string;
  type: string;
  wordCount: number;
  status: string;
}

interface Props {
  onStudy: (deckId: number) => void;
  showDecksOnly?: boolean;
}

export function FlashcardGenerator({ onStudy, showDecksOnly = false }: Props) {
  const [decks, setDecks] = useState<Deck[]>([]);
  const [materials, setMaterials] = useState<Material[]>([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [showForm, setShowForm] = useState(false);

  const [form, setForm] = useState({
    materialId: "",
    customText: "",
    title: "",
    count: 20,
    language: "english" as "english" | "hindi" | "both",
  });

  const fetchDecks = useCallback(async () => {
    const res = await fetch("/api/ai/flashcards");
    const json = await res.json();
    if (json.success) setDecks(json.data);
    setLoading(false);
  }, []);

  const fetchMaterials = useCallback(async () => {
    const res = await fetch("/api/ai/materials?limit=100");
    const json = await res.json();
    if (json.success)
      setMaterials(json.data.filter((m: Material) => m.status === "ready"));
  }, []);

  useEffect(() => {
    fetchDecks();
    fetchMaterials();
  }, [fetchDecks, fetchMaterials]);

  const handleGenerate = async () => {
    if (!form.title.trim()) {
      toast.error("Title required");
      return;
    }
    if (!form.materialId && !form.customText.trim()) {
      toast.error("Select a material or enter custom text");
      return;
    }

    setGenerating(true);
    try {
      const payload: Record<string, unknown> = {
        title: form.title,
        count: form.count,
        language: form.language,
      };
      if (form.materialId) payload.materialId = parseInt(form.materialId);
      else payload.customText = form.customText;

      const res = await fetch("/api/ai/flashcards", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const json = await res.json();
      if (!json.success) throw new Error(json.error);
      toast.success(`${json.data.cardCount} flashcards generated!`);
      setShowForm(false);
      setForm({
        materialId: "",
        customText: "",
        title: "",
        count: 20,
        language: "english",
      });
      fetchDecks();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Generation failed");
    } finally {
      setGenerating(false);
    }
  };

  const deleteDeck = async (id: number) => {
    if (!confirm("Delete this deck and all its cards?")) return;
    await fetch(`/api/ai/flashcards?id=${id}`, { method: "DELETE" });
    setDecks((d) => d.filter((x) => x.id !== id));
    toast.success("Deck deleted");
  };

  return (
    <div>
      {!showDecksOnly && (
        <>
          <div className="flex items-center justify-between mb-5">
            <h3 className="font-bold text-surface-900 flex items-center gap-2">
              <Layers size={18} className="text-violet-600" />
              Flashcard Decks
            </h3>
            <button
              onClick={() => setShowForm(!showForm)}
              className="flex items-center gap-2 bg-violet-600 hover:bg-violet-700 text-white text-sm font-semibold px-4 py-2 rounded-xl transition-all"
            >
              <Sparkles size={14} />
              {showForm ? "Cancel" : "Generate Deck"}
            </button>
          </div>

          {/* Generation Form */}
          {showForm && (
            <div className="card p-5 mb-5 border-2 border-violet-200 bg-violet-50/30">
              <h4 className="font-semibold text-surface-800 mb-4 flex items-center gap-2">
                <Sparkles size={15} className="text-violet-600" /> AI Flashcard
                Generator
              </h4>
              <div className="grid sm:grid-cols-2 gap-4 mb-4">
                <div className="sm:col-span-2">
                  <label className="block text-xs font-semibold text-surface-700 mb-1">
                    Deck Title *
                  </label>
                  <input
                    value={form.title}
                    onChange={(e) =>
                      setForm((p) => ({ ...p, title: e.target.value }))
                    }
                    className="input-base text-sm"
                    placeholder="e.g. Indian History - Ancient Period"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-surface-700 mb-1">
                    Source Material
                  </label>
                  <div className="relative">
                    <select
                      value={form.materialId}
                      onChange={(e) =>
                        setForm((p) => ({
                          ...p,
                          materialId: e.target.value,
                          customText: "",
                        }))
                      }
                      className="input-base text-sm appearance-none pr-8"
                    >
                      <option value="">— Use custom text below —</option>
                      {materials.map((m) => (
                        <option key={m.id} value={m.id}>
                          {m.title} ({(m.wordCount || 0).toLocaleString()}{" "}
                          words)
                        </option>
                      ))}
                    </select>
                    <ChevronDown
                      size={13}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-surface-400 pointer-events-none"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-surface-700 mb-1">
                    Number of Cards
                  </label>
                  <input
                    type="number"
                    min={5}
                    max={50}
                    value={form.count}
                    onChange={(e) =>
                      setForm((p) => ({
                        ...p,
                        count: parseInt(e.target.value) || 20,
                      }))
                    }
                    className="input-base text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-surface-700 mb-1">
                    Language
                  </label>
                  <div className="relative">
                    <select
                      value={form.language}
                      onChange={(e) =>
                        setForm((p) => ({
                          ...p,
                          language: e.target.value as typeof form.language,
                        }))
                      }
                      className="input-base text-sm appearance-none pr-8"
                    >
                      <option value="english">English only</option>
                      <option value="hindi">Hindi only</option>
                      <option value="both">Both (Bilingual)</option>
                    </select>
                    <ChevronDown
                      size={13}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-surface-400 pointer-events-none"
                    />
                  </div>
                </div>

                {!form.materialId && (
                  <div className="sm:col-span-2">
                    <label className="block text-xs font-semibold text-surface-700 mb-1">
                      Custom Text (if no material selected)
                    </label>
                    <textarea
                      value={form.customText}
                      onChange={(e) =>
                        setForm((p) => ({ ...p, customText: e.target.value }))
                      }
                      rows={4}
                      className="input-base text-sm resize-none"
                      placeholder="Paste study content here... (minimum 100 characters)"
                    />
                    <p className="text-xs text-surface-400 mt-1">
                      {form.customText.length} chars
                    </p>
                  </div>
                )}
              </div>

              <div className="flex gap-3">
                <button
                  onClick={handleGenerate}
                  disabled={generating}
                  className="flex items-center gap-2 bg-violet-600 hover:bg-violet-700 text-white font-semibold px-5 py-2.5 rounded-xl transition-all text-sm"
                >
                  {generating ? (
                    <>
                      <Loader2 size={15} className="animate-spin" /> Generating
                      with AI...
                    </>
                  ) : (
                    <>
                      <Sparkles size={15} /> Generate {form.count} Cards
                    </>
                  )}
                </button>
                <button
                  onClick={() => setShowForm(false)}
                  className="btn-secondary text-sm"
                >
                  Cancel
                </button>
              </div>

              {generating && (
                <p className="text-xs text-violet-600 mt-3 animate-pulse">
                  ✨ Gemini AI is creating your flashcards... This may take
                  15–30 seconds.
                </p>
              )}
            </div>
          )}
        </>
      )}

      {/* Decks list */}
      {loading ? (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="card p-5 animate-pulse">
              <div className="h-5 bg-surface-200 rounded w-3/4 mb-3" />
              <div className="h-3 bg-surface-100 rounded w-1/2" />
            </div>
          ))}
        </div>
      ) : decks.length === 0 ? (
        <div className="card p-12 text-center text-surface-400">
          <Layers size={36} className="mx-auto mb-3 text-surface-300" />
          <p className="font-medium text-surface-500">No flashcard decks yet</p>
          <p className="text-sm mt-1">
            Generate your first deck from any study material
          </p>
        </div>
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {decks.map((deck) => (
            <div
              key={deck.id}
              className="card p-5 hover:shadow-elevated transition-all group"
            >
              <div className="flex items-start justify-between gap-2 mb-3">
                <div className="w-10 h-10 bg-violet-100 rounded-xl flex items-center justify-center">
                  <Layers size={18} className="text-violet-600" />
                </div>
                <button
                  onClick={() => deleteDeck(deck.id)}
                  className="p-1.5 text-surface-300 hover:text-red-500 hover:bg-red-50 rounded-lg opacity-0 group-hover:opacity-100 transition-all"
                >
                  <Trash2 size={13} />
                </button>
              </div>
              <h4 className="font-bold text-surface-800 text-sm mb-1 line-clamp-2">
                {deck.title}
              </h4>
              <div className="flex items-center gap-2 text-xs text-surface-400 mb-4">
                <span>{deck.cardCount} cards</span>
                <span>·</span>
                <span className="capitalize">{deck.language}</span>
                <span>·</span>
                {/* FIX: was deck.studyCount — DB column studied_count → studiedCount */}
                <span>{deck.studiedCount ?? 0} reviews</span>
              </div>
              <button
                onClick={() => onStudy(deck.id)}
                className="w-full flex items-center justify-center gap-2 bg-violet-600 hover:bg-violet-700 text-white text-sm font-semibold py-2 rounded-lg transition-all"
              >
                <Play size={13} /> Study Now
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
