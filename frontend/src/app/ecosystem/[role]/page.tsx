import Link from "next/link";
import { ArrowRight, CheckCircle2, ChevronLeft, ClipboardList, Compass, Users } from "lucide-react";

const roles = {
  "research-product-owners": {
    label: "Research / Product Owners",
    title: "Move research toward a useful product.",
    description: "A focused workspace for shaping the problem, tracking evidence, and deciding what to build next.",
    tasks: ["Define a research problem", "Collect evidence and feedback", "Create a product brief", "Track validation milestones"],
    metrics: [["04", "Open decisions"], ["12", "Research notes"], ["03", "Active milestones"]],
  },
  "faculty-coordinators": {
    label: "Faculty Coordinators",
    title: "Coordinate the innovation pipeline.",
    description: "See projects, reviews, mentors, and programme progress in one calm operating view.",
    tasks: ["Review submitted projects", "Assign faculty volunteers", "Schedule review checkpoints", "Export programme reports"],
    metrics: [["24", "Projects this term"], ["08", "Review groups"], ["06", "Upcoming reviews"]],
  },
  "faculty-volunteers": {
    label: "Faculty Volunteers",
    title: "Give every student a better next step.",
    description: "A lightweight space to discover projects where your expertise can create immediate progress.",
    tasks: ["Browse student projects", "Offer structured feedback", "Join a review group", "Recommend a resource"],
    metrics: [["18", "Projects needing input"], ["07", "Open requests"], ["05", "Suggested resources"]],
  },
  "industry-investors": {
    label: "Industry Investors",
    title: "Find the signal earlier.",
    description: "Review researched opportunities, founder context, and the next proof point before you engage.",
    tasks: ["Explore opportunity briefs", "Save promising projects", "Request a founder conversation", "Track follow-up conversations"],
    metrics: [["11", "Curated opportunities"], ["05", "Saved projects"], ["03", "Active conversations"]],
  },
  "industry-guides": {
    label: "Industry Guides",
    title: "Turn experience into momentum.",
    description: "Offer practical context, connections, and mentorship to teams moving from campus toward market.",
    tasks: ["Choose your expertise areas", "Review a project brief", "Share practical feedback", "Schedule a guide session"],
    metrics: [["09", "Teams to support"], ["04", "Guide requests"], ["06", "Expertise areas"]],
  },
} as const;

export default async function EcosystemRolePage({ params }: { params: Promise<{ role: string }> }) {
  const { role } = await params;
  const content = roles[role as keyof typeof roles] ?? roles["research-product-owners"];

  return <main className="ecosystem-preview"><header className="ecosystem-header"><Link className="ecosystem-logo" href="/">AAI–DBITIC <span>Preview</span></Link><Link className="ecosystem-back" href="/"><ChevronLeft size={15} /> Back to landing page</Link></header><section className="ecosystem-hero"><div><p className="ecosystem-kicker">ROLE WORKSPACE / DEMO</p><h1>{content.title}</h1><p>{content.description}</p><div className="ecosystem-actions"><Link className="ecosystem-primary" href="/signup">Create account <ArrowRight size={15} /></Link><Link className="ecosystem-secondary" href="/login">Sign in</Link></div></div><div className="ecosystem-orb"><Compass size={42} /><span>AAI–DBITIC<br />ecosystem</span></div></section><section className="ecosystem-body"><div className="ecosystem-role"><span className="ecosystem-role-icon"><Users size={18} /></span><div><p className="ecosystem-kicker">YOUR PATHWAY</p><h2>{content.label}</h2></div></div><div className="ecosystem-metrics">{content.metrics.map(([value, label]) => <div key={label}><strong>{value}</strong><span>{label}</span></div>)}</div><div className="ecosystem-columns"><div><p className="ecosystem-kicker">START HERE</p><h2>A focused workspace<br />for your next move.</h2><p className="ecosystem-muted">This is a working preview of the role experience. Authentication and backend data can be connected to each action when the workflow is finalized.</p></div><div className="ecosystem-task-list">{content.tasks.map((task) => <div key={task}><CheckCircle2 size={17} /><span>{task}</span><ArrowRight size={15} /></div>)}</div></div><div className="ecosystem-notice"><ClipboardList size={19} /><span>Demo workspace: sample data is shown until the live ecosystem workflows are connected.</span></div></section></main>;
}