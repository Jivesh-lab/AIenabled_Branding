import PageContainer from "@/components/shared/PageContainer";
import { FileCheck2 } from "lucide-react";

export default function PitchQueuePage() {
  return (
    <PageContainer>
      <div className="flex flex-col gap-6 max-w-6xl mx-auto w-full py-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-foreground flex items-center gap-2">
            <FileCheck2 className="w-8 h-8 text-primary" />
            Pitch Queue
          </h1>
          <p className="text-muted-foreground mt-1">Manage and view your pitch queue details.</p>
        </div>

        <div className="bg-card border rounded-2xl p-8 flex flex-col gap-4 text-left text-muted-foreground mt-10 shadow-sm">
          <div className="flex items-center gap-3 border-b border-border/50 pb-4">
            <FileCheck2 className="w-5 h-5 text-foreground opacity-70" />
            <h2 className="text-xl font-semibold text-foreground m-0">Module Configuration</h2>
          </div>
          <p className="text-sm leading-relaxed">
            This workspace module is currently being provisioned. Once fully activated, this environment will support the following capabilities:
          </p>
          <ul className="list-disc list-outside text-sm space-y-2 mt-2 ml-5 marker:text-slate-300">
            <li>Structured data management and historical tracking</li>
            <li>Real-time analytics and automated reporting</li>
            <li>Role-based access control and collaborative editing</li>
          </ul>
        </div>
      </div>
    </PageContainer>
  );
}
