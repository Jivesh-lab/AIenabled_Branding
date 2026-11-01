"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import DbitLogo from "@/components/shared/DbitLogo";
import { Activity, ArrowDownRight, ArrowRight, ArrowUpRight, BarChart3, Bot, Building2, FileCheck, Lightbulb, Menu, Search, Send, TrendingUp, Users, Workflow, X } from "lucide-react";

const agents = [
  ["AI Incubation Assistant", "Answers student questions, provides incubation guidance and retrieves information using RAG.", Bot, "blue"],
  ["Application Agent", "Validates startup applications, generates summaries, evaluates completeness and prepares assessments.", FileCheck, "purple"],
  ["Mentor-Matching Agent", "Recommends suitable faculty and industry mentors based on startup requirements and expertise.", Users, "indigo"],
  ["Workflow Agent", "Coordinates tasks, meeting requests, deadlines, reminders and progress-report requests.", Workflow, "sky"],
  ["Monitoring Agent", "Tracks startup milestones, overdue activities, progress velocity and potential risks.", Activity, "violet"],
  ["Investor Matchmaking", "Evaluates investor preferences and ranks approved startups using sector, stage, thesis and readiness.", TrendingUp, "rose"],
] as const;
const demoProjects = [["Make-a-thon", "A hands-on platform for turning problems into prototypes", "Ideation + building", "Researcher teams in action", "https://images.unsplash.com/photo-1517048676732-d65bc937f952?auto=format&fit=crop&w=1200&q=85"], ["Startup Forum", "Conversations that connect researchers with the startup ecosystem", "Mentors + investors", "Ideas meet experience", "https://images.unsplash.com/photo-1556761175-b413da4baf72?auto=format&fit=crop&w=1200&q=85"], ["Brand Challenge", "A practical challenge in positioning, storytelling, and business", "Brand + strategy", "Skills built through practice", "https://images.unsplash.com/photo-1552664730-d307ca884978?auto=format&fit=crop&w=1200&q=85"]] as const;
const pathways = [["RESEARCH / PROJECT OWNERS", "Start with a question, a prototype, or a research insight and move it toward a useful venture.", "Research to venture", Lightbulb, "research-product-owners", "https://images.unsplash.com/photo-1531482615713-2afd69097998?auto=format&fit=crop&w=900&q=85"], ["FACULTY COORDINATORS", "Coordinate projects, programmes, reviews, and the people helping ideas progress.", "Coordinate a programme", Building2, "faculty-coordinators", "https://images.unsplash.com/photo-1523240795612-9a054b0db644?auto=format&fit=crop&w=900&q=85"], ["INVESTORS", "Discover researched opportunities and support the next generation of ventures.", "Explore opportunities", BarChart3, "investors", "https://images.unsplash.com/photo-1551836022-d5d88e9218df?auto=format&fit=crop&w=900&q=85"], ["MENTORS", "Share hard-earned perspective at the moment a researcher team needs it most.", "Become a mentor", Send, "industry-guides", "https://images.unsplash.com/photo-1521737711867-e3b97375f902?auto=format&fit=crop&w=900&q=85"]] as const;
const images = { hero: "https://images.unsplash.com/photo-1564981797816-1043664bf78d?auto=format&fit=crop&w=2200&q=85", lab: "https://images.unsplash.com/photo-1523240795612-9a054b0db644?auto=format&fit=crop&w=1800&q=85", office: "https://images.unsplash.com/photo-1497366754035-f200968a6e72?auto=format&fit=crop&w=1800&q=85", campus: "https://images.unsplash.com/photo-1498243691581-b145c3f54a5a?auto=format&fit=crop&w=1800&q=85" };
const eventImages = [images.campus, images.lab, images.office, images.hero, "/incubation-building.jpg"];
const fundingJourney = [["PROJECT", Lightbulb], ["INCUBATION", Building2], ["VALIDATION", Search], ["INVESTOR CONNECT", Users], ["FUNDING", BarChart3], ["GROWTH", ArrowUpRight]] as const;
const eventTypes = ["HACKATHONS", "WORKSHOPS", "MENTORSHIP", "COMPETITIONS", "TALKS", "DEMO DAYS", "INVESTOR MEETS"] as const;
const mentorFilters = ["ALL", "TECHNOLOGY", "BUSINESS", "MARKETING", "FINANCE", "LEGAL", "PRODUCT", "FUNDING"] as const;

