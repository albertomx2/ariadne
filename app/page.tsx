import {
  ArrowRight,
  BarChart3,
  CalendarCheck2,
  Check,
  HeartHandshake,
  LayoutGrid,
  MessageSquareText,
  ShieldCheck,
  Sparkles,
  UsersRound,
} from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import "./landing.css";

const stats = [
  ["92%", "activities ready before class"],
  ["3.4×", "faster support preparation"],
  ["87%", "learner choices honored"],
  ["1", "shared source of truth"],
] as const;

const features = [
  {
    icon: UsersRound,
    eyebrow: "Know the learner",
    title: "Functional profiles that stay useful",
    copy: "Capture communication, access, sensory context, interests, and supports through a guided AAC-informed conversation or an editable form.",
    color: "coral",
  },
  {
    icon: Sparkles,
    eyebrow: "Plan with confidence",
    title: "Activity supports in minutes",
    copy: "Turn an everyday lesson into an educator-reviewed package with visual steps, contextual vocabulary, and profile-aware supports.",
    color: "indigo",
  },
  {
    icon: MessageSquareText,
    eyebrow: "Protect every voice",
    title: "A communication space that adapts",
    copy: "Each learner sees their preferred photos, symbols, text, grid, voice output, vocabulary, and time-aware classroom activity.",
    color: "teal",
  },
] as const;

const quotes = [
  {
    quote:
      "Ariadne makes the support plan feel like part of teaching, not another document sitting somewhere else.",
    name: "Jordan R.",
    role: "Elementary educator · illustrative demo",
  },
  {
    quote:
      "The learner view keeps communication available while the schedule, activity, and visuals stay connected.",
    name: "Morgan L.",
    role: "School SLP · illustrative demo",
  },
] as const;

function AriadneWordmark() {
  return (
    <Link className="landing-brand" href="/" aria-label="Ariadne home">
      <Image
        alt=""
        className="landing-brand-mark"
        height={54}
        priority
        src="/logo-ariadne.png"
        width={54}
      />
      <span>Ariadne</span>
    </Link>
  );
}

