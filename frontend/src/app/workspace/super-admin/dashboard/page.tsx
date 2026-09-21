"use client";

import PageContainer from "@/components/shared/PageContainer";
import { Card } from "@/components/shared/Surface";
import WorkspaceSwitcherGrid from "../_components/WorkspaceSwitcherGrid";
import AuditLogViewer from "../_components/AuditLogViewer";
import SecurityPolicyPanel from "../_components/SecurityPolicyPanel";
import { Shield, Users, Activity, Lock } from "lucide-react";

export default function SuperAdminDashboardPage() {
  return (
    <PageContainer
      title="Super Admin Overview & Workspace Control"
      description="Full system access portal reserved for system owner oversight, workspace inspection, and security governance."
    >
      <div className="space-y-6">
        {/* Metric Cards Banner */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card className="p-4 border border-slate-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-slate-500 font-medium">Accessible Workspaces</p>
                <p className="text-2xl font-bold text-slate-900 mt-1">6 Workspaces</p>
                <p className="text-[11px] text-emerald-600 font-semibold mt-0.5">Unrestricted System Access</p>
              </div>
              <div className="flex size-10 items-center justify-center rounded-lg bg-blue-50 text-blue-600">
                <Users className="size-5" />
              </div>
            </div>
          </Card>

          <Card className="p-4 border border-slate-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-slate-500 font-medium">MFA Security Status</p>
                <p className="text-2xl font-bold text-slate-900 mt-1">Enforced (TOTP)</p>
                <p className="text-[11px] text-emerald-600 font-semibold mt-0.5">2FA Required on Login</p>
              </div>
              <div className="flex size-10 items-center justify-center rounded-lg bg-emerald-50 text-emerald-600">
                <Shield className="size-5" />
              </div>
            </div>
          </Card>

          <Card className="p-4 border border-slate-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-slate-500 font-medium">Audit Trail Logging</p>
                <p className="text-2xl font-bold text-slate-900 mt-1">Active</p>
                <p className="text-[11px] text-amber-600 font-semibold mt-0.5">MongoDB AuditLog</p>
              </div>
              <div className="flex size-10 items-center justify-center rounded-lg bg-amber-50 text-amber-600">
                <Activity className="size-5" />
              </div>
            </div>
          </Card>

          <Card className="p-4 border border-slate-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-slate-500 font-medium">Account Seeded Via</p>
                <p className="text-2xl font-bold text-slate-900 mt-1">CLI Seed Script</p>
                <p className="text-[11px] text-slate-500 font-medium mt-0.5">Public Signup Blocked</p>
              </div>
              <div className="flex size-10 items-center justify-center rounded-lg bg-purple-50 text-purple-600">
                <Lock className="size-5" />
              </div>
            </div>
          </Card>
        </div>

        {/* Workspace Switcher Grid */}
        <WorkspaceSwitcherGrid />

        {/* Audit Log Viewer */}
        <AuditLogViewer />

        {/* Security Policy Panel */}
        <SecurityPolicyPanel />
      </div>
    </PageContainer>
  );
}
