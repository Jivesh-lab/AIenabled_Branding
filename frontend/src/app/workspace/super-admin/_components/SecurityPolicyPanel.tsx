"use client";

import { Shield, Key, AlertOctagon, CheckCircle, Terminal, RefreshCw, Lock } from "lucide-react";

export default function SecurityPolicyPanel() {
  return (
    <div id="security-policy" className="space-y-4 rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
      <div className="flex items-center justify-between pb-3 border-b border-slate-100">
        <div>
          <h2 className="text-lg font-bold text-slate-900 tracking-tight flex items-center gap-2">
            <Shield className="size-5 text-indigo-600" /> Super Admin Security & Emergency Recovery Policy
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Operational security guidelines, mandatory MFA policy, and emergency account recovery procedures.
          </p>
        </div>
        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 text-xs font-semibold">
          <CheckCircle className="size-3.5" /> Mandatory MFA Enforced
        </span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Card 1: Account Definition */}
        <div className="rounded-lg border border-slate-200 p-4 bg-slate-50/50 space-y-2">
          <div className="flex items-center gap-2 text-slate-900 font-semibold text-sm">
            <Lock className="size-4 text-slate-700" />
            1. Role & Account Isolation
          </div>
          <p className="text-xs text-slate-600 leading-relaxed">
            The <code className="bg-slate-200 px-1 py-0.5 rounded text-amber-800 font-bold">super_admin</code> account is isolated from public signups. Accounts are strictly provisioned via backend database seeds (<code className="bg-slate-200 px-1 py-0.5 rounded font-mono">npm run seed:superadmin</code>).
          </p>
          <div className="text-[11px] text-slate-500 pt-1 font-mono">
            Assigned Seed Email: <span className="font-semibold text-slate-800">superadmin@aai-dbitic.edu</span>
          </div>
        </div>

        {/* Card 2: MFA Status */}
        <div className="rounded-lg border border-slate-200 p-4 bg-slate-50/50 space-y-2">
          <div className="flex items-center gap-2 text-slate-900 font-semibold text-sm">
            <Key className="size-4 text-indigo-600" />
            2. Multi-Factor Authentication (2FA)
          </div>
          <p className="text-xs text-slate-600 leading-relaxed">
            Every Super Admin login mandates a 6-digit TOTP code generated via an Authenticator application (Google Authenticator / Authy). Login without a valid TOTP passkey is rejected automatically.
          </p>
          <div className="text-[11px] text-slate-500 pt-1 font-mono">
            Policy Status: <span className="font-semibold text-emerald-600">STRICT_ENFORCEMENT (RFC 6238)</span>
          </div>
        </div>

        {/* Card 3: Audit Trail */}
        <div className="rounded-lg border border-slate-200 p-4 bg-slate-50/50 space-y-2">
          <div className="flex items-center gap-2 text-slate-900 font-semibold text-sm">
            <Terminal className="size-4 text-amber-600" />
            3. Immutable Audit Trail
          </div>
          <p className="text-xs text-slate-600 leading-relaxed">
            All workspace inspections, authentication attempts, and API executions performed under the Super Admin role are written to MongoDB&apos;s <code className="bg-slate-200 px-1 py-0.5 rounded">AuditLog</code> collection with IP and timestamp metadata.
          </p>
        </div>

        {/* Card 4: Compromise Recovery */}
        <div className="rounded-lg border border-slate-200 p-4 bg-slate-50/50 space-y-2">
          <div className="flex items-center gap-2 text-slate-900 font-semibold text-sm">
            <AlertOctagon className="size-4 text-red-600" />
            4. Emergency Compromise Recovery
          </div>
          <p className="text-xs text-slate-600 leading-relaxed">
            In the event of credential compromise, execute <code className="bg-slate-200 px-1 py-0.5 rounded text-red-700 font-bold">npm run seed:superadmin</code> on the server to immediately invalidate tokens, rotate TOTP secrets, and reset passwords.
          </p>
        </div>
      </div>
    </div>
  );
}
