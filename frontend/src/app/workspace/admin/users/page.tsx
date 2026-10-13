"use client";

import { useState, useEffect, useCallback } from "react";
import PageContainer from "@/components/shared/PageContainer";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import {
  Search,
  UserPlus,
  FileSpreadsheet,
  Trash2,
  Edit,
  X,
  AlertTriangle,
  Key,
  ShieldCheck,
  Check,
  XCircle,
  ChevronLeft,
  ChevronRight,
  Loader2,
} from "lucide-react";

type UserItem = {
  _id: string;
  name: string;
  email: string;
  role: string;
  status: "active" | "inactive" | "pending" | "rejected";
  isInvestorVerified?: boolean;
  mustChangePassword?: boolean;
  createdAt: string;
  lastLogin?: string;
  profile?: Record<string, string>;
};

export default function UserManagementPage() {
  const [users, setUsers] = useState<UserItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [selectedUserIds, setSelectedUserIds] = useState<string[]>([]);
  const [isMounted, setIsMounted] = useState(false);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalUsers, setTotalUsers] = useState(0);

  // Modals
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showBulkCsvModal, setShowBulkCsvModal] = useState(false);
  const [selectedUser, setSelectedUser] = useState<UserItem | null>(null);
  const [showDeleteModal, setShowDeleteModal] = useState<UserItem | null>(null);
  const [deleteConfirmationText, setDeleteConfirmationText] = useState("");

  // Password Update Modal state
  const [passwordModalUser, setPasswordModalUser] = useState<UserItem | null>(null);
  const [newPasswordInput, setNewPasswordInput] = useState("");
  const [forceChangePassword, setForceChangePassword] = useState(true);

  // Reject / Reason state
  const [rejectModalUser, setRejectModalUser] = useState<UserItem | null>(null);
  const [rejectionReasonInput, setRejectionReasonInput] = useState("");

  // Create Form state
  const [createForm, setCreateForm] = useState({
    name: "",
    email: "",
    role: "student",
    tempPassword: "",
    institution: "",
  });

  // Bulk CSV state
  const [csvText, setCsvText] = useState("");
  const [parsedCsvUsers, setParsedCsvUsers] = useState<Array<{ name: string; email: string; role: string; institution?: string; valid: boolean; reason?: string }>>([]);

  useEffect(() => {
    let active = true;
    const run = async () => {
      setLoading(true);
      try {
        const queryParams = new URLSearchParams();
        if (search) queryParams.set("search", search);
        if (roleFilter !== "all") queryParams.set("role", roleFilter);
        if (statusFilter !== "all") queryParams.set("status", statusFilter);
        queryParams.set("page", page.toString());
        queryParams.set("limit", "20");

        const res = await fetch(
          `/api/admin/users?${queryParams.toString()}`
        );

        if (res.ok) {
          const data = await res.json();
          if (active && Array.isArray(data.users)) {
            setUsers(data.users);
            if (data.pagination) {
              setTotalPages(data.pagination.totalPages || 1);
              setTotalUsers(data.pagination.total || data.users.length);
            }
          }
        } else {
          const err = await res.json();
          if (active) toast.error(err.message || "Failed to fetch users from database.");
        }
      } catch (err) {
        console.error("Failed to fetch users from database:", err);
        if (active) toast.error("Network error while connecting to user directory.");
      } finally {
        if (active) setLoading(false);
      }
    };

    const timer = setTimeout(() => {
      void run();
    }, 0);

    return () => {
      active = false;
      clearTimeout(timer);
    };
  }, [search, roleFilter, statusFilter, page]);

  const fetchUsers = useCallback(async () => {
    setLoading(true);
    try {
      const queryParams = new URLSearchParams();
      if (search) queryParams.set("search", search);
      if (roleFilter !== "all") queryParams.set("role", roleFilter);
      if (statusFilter !== "all") queryParams.set("status", statusFilter);
      queryParams.set("page", page.toString());
      queryParams.set("limit", "20");

      const res = await fetch(`/api/admin/users?${queryParams.toString()}`);

      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data.users)) {
          setUsers(data.users);
          if (data.pagination) {
            setTotalPages(data.pagination.totalPages || 1);
            setTotalUsers(data.pagination.total || data.users.length);
          }
        }
      } else {
        const err = await res.json();
        toast.error(err.message || "Failed to fetch users from database.");
      }
    } catch (err) {
      console.error("Failed to fetch users from database:", err);
      toast.error("Network error while connecting to user directory.");
    } finally {
      setLoading(false);
    }
  }, [search, roleFilter, statusFilter, page]);

  useEffect(() => {
    const id = requestAnimationFrame(() => setIsMounted(true));
    return () => cancelAnimationFrame(id);
  }, []);

  // Handle single user creation
  async function handleCreateUser(e: React.FormEvent) {
    e.preventDefault();
    if (!createForm.name || !createForm.email) {
      toast.error("Name and Email are required.");
      return;
    }

    try {
      const res = await fetch(`/api/admin/users`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: createForm.name,
          email: createForm.email,
          role: createForm.role,
          tempPassword: createForm.tempPassword || undefined,
          profile: { institution: createForm.institution || "AAI DBIT" },
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        toast.error(data.message || "Failed to create user.");
        return;
      }

      toast.success(`User created in database! Temp Password: ${data.tempPassword}`);
      setShowCreateModal(false);
      setCreateForm({ name: "", email: "", role: "student", tempPassword: "", institution: "" });
      fetchUsers();
    } catch {
      toast.error("Network error during user creation.");
    }
  }

  // Parse CSV text input
  function handleParseCsv() {
    if (!csvText.trim()) {
      toast.error("Please paste CSV data or select a file.");
      return;
    }

    const lines = csvText.trim().split("\n");
    const parsed = [];

    // Check if line 1 is header
    const hasHeader = lines[0].toLowerCase().includes("name") && lines[0].toLowerCase().includes("email");
    const startIndex = hasHeader ? 1 : 0;

    for (let i = startIndex; i < lines.length; i++) {
      const parts = lines[i].split(",").map((p) => p.trim().replace(/^["']|["']$/g, ""));
      if (parts.length < 2) continue;

      const name = parts[0] || "";
      const email = parts[1] || "";
      const role = (parts[2] || "student").toLowerCase();
      const institution = parts[3] || "";

      const isValidEmail = /^\S+@\S+\.\S+$/.test(email);
      const isValidRole = ["student", "faculty", "mentor", "investor"].includes(role);

      parsed.push({
        name,
        email,
        role: isValidRole ? role : "student",
        institution,
        valid: isValidEmail && name.length >= 2,
        reason: !isValidEmail ? "Invalid Email" : name.length < 2 ? "Name too short" : undefined,
      });
    }

    setParsedCsvUsers(parsed);
    if (parsed.length > 0) {
      toast.success(`Parsed ${parsed.length} rows from CSV.`);
    } else {
      toast.error("No valid CSV rows found.");
    }
  }

  // Bulk CSV submit
  async function handleImportBulkCsv() {
    const validRows = parsedCsvUsers.filter((u) => u.valid);
    if (validRows.length === 0) {
      toast.error("No valid user rows to import.");
      return;
    }

    try {
      const res = await fetch(`/api/admin/users/bulk`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ users: validRows }),
      });

      const data = await res.json();
      if (!res.ok) {
        toast.error(data.message || "Bulk import failed.");
        return;
      }

      toast.success(data.message || "Bulk import completed!");
      setShowBulkCsvModal(false);
      setCsvText("");
      setParsedCsvUsers([]);
      fetchUsers();
    } catch {
      toast.error("Failed to execute bulk import.");
    }
  }

  // Update or reset user password
  async function handleSavePassword(e: React.FormEvent) {
    e.preventDefault();
    if (!passwordModalUser) return;

    try {
      const res = await fetch(`/api/admin/users/${passwordModalUser._id}/reset-password`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          newPassword: newPasswordInput || undefined,
          mustChangePassword: forceChangePassword,
        }),
      });
      const data = await res.json();
      if (res.ok) {
        toast.success(`Password updated for ${passwordModalUser.name}! New Password: ${data.tempPassword}`);
        setPasswordModalUser(null);
        setNewPasswordInput("");
        fetchUsers();
      } else {
        toast.error(data.message || "Failed to update password.");
      }
    } catch {
      toast.error("Failed to update password.");
    }
  }

  // Generate secure password helper
  function handleGeneratePassword() {
    const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*";
    let gen = "Pass#";
    for (let i = 0; i < 6; i++) {
      gen += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    gen += "!";
    setNewPasswordInput(gen);
    toast.info(`Generated password: ${gen}`);
  }

  // Handle Deactivation / Activation
  async function handleToggleStatus(user: UserItem) {
    const newStatus = user.status === "active" ? "inactive" : "active";
    try {
      const res = await fetch(`/api/admin/users/${user._id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });
      if (res.ok) {
        toast.success(`User ${user.name} is now ${newStatus}.`);
        fetchUsers();
        if (selectedUser) setSelectedUser({ ...selectedUser, status: newStatus });
      }
    } catch {
      toast.error("Failed to update user status.");
    }
  }

  // Handle Account Approval
  async function handleApproveUser(user: UserItem) {
    try {
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000"}/api/admin/approvals/${user._id}/decide`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({ decision: "approve" }),
        }
      );
      const data = await res.json();
      if (res.ok) {
        toast.success(`User ${user.name} approved successfully.`);
        fetchUsers();
        if (selectedUser && selectedUser._id === user._id) {
          setSelectedUser({ ...selectedUser, status: "active" });
        }
      } else {
        toast.error(data.message || "Failed to approve user.");
      }
    } catch {
      toast.error("Network error while approving user.");
    }
  }

  // Handle Account Rejection
  async function handleRejectUser(user: UserItem, reason?: string) {
    try {
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000"}/api/admin/approvals/${user._id}/decide`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({ decision: "reject", reason: reason || "Registration rejected by Admin." }),
        }
      );
      const data = await res.json();
      if (res.ok) {
        toast.success(`User ${user.name} rejected.`);
        setRejectModalUser(null);
        setRejectionReasonInput("");
        fetchUsers();
        if (selectedUser && selectedUser._id === user._id) {
          setSelectedUser({ ...selectedUser, status: "rejected", isInvestorVerified: false });
        }
      } else {
        toast.error(data.message || "Failed to reject user.");
      }
    } catch {
      toast.error("Network error while rejecting user.");
    }
  }

  // Handle Investor Accreditation Verification
  async function handleVerifyInvestor(user: UserItem) {
    try {
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000"}/api/admin/approvals/${user._id}/decide`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({ decision: "verify_investor" }),
        }
      );
      const data = await res.json();
      if (res.ok) {
        toast.success(`Investor ${user.name} verified as accredited investor.`);
        fetchUsers();
        if (selectedUser && selectedUser._id === user._id) {
          setSelectedUser({ ...selectedUser, isInvestorVerified: true });
        }
      } else {
        toast.error(data.message || "Failed to verify investor.");
      }
    } catch {
      toast.error("Network error while verifying investor.");
    }
  }

  // Handle User Deletion (Hard/Soft)
  async function handleDeleteUser() {
    if (!showDeleteModal) return;
    if (deleteConfirmationText !== "DELETE") {
      toast.error('Type "DELETE" to confirm account removal.');
      return;
    }

    try {
      const res = await fetch(`/api/admin/users/${showDeleteModal._id}?hard=true`, {
        method: "DELETE",
      });
      if (res.ok) {
        toast.success(`User ${showDeleteModal.name} permanently removed from database.`);
        setUsers((prev) => prev.filter((u) => u._id !== showDeleteModal._id));
        setShowDeleteModal(null);
        setDeleteConfirmationText("");
        setSelectedUser(null);
        fetchUsers();
      } else {
        const data = await res.json();
        toast.error(data.message || "Failed to delete user account.");
      }
    } catch {
      toast.error("Failed to delete user account.");
    }
  }

  // Bulk Actions (Deactivate/Delete)
  async function handleBulkAction(action: "deactivate" | "delete") {
    if (selectedUserIds.length === 0) return;
    try {
      const res = await fetch(`/api/admin/users/bulk-action`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userIds: selectedUserIds, action }),
      });
      if (res.ok) {
        toast.success(`Bulk ${action} executed for ${selectedUserIds.length} users.`);
        setSelectedUserIds([]);
        fetchUsers();
      }
    } catch {
      toast.error(`Bulk ${action} failed.`);
    }
  }

  const filteredUsers = users.filter((u) => {
    const matchesSearch =
      !search ||
      u.name.toLowerCase().includes(search.toLowerCase()) ||
      u.email.toLowerCase().includes(search.toLowerCase());
    const matchesRole = roleFilter === "all" || u.role === roleFilter;
    const matchesStatus = statusFilter === "all" || u.status === statusFilter;
    return matchesSearch && matchesRole && matchesStatus;
  });

  return (
    <PageContainer
      title="User Account Management"
      description="Create, onboarding, inspect, edit, deactivate, or delete user accounts across all ecosystem roles."
    >
      <div className="space-y-5">
        {/* Action Controls Bar */}
        <div className="flex flex-col md:flex-row items-center justify-between gap-3 bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
          <div className="flex items-center gap-2 w-full md:w-auto">
            <button
              onClick={() => setShowCreateModal(true)}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold shadow-sm transition-colors"
            >
              <UserPlus className="size-4" /> Add Single User
            </button>
            <button
              onClick={() => setShowBulkCsvModal(true)}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-100 text-xs font-semibold transition-colors"
            >
              <FileSpreadsheet className="size-4" /> Bulk CSV Onboarding
            </button>
          </div>

          {/* Bulk Select Actions */}
          {selectedUserIds.length > 0 && (
            <div className="flex items-center gap-2 bg-indigo-50 border border-indigo-200 px-3 py-1.5 rounded-lg text-xs font-medium text-indigo-900 w-full md:w-auto">
              <span>{selectedUserIds.length} users selected</span>
              <button
                onClick={() => handleBulkAction("deactivate")}
                className="px-2 py-1 rounded bg-amber-100 text-amber-800 hover:bg-amber-200 font-semibold text-[11px]"
              >
                Deactivate All
              </button>
              <button
                onClick={() => handleBulkAction("delete")}
                className="px-2 py-1 rounded bg-red-100 text-red-800 hover:bg-red-200 font-semibold text-[11px]"
              >
                Delete Selected
              </button>
            </div>
          )}
        </div>

        {/* Filter Controls */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
          <div className="relative md:col-span-2">
            <Search className="absolute left-3 top-2.5 size-4 text-slate-400" />
            <Input
              placeholder="Search users by name or email..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9 text-xs h-9 bg-white"
            />
          </div>

          <select
            value={roleFilter}
            onChange={(e) => setRoleFilter(e.target.value)}
            className="h-9 rounded-md border border-slate-200 bg-white px-3 text-xs text-slate-700 focus:ring-1 focus:ring-indigo-500"
          >
            <option value="all">All Roles</option>
            <option value="student">Student</option>
            <option value="faculty">Faculty</option>
            <option value="mentor">Mentor</option>
            <option value="investor">Investor</option>
            <option value="admin">Admin</option>
          </select>

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="h-9 rounded-md border border-slate-200 bg-white px-3 text-xs text-slate-700 focus:ring-1 focus:ring-indigo-500"
          >
            <option value="all">All Statuses</option>
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
            <option value="pending">Pending</option>
            <option value="rejected">Rejected</option>
          </select>
        </div>

        {/* Users Table */}
        <div className="rounded-xl border border-slate-200 bg-white overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-700">
              <thead className="bg-slate-50 text-[11px] uppercase tracking-wider text-slate-500 font-semibold border-b border-slate-200">
                <tr>
                  <th className="p-3.5 w-10 text-center">
                    <input
                      type="checkbox"
                      checked={selectedUserIds.length === filteredUsers.length && filteredUsers.length > 0}
                      onChange={(e) => {
                        if (e.target.checked) setSelectedUserIds(filteredUsers.map((u) => u._id));
                        else setSelectedUserIds([]);
                      }}
                      className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                    />
                  </th>
                  <th className="p-3.5">User Name & Email</th>
                  <th className="p-3.5">Role</th>
                  <th className="p-3.5">Status</th>
                  <th className="p-3.5">Created Date</th>
                  <th className="p-3.5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {loading ? (
                  <tr>
                    <td colSpan={6} className="p-8 text-center text-slate-500">
                      <div className="flex items-center justify-center gap-2">
                        <Loader2 className="size-4 animate-spin text-indigo-600" />
                        <span>Loading user accounts from database...</span>
                      </div>
                    </td>
                  </tr>
                ) : filteredUsers.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="p-8 text-center text-slate-400">
                      No user accounts found matching your filters.
                    </td>
                  </tr>
                ) : (
                  filteredUsers.map((user) => (
                    <tr key={user._id} className="hover:bg-slate-50/70 transition-colors">
                      <td className="p-3.5 text-center">
                        <input
                          type="checkbox"
                          checked={selectedUserIds.includes(user._id)}
                          onChange={(e) => {
                            if (e.target.checked) setSelectedUserIds((prev) => [...prev, user._id]);
                            else setSelectedUserIds((prev) => prev.filter((id) => id !== user._id));
                          }}
                          className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                        />
                      </td>
                      <td className="p-3.5">
                        <div className="font-semibold text-slate-900">{user.name}</div>
                        <div className="text-[11px] text-slate-500">{user.email}</div>
                      </td>
                      <td className="p-3.5">
                        <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-semibold bg-indigo-50 text-indigo-700 border border-indigo-200 uppercase">
                          {user.role}
                        </span>
                      </td>
                      <td className="p-3.5">
                        <div className="flex flex-col gap-1 items-start">
                          {user.status === "active" && (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 font-semibold text-[10px]">
                              ACTIVE
                            </span>
                          )}
                          {user.status === "inactive" && (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 border border-slate-200 font-semibold text-[10px]">
                              INACTIVE
                            </span>
                          )}
                          {user.status === "pending" && (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-50 text-amber-700 border border-amber-200 font-semibold text-[10px]">
                              PENDING APPROVAL
                            </span>
                          )}
                          {user.status === "rejected" && (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-red-50 text-red-700 border border-red-200 font-semibold text-[10px]">
                              REJECTED
                            </span>
                          )}
                          {user.role === "investor" && (
                            user.isInvestorVerified ? (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-700 border border-indigo-200 font-semibold text-[9px]">
                                <ShieldCheck className="size-3 text-indigo-600" /> VERIFIED
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-slate-50 text-slate-600 border border-slate-200 font-semibold text-[9px]">
                                UNVERIFIED ACCREDITATION
                              </span>
                            )
                          )}
                        </div>
                      </td>
                      <td suppressHydrationWarning className="p-3.5 text-slate-500 text-[11px]">
                        {isMounted ? new Date(user.createdAt).toLocaleDateString() : user.createdAt}
                      </td>
                      <td className="p-3.5 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          {user.status === "pending" && (
                            <>
                              <button
                                onClick={() => handleApproveUser(user)}
                                className="p-1.5 rounded hover:bg-emerald-50 text-emerald-600 transition-colors"
                                title="Approve Registration"
                              >
                                <Check className="size-3.5" />
                              </button>
                              <button
                                onClick={() => {
                                  setRejectModalUser(user);
                                  setRejectionReasonInput("");
                                }}
                                className="p-1.5 rounded hover:bg-red-50 text-red-600 transition-colors"
                                title="Reject Registration"
                              >
                                <XCircle className="size-3.5" />
                              </button>
                            </>
                          )}
                          {user.role === "investor" && user.status === "active" && !user.isInvestorVerified && (
                            <button
                              onClick={() => handleVerifyInvestor(user)}
                              className="p-1.5 rounded hover:bg-indigo-50 text-indigo-600 transition-colors"
                              title="Verify Accredited Investor"
                            >
                              <ShieldCheck className="size-3.5" />
                            </button>
                          )}
                          <button
                            onClick={() => setSelectedUser(user)}
                            className="p-1.5 rounded hover:bg-slate-100 text-slate-600 transition-colors"
                            title="View & Edit Details"
                          >
                            <Edit className="size-3.5" />
                          </button>
                          <button
                            onClick={() => {
                              setPasswordModalUser(user);
                              setNewPasswordInput("");
                              setForceChangePassword(true);
                            }}
                            className="p-1.5 rounded hover:bg-amber-50 text-amber-600 transition-colors"
                            title="Update / Reset Password"
                          >
                            <Key className="size-3.5" />
                          </button>
                          <button
                            onClick={() => setShowDeleteModal(user)}
                            className="p-1.5 rounded hover:bg-red-50 text-red-600 transition-colors"
                            title="Delete / Deactivate"
                          >
                            <Trash2 className="size-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination bar */}
          <div className="flex items-center justify-between px-4 py-3 border-t border-slate-200 bg-slate-50/50 text-xs text-slate-600">
            <div>
              Showing <span className="font-semibold text-slate-900">{users.length}</span> of{" "}
              <span className="font-semibold text-slate-900">{totalUsers}</span> users (Page {page} of {totalPages})
            </div>
            <div className="flex items-center gap-1.5">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page <= 1}
                className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed font-medium shadow-sm transition-colors"
              >
                <ChevronLeft className="size-3.5" /> Previous
              </button>
              <button
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page >= totalPages}
                className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed font-medium shadow-sm transition-colors"
              >
                Next <ChevronRight className="size-3.5" />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* SINGLE USER CREATION MODAL */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-md bg-white rounded-xl shadow-xl border border-slate-200 p-6 space-y-4 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between border-b pb-3">
              <h3 className="text-lg font-bold text-slate-900">Create New User Account</h3>
              <button onClick={() => setShowCreateModal(false)} className="text-slate-400 hover:text-slate-600">
                <X className="size-5" />
              </button>
            </div>

            <form onSubmit={handleCreateUser} className="space-y-3 text-xs">
              <div>
                <label className="block text-slate-700 font-semibold mb-1">Full Name</label>
                <Input
                  required
                  placeholder="e.g. John Doe"
                  value={createForm.name}
                  onChange={(e) => setCreateForm({ ...createForm, name: e.target.value })}
                  className="h-9 text-xs"
                />
              </div>

              <div>
                <label className="block text-slate-700 font-semibold mb-1">Email Address</label>
                <Input
                  required
                  type="email"
                  placeholder="john@example.com"
                  value={createForm.email}
                  onChange={(e) => setCreateForm({ ...createForm, email: e.target.value })}
                  className="h-9 text-xs"
                />
              </div>

              <div>
                <label className="block text-slate-700 font-semibold mb-1">Assign Ecosystem Role</label>
                <select
                  value={createForm.role}
                  onChange={(e) => setCreateForm({ ...createForm, role: e.target.value })}
                  className="w-full h-9 rounded-md border border-slate-200 bg-white px-3 text-xs text-slate-700 focus:ring-1 focus:ring-indigo-500"
                >
                  <option value="student">Student</option>
                  <option value="faculty">Faculty</option>
                  <option value="mentor">Mentor</option>
                  <option value="investor">Investor</option>
                  <option value="admin">Admin</option>
                </select>
              </div>

              <div>
                <label className="block text-slate-700 font-semibold mb-1">Temporary Password (Optional)</label>
                <Input
                  placeholder="Auto-generated if left blank"
                  value={createForm.tempPassword}
                  onChange={(e) => setCreateForm({ ...createForm, tempPassword: e.target.value })}
                  className="h-9 text-xs"
                />
                <p className="text-[11px] text-slate-500 mt-1">
                  User will be prompted to change password upon first login.
                </p>
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="px-4 py-2 rounded-lg border border-slate-200 text-slate-700 hover:bg-slate-50 font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white font-semibold shadow-sm"
                >
                  Create Account
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* BULK CSV UPLOAD & IMPORT MODAL */}
      {showBulkCsvModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-2xl bg-white rounded-xl shadow-xl border border-slate-200 p-6 space-y-4 animate-in fade-in zoom-in-95 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b pb-3">
              <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                <FileSpreadsheet className="size-5 text-emerald-600" /> Bulk CSV User Onboarding
              </h3>
              <button onClick={() => setShowBulkCsvModal(false)} className="text-slate-400 hover:text-slate-600">
                <X className="size-5" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <p className="text-slate-600">
                Paste your CSV data below or enter comma-separated values format: <code className="bg-slate-100 px-1 py-0.5 rounded font-mono">name, email, role, institution</code>
              </p>

              <textarea
                rows={5}
                placeholder={`name, email, role, institution\nJohn Doe, john@student.edu, student, AAI DBIT\nJane Smith, jane@mentor.com, mentor, TechCorp`}
                value={csvText}
                onChange={(e) => setCsvText(e.target.value)}
                className="w-full p-3 border border-slate-200 rounded-lg text-xs font-mono focus:ring-1 focus:ring-emerald-500"
              />

              <div className="flex justify-between items-center">
                <button
                  type="button"
                  onClick={handleParseCsv}
                  className="px-3.5 py-1.5 rounded bg-slate-900 text-white font-semibold hover:bg-slate-800"
                >
                  Parse & Preview CSV
                </button>
                <span className="text-slate-500">{parsedCsvUsers.length} rows parsed</span>
              </div>

              {/* Preview Table */}
              {parsedCsvUsers.length > 0 && (
                <div className="rounded-lg border border-slate-200 overflow-hidden max-h-48 overflow-y-auto">
                  <table className="w-full text-left text-[11px]">
                    <thead className="bg-slate-100 font-semibold text-slate-700">
                      <tr>
                        <th className="p-2">Status</th>
                        <th className="p-2">Name</th>
                        <th className="p-2">Email</th>
                        <th className="p-2">Role</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {parsedCsvUsers.map((item, idx) => (
                        <tr key={idx} className={item.valid ? "bg-white" : "bg-red-50"}>
                          <td className="p-2">
                            {item.valid ? (
                              <span className="text-emerald-600 font-bold">VALID</span>
                            ) : (
                              <span className="text-red-600 font-bold">{item.reason}</span>
                            )}
                          </td>
                          <td className="p-2">{item.name}</td>
                          <td className="p-2">{item.email}</td>
                          <td className="p-2 font-mono uppercase">{item.role}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              <div className="flex justify-end gap-2 pt-3 border-t">
                <button
                  type="button"
                  onClick={() => setShowBulkCsvModal(false)}
                  className="px-4 py-2 rounded-lg border border-slate-200 text-slate-700 hover:bg-slate-50 font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleImportBulkCsv}
                  disabled={parsedCsvUsers.filter((u) => u.valid).length === 0}
                  className="px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-semibold shadow-sm disabled:opacity-50"
                >
                  Import {parsedCsvUsers.filter((u) => u.valid).length} Users
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* USER DETAILS / EDIT DRAWER */}
      {selectedUser && (
        <div className="fixed inset-0 z-50 flex justify-end bg-black/40">
          <div className="w-full max-w-md bg-white h-full p-6 space-y-4 shadow-2xl animate-in slide-in-from-right overflow-y-auto">
            <div className="flex items-center justify-between border-b pb-3">
              <h3 className="text-lg font-bold text-slate-900">User Profile & Controls</h3>
              <button onClick={() => setSelectedUser(null)} className="text-slate-400 hover:text-slate-600">
                <X className="size-5" />
              </button>
            </div>

            <div className="space-y-4 text-xs">
              <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-1">
                <p className="text-base font-bold text-slate-900">{selectedUser.name}</p>
                <p className="text-slate-500">{selectedUser.email}</p>
                <div className="pt-2 flex items-center gap-2">
                  <span className="px-2 py-0.5 rounded bg-indigo-100 text-indigo-800 font-semibold uppercase">
                    {selectedUser.role}
                  </span>
                  <span className="px-2 py-0.5 rounded bg-emerald-100 text-emerald-800 font-semibold uppercase">
                    {selectedUser.status}
                  </span>
                </div>
              </div>

              {/* Approval & Accreditation Controls */}
              <div className="space-y-2 p-3 bg-indigo-50/50 rounded-xl border border-indigo-100">
                <label className="block text-indigo-950 font-bold text-xs">Vetting & Accreditation Controls</label>
                
                {selectedUser.status !== "active" && (
                  <button
                    onClick={() => handleApproveUser(selectedUser)}
                    className="w-full py-2 px-3 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-semibold flex items-center justify-center gap-1.5 transition-colors shadow-sm"
                  >
                    <Check className="size-4" /> Approve User Account
                  </button>
                )}

                {selectedUser.status !== "rejected" && (
                  <button
                    onClick={() => {
                      setRejectModalUser(selectedUser);
                      setRejectionReasonInput("");
                    }}
                    className="w-full py-2 px-3 rounded-lg bg-red-50 hover:bg-red-100 text-red-700 border border-red-200 font-semibold flex items-center justify-center gap-1.5 transition-colors"
                  >
                    <XCircle className="size-4" /> Reject Registration
                  </button>
                )}

                {selectedUser.role === "investor" && selectedUser.status === "active" && (
                  selectedUser.isInvestorVerified ? (
                    <div className="p-2.5 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-800 text-[11px] font-semibold flex items-center gap-2">
                      <ShieldCheck className="size-4 text-emerald-600" />
                      Accredited Investor Verified
                    </div>
                  ) : (
                    <button
                      onClick={() => handleVerifyInvestor(selectedUser)}
                      className="w-full py-2 px-3 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white font-semibold flex items-center justify-center gap-1.5 transition-colors shadow-sm"
                    >
                      <ShieldCheck className="size-4" /> Verify as Accredited Investor
                    </button>
                  )
                )}
              </div>

              <div className="space-y-2">
                <label className="block text-slate-700 font-semibold">Account Status</label>
                <button
                  onClick={() => handleToggleStatus(selectedUser)}
                  className={`w-full py-2 rounded-lg font-semibold border transition-colors ${
                    selectedUser.status === "active"
                      ? "bg-amber-50 text-amber-800 border-amber-200 hover:bg-amber-100"
                      : "bg-emerald-50 text-emerald-800 border-emerald-200 hover:bg-emerald-100"
                  }`}
                >
                  {selectedUser.status === "active" ? "Deactivate User Account" : "Activate User Account"}
                </button>
              </div>

              <div className="space-y-2">
                <label className="block text-slate-700 font-semibold">Password Management</label>
                <button
                  onClick={() => {
                    setPasswordModalUser(selectedUser);
                    setSelectedUser(null);
                    setNewPasswordInput("");
                    setForceChangePassword(true);
                  }}
                  className="w-full py-2 rounded-lg bg-amber-500 text-white font-semibold hover:bg-amber-600 transition-colors flex items-center justify-center gap-2"
                >
                  <Key className="size-4" /> Update User Password
                </button>
              </div>

              <div className="pt-4 border-t space-y-2">
                <label className="block text-red-700 font-semibold">Danger Zone</label>
                <button
                  onClick={() => {
                    setShowDeleteModal(selectedUser);
                    setSelectedUser(null);
                  }}
                  className="w-full py-2 rounded-lg bg-red-50 text-red-700 border border-red-200 hover:bg-red-100 font-semibold transition-colors"
                >
                  Delete Account
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* REJECT USER REGISTRATION MODAL */}
      {rejectModalUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-md bg-white rounded-xl shadow-xl border border-red-200 p-6 space-y-4 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between border-b pb-3">
              <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2 text-red-600">
                <XCircle className="size-5" /> Reject Registration
              </h3>
              <button onClick={() => setRejectModalUser(null)} className="text-slate-400 hover:text-slate-600">
                <X className="size-5" />
              </button>
            </div>

            <div className="space-y-3 text-xs text-slate-700">
              <p>
                Provide a reason for rejecting the registration for <strong>{rejectModalUser.name}</strong> ({rejectModalUser.email}):
              </p>
              <textarea
                rows={3}
                placeholder="Reason for rejection (e.g., Incomplete credentials, unauthorized role request)..."
                value={rejectionReasonInput}
                onChange={(e) => setRejectionReasonInput(e.target.value)}
                className="w-full p-2.5 rounded-lg border border-slate-300 text-xs focus:ring-1 focus:ring-red-500 focus:border-red-500"
              />
            </div>

            <div className="flex justify-end gap-2 pt-3 border-t">
              <button
                type="button"
                onClick={() => setRejectModalUser(null)}
                className="px-4 py-2 rounded-lg border border-slate-200 text-slate-700 hover:bg-slate-50 font-semibold text-xs"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => handleRejectUser(rejectModalUser, rejectionReasonInput)}
                className="px-4 py-2 rounded-lg bg-red-600 hover:bg-red-700 text-white font-semibold text-xs shadow-sm"
              >
                Confirm Rejection
              </button>
            </div>
          </div>
        </div>
      )}

      {/* UPDATE USER PASSWORD MODAL */}
      {passwordModalUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-md bg-white rounded-xl shadow-xl border border-slate-200 p-6 space-y-4 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between border-b pb-3">
              <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                <Key className="size-5 text-amber-600" /> Update User Password
              </h3>
              <button onClick={() => setPasswordModalUser(null)} className="text-slate-400 hover:text-slate-600">
                <X className="size-5" />
              </button>
            </div>

            <form onSubmit={handleSavePassword} className="space-y-4 text-xs">
              <div className="p-3 rounded-lg bg-amber-50 border border-amber-200 text-amber-900 space-y-0.5">
                <p className="font-bold text-sm">{passwordModalUser.name}</p>
                <p className="text-amber-700">{passwordModalUser.email}</p>
                <span className="inline-block mt-1 px-2 py-0.5 rounded bg-amber-200/60 text-amber-900 text-[10px] font-semibold uppercase">
                  {passwordModalUser.role}
                </span>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-slate-700 font-semibold">New Password</label>
                  <button
                    type="button"
                    onClick={handleGeneratePassword}
                    className="text-[11px] text-indigo-600 hover:underline font-semibold"
                  >
                    Auto-Generate Password
                  </button>
                </div>
                <Input
                  type="text"
                  placeholder="Enter custom new password or auto-generate..."
                  value={newPasswordInput}
                  onChange={(e) => setNewPasswordInput(e.target.value)}
                  className="h-9 text-xs font-mono"
                />
                <p className="text-[11px] text-slate-500 mt-1">
                  Leave blank to auto-assign a secure temporary password.
                </p>
              </div>

              <div className="flex items-center gap-2 pt-1">
                <input
                  type="checkbox"
                  id="forceResetCheck"
                  checked={forceChangePassword}
                  onChange={(e) => setForceChangePassword(e.target.checked)}
                  className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                />
                <label htmlFor="forceResetCheck" className="text-slate-700 text-xs font-medium cursor-pointer">
                  Require user to change password upon next login
                </label>
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t">
                <button
                  type="button"
                  onClick={() => setPasswordModalUser(null)}
                  className="px-4 py-2 rounded-lg border border-slate-200 text-slate-700 hover:bg-slate-50 font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-lg bg-amber-600 hover:bg-amber-700 text-white font-semibold shadow-sm"
                >
                  Save New Password
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* SAFETY CONFIRMATION DELETE MODAL */}
      {showDeleteModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="w-full max-w-md bg-white rounded-xl shadow-xl border border-red-200 p-6 space-y-4 animate-in zoom-in-95">
            <div className="flex items-center gap-3 text-red-600 border-b pb-3">
              <AlertTriangle className="size-6" />
              <h3 className="text-lg font-bold text-slate-900">Confirm User Deletion</h3>
            </div>

            <div className="space-y-3 text-xs text-slate-600">
              <p>
                You are about to delete user <strong className="text-slate-900">{showDeleteModal.name}</strong> ({showDeleteModal.email}).
              </p>
              <div className="p-3 rounded-lg bg-red-50 text-red-800 border border-red-200">
                ⚠️ Warning: Deactivating or removing this user may affect associated active mentees, applications, or startup profile records.
              </div>

              <p>
                To confirm deletion, type <strong className="text-slate-900 font-mono">DELETE</strong> in the box below:
              </p>

              <Input
                placeholder='Type "DELETE" to confirm'
                value={deleteConfirmationText}
                onChange={(e) => setDeleteConfirmationText(e.target.value)}
                className="h-9 text-xs border-red-300 focus:ring-red-500 font-mono"
              />
            </div>

            <div className="flex justify-end gap-2 pt-3 border-t">
              <button
                onClick={() => {
                  setShowDeleteModal(null);
                  setDeleteConfirmationText("");
                }}
                className="px-4 py-2 rounded-lg border border-slate-200 text-slate-700 hover:bg-slate-50 font-semibold text-xs"
              >
                Cancel
              </button>
              <button
                onClick={handleDeleteUser}
                disabled={deleteConfirmationText !== "DELETE"}
                className="px-4 py-2 rounded-lg bg-red-600 hover:bg-red-700 text-white font-semibold text-xs disabled:opacity-50 shadow-sm"
              >
                Confirm Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </PageContainer>
  );
}
