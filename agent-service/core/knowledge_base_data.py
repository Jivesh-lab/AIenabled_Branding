"""
core/knowledge_base_data.py
───────────────────────────
Curated incubation knowledge base for the AI Incubation Assistant.
Used as authoritative fallback and source for semantic/keyword retrieval
when pgvector is empty or running in offline/standalone mode.
"""

INCUBATION_KNOWLEDGE_DOCS = [
    {
        "id": "kb-policy-01",
        "title": "DBIT Incubation Centre Eligibility & Application Criteria",
        "source": "incubation_policy_2026.pdf",
        "source_type": "policy",
        "content": (
            "To be eligible for incubation at DBIT Incubation Centre (DBITIC), at least one co-founder must be a currently enrolled student, "
            "alumnus (within 3 years of graduation), or faculty member. Teams must consist of 1 to 5 members. "
            "Startups must address a clear technological, social, or industrial problem. Projects in AgriTech, HealthTech, GreenTech, "
            "IoT, AI/ML, and CleanTech receive priority access to specialized hardware lab equipment."
        ),
        "metadata": {"section": "eligibility", "stage": "all"}
    },
    {
        "id": "kb-policy-02",
        "title": "Incubation Stages and Progression Milestones",
        "source": "incubation_stages.pdf",
        "source_type": "policy",
        "content": (
            "The incubation journey is structured into 4 key stages: "
            "1. Pre-Incubation / Ideation (Weeks 1-4): Problem validation, customer interviews, and initial faculty mentor allocation. "
            "2. Prototype Development (Weeks 5-12): MVP architecture, bench trials, and TRL 3 to 4 progression. "
            "3. Validation & Pilot (Weeks 13-20): Field pilot tests, ASTM/ISO testing compliance, and user feedback integration. "
            "4. Commercialization & Seed Funding (Weeks 21-28): Pitch deck finalization, seed fund applications (DST NIDHI, SISFS), "
            "and formal registration as a Private Limited / LLP company."
        ),
        "metadata": {"section": "stages", "stage": "timeline"}
    },
    {
        "id": "kb-policy-03",
        "title": "Application Submission Requirements & Mandatory Documents",
        "source": "application_guidelines.pdf",
        "source_type": "guidelines",
        "content": (
            "An incubation application requires: "
            "1. Startup Name & Tagline (concise value proposition). "
            "2. Detailed Problem Statement (minimum 30 characters) describing the pain point and affected users. "
            "3. Proposed Solution (minimum 30 characters) outlining technical differentiation and innovation. "
            "4. Team Details including roll numbers, institutional emails, and technical roles. "
            "5. Technology Stack and Prototype Status (No Prototype, POC Ready, Working Prototype, or MVP Deployed). "
            "6. Optional Attachments: Pitch deck (PDF, max 10MB), GitHub repository link, demo video link. "
            "7. Signed Declaration of Intellectual Property and College Incubation Regulations acceptance."
        ),
        "metadata": {"section": "submission", "stage": "pre-incubation"}
    },
    {
        "id": "kb-policy-04",
        "title": "Government and Institutional Funding Schemes",
        "source": "funding_schemes_guide.pdf",
        "source_type": "scheme",
        "content": (
            "Eligible incubated startups can apply for supported funding schemes: "
            "1. DST NIDHI-EIR (National Initiative for Developing and Harnessing Innovations - Entrepreneurs-in-Residence): "
            "Provides fellowship support of ₹30,000/month for up to 12 months for student entrepreneurs. "
            "2. DST NIDHI-PRAYAS: Prototype grant up to ₹10 Lakhs for hardware and tech innovation proof-of-concept. "
            "3. Startup India Seed Fund Scheme (SISFS): Financial assistance up to ₹20 Lakhs as grant for POC/prototype, "
            "and up to ₹50 Lakhs through convertible debentures or debt for market entry/commercialization. "
            "4. BIRAC BIG (Biotechnology Ignition Grant): Up to ₹50 Lakhs for biotech and medtech ventures."
        ),
        "metadata": {"section": "funding", "stage": "funding"}
    },
    {
        "id": "kb-policy-05",
        "title": "Faculty and Industry Mentorship Allocation Process",
        "source": "mentorship_framework.pdf",
        "source_type": "policy",
        "content": (
            "Every accepted startup is assigned a Faculty Coordinator and an Industry Mentor. "
            "Mentor allocation is conducted via AI matchmaking considering startup domain (e.g. AgriTech, Web3, GreenTech), "
            "current maturity (TRL), requested expertise (e.g. biopolymer tooling, smart contracts, regulatory compliance), "
            "and mentor bandwidth. "
            "All mentor allocations require human review and authorization by the Faculty Incubation Coordinator."
        ),
        "metadata": {"section": "mentors", "stage": "incubation"}
    },
    {
        "id": "kb-policy-06",
        "title": "Milestone Reviews, Progress Tracking, and Health Indicators",
        "source": "monitoring_framework.pdf",
        "source_type": "policy",
        "content": (
            "Startups must submit monthly progress reports and attend bi-weekly milestone check-ins with their mentors. "
            "Startup health is evaluated based on: "
            "- 'On Track': Overdue milestones = 0, task completion rate >= 70%. "
            "- 'Needs Attention': 1 overdue milestone or task completion rate between 40% and 69%. "
            "- 'At Risk': 2 or more overdue milestones or missing progress reports for over 30 days. "
            "Incubation managers schedule emergency reviews for startups marked At Risk to provide intervention resources."
        ),
        "metadata": {"section": "monitoring", "stage": "milestones"}
    }
]
