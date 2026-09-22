"use client";

import { useState, useEffect } from "react";
import PageContainer from "@/components/shared/PageContainer";
import AuditLogViewer from "@/app/workspace/super-admin/_components/AuditLogViewer";

export default function AdminAuditPage() {
  return (
    <PageContainer
      title="Admin Operational Audit Log"
      description="Immutable security log recording all administrative user modifications, approvals, impersonation sessions, and announcements."
    >
      <div className="space-y-4">
        <AuditLogViewer />
      </div>
    </PageContainer>
  );
}
