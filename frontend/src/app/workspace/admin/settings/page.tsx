"use client";

import PageContainer from "@/components/shared/PageContainer";
import { Card } from "@/components/shared/Surface";
import { toast } from "sonner";
import { Settings, Shield, UserCheck, Bell, Lock } from "lucide-react";

export default function AdminSettingsPage() {
  function handleSaveSettings(e: React.FormEvent) {
    e.preventDefault();
    toast.success("Operational admin settings saved successfully.");
  }

  return (
    <PageContainer
      title="Admin Operational Settings"
      description="Configure workspace onboarding policies, vetting rules, and automated notification defaults."
    >
      <div className="space-y-6 max-w-3xl">
        <form onSubmit={handleSaveSettings}>
          <Card className="p-6 border border-slate-200 space-y-6">
            <div className="border-b pb-3">
              <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <UserCheck className="size-5 text-indigo-600" /> Onboarding & Registration Vetting Policy
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Configure approval rules for incoming registrations.
              </p>
            </div>

            <div className="space-y-4 text-xs">
              <div className="flex items-center justify-between p-3 rounded-lg bg-slate-50 border border-slate-100">
                <div>
                  <p className="font-semibold text-slate-800">Mandatory Mentor Vetting Queue</p>
                  <p className="text-slate-500 text-[11px]">Require admin review before activating new mentor accounts.</p>
                </div>
                <input type="checkbox" defaultChecked className="size-4 rounded text-indigo-600 focus:ring-indigo-500" />
              </div>

              <div className="flex items-center justify-between p-3 rounded-lg bg-slate-50 border border-slate-100">
                <div>
                  <p className="font-semibold text-slate-800">Mandatory Industry Partner Vetting</p>
                  <p className="text-slate-500 text-[11px]">Require corporate verification before posting opportunities.</p>
                </div>
                <input type="checkbox" defaultChecked className="size-4 rounded text-indigo-600 focus:ring-indigo-500" />
              </div>

              <div className="flex items-center justify-between p-3 rounded-lg bg-slate-50 border border-slate-100">
                <div>
                  <p className="font-semibold text-slate-800">Force Password Reset on Admin Created Accounts</p>
                  <p className="text-slate-500 text-[11px]">Require users to set a new password on their first login.</p>
                </div>
                <input type="checkbox" defaultChecked className="size-4 rounded text-indigo-600 focus:ring-indigo-500" />
              </div>
            </div>

            <div className="flex justify-end pt-3 border-t">
              <button
                type="submit"
                className="px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-xs shadow-sm transition-colors"
              >
                Save Settings
              </button>
            </div>
          </Card>
        </form>
      </div>
    </PageContainer>
  );
}
