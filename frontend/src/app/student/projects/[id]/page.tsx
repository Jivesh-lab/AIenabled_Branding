import { use } from "react";
import PageContainer from "@/components/shared/PageContainer";

export default function ProjectPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);

  return (
    <PageContainer>
      <h1 className="text-[28px] font-semibold tracking-tight text-ink">Project {id}</h1>
      <p className="mt-2 text-[14px] text-muted-ink">Content coming soon.</p>
    </PageContainer>
  );
}
