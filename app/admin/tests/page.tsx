"use client";

import { useState, useEffect, useCallback } from "react";
import {
  Plus,
  Pencil,
  Trash2,
  Search,
  Eye,
  EyeOff,
  ChevronLeft,
  ChevronRight,
  CheckSquare,
  Square,
  Trash,
  Filter,
  RefreshCw,
} from "lucide-react";
import { TestFormModal } from "@/components/admin/TestFormModal";
import toast from "react-hot-toast";
import type { MockTest } from "@/types";

export default function AdminTestsPage() {
  const [tests, setTests] = useState<(MockTest & { category_name?: string })[]>(
    [],
  );
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState("");
  const [difficultyFilter, setDifficultyFilter] = useState("");
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<MockTest | null>(null);
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const [bulkDeleting, setBulkDeleting] = useState(false);

  const LIMIT = 15;

  const fetchTests = useCallback(async () => {
    setLoading(true);
    setSelected(new Set());
    const sp = new URLSearchParams({
      page: String(page),
      limit: String(LIMIT),
    });
    if (search) sp.set("search", search);
    if (typeFilter) sp.set("type", typeFilter);
    if (difficultyFilter) sp.set("difficulty", difficultyFilter);
    const res = await fetch(`/api/admin/tests?${sp}`);
    const json = await res.json();
    if (json.success) {
      setTests(json.data);
      setTotal(json.pagination.total);
    }
    setLoading(false);
  }, [page, search, typeFilter, difficultyFilter]);

  useEffect(() => {
    fetchTests();
  }, [fetchTests]);

  // Reset page when filters change
  useEffect(() => {
    setPage(1);
  }, [search, typeFilter, difficultyFilter]);

  const handleDelete = async (id: number) => {
    if (!confirm("Delete this test?")) return;
    await fetch(`/api/admin/tests?id=${id}`, { method: "DELETE" });
    toast.success("Test deleted");
    fetchTests();
  };

  const handleBulkDelete = async () => {
    if (selected.size === 0) return;
    if (
      !confirm(
        `Delete ${selected.size} selected test(s)? This cannot be undone.`,
      )
    )
      return;
    setBulkDeleting(true);
    try {
      await Promise.all(
        [...selected].map((id) =>
          fetch(`/api/admin/tests?id=${id}`, { method: "DELETE" }),
        ),
      );
      toast.success(`${selected.size} test(s) deleted`);
      setSelected(new Set());
      fetchTests();
    } catch {
      toast.error("Some deletions failed");
    } finally {
      setBulkDeleting(false);
    }
  };

  const handleToggle = async (test: MockTest) => {
    await fetch("/api/admin/tests", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: test.id, isActive: !test.isActive }),
    });
    fetchTests();
  };

  const toggleSelect = (id: number) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleSelectAll = () => {
    if (selected.size === tests.length) {
      setSelected(new Set());
    } else {
      setSelected(new Set(tests.map((t) => t.id)));
    }
  };

  const totalPages = Math.ceil(total / LIMIT);
  const allSelected = tests.length > 0 && selected.size === tests.length;

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-display font-bold text-surface-900">
            Mock Tests
          </h1>
          <p className="text-sm text-surface-500 mt-0.5">{total} total tests</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={fetchTests}
            className="p-2 text-surface-400 hover:text-surface-700 hover:bg-surface-100 rounded-lg"
            title="Refresh"
          >
            <RefreshCw size={15} />
          </button>
          <button
            onClick={() => {
              setEditing(null);
              setModalOpen(true);
            }}
            className="btn-primary flex items-center gap-2 text-sm"
          >
            <Plus size={15} /> Add Test
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="card p-4 mb-4 flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-2 flex-1 min-w-[200px]">
          <Search size={15} className="text-surface-400 shrink-0" />
          <input
            type="text"
            placeholder="Search tests..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="flex-1 outline-none text-sm text-surface-700 placeholder:text-surface-400"
          />
        </div>
        <div className="flex items-center gap-2">
          <Filter size={13} className="text-surface-400" />
          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            className="input-base text-sm py-1.5 w-auto"
          >
            <option value="">All Types</option>
            <option value="free">Free</option>
            <option value="premium">Premium</option>
          </select>
          <select
            value={difficultyFilter}
            onChange={(e) => setDifficultyFilter(e.target.value)}
            className="input-base text-sm py-1.5 w-auto"
          >
            <option value="">All Levels</option>
            <option value="easy">Easy</option>
            <option value="medium">Medium</option>
            <option value="hard">Hard</option>
          </select>
        </div>
      </div>

      {/* Bulk action bar */}
      {selected.size > 0 && (
        <div className="mb-3 px-4 py-2.5 bg-brand-50 border border-brand-200 rounded-xl flex items-center justify-between">
          <span className="text-sm font-semibold text-brand-700">
            {selected.size} test{selected.size !== 1 ? "s" : ""} selected
          </span>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setSelected(new Set())}
              className="text-sm text-surface-500 hover:text-surface-700"
            >
              Deselect all
            </button>
            <button
              onClick={handleBulkDelete}
              disabled={bulkDeleting}
              className="flex items-center gap-1.5 bg-danger-500 hover:bg-danger-600 text-white text-sm font-semibold px-3 py-1.5 rounded-lg transition-colors"
            >
              <Trash size={13} />
              {bulkDeleting ? "Deleting..." : `Delete ${selected.size}`}
            </button>
          </div>
        </div>
      )}

      {/* Table */}
      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-surface-50 border-b border-surface-100">
                <th className="px-4 py-3 w-10">
                  <button
                    onClick={toggleSelectAll}
                    className="text-surface-400 hover:text-brand-600"
                  >
                    {allSelected ? (
                      <CheckSquare size={16} className="text-brand-500" />
                    ) : (
                      <Square size={16} />
                    )}
                  </button>
                </th>
                {[
                  "Title",
                  "Category",
                  "Type",
                  "Questions",
                  "Duration",
                  "Difficulty",
                  "Status",
                  "Actions",
                ].map((h) => (
                  <th
                    key={h}
                    className="text-left px-4 py-3 text-xs font-semibold text-surface-500 uppercase tracking-wide whitespace-nowrap"
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-surface-100">
              {loading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <tr key={i}>
                    {Array.from({ length: 9 }).map((_, j) => (
                      <td key={j} className="px-4 py-3">
                        <div className="h-4 bg-surface-200 rounded animate-pulse w-20" />
                      </td>
                    ))}
                  </tr>
                ))
              ) : tests.length === 0 ? (
                <tr>
                  <td
                    colSpan={9}
                    className="px-4 py-10 text-center text-surface-400"
                  >
                    No tests found — try adjusting your filters
                  </td>
                </tr>
              ) : (
                tests.map((test) => (
                  <tr
                    key={test.id}
                    className={`hover:bg-surface-50 ${selected.has(test.id) ? "bg-brand-50/50" : ""}`}
                  >
                    <td className="px-4 py-3">
                      <button
                        onClick={() => toggleSelect(test.id)}
                        className="text-surface-400 hover:text-brand-600"
                      >
                        {selected.has(test.id) ? (
                          <CheckSquare size={16} className="text-brand-500" />
                        ) : (
                          <Square size={16} />
                        )}
                      </button>
                    </td>
                    <td className="px-4 py-3">
                      <div className="font-medium text-surface-800 max-w-[220px] truncate">
                        {test.title}
                      </div>
                      <div className="text-xs text-surface-400 mt-0.5 font-mono truncate max-w-[220px]">
                        {test.slug}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-surface-600 text-xs">
                      {test.category_name || "—"}
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`badge ${test.type === "free" ? "badge-free" : "badge-premium"}`}
                      >
                        {test.type}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-surface-600 text-xs">
                      {test.totalQuestions}
                    </td>
                    <td className="px-4 py-3 text-surface-600 text-xs">
                      {test.duration} min
                    </td>
                    <td className="px-4 py-3 text-xs capitalize">
                      <span
                        className={`badge ${
                          test.difficulty === "easy"
                            ? "bg-success-50 text-success-600"
                            : test.difficulty === "hard"
                              ? "bg-danger-50 text-danger-600"
                              : "bg-warning-50 text-warning-500"
                        }`}
                      >
                        {test.difficulty}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <button
                        onClick={() => handleToggle(test)}
                        className={`flex items-center gap-1 text-xs font-medium px-2 py-1 rounded-full ${
                          test.isActive
                            ? "bg-success-50 text-success-600"
                            : "bg-surface-100 text-surface-500"
                        }`}
                      >
                        {test.isActive ? (
                          <>
                            <Eye size={11} /> Active
                          </>
                        ) : (
                          <>
                            <EyeOff size={11} /> Hidden
                          </>
                        )}
                      </button>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => {
                            setEditing(test);
                            setModalOpen(true);
                          }}
                          className="p-1.5 text-surface-500 hover:text-brand-600 hover:bg-brand-50 rounded-lg transition-colors"
                        >
                          <Pencil size={13} />
                        </button>
                        <button
                          onClick={() => handleDelete(test.id)}
                          className="p-1.5 text-surface-500 hover:text-danger-600 hover:bg-danger-50 rounded-lg transition-colors"
                        >
                          <Trash2 size={13} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="px-4 py-3 border-t border-surface-100 flex items-center justify-between">
            <span className="text-xs text-surface-500">
              Page {page} of {totalPages} · {total} total
            </span>
            <div className="flex items-center gap-1">
              <button
                onClick={() => setPage(1)}
                disabled={page === 1}
                className="px-2 py-1.5 hover:bg-surface-100 rounded-lg text-xs disabled:opacity-40"
              >
                «
              </button>
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1}
                className="p-1.5 hover:bg-surface-100 rounded-lg disabled:opacity-40"
              >
                <ChevronLeft size={14} />
              </button>
              {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                const p = Math.max(1, Math.min(totalPages - 4, page - 2)) + i;
                return p <= totalPages ? (
                  <button
                    key={p}
                    onClick={() => setPage(p)}
                    className={`w-8 h-8 rounded-lg text-xs font-medium transition-colors ${
                      p === page
                        ? "bg-brand-500 text-white"
                        : "hover:bg-surface-100 text-surface-600"
                    }`}
                  >
                    {p}
                  </button>
                ) : null;
              })}
              <button
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
                className="p-1.5 hover:bg-surface-100 rounded-lg disabled:opacity-40"
              >
                <ChevronRight size={14} />
              </button>
              <button
                onClick={() => setPage(totalPages)}
                disabled={page === totalPages}
                className="px-2 py-1.5 hover:bg-surface-100 rounded-lg text-xs disabled:opacity-40"
              >
                »
              </button>
            </div>
          </div>
        )}
      </div>

      {modalOpen && (
        <TestFormModal
          test={editing}
          onClose={() => setModalOpen(false)}
          onSaved={() => {
            setModalOpen(false);
            fetchTests();
          }}
        />
      )}
    </div>
  );
}