export default function Home() {
  return (
    <main className="landing-page">
      <header className="landing-nav">
        <AriadneWordmark />
        <nav aria-label="Marketing navigation">
          <a href="#how-it-works">How it works</a>
          <a href="#platform">Platform</a>
          <a href="#impact">Impact</a>
          <a href="#stories">Stories</a>
        </nav>
        <div className="landing-nav-actions">
          <Link className="landing-login" href="/sign-in">
            Log in
          </Link>
          <Link className="landing-button landing-button-primary" href="/sign-in">
            Access the app <ArrowRight size={17} />
          </Link>
        </div>
      </header>

      <section className="landing-hero" id="top">
        <div className="hero-thread hero-thread-left" aria-hidden="true" />
        <div className="hero-thread hero-thread-right" aria-hidden="true" />
        <div className="hero-copy">
          <p className="landing-kicker">
            <span /> Inclusive classroom participation
          </p>
          <h1>
            A clear path to <em>every learner&apos;s voice.</em>
          </h1>
          <p className="hero-lede">
            Ariadne connects learner profiles, AAC communication, visual
            schedules, and activity supports in one calm, educator-reviewed
            workspace.
          </p>
          <div className="hero-actions">
            <Link className="landing-button landing-button-primary large" href="/sign-in">
              Access Ariadne <ArrowRight size={19} />
            </Link>
            <a className="landing-button landing-button-secondary large" href="#how-it-works">
              See how it works
            </a>
          </div>
          <div className="hero-trust">
            <span><ShieldCheck size={16} /> Educator reviewed</span>
            <span><HeartHandshake size={16} /> Learner autonomy</span>
            <span><Check size={16} /> AAC-informed</span>
          </div>
        </div>

        <div className="hero-product" aria-label="Ariadne product preview">
          <div className="product-window">
            <div className="product-window-bar">
              <span><i /><i /><i /></span>
              <b>Ariadne · Ms. Rivera&apos;s class</b>
              <small>Live sync</small>
            </div>
            <div className="product-layout">
              <aside>
                <div className="mini-logo">A</div>
                <span className="active"><LayoutGrid size={15} /> Today</span>
                <span><UsersRound size={15} /> Learners</span>
                <span><CalendarCheck2 size={15} /> Schedule</span>
                <span><BarChart3 size={15} /> Insights</span>
              </aside>
              <div className="product-main">
                <header>
                  <div><small>HAPPENING NOW</small><strong>Morning meeting</strong></div>
                  <span>3 learners</span>
                </header>
                <div className="product-grid">
                  <article className="product-profile-card">
                    <p>LEARNER PROFILE</p>
                    <div className="profile-person"><i>M</i><span><strong>Maya</strong><small>Photos + text · 3 × 3</small></span></div>
                    <ul>
                      <li><Check size={13} /> One step at a time</li>
                      <li><Check size={13} /> Extra response time</li>
                      <li><Check size={13} /> Quiet workspace</li>
                    </ul>
                  </article>
                  <article className="product-board-card">
                    <p>COMMUNICATION READY</p>
                    <div className="visual-choices">
                      <span><b>I</b><small>I</small></span>
                      <span><b>●</b><small>WANT</small></span>
                      <span><b>＋</b><small>MORE</small></span>
                      <span><b>✓</b><small>HELP</small></span>
                    </div>
                  </article>
                </div>
                <div className="product-activity-card">
                  <span><Sparkles size={18} /></span>
                  <div><small>NEXT ACTIVITY</small><strong>Shared reading circle</strong></div>
                  <b>Ready</b>
                </div>
              </div>
            </div>
          </div>
          <div className="floating-proof proof-one"><ShieldCheck size={17} /> FERPA-minded privacy</div>
          <div className="floating-proof proof-two"><Sparkles size={17} /> Profile-aware supports</div>
        </div>
      </section>

      <section className="logo-strip" aria-label="Built for school teams">
        <p>One connected workspace for</p>
        <span>EDUCATORS</span><i />
        <span>SLPs</span><i />
        <span>PARAPROFESSIONALS</span><i />
        <span>LEARNERS</span><i />
        <span>FAMILIES</span>
      </section>

      <section className="landing-section workflow-section" id="how-it-works">
        <div className="section-heading centered">
          <p className="landing-kicker"><span /> One continuous thread</p>
          <h2>Plan. Adapt. Participate.</h2>
          <p>Support follows the learner from educator planning to the moment communication is needed.</p>
        </div>
        <div className="workflow-grid">
          {[
            ["01", "Understand", "Build a living functional profile from real classroom observations."],
            ["02", "Prepare", "Create activity-specific vocabulary, steps, and supports with AI."],
            ["03", "Review", "Keep every recommendation editable and educator approved."],
            ["04", "Participate", "Synchronize the right communication and activity at the right time."],
          ].map(([number, title, copy]) => (
            <article key={number}>
              <span>{number}</span>
              <h3>{title}</h3>
              <p>{copy}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="landing-section platform-section" id="platform">
        <div className="section-heading">
          <p className="landing-kicker"><span /> One platform, personalized paths</p>
          <h2>Designed around the learner. Built for the whole team.</h2>
        </div>
        <div className="feature-grid">
          {features.map(({ icon: Icon, eyebrow, title, copy, color }) => (
            <article className={`feature-card ${color}`} key={title}>
              <span><Icon size={22} /></span>
              <p>{eyebrow}</p>
              <h3>{title}</h3>
              <div className="feature-line" />
              <p>{copy}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="impact-section" id="impact">
        <div className="impact-copy">
          <p className="landing-kicker light"><span /> A calmer operating system</p>
          <h2>Less fragmented support. More time for participation.</h2>
          <p>
            Profiles, visual systems, schedules, materials, and insights stay
            synchronized—so teams can prepare once and deliver consistently.
          </p>
          <small>Illustrative hackathon demo metrics, not clinical or commercial study results.</small>
        </div>
        <div className="stats-grid">
          {stats.map(([value, label]) => (
            <article key={label}><strong>{value}</strong><span>{label}</span></article>
          ))}
        </div>
      </section>

      <section className="landing-section stories-section" id="stories">
        <div className="section-heading centered">
          <p className="landing-kicker"><span /> Built for real classrooms</p>
          <h2>What connected support can feel like.</h2>
        </div>
        <div className="quote-grid">
          {quotes.map((item) => (
            <figure key={item.name}>
              <blockquote>“{item.quote}”</blockquote>
              <figcaption><b>{item.name}</b><span>{item.role}</span></figcaption>
            </figure>
          ))}
        </div>
      </section>

      <section className="final-cta">
        <div className="cta-thread" aria-hidden="true" />
        <div>
          <p className="landing-kicker light"><span /> Start with one learner</p>
          <h2>Make the path to participation clearer.</h2>
          <p>Open Ariadne and create your synchronized educator workspace.</p>
        </div>
        <Link className="landing-button landing-button-light large" href="/sign-in">
          Access the application <ArrowRight size={19} />
        </Link>
      </section>

      <footer className="landing-footer">
        <AriadneWordmark />
        <p>AAC-informed classroom access, with educator review at every step.</p>
        <Link href="/sign-in">Log in to Ariadne <ArrowRight size={15} /></Link>
      </footer>
    </main>
  );
}
