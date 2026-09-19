import PageContainer from "@/components/shared/PageContainer";
import { Presentation, CheckCircle2, Clock, XCircle, FileText } from "lucide-react";

export default function PitchDecksPage() {
  const pitchDecks = [
    { name: "Seed Round Deck v2.pdf", status: "Approved", date: "Oct 12, 2023", icon: CheckCircle2, color: "text-green-500" },
    { name: "Investor Update Q3.pdf", status: "Pending Review", date: "Oct 15, 2023", icon: Clock, color: "text-orange-500" },
    { name: "Pre-Seed Deck (Old).pdf", status: "Rejected", date: "Sep 01, 2023", icon: XCircle, color: "text-red-500" },
  ];

  return (
    <PageContainer>
      <div className="flex flex-col gap-8 max-w-5xl mx-auto w-full py-4">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-foreground flex items-center gap-2">
              <Presentation className="w-8 h-8 text-primary" />
              Pitch Decks
            </h1>
            <p className="text-muted-foreground mt-1">Manage and track your AI-generated pitch materials.</p>
          </div>
          <button className="px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-medium hover:bg-primary/90 flex items-center gap-2">
            <Presentation className="w-4 h-4" />
            Generate New Deck
          </button>
        </div>

        <div className="bg-card border rounded-3xl overflow-hidden shadow-sm">
          <div className="px-6 py-4 border-b bg-muted/30">
            <h3 className="font-semibold">Recent Pitch Decks</h3>
          </div>
          <div className="divide-y">
            {pitchDecks.map((deck, i) => (
              <div key={i} className="p-6 flex items-center justify-between hover:bg-muted/10 transition-colors">
                <div className="flex items-center gap-4">
                  <div className="p-3 bg-primary/10 text-primary rounded-xl">
                    <FileText className="w-6 h-6" />
                  </div>
                  <div>
                    <h4 className="font-semibold">{deck.name}</h4>
                    <p className="text-sm text-muted-foreground">Generated on {deck.date}</p>
                  </div>
                </div>
                <div className="flex items-center gap-6">
                  <div className={`flex items-center gap-1.5 text-sm font-medium ${deck.color}`}>
                    <deck.icon className="w-4 h-4" />
                    {deck.status}
                  </div>
                  <button className="text-sm text-primary hover:underline font-medium">View</button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </PageContainer>
  );
}
