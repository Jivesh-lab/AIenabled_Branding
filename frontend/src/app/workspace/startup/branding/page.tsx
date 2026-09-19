"use client";

import PageContainer from "@/components/shared/PageContainer";
import { useState } from "react";
import { Wand2, Loader2, Download, Palette, Type, Image as ImageIcon } from "lucide-react";
import { motion } from "framer-motion";

export default function BrandingEnginePage() {
  const [prompt, setPrompt] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [hasGenerated, setHasGenerated] = useState(false);

  const handleGenerate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!prompt) return;
    setIsGenerating(true);
    // Simulate AI generation
    setTimeout(() => {
      setIsGenerating(false);
      setHasGenerated(true);
    }, 2500);
  };

  return (
    <PageContainer>
      <div className="flex flex-col gap-8 max-w-5xl mx-auto w-full">
        <div className="text-center space-y-4 py-8">
          <div className="inline-flex items-center justify-center p-3 bg-primary/10 rounded-2xl mb-4">
            <Wand2 className="w-8 h-8 text-primary" />
          </div>
          <h1 className="text-4xl font-extrabold tracking-tight text-foreground">
            AI Branding Engine
          </h1>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Generate customized pitch decks, press releases, and brand assets instantly. Describe your startup and let the AI do the rest.
          </p>
        </div>

        {/* Input Section */}
        <div className="bg-card border border-border/50 rounded-3xl p-6 shadow-sm backdrop-blur-sm bg-white/50 dark:bg-zinc-950/50">
          <form onSubmit={handleGenerate} className="flex flex-col gap-4">
            <div className="flex flex-col gap-2">
              <label htmlFor="prompt" className="text-sm font-medium ml-1">
                Describe your startup vision & product
              </label>
              <textarea
                id="prompt"
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                placeholder="e.g., We are a sustainable ag-tech company building smart irrigation systems using IoT sensors..."
                className="w-full min-h-[120px] p-4 rounded-2xl bg-background border border-border focus:ring-2 focus:ring-primary/50 focus:border-primary outline-none resize-none transition-all"
              />
            </div>
            
            <div className="flex items-center justify-between">
              <div className="flex gap-4 text-sm text-muted-foreground">
                <span className="flex items-center gap-1.5 bg-secondary/50 px-3 py-1.5 rounded-full"><Palette className="w-4 h-4"/> Auto-Colors</span>
                <span className="flex items-center gap-1.5 bg-secondary/50 px-3 py-1.5 rounded-full"><Type className="w-4 h-4"/> Modern Fonts</span>
              </div>
              <button
                type="submit"
                disabled={isGenerating || !prompt}
                className="px-6 py-3 bg-primary text-primary-foreground font-medium rounded-xl hover:bg-primary/90 transition-colors disabled:opacity-50 flex items-center gap-2"
              >
                {isGenerating ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    Generating Assets...
                  </>
                ) : (
                  <>
                    <Wand2 className="w-5 h-5" />
                    Generate Brand
                  </>
                )}
              </button>
            </div>
          </form>
        </div>

        {/* Results Section */}
        {hasGenerated && (
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="grid grid-cols-1 md:grid-cols-3 gap-6"
          >
            <div className="md:col-span-1 space-y-6">
              <div className="bg-card border rounded-3xl p-6 shadow-sm">
                <h3 className="font-semibold text-lg mb-4 flex items-center gap-2"><ImageIcon className="w-5 h-5 text-primary"/> Logo Concepts</h3>
                <div className="aspect-square bg-gradient-to-tr from-blue-500 to-purple-600 rounded-2xl flex items-center justify-center text-white font-bold text-4xl shadow-inner relative overflow-hidden group">
                  <span>AgriTech</span>
                  <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                    <button className="bg-white text-black px-4 py-2 rounded-lg font-medium text-sm flex items-center gap-2">
                      <Download className="w-4 h-4" /> Download
                    </button>
                  </div>
                </div>
              </div>
              
              <div className="bg-card border rounded-3xl p-6 shadow-sm">
                <h3 className="font-semibold text-lg mb-4 flex items-center gap-2"><Palette className="w-5 h-5 text-primary"/> Color Palette</h3>
                <div className="flex flex-col gap-3">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-blue-600 shadow-sm"></div>
                    <span className="font-mono text-sm">#2563EB (Primary)</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-purple-600 shadow-sm"></div>
                    <span className="font-mono text-sm">#9333EA (Secondary)</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-emerald-500 shadow-sm"></div>
                    <span className="font-mono text-sm">#10B981 (Accent)</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="md:col-span-2 space-y-6">
               <div className="bg-card border rounded-3xl p-6 shadow-sm min-h-[300px] flex flex-col">
                <div className="flex items-center justify-between mb-6">
                  <h3 className="font-semibold text-lg flex items-center gap-2"><Type className="w-5 h-5 text-primary"/> Pitch Deck Structure (Auto-Generated)</h3>
                  <button className="text-primary text-sm font-medium hover:underline flex items-center gap-1">
                    Export to PPTX
                  </button>
                </div>
                
                <div className="space-y-4 flex-1">
                  {[
                    "1. Problem Statement: Water scarcity in modern agriculture",
                    "2. Our Solution: Smart IoT irrigation network",
                    "3. Market Size: $15B Ag-Tech industry",
                    "4. Business Model: B2B SaaS + Hardware",
                    "5. Team: Experts in agronomy and embedded systems"
                  ].map((slide, i) => (
                    <div key={i} className="p-4 bg-secondary/30 rounded-xl border border-border/50 font-medium">
                      {slide}
                    </div>
                  ))}
                </div>
               </div>
            </div>
          </motion.div>
        )}
      </div>
    </PageContainer>
  );
}