export default function RootPage() {
  const [menuOpen, setMenuOpen] = useState(false);
  const [activeProject, setActiveProject] = useState(0);
  const [activePathway, setActivePathway] = useState(0);
  const [scrolled, setScrolled] = useState(false);
  const [activeAgent, setActiveAgent] = useState<string | null>(null);
  const [carouselStart, setCarouselStart] = useState<number | null>(null);
  const [dividerPosition, setDividerPosition] = useState(50);
  const [mentorFilter, setMentorFilter] = useState<(typeof mentorFilters)[number]>("ALL");

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 16);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const handleCarouselPointerDown = (event: React.PointerEvent<HTMLDivElement>) => setCarouselStart(event.clientX);
  const handleCarouselPointerUp = (event: React.PointerEvent<HTMLDivElement>) => {
    if (carouselStart === null) return;
    const distance = event.clientX - carouselStart;
    if (Math.abs(distance) > 35) setActivePathway((current) => Math.max(0, Math.min(pathways.length - 1, current + (distance < 0 ? 1 : -1))));
    setCarouselStart(null);
  };

  const updateDivider = (event: React.PointerEvent<HTMLDivElement>) => {
    const bounds = event.currentTarget.getBoundingClientRect();
    setDividerPosition(Math.min(94, Math.max(6, ((event.clientX - bounds.left) / bounds.width) * 100)));
  };

  return (
    <main className="landing-page">
      <section className="landing-hero" style={{ backgroundImage: `url(${images.hero})` }}>
        <div className="hero-shade" />
        <header className={scrolled ? "landing-nav is-scrolled" : "landing-nav"}>
          <DbitLogo variant="full" size="md" theme="dark" href="/" className="landing-logo" />
          <nav className={menuOpen ? "landing-links is-open" : "landing-links"}>
            <a href="#ecosystem" onClick={() => setMenuOpen(false)}>Ecosystem</a>
            <a href="#agents" onClick={() => setMenuOpen(false)}>AI Agents</a>
            <a href="#incubators" onClick={() => setMenuOpen(false)}>Incubation</a>
            <a href="#impact" onClick={() => setMenuOpen(false)}>Impact</a>
            <a href="#events" onClick={() => setMenuOpen(false)}>Events</a>
            <a href="#mentors" onClick={() => setMenuOpen(false)}>Mentors</a>
          </nav>
          <div className="nav-actions">
            <Link className="login-link" href="/login">Login</Link>
            <Link className="pill-button light-pill" href="/login">GET STARTED <ArrowRight size={15} /></Link>
          </div>
          <button className="menu-button" aria-label="Toggle navigation" onClick={() => setMenuOpen(!menuOpen)}>
            {menuOpen ? <X size={22} /> : <Menu size={22} />}
          </button>
        </header>
        <div className="hero-copy">
          <p className="eyebrow">AI-POWERED INNOVATION ECOSYSTEM</p>
          <h1>BUILD YOUR<br /><span>NEXT BIG IDEA</span><br />INTO A REAL<br /><span className="venture-line">VENTURE.</span></h1>
          <p className="hero-description">Connect research, branding, mentors, funding and startup support in one place so researcher ideas move from concept to traction faster.</p>
          <div className="hero-buttons">
            <Link className="pill-button light-pill" href="/login">START BUILDING <ArrowRight size={15} /></Link>
            <Link className="video-button" href="#ecosystem">
              <span className="play-icon"><ArrowRight size={12} /></span> EXPLORE ECOSYSTEM <ArrowDownRight size={16} />
            </Link>
          </div>
        </div>
        <div
          className="hero-3d-scene"
          aria-label="Incubation pipeline"
          onPointerMove={(event) => {
            const bounds = event.currentTarget.getBoundingClientRect();
            const x = (event.clientX - bounds.left) / bounds.width - 0.5;
            const y = (event.clientY - bounds.top) / bounds.height - 0.5;
            event.currentTarget.style.setProperty("--scene-x", `${x * 10}deg`);
            event.currentTarget.style.setProperty("--scene-y", `${y * -8}deg`);
          }}
          onPointerLeave={(event) => {
            event.currentTarget.style.setProperty("--scene-x", "0deg");
            event.currentTarget.style.setProperty("--scene-y", "0deg");
          }}
        >
          <div className="hero-pipeline-line" />
          <i className="hero-pipeline-particle particle-one" />
          <i className="hero-pipeline-particle particle-two" />
          <div className="hero-3d-plane plane-back"><span>03</span><strong>FUND</strong><small>Investor runway</small></div>
          <div className="hero-3d-plane plane-mid"><span>02</span><strong>VALIDATE</strong><small>Proof &amp; traction</small></div>
          <div className="hero-3d-plane plane-front"><span>01</span><strong>IDEA</strong><small>From classroom to market</small></div>
        </div>
        <div className="hero-campus-tag"><span>FROM CLASSROOM</span><span>TO MARKET</span></div>
        <div className="hero-bottom">
          <div className="hero-stats">
            <div><strong>2017</strong><span>E-CELL FOUNDED</span></div>
            <div><strong>16+</strong><span>EVENTS</span></div>
            <div><strong>8</strong><span>AREAS</span></div>
            <div><strong>1</strong><span>RESEARCHER ECOSYSTEM</span></div>
          </div>
        </div>
      </section>

      <section className="ecosystem-section" id="ecosystem">
        <div className="ecosystem-heading">
          <div>
            <div className="section-kicker">INNOVATION ECOSYSTEM</div>
            <h2>ONE ECOSYSTEM.<br /><em>DIFFERENT STARTING POINTS.</em></h2>
          </div>
          <p>Whether you&apos;re a researcher, faculty member, mentor, investor or industry partner, DBIT Incubation Centre gives you the right tools, people and opportunities.</p>
        </div>
        <div
          className="pathways-carousel"
          onPointerDown={handleCarouselPointerDown}
          onPointerUp={handleCarouselPointerUp}
          onPointerCancel={() => setCarouselStart(null)}
        >
          {pathways.map(([category, description, action, Icon, role, image], cardIndex) => (
            <article className={activePathway === cardIndex ? "pathway-card active" : "pathway-card"} key={category} onMouseEnter={() => setActivePathway(cardIndex)}>
              <div className="pathway-image" style={{ backgroundImage: `linear-gradient(180deg, transparent 20%, rgba(4,18,45,.9) 100%), url(${image})` }}>
                <span>0{cardIndex + 1}</span>
                <Icon size={20} />
              </div>
              <div className="pathway-card-copy">
                <span className="pathway-category">{category}</span>
                <h3>{category.split(" /")[0]}</h3>
                <p>{description}</p>
                <Link className="pathway-arrow" href={`/ecosystem/${role}`} aria-label={action}>
                  <ArrowUpRight size={18} />
                </Link>
              </div>
            </article>
          ))}
        </div>
      </section>

      <section className="problem-section section-light">
        <div className="problem-lead">
          <div className="section-kicker">ABOUT E-CELL</div>
          <h2>Ideas are<br /><em>bulletproof.</em><br />Build them.</h2>
        </div>
        <div className="problem-copy">
          <p>DBIT’s E-Cell creates a platform for aspiring entrepreneurs to discuss ideas, produce business plans, and connect with mentors, incubators, and investors.</p>
          <div className="problem-list">
            <span><b>01</b> Talks and workshops</span>
            <span><b>02</b> Competitions and challenges</span>
            <span><b>03</b> Finance and management</span>
            <span><b>04</b> Social entrepreneurship</span>
          </div>
        </div>
      </section>

      <section id="agents" className="agents-section section-light">
        <div className="agents-intro">
          <div className="section-kicker">AGENTIC AI ARCHITECTURE</div>
          <h2>DON&apos;T JUST ASK AI.<br />LET AGENTS <em>COORDINATE.</em></h2>
          <p>Six specialized AI agents orchestrated by a central LangGraph Supervisor work together to guide, validate, match, and scale researcher startups.</p>
        </div>
        <div className="agent-orbit">
          <div className={activeAgent ? "agent-core is-active" : "agent-core"}>
            <small style={{ fontSize: "9px", letterSpacing: "0.14em", color: "#a5e2ff", display: "block", marginBottom: "2px" }}>AI CORE</small>
            LANGGRAPH<br /><span>ORCHESTRATOR</span>
          </div>
          <div className="agent-lines" />
          {agents.map(([name, description, Icon, color]) => (
            <article
              className={activeAgent === name ? "agent-card active" : "agent-card"}
              key={name}
              onMouseEnter={() => setActiveAgent(name)}
              onMouseLeave={() => setActiveAgent(null)}
            >
              <span className={`agent-icon ${color}`}><Icon size={20} /></span>
              <div>
                <strong>{name.toUpperCase()}</strong>
                <p>{description}</p>
                <small>Explore capability <ArrowUpRight size={12} /></small>
              </div>
            </article>
          ))}
        </div>
      </section>

      <section className="funding-section dark-section" id="funding">
        <div className="funding-heading">
          <div>
            <div className="section-kicker">FUNDING & OPPORTUNITY</div>
            <h2>TURNING INNOVATION<br /><em>INTO OPPORTUNITIES.</em></h2>
          </div>
        </div>
        <div className="funding-track">
          {fundingJourney.map(([label, Icon], index) => (
            <div className="funding-stage" key={label}>
              <div className="funding-icon"><Icon size={19} /></div>
              <span>0{index + 1}</span>
              <strong>{label}</strong>
              {index < fundingJourney.length - 1 && <ArrowRight className="funding-arrow" size={20} />}
            </div>
          ))}
        </div>
      </section>

      <section id="incubators" className="split-section incubator-section dark-section" style={{ backgroundImage: `url(${images.lab})` }}>
        <div className="dark-overlay" />
        <div className="split-copy">
          <div className="section-kicker">FOR INCUBATION CENTRES</div>
          <h2>One Place to Run<br />Your Incubator.</h2>
          <p>Manage projects, track progress, connect with mentors, and scale innovation — all in one platform.</p>
          <Link className="pill-button light-pill" href="/login">View Dashboard <ArrowRight size={15} /></Link>
        </div>
      </section>

      <section id="impact" className="impact-section section-light">
        <div className="impact-copy">
          <div className="section-kicker">EVENTS & INITIATIVES</div>
          <h2>Learn by<br />doing <em>together.</em></h2>
          <p>From Make-a-thons and Startup Forums to finance, branding, and problem-solving workshops, DBIT’s E-Cell bridges engineering with entrepreneurship.</p>
          <div className="impact-stats">
            {[["2017", "E-Cell formed"], ["16+", "Event reports"], ["8", "Core initiatives"], ["3", "Growth pathways"], ["1", "Researcher community"]].map(([value, label]) => (
              <div key={label}>
                <strong>{value}</strong>
                <span>{label}</span>
              </div>
            ))}
          </div>
        </div>
        <div className="impact-image" style={{ backgroundImage: `url(${images.campus})` }}>
          <span>Talks<br />Workshops<br />Competitions<br />Mentorship<br />Impact</span>
        </div>
      </section>

      <section className="demo-section section-light">
        <div className="demo-heading">
          <div>
            <div className="section-kicker">EVENTS & REPORTS</div>
            <h2>Learn by<br />building <em>together.</em></h2>
          </div>
        </div>
        <div className="demo-stage">
          <div className="demo-orbit orbit-one" />
          <div className="demo-orbit orbit-two" />
          <div className="demo-card" style={{ backgroundImage: `linear-gradient(180deg, transparent 30%, rgba(3,7,6,.92) 100%), url(${demoProjects[activeProject][4]})` }}>
            <span className="demo-badge">DBIT E-CELL</span>
            <div className="demo-card-copy">
              <span>INITIATIVE 0{activeProject + 1}</span>
              <h3>{demoProjects[activeProject][0]}</h3>
              <p>{demoProjects[activeProject][1]}</p>
            </div>
          </div>
          <div className="demo-result">
            <span className="section-kicker">PATHWAY</span>
            <strong>{demoProjects[activeProject][2]}</strong>
            <p>{demoProjects[activeProject][3]}</p>
            <span className="result-line" />
          </div>
        </div>
        <div className="demo-controls">
          {demoProjects.map(([name], index) => (
            <button className={activeProject === index ? "demo-tab active" : "demo-tab"} key={name} onClick={() => setActiveProject(index)}>
              <span>0{index + 1}</span>{name}
            </button>
          ))}
        </div>
      </section>

      <section className="compare-section dark-section" id="from-classroom">
        <div className="compare-heading">
          <div>
            <div className="section-kicker">PROJECT TO STARTUP</div>
            <h2>FROM CLASSROOM<br /><em>TO MARKET.</em></h2>
          </div>
        </div>
        <div
          className="compare-slider"
          onPointerDown={(event) => {
            event.currentTarget.setPointerCapture(event.pointerId);
            updateDivider(event);
          }}
          onPointerMove={(event) => {
            if (event.currentTarget.hasPointerCapture(event.pointerId)) updateDivider(event);
          }}
          onPointerCancel={(event) => {
            event.currentTarget.releasePointerCapture(event.pointerId);
            setDividerPosition(50);
          }}
          onPointerLeave={() => setDividerPosition(50)}
          style={{ "--divider": `${dividerPosition}%` } as React.CSSProperties}
        >
          <div className="compare-pane compare-startup">
            <span className="compare-label">STARTUP READY</span>
            <h3>VERIFIED DATA<br />PENDING</h3>
            <div>
              <span>Startup Name</span>
              <span>Market Analysis</span>
              <span>Business Model</span>
              <span>Pitch Deck</span>
              <span>Mentor Recommendation</span>
            </div>
          </div>
          <div className="compare-pane compare-project">
            <span className="compare-label">RESEARCHER PROJECT</span>
            <h3>PROJECT INPUTS<br />PENDING</h3>
            <div>
              <span>Report</span>
              <span>Prototype</span>
              <span>Notes</span>
              <span>GitHub</span>
              <span>Screenshots</span>
            </div>
          </div>
          <div className="compare-divider">
            <span><ArrowRight size={14} /><ArrowRight size={14} /></span>
          </div>
        </div>
      </section>

      <section className="events-section dark-section" id="events">
        <div className="events-heading">
          <div>
            <div className="section-kicker">EVENTS & INITIATIVES</div>
            <h2>LEARN BY<br /><em>DOING TOGETHER.</em></h2>
          </div>
        </div>
        <div className="events-carousel">
          {eventTypes.map((eventType, index) => (
            <article className="event-card" key={eventType}>
              <div
                className="event-image"
                style={{
                  backgroundImage: `linear-gradient(180deg, rgba(8, 127, 229, .18), rgba(3, 12, 24, .92)), url("${eventImages[index % eventImages.length]}")`,
                  backgroundPosition: `${18 + index * 14}% center`,
                }}
              >
                <span>DEMO EVENT</span>
                <strong>0{index + 1}</strong>
              </div>
              <div className="event-card-copy">
                <span>DATE PENDING · {eventType}</span>
                <h3>{eventType}</h3>
                <p>Official description and event photography will be added after verification.</p>
                <ArrowUpRight size={18} />
              </div>
            </article>
          ))}
        </div>
      </section>

      <section className="mentors-section section-light" id="mentors">
        <div className="mentors-heading">
          <div>
            <div className="section-kicker">MENTOR NETWORK</div>
            <h2>THE RIGHT PEOPLE<br /><em>CAN CHANGE THE TRAJECTORY.</em></h2>
          </div>
        </div>
        <div className="mentor-filters">
          {mentorFilters.map((filter) => (
            <button className={mentorFilter === filter ? "active" : ""} key={filter} type="button" onClick={() => setMentorFilter(filter)}>
              {filter}
            </button>
          ))}
        </div>
        <div className="mentor-cards">
          {["MENTOR PROFILE 01", "MENTOR PROFILE 02", "MENTOR PROFILE 03", "MENTOR PROFILE 04"].map((profile) => (
            <article className="mentor-card" key={profile}>
              <div className="mentor-photo">
                <Users size={30} />
                <span>PHOTO<br />PENDING</span>
              </div>
              <span className="mentor-filter-label">{mentorFilter === "ALL" ? "EXPERTISE PENDING" : mentorFilter}</span>
              <h3>NAME PENDING</h3>
              <p>Designation pending · Industry pending</p>
              <small>Mentoring area pending</small>
            </article>
          ))}
        </div>
      </section>

      <footer className="landing-footer final-footer">
        <div className="footer-brand">
          <DbitLogo variant="full" size="md" theme="light" href="/" className="footer-logo mb-2" />
          <p>AI-powered academic innovation &amp; incubation ecosystem at Don Bosco Institute of Technology.</p>
        </div>
        <div className="footer-column">
          <strong>PLATFORM</strong>
          <a href="#agents">AI Agents</a>
          <a href="#funding">Incubation &amp; Funding</a>
          <a href="#ecosystem">Pathways</a>
        </div>
        <div className="footer-column">
          <strong>COMMUNITY</strong>
          <a href="#mentors">Mentor Network</a>
          <a href="#events">Events &amp; Initiatives</a>
          <a href="#impact">E-Cell Impact</a>
        </div>
        <div className="footer-column">
          <strong>ACCESS</strong>
          <Link href="/login">Sign In / Dashboard</Link>
          <a href="mailto:hello@dbit-incubation.example">Contact Team</a>
        </div>
        <div className="footer-legal">
          <span>&copy; {new Date().getFullYear()} DBIT Incubation Centre. All rights reserved.</span>
          <span>Privacy Policy</span>
          <span>Terms of Use</span>
          <span className="footer-socials">
            <a href="mailto:hello@dbit-incubation.example" aria-label="LinkedIn">in</a>
            <a href="mailto:hello@dbit-incubation.example" aria-label="Instagram">&empty;</a>
            <a href="mailto:hello@dbit-incubation.example" aria-label="YouTube">&#9654;</a>
          </span>
        </div>
      </footer>
    </main>
  );
}
