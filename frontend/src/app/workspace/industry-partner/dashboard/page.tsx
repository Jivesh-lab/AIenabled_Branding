import PageContainer from "@/components/shared/PageContainer";
import { FileText, Inbox, CalendarDays, Wand2, Sparkles, Building2, ArrowRight } from "lucide-react";

export default function DashboardPage() {
  const kpis = [
    { label: "Active Problem Statements", value: "3", icon: FileText, color: "text-blue-500", bg: "bg-blue-500/10" },
    { label: "Pending Applications", value: "12", icon: Inbox, color: "text-purple-500", bg: "bg-purple-500/10" },
    { label: "Upcoming Meetings", value: "4", icon: CalendarDays, color: "text-orange-500", bg: "bg-orange-500/10" },
  ];

  const recentApplications = [
    { name: "AgriTech Solutions", focus: "IoT Sensors for Irrigation", date: "Oct 18, 2023" },
    { name: "NeuroLink Labs", focus: "BCI for Accessibility", date: "Oct 16, 2023" },
    { name: "EcoBuild Systems", focus: "Sustainable Materials", date: "Oct 15, 2023" },
  ];

  return (
    <PageContainer>
      <div className="flex flex-col gap-8 max-w-6xl mx-auto w-full py-4">
        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-[28px] font-semibold tracking-tight text-foreground flex items-center gap-2">
              <Building2 className="w-8 h-8 text-primary" />
              Industry Partner Dashboard
            </h1>
            <p className="mt-1 text-[14px] text-muted-foreground">
              Welcome back. Here is the latest activity on your open innovation initiatives.
            </p>
          </div>
          <button className="px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-medium hover:bg-primary/90 flex items-center gap-2">
            <FileText className="w-4 h-4" />
            Post New Problem Statement
          </button>
        </div>

        {/* KPI Row */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
          {kpis.map((kpi, i) => (
            <div key={i} className="bg-card border rounded-2xl p-6 shadow-sm flex items-center gap-4">
              <div className={`p-4 rounded-xl ${kpi.bg}`}>
                <kpi.icon className={`w-6 h-6 ${kpi.color}`} />
              </div>
              <div>
                <p className="text-3xl font-bold text-foreground">{kpi.value}</p>
                <h3 className="text-muted-foreground text-sm font-medium">{kpi.label}</h3>
              </div>
            </div>
          ))}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Column */}
          <div className="lg:col-span-2 flex flex-col gap-6">
            
            {/* Tech Matchmaking Preview */}
            <div className="bg-gradient-to-br from-indigo-500/10 to-purple-500/10 border border-indigo-500/20 rounded-3xl p-6 shadow-sm relative overflow-hidden">
              <div className="absolute top-0 right-0 p-6 opacity-10">
                <Wand2 className="w-32 h-32" />
              </div>
              <div className="relative z-10">
                <div className="inline-flex items-center gap-1.5 bg-indigo-500/20 text-indigo-700 dark:text-indigo-300 px-3 py-1 rounded-full text-xs font-semibold mb-4">
                  <Sparkles className="w-3 h-3" />
                  AI Matchmaking Active
                </div>
                <h3 className="font-semibold text-xl mb-2">New Tech Match Found!</h3>
                <p className="text-muted-foreground mb-6 max-w-md">
                  Our AI has found a strong overlap between your <span className="font-medium text-foreground">"Smart Logistics Optimization"</span> problem statement and a recent research paper from the AAI-DBITIC Labs.
                </p>
                <button className="px-5 py-2.5 bg-indigo-600 text-white rounded-xl text-sm font-medium hover:bg-indigo-700 transition-colors flex items-center gap-2">
                  View Match Details
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Active Problem Statements */}
            <div className="bg-card border rounded-3xl overflow-hidden shadow-sm">
              <div className="px-6 py-4 border-b bg-muted/30 flex justify-between items-center">
                <h3 className="font-semibold">Active Problem Statements</h3>
                <button className="text-sm text-primary font-medium hover:underline">View All</button>
              </div>
              <div className="divide-y">
                <div className="p-6">
                  <div className="flex justify-between items-start mb-2">
                    <h4 className="font-semibold text-lg">Smart Logistics Optimization</h4>
                    <span className="bg-green-500/10 text-green-600 px-2.5 py-0.5 rounded-full text-xs font-medium">Active</span>
                  </div>
                  <p className="text-sm text-muted-foreground mb-4">Seeking innovative solutions to reduce last-mile delivery costs using predictive AI modeling.</p>
                  <div className="flex gap-6 text-sm">
                    <span className="flex items-center gap-1.5 font-medium"><Inbox className="w-4 h-4 text-muted-foreground" /> 8 Proposals</span>
                    <span className="flex items-center gap-1.5 font-medium"><Wand2 className="w-4 h-4 text-muted-foreground" /> 2 AI Matches</span>
                  </div>
                </div>
                <div className="p-6">
                  <div className="flex justify-between items-start mb-2">
                    <h4 className="font-semibold text-lg">Sustainable Packaging Alternatives</h4>
                    <span className="bg-green-500/10 text-green-600 px-2.5 py-0.5 rounded-full text-xs font-medium">Active</span>
                  </div>
                  <p className="text-sm text-muted-foreground mb-4">Looking for biodegradable materials that can replace single-use plastics in supply chains.</p>
                  <div className="flex gap-6 text-sm">
                    <span className="flex items-center gap-1.5 font-medium"><Inbox className="w-4 h-4 text-muted-foreground" /> 4 Proposals</span>
                    <span className="flex items-center gap-1.5 font-medium"><Wand2 className="w-4 h-4 text-muted-foreground" /> 0 AI Matches</span>
                  </div>
                </div>
              </div>
            </div>

          </div>

          {/* Sidebar Column */}
          <div className="flex flex-col gap-6">
            
            {/* Recent Applications */}
            <div className="bg-card border rounded-3xl overflow-hidden shadow-sm">
              <div className="px-6 py-4 border-b bg-muted/30">
                <h3 className="font-semibold">Recent Applications</h3>
              </div>
              <div className="divide-y">
                {recentApplications.map((app, i) => (
                  <div key={i} className="p-4 hover:bg-muted/10 transition-colors cursor-pointer group">
                    <h4 className="font-medium text-sm group-hover:text-primary transition-colors">{app.name}</h4>
                    <p className="text-xs text-muted-foreground mt-1 mb-2">{app.focus}</p>
                    <div className="flex justify-between items-center text-xs text-muted-foreground">
                      <span>{app.date}</span>
                      <span className="text-primary font-medium">Review</span>
                    </div>
                  </div>
                ))}
              </div>
              <div className="p-4 border-t bg-muted/10 text-center">
                <button className="text-sm font-medium text-primary hover:underline">View All 12 Applications</button>
              </div>
            </div>

          </div>
        </div>
      </div>
    </PageContainer>
  );
}
