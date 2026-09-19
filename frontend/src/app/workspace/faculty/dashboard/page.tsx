import PageContainer from "@/components/shared/PageContainer";

export default function FacultyDashboardPage() {
  return (
    <PageContainer>
      <div className="flex flex-col gap-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-foreground">
            Faculty Dashboard
          </h1>
          <p className="text-muted-foreground mt-2">
            Welcome to the Faculty Workspace. Monitor your research and students.
          </p>
        </div>
        
        <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
          <div className="p-6 rounded-xl border bg-card text-card-foreground shadow-sm">
            <h3 className="font-semibold mb-2">Supervised Projects</h3>
            <p className="text-3xl font-bold">12</p>
          </div>
          <div className="p-6 rounded-xl border bg-card text-card-foreground shadow-sm">
            <h3 className="font-semibold mb-2">Pending IP Filings</h3>
            <p className="text-3xl font-bold">3</p>
          </div>
          <div className="p-6 rounded-xl border bg-card text-card-foreground shadow-sm">
            <h3 className="font-semibold mb-2">Active Grants</h3>
            <p className="text-3xl font-bold">2</p>
          </div>
        </div>
        
        <div className="p-6 rounded-xl border bg-card text-card-foreground shadow-sm min-h-[300px]">
          <h3 className="font-semibold mb-4 text-xl">Recent Student Activity</h3>
          <p className="text-muted-foreground text-sm">Integration with AI oversight pending...</p>
        </div>
      </div>
    </PageContainer>
  );
}
