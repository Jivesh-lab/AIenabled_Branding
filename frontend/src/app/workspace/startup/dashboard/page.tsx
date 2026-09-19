import PageContainer from "@/components/shared/PageContainer";

export default function StartupDashboardPage() {
  return (
    <PageContainer>
      <div className="flex flex-col gap-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-foreground">
            Startup Dashboard
          </h1>
          <p className="text-muted-foreground mt-2">
            Speed to market and growth operations.
          </p>
        </div>
        
        <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
          <div className="p-6 rounded-xl border bg-card text-card-foreground shadow-sm">
            <h3 className="font-semibold mb-2">Monthly MRR Growth</h3>
            <p className="text-3xl font-bold text-green-500">+15%</p>
          </div>
          <div className="p-6 rounded-xl border bg-card text-card-foreground shadow-sm">
            <h3 className="font-semibold mb-2">Runway Remaining</h3>
            <p className="text-3xl font-bold">11 mo</p>
          </div>
          <div className="p-6 rounded-xl border bg-card text-card-foreground shadow-sm">
            <h3 className="font-semibold mb-2">Brand Assets</h3>
            <p className="text-3xl font-bold">4 Ready</p>
          </div>
        </div>
        
        <div className="p-6 rounded-xl border bg-card text-card-foreground shadow-sm min-h-[300px]">
          <h3 className="font-semibold mb-4 text-xl">AI Branding Engine</h3>
          <p className="text-muted-foreground text-sm">Generate customized pitch decks and press releases featuring approved AAI–DBITIC logos...</p>
        </div>
      </div>
    </PageContainer>
  );
}
