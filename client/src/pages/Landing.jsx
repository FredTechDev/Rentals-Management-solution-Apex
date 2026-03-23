import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  ArrowRight,
  BellRing,
  Building,
  CreditCard,
  MessageSquare,
  Shield,
  Sparkles,
  Wrench
} from 'lucide-react';
import AnimatedSection from '../components/AnimatedSection';
import FloatingHint from '../components/FloatingHint';
import '../styles/Landing.css';

const rotatingTaglines = [
  'Collect rent without chaos.',
  'Delight tenants with faster response.',
  'Run every unit from one polished workspace.'
];

const heroStats = [
  { label: 'M-Pesa Ready', value: '24/7', icon: <CreditCard size={18} /> },
  { label: 'Maintenance Workflow', value: 'Live', icon: <Wrench size={18} /> },
  { label: 'Tenant Messaging', value: 'Instant', icon: <MessageSquare size={18} /> }
];

const features = [
  {
    icon: <CreditCard size={28} />,
    title: 'Payments That Move Fast',
    text: 'Handle rent, confirmations, receipts, and reminders from one Kenya-ready flow.'
  },
  {
    icon: <Wrench size={28} />,
    title: 'Maintenance Without Guesswork',
    text: 'Turn tenant issues into trackable tickets with status, assignment, and progress visibility.'
  },
  {
    icon: <BellRing size={28} />,
    title: 'Notifications That Actually Help',
    text: 'Due reminders, payment updates, lease alerts, and management notices stay visible and timely.'
  },
  {
    icon: <Building size={28} />,
    title: 'Portfolio Control',
    text: 'Track properties, units, leases, approvals, and occupancy from one clean command surface.'
  },
  {
    icon: <MessageSquare size={28} />,
    title: 'Community Communication',
    text: 'Keep tenants, caretakers, and managers aligned through one secure communication lane.'
  },
  {
    icon: <Shield size={28} />,
    title: 'Secure By Default',
    text: 'Protected endpoints, role-aware dashboards, and cleaner session handling keep data scoped.'
  }
];

const workflow = [
  'Landlord or manager signs up and adds properties.',
  'Tenants apply for open units and get reviewed cleanly.',
  'Rent, maintenance, lease documents, and notices stay in one responsive workspace.'
];

const Landing = () => {
  const [activeTagline, setActiveTagline] = useState(0);

  useEffect(() => {
    const interval = window.setInterval(() => {
      setActiveTagline((currentIndex) => (currentIndex + 1) % rotatingTaglines.length);
    }, 2800);

    return () => window.clearInterval(interval);
  }, []);

  return (
    <div className="landing-page">
      <AnimatedSection as="section" className="hero-section" delay={40}>
        <div className="hero-content">
          <div className="agency-name">Apex Agencies</div>
          <div className="badge glass-card">Kenya-ready rental operations</div>
          <h1>
            Collect rent. Calm tenants.
            <span> Run every unit beautifully.</span>
          </h1>
          <p className="hero-lead">
            From M-Pesa collection to lease tracking and maintenance follow-up, Apex keeps your rental business
            responsive, visible, and easier to trust.
          </p>
          <div className="hero-tagline-strip animate-pop" key={rotatingTaglines[activeTagline]}>
            <Sparkles size={18} />
            <strong>{rotatingTaglines[activeTagline]}</strong>
          </div>
          <div className="hero-buttons">
            <FloatingHint content="Start as a tenant, landlord, or property manager with the updated onboarding flow.">
              <Link to="/register" className="btn-primary">
                Create Account <ArrowRight size={18} />
              </Link>
            </FloatingHint>
            <FloatingHint content="Return to your live dashboard, notifications, charts, and management tools.">
              <Link to="/login" className="btn-secondary">Login to Dashboard</Link>
            </FloatingHint>
          </div>
          <div className="hero-copy-footer">
            <span>Built for landlords, tenants, caretakers, and SaaS operators.</span>
            <span>Responsive on desktop, tablet, and mobile.</span>
          </div>
        </div>

        <div className="hero-visual">
          <div className="hero-image-shell glass-card">
            <img
              src="https://images.unsplash.com/photo-1613490493576-7fde63acd811?q=80&w=2071&auto=format&fit=crop"
              alt="Luxury modern residence"
              className="hero-img"
            />
            <div className="hero-orbit hero-orbit-one glass-card">
              <span>Occupancy</span>
              <strong>94%</strong>
            </div>
            <div className="hero-orbit hero-orbit-two glass-card">
              <span>Receipts</span>
              <strong>Instant</strong>
            </div>
          </div>
          <div className="hero-stats-grid">
            {heroStats.map((stat, index) => (
              <AnimatedSection as="div" key={stat.label} className="stat-blob glass-card" delay={120 + index * 80}>
                <div className="feature-icon">{stat.icon}</div>
                <div>
                  <strong>{stat.value}</strong>
                  <span>{stat.label}</span>
                </div>
              </AnimatedSection>
            ))}
          </div>
        </div>
      </AnimatedSection>

      <AnimatedSection as="section" className="landing-trust-strip" delay={100}>
        <div className="trust-chip glass-card">Lease uploads with protected access</div>
        <div className="trust-chip glass-card">SweetAlert feedback flows</div>
        <div className="trust-chip glass-card">Live analytics via Chart.js</div>
        <div className="trust-chip glass-card">Floating UI tooltips and actions</div>
      </AnimatedSection>

      <AnimatedSection as="section" className="features-grid" delay={140}>
        {features.map((feature) => (
          <FloatingHint key={feature.title} content={feature.text}>
            <div className="feature-card glass-card">
              <div className="feature-icon">{feature.icon}</div>
              <h3>{feature.title}</h3>
              <p>{feature.text}</p>
            </div>
          </FloatingHint>
        ))}
      </AnimatedSection>

      <AnimatedSection as="section" className="workflow-section glass-card" delay={180}>
        <div className="section-header">
          <h2>One Flow, End To End</h2>
          <span className="badge">Clean onboarding to reporting</span>
        </div>
        <div className="workflow-grid">
          {workflow.map((step, index) => (
            <div key={step} className="workflow-step">
              <span className="workflow-index">0{index + 1}</span>
              <p>{step}</p>
            </div>
          ))}
        </div>
      </AnimatedSection>

      <footer className="landing-footer">
        <p>&copy; 2026 Apex Agencies. Built for calmer rent operations.</p>
      </footer>
    </div>
  );
};

export default Landing;
