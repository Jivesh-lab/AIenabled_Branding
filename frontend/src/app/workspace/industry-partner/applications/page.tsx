import PageContainer from "@/components/shared/PageContainer";
import { Inbox } from "lucide-react";

export default function ApplicationsPage() {
  return (
    <PageContainer>
      <div className="flex flex-col gap-6 max-w-6xl mx-auto w-full py-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-foreground flex items-center gap-2">
            <Inbox className="w-8 h-8 text-primary" />
            Applications
          </h1>
          <p className="text-muted-foreground mt-1">Review incoming proposals from startups.</p>
        </div>

        <div className="bg-card border rounded-2xl p-8 text-center text-muted-foreground mt-10">
          Application review pipeline coming soon.
        </div>
      </div>
    </PageContainer>
  );
}
