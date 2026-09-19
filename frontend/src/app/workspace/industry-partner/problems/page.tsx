import PageContainer from "@/components/shared/PageContainer";
import { FileText, Plus } from "lucide-react";

export default function ProblemStatementsPage() {
  return (
    <PageContainer>
      <div className="flex flex-col gap-6 max-w-6xl mx-auto w-full py-4">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-foreground flex items-center gap-2">
              <FileText className="w-8 h-8 text-primary" />
              Problem Statements
            </h1>
            <p className="text-muted-foreground mt-1">Manage the challenges you've posted to the incubator community.</p>
          </div>
          <button className="px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-medium hover:bg-primary/90 flex items-center gap-2">
            <Plus className="w-4 h-4" /> New Statement
          </button>
        </div>

        <div className="bg-card border rounded-2xl p-8 text-center text-muted-foreground mt-10">
          More detailed management view coming soon.
        </div>
      </div>
    </PageContainer>
  );
}
