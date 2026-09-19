import PageContainer from "@/components/shared/PageContainer";
import { BarChart4, TrendingUp, TrendingDown, DollarSign, Users, Activity } from "lucide-react";

export default function KPIDashboardPage() {
  const kpis = [
    { label: "Monthly Recurring Revenue (MRR)", value: "$12,450", change: "+15%", positive: true, icon: DollarSign },
    { label: "Active Users", value: "2,841", change: "+8%", positive: true, icon: Users },
    { label: "Burn Rate", value: "$8,200/mo", change: "-2%", positive: true, icon: Activity },
    { label: "Runway", value: "14 months", change: "-1 month", positive: false, icon: TrendingDown },
  ];

  return (
    <PageContainer>
      <div className="flex flex-col gap-8 max-w-6xl mx-auto w-full py-4">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-foreground flex items-center gap-2">
              <BarChart4 className="w-8 h-8 text-primary" />
              KPI Tracking
            </h1>
            <p className="text-muted-foreground mt-1">Monitor your startup's core metrics in real-time.</p>
          </div>
          <div className="flex gap-2">
            <button className="px-4 py-2 bg-secondary text-secondary-foreground rounded-lg text-sm font-medium hover:bg-secondary/80">Last 30 Days</button>
            <button className="px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-medium hover:bg-primary/90">Export Report</button>
          </div>
        </div>

        {/* KPI Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {kpis.map((kpi, i) => (
            <div key={i} className="bg-card border rounded-2xl p-6 shadow-sm">
              <div className="flex justify-between items-start mb-4">
                <div className="p-2 bg-primary/10 rounded-lg">
                  <kpi.icon className="w-5 h-5 text-primary" />
                </div>
                <span className={`text-sm font-semibold flex items-center gap-1 ${kpi.positive ? 'text-green-500' : 'text-red-500'}`}>
                  {kpi.positive ? <TrendingUp className="w-4 h-4" /> : <TrendingDown className="w-4 h-4" />}
                  {kpi.change}
                </span>
              </div>
              <h3 className="text-muted-foreground text-sm font-medium">{kpi.label}</h3>
              <p className="text-3xl font-bold mt-1 text-foreground">{kpi.value}</p>
            </div>
          ))}
        </div>

        {/* Chart Area Mock */}
        <div className="bg-card border rounded-3xl p-6 shadow-sm h-[400px] flex flex-col">
          <h3 className="font-semibold text-lg mb-6">Revenue Growth (YTD)</h3>
          <div className="flex-1 flex items-end justify-between gap-2 md:gap-6 pt-10">
            {/* Generating mock bars */}
            {[40, 45, 55, 50, 65, 75, 80, 95, 85, 100, 110, 125].map((height, i) => (
              <div key={i} className="w-full flex flex-col items-center gap-2 group relative">
                <div className="absolute -top-8 bg-black text-white text-xs px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity">
                  ${(height * 100).toLocaleString()}
                </div>
                <div 
                  className="w-full bg-primary/20 hover:bg-primary rounded-t-sm transition-colors" 
                  style={{ height: `${(height / 125) * 100}%` }}
                ></div>
                <span className="text-xs text-muted-foreground hidden sm:block">
                  {['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'][i]}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </PageContainer>
  );
}
