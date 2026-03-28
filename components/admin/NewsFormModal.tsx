"use client";

import { useState, useRef } from "react";
import { X, Save } from "lucide-react";
import dynamic from "next/dynamic";
import toast from "react-hot-toast";
import type { NewsArticle } from "@/types";

// TipTap loaded client-side only
const TipTapWrapper = dynamic(() => import("./TipTapWrapper"), {
  ssr: false,
  loading: () => (
    <div className="h-64 bg-surface-100 rounded-lg animate-pulse" />
  ),
});

interface Props {
  article: NewsArticle | null;
  onClose: () => void;
  onSaved: () => void;
}

export function NewsFormModal({ article, onClose, onSaved }: Props) {
  const [title, setTitle] = useState(article?.title || "");
  const [slug, setSlug] = useState(article?.slug || "");
  const [excerpt, setExcerpt] = useState(article?.excerpt || "");
  const [content, setContent] = useState(article?.content || "");
  const [published, setPublished] = useState(article?.published || false);
  const [saving, setSaving] = useState(false);

  const generateSlug = (t: string) =>
    t
      .toLowerCase()
      .replace(/[^\w\s-]/g, "")
      .replace(/[\s_]+/g, "-")
      .replace(/^-+|-+$/g, "");

  const handleSave = async () => {
    if (!title.trim() || !content.trim()) {
      toast.error("Title and content are required");
      return;
    }
    setSaving(true);
    try {
      const method = article ? "PUT" : "POST";
      const url = article ? `/api/admin/news?id=${article.id}` : "/api/news";
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title,
          slug: slug || generateSlug(title),
          excerpt,
          content,
          published,
        }),
      });
      const json = await res.json();
      if (!json.success) throw new Error(json.error);
      toast.success(article ? "Article updated" : "Article created");
      onSaved();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Failed to save");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div className="relative bg-white rounded-2xl w-full max-w-4xl shadow-overlay max-h-[90vh] flex flex-col">
        <div className="flex items-center justify-between px-6 py-4 border-b border-surface-100 shrink-0">
          <h2 className="font-bold text-surface-900">
            {article ? "Edit Article" : "New Article"}
          </h2>
          <button
            onClick={onClose}
            className="p-1.5 hover:bg-surface-100 rounded-lg"
          >
            <X size={16} />
          </button>
        </div>

        <div className="overflow-y-auto flex-1 p-6 space-y-4">
          <div>
            <label className="block text-xs font-semibold text-surface-700 mb-1">
              Title *
            </label>
            <input
              value={title}
              onChange={(e) => {
                setTitle(e.target.value);
                if (!article) setSlug(generateSlug(e.target.value));
              }}
              className="input-base text-sm"
              placeholder="Article title..."
            />
          </div>
          <div className="grid sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-surface-700 mb-1">
                Slug
              </label>
              <input
                value={slug}
                onChange={(e) => setSlug(e.target.value)}
                className="input-base text-sm font-mono"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-surface-700 mb-1">
                Excerpt
              </label>
              <input
                value={excerpt}
                onChange={(e) => setExcerpt(e.target.value)}
                className="input-base text-sm"
                placeholder="Short summary..."
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-surface-700 mb-1">
              Content *
            </label>
            <TipTapWrapper value={content} onChange={setContent} />
          </div>

          <div className="flex items-center gap-3">
            <input
              type="checkbox"
              id="pub"
              checked={published}
              onChange={(e) => setPublished(e.target.checked)}
              className="w-4 h-4 accent-brand-500"
            />
            <label htmlFor="pub" className="text-sm text-surface-700">
              Publish immediately
            </label>
          </div>
        </div>

        <div className="px-6 py-4 border-t border-surface-100 flex justify-end gap-3 shrink-0">
          <button onClick={onClose} className="btn-secondary text-sm">
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="btn-primary flex items-center gap-2 text-sm"
          >
            <Save size={14} /> {saving ? "Saving..." : "Save Article"}
          </button>
        </div>
      </div>
    </div>
  );
}
