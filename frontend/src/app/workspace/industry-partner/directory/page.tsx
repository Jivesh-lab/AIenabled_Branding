import PageContainer from "@/components/shared/PageContainer";
import { Search, Filter, Briefcase, Zap, MapPin } from "lucide-react";

export default function StartupDirectoryPage() {
  const startups = [
    { name: "AgriTech Solutions", industry: "Ag-Tech", stage: "Seed", location: "Mumbai", tech: "IoT Sensors" },
    { name: "NeuroLink Labs", industry: "Health-Tech", stage: "Pre-Seed", location: "Bangalore", tech: "BCI" },
    { name: "EcoBuild Systems", industry: "Clean-Tech", stage: "Series A", location: "Delhi", tech: "Sustainable Materials" },
    { name: "FinFlow AI", industry: "FinTech", stage: "Seed", location: "Pune", tech: "Machine Learning" },
    { name: "AeroDrones", industry: "Logistics", stage: "Pre-Seed", location: "Hyderabad", tech: "Computer Vision" },
    { name: "BioGenix", industry: "Biotech", stage: "Series B", location: "Chennai", tech: "CRISPR" },
  ];

  return (
    <PageContainer>
      <div className="flex flex-col gap-6 max-w-6xl mx-auto w-full py-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-foreground flex items-center gap-2">
            <Search className="w-8 h-8 text-primary" />
            Startup Directory
          </h1>
          <p className="text-muted-foreground mt-1">Discover and filter through startups currently in the incubator.</p>
        </div>

        <div className="flex flex-col md:flex-row gap-4 mb-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground w-5 h-5" />
            <input 
              type="text" 
              placeholder="Search by name, industry, or technology..." 
              className="w-full pl-10 pr-4 py-2 border rounded-xl bg-card focus:ring-2 focus:ring-primary/50 outline-none"
            />
          </div>
          <button className="flex items-center gap-2 px-4 py-2 bg-secondary text-secondary-foreground rounded-xl border hover:bg-secondary/80">
            <Filter className="w-4 h-4" /> Filters
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {startups.map((startup, i) => (
            <div key={i} className="bg-card border rounded-2xl p-6 shadow-sm hover:shadow-md transition-shadow cursor-pointer">
              <div className="flex justify-between items-start mb-4">
                <div className="w-12 h-12 bg-primary/10 rounded-xl flex items-center justify-center text-primary font-bold text-xl">
                  {startup.name.charAt(0)}
                </div>
                <span className="bg-secondary px-2.5 py-0.5 rounded-full text-xs font-medium border">{startup.stage}</span>
              </div>
              <h3 className="font-semibold text-lg mb-2">{startup.name}</h3>
              <div className="flex flex-col gap-2 text-sm text-muted-foreground mb-4">
                <span className="flex items-center gap-2"><Briefcase className="w-4 h-4" /> {startup.industry}</span>
                <span className="flex items-center gap-2"><Zap className="w-4 h-4" /> {startup.tech}</span>
                <span className="flex items-center gap-2"><MapPin className="w-4 h-4" /> {startup.location}</span>
              </div>
              <button className="w-full py-2 bg-primary/10 text-primary rounded-lg font-medium hover:bg-primary/20 transition-colors">
                View Profile
              </button>
            </div>
          ))}
        </div>
      </div>
    </PageContainer>
  );
}
