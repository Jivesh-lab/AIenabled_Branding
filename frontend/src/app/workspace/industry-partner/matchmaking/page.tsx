import PageContainer from "@/components/shared/PageContainer";
import { Wand2, Sparkles, CheckCircle2, ArrowRight } from "lucide-react";

export default function TechMatchmakingPage() {
  return (
    <PageContainer>
      <div className="flex flex-col gap-8 max-w-5xl mx-auto w-full py-4">
        <div className="text-center space-y-4 py-8">
          <div className="inline-flex items-center justify-center p-3 bg-indigo-500/10 rounded-2xl mb-4 text-indigo-600">
            <Wand2 className="w-8 h-8" />
          </div>
          <h1 className="text-4xl font-extrabold tracking-tight text-foreground">
            AI Tech Matchmaking
          </h1>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Our AI engine analyzes your problem statements against thousands of academic papers and startup profiles to find hidden synergies.
          </p>
        </div>

        <div className="bg-card border rounded-3xl p-8 shadow-sm">
          <div className="flex flex-col md:flex-row gap-8 items-center">
            
            {/* Industry Problem */}
            <div className="flex-1 space-y-4">
              <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Your Problem Statement</span>
              <div className="p-6 bg-secondary/30 rounded-2xl border">
                <h3 className="font-semibold text-lg mb-2">Smart Logistics Optimization</h3>
                <p className="text-sm text-muted-foreground">Seeking innovative solutions to reduce last-mile delivery costs using predictive AI modeling and real-time traffic data.</p>
              </div>
            </div>

            {/* AI Match Graphic */}
            <div className="flex flex-col items-center justify-center">
              <div className="relative">
                <div className="absolute inset-0 bg-indigo-500/20 blur-xl rounded-full"></div>
                <div className="w-16 h-16 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-full flex items-center justify-center text-white relative z-10 shadow-lg shadow-indigo-500/30">
                  <Sparkles className="w-8 h-8" />
                </div>
              </div>
              <div className="mt-4 font-bold text-transparent bg-clip-text bg-gradient-to-r from-indigo-500 to-purple-600">
                94% Match
              </div>
            </div>

            {/* Matched Solution */}
            <div className="flex-1 space-y-4">
              <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Discovered Solution</span>
              <div className="p-6 bg-indigo-500/5 border border-indigo-500/20 rounded-2xl">
                <div className="flex items-center gap-2 mb-2 text-indigo-600">
                  <CheckCircle2 className="w-4 h-4" />
                  <span className="text-xs font-semibold">Verified Startup Project</span>
                </div>
                <h3 className="font-semibold text-lg mb-2">AeroDrones routing algorithm</h3>
                <p className="text-sm text-muted-foreground">A novel approach to drone delivery routing that incorporates urban wind shear data and traffic density.</p>
              </div>
            </div>

          </div>

          <div className="mt-10 flex justify-center">
            <button className="px-8 py-3 bg-indigo-600 text-white rounded-xl font-medium hover:bg-indigo-700 transition-colors flex items-center gap-2">
              Review Full Match Report
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </PageContainer>
  );
}
