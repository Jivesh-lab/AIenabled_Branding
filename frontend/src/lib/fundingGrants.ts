/**
 * Funding and grant schemes shown on the Funding & Grants page and found by the portal search.
 * One list, so the page and the search can never disagree.
 */

export interface GrantOpportunity {
  id: string;
  name: string;
  provider: string;
  category: "Institutional" | "Government Scheme" | "Industry Partner";
  domain: string;
  amount: string;
  deadline: string;
  stage: string;
  description: string;
  eligibility: string[];
  disbursement: string[];
  openCall: boolean;
}

export const GRANT_OPPORTUNITIES: GrantOpportunity[] = [
  {
    id: "f1",
    name: "AI Innovation Grant",
    provider: "DBIT Incubation Centre & AI Research Lab",
    category: "Institutional",
    domain: "AI / Deep Tech",
    amount: "Up to ₹2 Lakh",
    deadline: "28 Sep 2026",
    stage: "TRL 3 - Proof of Concept",
    description:
      "Catalyst grant to fund computational resources, cloud GPUs, edge sensor hardware, and dataset procurement for researcher AI innovations.",
    eligibility: [
      "DBIT researcher founder team (min 2 members)",
      "Clear AI/ML architecture & problem definition",
      "Endorsement by department faculty guide",
    ],
    disbursement: ["50% on grant sanction", "30% upon algorithm benchmark test", "20% on final demo day"],
    openCall: true,
  },
  {
    id: "f2",
    name: "Researcher Startup Seed Fund",
    provider: "Institutional Innovation Corpus",
    category: "Institutional",
    domain: "Any Domain",
    amount: "Up to ₹5 Lakh",
    deadline: "05 Oct 2026",
    stage: "TRL 4 - Lab Prototype",
    description:
      "Early-stage seed capital for promising college startups transitioning from academic capstones to commercial legal entities.",
    eligibility: [
      "Admitted DBIT incubation startup",
      "Formal corporate incorporation / DPIIT registration plan",
      "Completed milestone roadmap agreed with Faculty Coordinator",
    ],
    disbursement: ["40% upon incubation agreement", "30% upon MVP pilot test", "30% on incorporation & compliance"],
    openCall: true,
  },
  {
    id: "f3",
    name: "AgriTech Incubation Support Grant",
    provider: "AgriCore Diagnostics & BioVentures Partnership",
    category: "Industry Partner",
    domain: "AgriTech",
    amount: "Up to ₹3 Lakh",
    deadline: "12 Oct 2026",
    stage: "TRL 4 - Field Prototype",
    description:
      "Industry-sponsored grant supporting pilot field trials, sensor fabrication, and rural deployment testing for automated farming solutions.",
    eligibility: [
      "Startup addressing agriculture or food supply chain",
      "Willingness to conduct on-site field testing",
      "Pass AI Application Agent screening with readiness score ≥ 75",
    ],
    disbursement: ["50% hardware fabrication advance", "50% post 30-day field deployment report"],
    openCall: true,
  },
  {
    id: "f4",
    name: "DST NIDHI-PRAYAS Prototype Grant",
    provider: "Department of Science & Technology (Govt. of India)",
    category: "Government Scheme",
    domain: "Hardware / CleanTech / IoT",
    amount: "Up to ₹10 Lakh",
    deadline: "30 Nov 2026",
    stage: "TRL 3-5 - Idea to Prototype",
    description:
      "Flagship national grant dedicated to turning innovative hardware and technology ideas into tangible market-ready prototypes with zero equity taken.",
    eligibility: [
      "Indian citizen researcher innovators aged 18-35",
      "Original intellectual property not commercially launched yet",
      "Tangible product development (physical device/component)",
    ],
    disbursement: ["30% upon grant sanction", "40% upon mid-stage prototype review", "30% on final prototype delivery"],
    openCall: true,
  },
  {
    id: "f5",
    name: "MeitY TIDE 2.0 Incubation Scheme",
    provider: "Ministry of Electronics & Information Technology",
    category: "Government Scheme",
    domain: "ICT / Software / Electronics",
    amount: "Up to ₹7 Lakh",
    deadline: "15 Dec 2026",
    stage: "TRL 4 - Validation",
    description:
      "Technology Incubation and Development of Entrepreneurs grant promoting emerging technologies in IoT, AI, blockchain, and robotics.",
    eligibility: [
      "Registered with a recognized TIDE 2.0 incubation center",
      "Technology solving national priority area",
      "Structured product roadmap with defined milestones",
    ],
    disbursement: ["40% initial tranche", "30% on technical milestone", "30% on customer pilot report"],
    openCall: true,
  },
  {
    id: "f6",
    name: "BIRAC BIG (Biotechnology Ignition Grant)",
    provider: "Biotechnology Industry Research Assistance Council",
    category: "Government Scheme",
    domain: "HealthTech / BioTech",
    amount: "Up to ₹50 Lakh",
    deadline: "15 Jan 2027",
    stage: "TRL 3 - Pre-commercial",
    description:
      "High-value ignition funding for healthcare, medical diagnostics, biomedical engineering, and sustainable biopolymer startups.",
    eligibility: [
      "BioTech / MedTech focus with laboratory validation requirements",
      "Dedicated faculty researcher or technical co-founder",
      "Formal institutional lab safety pre-clearance",
    ],
    disbursement: ["Tranche-based release tied to strict laboratory milestone audits"],
    openCall: true,
  },
];
