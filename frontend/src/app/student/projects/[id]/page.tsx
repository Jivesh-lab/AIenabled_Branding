import { use } from "react";
import PageContainer from "@/components/shared/PageContainer";

export default function ProjectPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);

  return (
    <PageContainer>
      <h1 className="text-[28px] font-semibold tracking-tight text-[#0F172A]">Project {id}</h1>
      <p className="mt-2 text-[14px] text-[#64748B]">Content coming soon.</p>
    </PageContainer>
  );
}
