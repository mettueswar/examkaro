"use client";

import { useState, useRef, useCallback } from "react";
import {
  Upload,
  Link,
  Play,
  FileText,
  Trash2,
  CheckCircle,
  Clock,
  AlertCircle,
  Plus,
  X,
  Loader2,
  BookOpen,
} from "lucide-react";
import { cn } from "@/lib/utils";
import toast from "react-hot-toast";

interface Material {
  id: number;
  title: string;
  type: "pdf" | "docx" | "url" | "youtube" | "text";
  wordCount: number;
  status: "pending" | "processing" | "ready" | "failed";
  errorMessage?: string;
  createdAt: string;
}

const TYPE_ICONS: Record<string, React.ElementType> = {
  pdf: FileText,
  docx: FileText,
  url: Link,
  youtube: Play,
  text: BookOpen,
};

const TYPE_COLORS: Record<string, string> = {
  pdf: "text-red-600 bg-red-50",
  docx: "text-blue-600 bg-blue-50",
  url: "text-green-600 bg-green-50",
  youtube: "text-red-500 bg-red-50",
  text: "text-violet-600 bg-violet-50",
};

export function MaterialUploader() {
  const [materials, setMaterials] = useState<Material[]>([]);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [activeInput, setActiveInput] = useState<
    "file" | "url" | "youtube" | "text" | null
  >(null);
  const [urlInput, setUrlInput] = useState("");
  const [textInput, setTextInput] = useState("");
  const [textTitle, setTextTitle] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);

  const fetchMaterials = useCallback(async () => {
    setLoading(true);
    const res = await fetch("/api/ai/materials");
    const json = await res.json();
    if (json.success) setMaterials(json.data);
    setLoading(false);
  }, []);

  useState(() => {
    fetchMaterials();
  });

  const handleFileUpload = async (file: File) => {
    const formData = new FormData();
    formData.append("file", file);
    formData.append("title", file.name.replace(/\.(pdf|docx)$/i, ""));
    setUploading(true);
    try {
      const res = await fetch("/api/ai/materials/upload", {
        method: "POST",
        body: formData,
      });
      const json = await res.json();
      if (!json.success) throw new Error(json.error);
      toast.success(`${file.name} processed!`);
      fetchMaterials();
      setActiveInput(null);
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setUploading(false);
    }
  };

  const handleURL = async (type: "url" | "youtube") => {
    if (!urlInput.trim()) return;
    setUploading(true);
    try {
      const res = await fetch("/api/ai/materials", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type, url: urlInput.trim() }),
      });
      const json = await res.json();
      if (!json.success) throw new Error(json.error);
      toast.success("Content extracted successfully!");
      setUrlInput("");
      fetchMaterials();
      setActiveInput(null);
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Failed to process URL");
    } finally {
      setUploading(false);
    }
  };

  const handleText = async () => {
    if (textInput.length < 100) {
      toast.error("Please enter at least 100 characters");
      return;
    }
    setUploading(true);
    try {
      const res = await fetch("/api/ai/materials", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: "text",
          text: textInput,
          title: textTitle || "My Notes",
        }),
      });
      const json = await res.json();
      if (!json.success) throw new Error(json.error);
      toast.success("Notes saved!");
      setTextInput("");
      setTextTitle("");
      fetchMaterials();
      setActiveInput(null);
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Failed");
    } finally {
      setUploading(false);
    }
  };

  const deleteMaterial = async (id: number) => {
    if (
      !confirm(
        "Delete this material? Any decks or quizzes created from it will remain.",
      )
    )
      return;
    await fetch(`/api/ai/materials?id=${id}`, { method: "DELETE" });
    setMaterials((m) => m.filter((x) => x.id !== id));
    toast.success("Deleted");
  };

  const inputButtons = [
    {
      id: "file" as const,
      label: "PDF / DOCX",
      icon: Upload,
      color:
        "border-blue-200 hover:border-blue-400 hover:bg-blue-50 text-blue-600",
    },
    {
      id: "url" as const,
      label: "Website URL",
      icon: Link,
      color:
        "border-green-200 hover:border-green-400 hover:bg-green-50 text-green-600",
    },
    {
      id: "youtube" as const,
      label: "YouTube Link",
      icon: Play,
      color: "border-red-200 hover:border-red-400 hover:bg-red-50 text-red-600",
    },
    {
      id: "text" as const,
      label: "Paste Notes",
      icon: FileText,
      color:
        "border-violet-200 hover:border-violet-400 hover:bg-violet-50 text-violet-600",
    },
  ];

  return (
    <div>
      {/* Upload buttons */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
        {inputButtons.map(({ id, label, icon: Icon, color }) => (
          <button
            key={id}
            onClick={() => {
              setActiveInput(activeInput === id ? null : id);
              if (id === "file") fileRef.current?.click();
            }}
            className={cn(
              "flex flex-col items-center gap-2 p-4 rounded-xl border-2 transition-all font-medium text-sm",
              color,
              activeInput === id && "ring-2 ring-offset-1 ring-violet-500",
            )}
          >
            <Icon size={22} />
            {label}
          </button>
        ))}
        <input
          ref={fileRef}
          type="file"
          accept=".pdf,.docx"
          className="hidden"
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) handleFileUpload(f);
            e.target.value = "";
          }}
        />
      </div>

      {/* Input panels */}
      {(activeInput === "url" || activeInput === "youtube") && (
        <div className="card p-4 mb-5">
          <div className="flex items-center gap-2 mb-3">
            {activeInput === "youtube" ? (
              <Play size={16} className="text-red-500" />
            ) : (
              <Link size={16} className="text-green-600" />
            )}
            <span className="font-semibold text-surface-800 text-sm">
              {activeInput === "youtube" ? "YouTube Video URL" : "Website URL"}
            </span>
            <button
              onClick={() => setActiveInput(null)}
              className="ml-auto p-1 hover:bg-surface-100 rounded-lg"
            >
              <X size={14} />
            </button>
          </div>
          <div className="flex gap-2">
            <input
              value={urlInput}
              onChange={(e) => setUrlInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleURL(activeInput)}
              placeholder={
                activeInput === "youtube"
                  ? "https://youtube.com/watch?v=..."
                  : "https://example.com/article"
              }
              className="input-base text-sm flex-1"
              autoFocus
            />
            <button
              onClick={() => handleURL(activeInput)}
              disabled={!urlInput.trim() || uploading}
              className="btn-primary text-sm flex items-center gap-2 shrink-0"
            >
              {uploading ? (
                <Loader2 size={14} className="animate-spin" />
              ) : (
                <Plus size={14} />
              )}
              {uploading ? "Processing..." : "Extract"}
            </button>
          </div>
          {activeInput === "youtube" && (
            <p className="text-xs text-surface-400 mt-2">
              Extracts video transcript. Works best with videos that have
              English or Hindi captions.
            </p>
          )}
        </div>
      )}

      {activeInput === "text" && (
        <div className="card p-4 mb-5">
          <div className="flex items-center gap-2 mb-3">
            <FileText size={16} className="text-violet-600" />
            <span className="font-semibold text-surface-800 text-sm">
              Paste Your Notes
            </span>
            <button
              onClick={() => setActiveInput(null)}
              className="ml-auto p-1 hover:bg-surface-100 rounded-lg"
            >
              <X size={14} />
            </button>
          </div>
          <input
            value={textTitle}
            onChange={(e) => setTextTitle(e.target.value)}
            placeholder="Title (e.g. Indian History Notes)"
            className="input-base text-sm mb-2"
          />
          <textarea
            value={textInput}
            onChange={(e) => setTextInput(e.target.value)}
            placeholder="Paste your study notes, textbook content, or any text here... (minimum 100 characters)"
            rows={6}
            className="input-base text-sm resize-y mb-2"
            autoFocus
          />
          <div className="flex items-center justify-between">
            <span className="text-xs text-surface-400">
              {textInput.length} characters
            </span>
            <button
              onClick={handleText}
              disabled={textInput.length < 100 || uploading}
              className="btn-primary text-sm flex items-center gap-2"
            >
              {uploading ? (
                <Loader2 size={14} className="animate-spin" />
              ) : (
                <Plus size={14} />
              )}
              {uploading ? "Saving..." : "Save Notes"}
            </button>
          </div>
        </div>
      )}

      {/* Materials list */}
      <div>
        <h3 className="font-semibold text-surface-800 mb-3 flex items-center gap-2">
          <BookOpen size={16} className="text-violet-600" />
          Your Study Materials
          <span className="text-xs text-surface-400 font-normal">
            ({materials.length})
          </span>
        </h3>

        {loading ? (
          <div className="grid sm:grid-cols-2 gap-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="card p-4 animate-pulse">
                <div className="h-4 bg-surface-200 rounded w-2/3 mb-2" />
                <div className="h-3 bg-surface-100 rounded w-1/3" />
              </div>
            ))}
          </div>
        ) : materials.length === 0 ? (
          <div className="card p-12 text-center text-surface-400">
            <Upload size={36} className="mx-auto mb-3 text-surface-300" />
            <p className="font-medium text-surface-500">No materials yet</p>
            <p className="text-sm mt-1">
              Upload a PDF, DOCX, paste a website URL, or add YouTube links
              above
            </p>
          </div>
        ) : (
          <div className="grid sm:grid-cols-2 gap-3">
            {materials.map((m) => {
              const Icon = TYPE_ICONS[m.type] || FileText;
              return (
                <div
                  key={m.id}
                  className="card p-4 flex items-start gap-3 hover:shadow-elevated transition-shadow"
                >
                  <div
                    className={cn(
                      "w-10 h-10 rounded-xl flex items-center justify-center shrink-0",
                      TYPE_COLORS[m.type] || "bg-surface-100 text-surface-500",
                    )}
                  >
                    <Icon size={18} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-surface-800 text-sm truncate">
                      {m.title}
                    </p>
                    <div className="flex items-center gap-2 mt-1 flex-wrap">
                      <span className="text-xs text-surface-400 uppercase font-medium">
                        {m.type}
                      </span>
                      <span className="text-xs text-surface-400">·</span>
                      <span className="text-xs text-surface-400">
                        {(m.wordCount || 0).toLocaleString()} words
                      </span>
                      {m.status === "ready" && (
                        <span className="flex items-center gap-1 text-xs text-green-600">
                          <CheckCircle size={10} /> Ready
                        </span>
                      )}
                      {m.status === "processing" && (
                        <span className="flex items-center gap-1 text-xs text-orange-500">
                          <Clock size={10} /> Processing
                        </span>
                      )}
                      {m.status === "failed" && (
                        <span className="flex items-center gap-1 text-xs text-red-500">
                          <AlertCircle size={10} /> Failed
                        </span>
                      )}
                    </div>
                    {m.errorMessage && (
                      <p className="text-xs text-red-500 mt-1 truncate">
                        {m.errorMessage}
                      </p>
                    )}
                  </div>
                  <button
                    onClick={() => deleteMaterial(m.id)}
                    className="p-1.5 text-surface-300 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors shrink-0"
                  >
                    <Trash2 size={13} />
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
