import PageContainer from "@/components/shared/PageContainer";

export default function InvestorDashboardPage() {
  return (
    <PageContainer>
      <div className="flex flex-col gap-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-foreground">
            Investor Dashboard
          </h1>
          <p className="text-muted-foreground mt-2">
            Targeted deal-flow and portfolio monitoring.
          </p>
        </div>
        
        <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
          <div className="p-6 rounded-xl border bg-card text-card-foreground shadow-sm">
            <h3 className="font-semibold mb-2">New Matches</h3>
            <p className="text-3xl font-bold text-green-500">8</p>
          </div>
          <div className="p-6 rounded-xl border bg-card text-card-foreground shadow-sm">
            <h3 className="font-semibold mb-2">Portfolio Companies</h3>
            <p className="text-3xl font-bold">14</p>
          </div>
          <div className="p-6 rounded-xl border bg-card text-card-foreground shadow-sm">
            <h3 className="font-semibold mb-2">Pending Pitches</h3>
            <p className="text-3xl font-bold text-orange-500">5</p>
          </div>
        </div>
        
        <div className="p-6 rounded-xl border bg-card text-card-foreground shadow-sm min-h-[300px]">
          <h3 className="font-semibold mb-4 text-xl">Curated Deal Flow</h3>
          <p className="text-muted-foreground text-sm">AI filtering pitch decks based on your investment criteria...</p>
        </div>
      </div>
    </PageContainer>
  );
}
