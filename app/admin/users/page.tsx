"use client";

import { useState, useEffect, useCallback } from "react";
import {
  Shield,
  Crown,
  Search,
  Filter,
  CheckSquare,
  Square,
  Trash,
  ChevronLeft,
  ChevronRight,
  RefreshCw,
  UserX,
  UserCheck,
  MoreHorizontal,
  Download,
} from "lucide-react";
import toast from "react-hot-toast";
import type { User } from "@/types";

type UserWithCount = User & { attemptCount: number };

export default function AdminUsersPage() {
  const [users, setUsers] = useState<UserWithCount[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [planFilter, setPlanFilter] = useState("");
  const [roleFilter, setRoleFilter] = useState("");
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const [actionLoading, setActionLoading] = useState<number | null>(null);

  const LIMIT = 20;

  const fetchUsers = useCallback(async () => {
    setLoading(true);
    setSelected(new Set());
    const sp = new URLSearchParams({
      page: String(page),
      limit: String(LIMIT),
    });
    if (search) sp.set("search", search);
    const res = await fetch(`/api/admin/users?${sp}`);
    const json = await res.json();
    if (json.success) {
      let data: UserWithCount[] = json.data;
      // Client-side filter for plan/role (since API doesn't support these yet)
      if (planFilter) data = data.filter((u) => u.plan === planFilter);
      if (roleFilter) data = data.filter((u) => u.role === roleFilter);
      setUsers(data);
      setTotal(json.pagination?.total ?? data.length);
    }
    setLoading(false);
  }, [page, search, planFilter, roleFilter]);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);
  useEffect(() => {
    setPage(1);
  }, [search, planFilter, roleFilter]);

  const updateUser = async (id: number, updates: Partial<User>) => {
    setActionLoading(id);
    try {
      const res = await fetch("/api/admin/users", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, ...updates }),
      });
      const json = await res.json();
      if (!json.success) throw new Error(json.error);
      toast.success("User updated");
      fetchUsers();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Failed");
    } finally {
      setActionLoading(null);
    }
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
    if (selected.size === users.length) setSelected(new Set());
    else setSelected(new Set(users.map((u) => u.id)));
  };

  const exportCSV = () => {
    const rows = [
      ["ID", "Name", "Email", "Plan", "Role", "Attempts", "Joined"],
      ...users.map((u) => [
        u.id,
        u.name,
        u.email,
        u.plan,
        u.role,
        u.attemptCount,
        new Date(u.createdAt).toLocaleDateString("en-IN"),
      ]),
    ];
    const csv = rows.map((r) => r.join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `users-${new Date().toISOString().split("T")[0]}.csv`;
    a.click();
  };

  const totalPages = Math.ceil(total / LIMIT);
  const allSelected = users.length > 0 && selected.size === users.length;

  const planBadge = (plan: string) => {
    if (plan === "super") return "bg-violet-100 text-violet-700";
    if (plan === "premium") return "bg-warning-50 text-warning-500";
    return "bg-surface-100 text-surface-500";
  };

  const roleBadge = (role: string) => {
    if (role === "admin") return "bg-brand-50 text-brand-600";
    if (role === "moderator") return "bg-purple-50 text-purple-600";
    return "bg-surface-100 text-surface-500";
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-display font-bold text-surface-900">
            Users
          </h1>
          <p className="text-sm text-surface-500 mt-0.5">{total} total users</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={fetchUsers}
            className="p-2 text-surface-400 hover:text-surface-700 hover:bg-surface-100 rounded-lg"
            title="Refresh"
          >
            <RefreshCw size={15} />
          </button>
          <button
            onClick={exportCSV}
            className="btn-outline flex items-center gap-2 text-sm"
          >
            <Download size={14} /> Export CSV
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="card p-4 mb-4 flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-2 flex-1 min-w-[200px]">
          <Search size={15} className="text-surface-400 shrink-0" />
          <input
            type="text"
            placeholder="Search by name or email..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="flex-1 outline-none text-sm text-surface-700 placeholder:text-surface-400"
          />
        </div>
        <div className="flex items-center gap-2">
          <Filter size={13} className="text-surface-400" />
          <select
            value={planFilter}
            onChange={(e) => setPlanFilter(e.target.value)}
            className="input-base text-sm py-1.5 w-auto"
          >
            <option value="">All Plans</option>
            <option value="free">Free</option>
            <option value="premium">Premium</option>
            <option value="super">Super</option>
          </select>
          <select
            value={roleFilter}
            onChange={(e) => setRoleFilter(e.target.value)}
            className="input-base text-sm py-1.5 w-auto"
          >
            <option value="">All Roles</option>
            <option value="user">User</option>
            <option value="moderator">Moderator</option>
            <option value="admin">Admin</option>
          </select>
        </div>
      </div>

      {/* Bulk action bar */}
      {selected.size > 0 && (
        <div className="mb-3 px-4 py-2.5 bg-brand-50 border border-brand-200 rounded-xl flex items-center justify-between flex-wrap gap-2">
          <span className="text-sm font-semibold text-brand-700">
            {selected.size} user{selected.size !== 1 ? "s" : ""} selected
          </span>
          <div className="flex items-center gap-2 flex-wrap">
            <button
              onClick={() => setSelected(new Set())}
              className="text-sm text-surface-500 hover:text-surface-700"
            >
              Deselect all
            </button>
            <button
              onClick={() => {
                [...selected].forEach((id) =>
                  updateUser(id, { plan: "premium" as User["plan"] }),
                );
              }}
              className="flex items-center gap-1.5 bg-warning-500 hover:bg-warning-600 text-white text-xs font-semibold px-3 py-1.5 rounded-lg"
            >
              <Crown size={12} /> Set Premium
            </button>
            <button
              onClick={() => {
                [...selected].forEach((id) =>
                  updateUser(id, { plan: "free" as User["plan"] }),
                );
              }}
              className="flex items-center gap-1.5 bg-surface-500 hover:bg-surface-600 text-white text-xs font-semibold px-3 py-1.5 rounded-lg"
            >
              Set Free
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
                  "User",
                  "Email",
                  "Plan",
                  "Role",
                  "Attempts",
                  "Joined",
                  "Actions",
                ].map((h) => (
                  <th
                    key={h}
                    className="text-left px-4 py-3 text-xs font-semibold text-surface-500 uppercase whitespace-nowrap"
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-surface-100">
              {loading ? (
                Array.from({ length: 6 }).map((_, i) => (
                  <tr key={i}>
                    {Array.from({ length: 8 }).map((_, j) => (
                      <td key={j} className="px-4 py-3">
                        <div className="h-4 bg-surface-200 rounded animate-pulse w-20" />
                      </td>
                    ))}
                  </tr>
                ))
              ) : users.length === 0 ? (
                <tr>
                  <td
                    colSpan={8}
                    className="px-4 py-10 text-center text-surface-400"
                  >
                    No users found
                  </td>
                </tr>
              ) : (
                users.map((u) => (
                  <tr
                    key={u.id}
                    className={`hover:bg-surface-50 ${selected.has(u.id) ? "bg-brand-50/50" : ""}`}
                  >
                    <td className="px-4 py-3">
                      <button
                        onClick={() => toggleSelect(u.id)}
                        className="text-surface-400 hover:text-brand-600"
                      >
                        {selected.has(u.id) ? (
                          <CheckSquare size={16} className="text-brand-500" />
                        ) : (
                          <Square size={16} />
                        )}
                      </button>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        {u.avatar ? (
                          <img
                            src={u.avatar}
                            alt={u.name}
                            className="w-7 h-7 rounded-full"
                          />
                        ) : (
                          <div className="w-7 h-7 bg-brand-100 rounded-full flex items-center justify-center text-brand-600 text-xs font-bold shrink-0">
                            {u.name?.[0]?.toUpperCase()}
                          </div>
                        )}
                        <span className="font-medium text-surface-800 max-w-[120px] truncate text-xs">
                          {u.name}
                        </span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-surface-600 max-w-[160px] truncate text-xs">
                      {u.email}
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`badge capitalize text-xs ${planBadge(u.plan)}`}
                      >
                        {u.plan === "premium" && <Crown size={9} />}
                        {u.plan === "super" && <Crown size={9} />}
                        {u.plan}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`badge capitalize text-xs ${roleBadge(u.role)}`}
                      >
                        {u.role === "admin" && <Shield size={9} />}
                        {u.role}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-surface-600 text-xs">
                      {u.attemptCount ?? 0}
                    </td>
                    <td className="px-4 py-3 text-surface-500 text-xs whitespace-nowrap">
                      {new Date(u.createdAt).toLocaleDateString("en-IN")}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1">
                        {/* Toggle plan */}
                        {u.plan === "free" ? (
                          <button
                            onClick={() =>
                              updateUser(u.id, { plan: "premium" })
                            }
                            disabled={actionLoading === u.id}
                            className="p-1.5 text-surface-400 hover:text-warning-500 hover:bg-warning-50 rounded-lg"
                            title="Upgrade to Premium"
                          >
                            <Crown size={13} />
                          </button>
                        ) : (
                          <button
                            onClick={() => updateUser(u.id, { plan: "free" })}
                            disabled={actionLoading === u.id}
                            className="p-1.5 text-warning-400 hover:text-surface-500 hover:bg-surface-100 rounded-lg"
                            title="Downgrade to Free"
                          >
                            <Crown size={13} />
                          </button>
                        )}
                        {/* Toggle role */}
                        {u.role === "user" ? (
                          <button
                            onClick={() =>
                              updateUser(u.id, { role: "moderator" })
                            }
                            disabled={actionLoading === u.id}
                            className="p-1.5 text-surface-400 hover:text-purple-600 hover:bg-purple-50 rounded-lg"
                            title="Make Moderator"
                          >
                            <Shield size={13} />
                          </button>
                        ) : u.role === "moderator" ? (
                          <button
                            onClick={() => updateUser(u.id, { role: "user" })}
                            disabled={actionLoading === u.id}
                            className="p-1.5 text-purple-500 hover:text-surface-500 hover:bg-surface-100 rounded-lg"
                            title="Remove Moderator"
                          >
                            <Shield size={13} />
                          </button>
                        ) : null}
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
              Page {page} of {totalPages}
            </span>
            <div className="flex items-center gap-1">
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
                    className={`w-8 h-8 rounded-lg text-xs font-medium ${p === page ? "bg-brand-500 text-white" : "hover:bg-surface-100 text-surface-600"}`}
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
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
