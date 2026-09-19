import PageContainer from "@/components/shared/PageContainer";
import { Sparkles } from "lucide-react";

export default function AIMatchmakingPage() {
  return (
    <PageContainer>
      <div className="flex flex-col gap-6 max-w-6xl mx-auto w-full py-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-foreground flex items-center gap-2">
            <Sparkles className="w-8 h-8 text-primary" />
            AI Matchmaking
          </h1>
          <p className="text-muted-foreground mt-1">Manage and view your ai matchmaking details.</p>
        </div>

        <div className="bg-card border rounded-2xl p-12 text-center flex flex-col items-center justify-center text-muted-foreground mt-10 shadow-sm">
          <Sparkles className="w-12 h-12 mb-4 opacity-20" />
          <p className="text-lg font-medium text-foreground mb-1">Coming Soon</p>
          <p className="text-sm">This module is currently under active development.</p>
        </div>
      </div>
    </PageContainer>
  );
}
