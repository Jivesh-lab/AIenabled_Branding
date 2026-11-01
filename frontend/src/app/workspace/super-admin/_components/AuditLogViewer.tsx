"use client";

import { useState, useEffect, useCallback } from "react";
import {
  FileText,
  Search,
  RefreshCw,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Clock,
  Shield,
  User,
  Globe,
} from "lucide-react";
import { Input } from "@/components/ui/input";

type AuditLogItem = {
  _id: string;
  userId: string;
  email: string;
  role: string;
  action: string;
  resource: string;
  workspace: string;
  details?: Record<string, unknown>;
  ip: string;
  userAgent: string;
  status: "SUCCESS" | "FAILURE" | "WARNING";
  createdAt: string;
};

export default function AuditLogViewer() {
  const [logs, setLogs] = useState<AuditLogItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("ALL");

  const fetchAuditLogs = useCallback(async () => {
    setLoading(true);
    try {
      const queryParams = new URLSearchParams();
      if (search) queryParams.set("search", search);
      if (statusFilter !== "ALL") queryParams.set("status", statusFilter);

      const res = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000"}/api/audit?${queryParams.toString()}`,
        {
          headers: { "Content-Type": "application/json" },
          credentials: "include",
        }
      );

      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data.logs)) {
          setLogs(data.logs);
        }
      }
    } catch (err) {
      console.error("Failed to fetch audit logs from database:", err);
    } finally {
      setLoading(false);
    }
  }, [search, statusFilter]);

  useEffect(() => {
    let ignore = false;
    async function load() {
      try {
        const queryParams = new URLSearchParams();
        if (statusFilter !== "ALL") queryParams.set("status", statusFilter);
        const res = await fetch(
          `${process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000"}/api/audit?${queryParams.toString()}`,
          { headers: { "Content-Type": "application/json" }, credentials: "include" }
        );
        if (!ignore && res.ok) {
          const data = await res.json();
          if (Array.isArray(data.logs)) {
            setLogs(data.logs);
          }
        }
      } catch (err) {
        if (!ignore) {
          console.error("Failed to fetch audit logs:", err);
        }
      }
    }
    load();
    return () => {
      ignore = true;
    };
  }, [statusFilter]);

  const filteredLogs = logs.filter((log) => {
    const matchesSearch =
      !search ||
      log.email.toLowerCase().includes(search.toLowerCase()) ||
      log.action.toLowerCase().includes(search.toLowerCase()) ||
      log.resource.toLowerCase().includes(search.toLowerCase());
    const matchesStatus = statusFilter === "ALL" || log.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  return (
    <div id="audit-logs" className="space-y-4 rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
        <div>
          <h2 className="text-lg font-bold text-slate-900 tracking-tight flex items-center gap-2">
            <FileText className="size-5 text-amber-600" /> Super Admin Action Audit Log
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Immutable security audit trail recording all Super Admin logins, workspace switches, and system inspections.
          </p>
        </div>

        <button
          onClick={fetchAuditLogs}
          disabled={loading}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 text-slate-700 hover:bg-slate-50 text-xs font-medium transition-colors"
        >
          <RefreshCw className={`size-3.5 ${loading ? "animate-spin" : ""}`} />
          Refresh Logs
        </button>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row items-center gap-3">
        <div className="relative flex-1 w-full">
          <Search className="absolute left-3 top-2.5 size-4 text-slate-400" />
          <Input
            placeholder="Search by action, email, or resource path..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 text-xs h-9"
          />
        </div>

        <div className="flex items-center gap-1.5 w-full sm:w-auto">
          {["ALL", "SUCCESS", "FAILURE", "WARNING"].map((status) => (
            <button
              key={status}
              onClick={() => setStatusFilter(status)}
              className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
                statusFilter === status
                  ? "bg-slate-900 text-white"
                  : "bg-slate-100 text-slate-600 hover:bg-slate-200"
              }`}
            >
              {status}
            </button>
          ))}
        </div>
      </div>

      {/* Audit Log Table */}
      <div className="overflow-x-auto rounded-lg border border-slate-200">
        <table className="w-full text-left text-xs text-slate-700">
          <thead className="bg-slate-50 text-[11px] uppercase tracking-wider text-slate-500 font-semibold border-b border-slate-200">
            <tr>
              <th className="px-4 py-3">Timestamp</th>
              <th className="px-4 py-3">User & Email</th>
              <th className="px-4 py-3">Action</th>
              <th className="px-4 py-3">Workspace</th>
              <th className="px-4 py-3">IP Address</th>
              <th className="px-4 py-3">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 font-mono text-[11px]">
            {filteredLogs.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center text-slate-400 font-sans text-xs">
                  No audit log records found matching your filters.
                </td>
              </tr>
            ) : (
              filteredLogs.map((log) => (
                <tr key={log._id} className="hover:bg-slate-50/70 transition-colors">
                  <td suppressHydrationWarning className="px-4 py-3 text-slate-500 whitespace-nowrap flex items-center gap-1.5 font-sans">
                    <Clock className="size-3.5 text-slate-400" />
                    {log.createdAt}
                  </td>
                  <td className="px-4 py-3 font-sans">
                    <div className="font-semibold text-slate-900 flex items-center gap-1">
                      <User className="size-3.5 text-slate-400" /> {log.email}
                    </div>
                    <span className="text-[10px] text-amber-600 font-semibold uppercase">{log.role}</span>
                  </td>
                  <td className="px-4 py-3 font-semibold text-slate-800">
                    {log.action}
                    <div className="text-[10px] font-mono text-slate-400">{log.resource}</div>
                  </td>
                  <td className="px-4 py-3 font-sans">
                    <span className="px-2 py-0.5 rounded bg-slate-100 text-slate-700 font-medium">
                      /workspace/{log.workspace}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-slate-500 flex items-center gap-1 font-sans">
                    <Globe className="size-3 text-slate-400" /> {log.ip}
                  </td>
                  <td className="px-4 py-3 font-sans">
                    {log.status === "SUCCESS" && (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 font-semibold text-[10px]">
                        <CheckCircle2 className="size-3" /> SUCCESS
                      </span>
                    )}
                    {log.status === "FAILURE" && (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-red-50 text-red-700 border border-red-200 font-semibold text-[10px]">
                        <XCircle className="size-3" /> FAILURE
                      </span>
                    )}
                    {log.status === "WARNING" && (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-50 text-amber-700 border border-amber-200 font-semibold text-[10px]">
                        <AlertTriangle className="size-3" /> WARNING
                      </span>
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
