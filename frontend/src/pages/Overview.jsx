import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, Check, FileCheck2, FileCog, FileSearch2, Sparkles, ShieldCheck, Zap, Activity, Clock3 } from 'lucide-react';
import MetricCard from '../components/MetricCard';

const modules = [
  { to: '/jd-checker', icon: FileCheck2, n: '01', title: 'JD Checker', desc: 'Compare a resume against a job description and see what is covered, missing, or weak.' },
  { to: '/resume-screener', icon: FileSearch2, n: '02', title: 'Resume Screener', desc: 'Simulate company-and-role screening using skills, projects, experience, and role evidence.' },
  { to: '/resume-optimizer', icon: FileCog, n: '03', title: 'Resume Optimizer', desc: 'Turn screening signals into truthful, targeted edits across the resume.' },
  { to: '/ai-suggester', icon: Sparkles, n: '04', title: 'AI Suggester', desc: 'Discover companies and roles where the strongest evidence-backed fit exists.' },
];

export default function Overview() {
  return (
    <>
      <section className="hero section">
        <div className="eyebrow"><span className="live-dot" /> AI Resume Intelligence · Evidence first</div>
        <h1>Your resume.<br /><span>Made job-ready.</span></h1>
        <p className="hero-copy">One workspace to understand job fit, simulate screening, optimize your resume, and discover companies worth applying to.</p>
        <div className="hero-actions">
          <Link className="gradient-btn" to="/jd-checker">Analyze my resume <ArrowRight size={18} /></Link>
          <Link className="soft-btn" to="/resume-screener">Explore screening</Link>
        </div>
        <div className="hero-proof">
          <div><strong>4</strong><span>AI workflows</span></div>
          <div><strong>100+</strong><span>company profiles</span></div>
          <div><strong>500</strong><span>shortlisted signals</span></div>
          <div><strong>1</strong><span>shared candidate view</span></div>
        </div>
      </section>

      <section className="section dashboard-strip">
        <div className="dashboard-head">
          <div><div className="section-kicker">WORKSPACE SNAPSHOT</div><h2>Everything starts with <span>evidence.</span></h2></div>
          <span className="demo-badge"><Activity size={13} /> Demo workspace</span>
        </div>
        <div className="metric-grid">
          <MetricCard label="Resume readiness" value="84" hint="Current demo profile" tone="cyan" />
          <MetricCard label="JD checks" value="12" hint="Last 30 days" />
          <MetricCard label="Company matches" value="18" hint="Above 70% fit" />
          <MetricCard label="Priority gaps" value="3" hint="Worth addressing" />
        </div>
      </section>

      <section className="section pad-top">
        <div className="section-kicker">THE VEEBEE WORKFLOW</div>
        <div className="section-title-row"><h2>Four pages.<br /><span>One hiring signal.</span></h2><p>The four objectives share the same candidate, skill, project, and company intelligence layers so the experience feels continuous rather than fragmented.</p></div>
        <div className="module-grid">
          {modules.map(({ to, icon: Icon, n, title, desc }) => (
            <Link to={to} className="module-card" key={to}>
              <div className="module-top"><span className="module-number">{n}</span><span className="mini-arrow"><ArrowRight size={17} /></span></div>
              <div className="module-icon"><Icon size={22} /></div>
              <h3>{title}</h3>
              <p>{desc}</p>
              <span className="module-link">Open module <ArrowRight size={15} /></span>
            </Link>
          ))}
        </div>
      </section>

      <section className="section recent-section">
        <div className="section-kicker">RECENT ANALYSES</div>
        <div className="recent-list">
          <div className="recent-row"><div className="recent-icon cyan"><FileCheck2 size={17} /></div><div><strong>NVIDIA · Software Engineer</strong><span>JD Checker · Strong match</span></div><b>91</b><span className="recent-time"><Clock3 size={13} /> 2h</span></div>
          <div className="recent-row"><div className="recent-icon purple"><FileSearch2 size={17} /></div><div><strong>Microsoft · Software Engineer</strong><span>Resume Screener · Competitive</span></div><b>84</b><span className="recent-time"><Clock3 size={13} /> 1d</span></div>
          <div className="recent-row"><div className="recent-icon green"><Sparkles size={17} /></div><div><strong>Company discovery</strong><span>AI Suggester · 6 matches</span></div><b>6</b><span className="recent-time"><Clock3 size={13} /> 2d</span></div>
        </div>
      </section>

      <section className="section trust-section">
        <div className="trust-banner"><div><div className="section-kicker">BUILT TO BE USEFUL, NOT FLASHY</div><h2>Explain the score.<br /><span>Show the next move.</span></h2></div><div className="trust-points"><div><ShieldCheck size={18} /><span>Evidence-backed signals</span></div><div><Zap size={18} /><span>API-ready architecture</span></div><div><Check size={18} /><span>Actionable recommendations</span></div></div></div>
      </section>

      <footer className="footer home-footer"><div><div className="brand footer-brand"><span className="brand-mark small">V</span><span className="brand-name"><b>Vee</b>Bee</span></div><p>Designed for candidates who want more than a generic ATS score.</p></div><div className="footer-meta"><span>JD Checker</span><span>Resume Screener</span><span>Optimizer</span><span>AI Suggester</span></div></footer>
    </>
  );
}
