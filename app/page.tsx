import {
  ArrowRight,
  Check,
  HeartHandshake,
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

function RedThread({ className = "", id }: { className?: string; id: string }) {
  const path =
    "M-42 552 C118 610 176 500 292 548 C370 580 335 652 418 646 C503 640 494 542 416 538 C344 534 336 622 422 642 C560 674 614 534 750 574 C854 605 820 668 928 651 C1040 634 1074 526 1204 558 C1320 586 1372 526 1490 518";

  return (
    <svg
      aria-hidden="true"
      className={`red-thread ${className}`}
      preserveAspectRatio="none"
      viewBox="0 0 1440 690"
    >
      <defs>
        <filter id={`${id}-roughness`} x="-10%" y="-20%" width="120%" height="140%">
          <feTurbulence baseFrequency="0.012 0.11" numOctaves="2" result="noise" seed="7" type="fractalNoise" />
          <feDisplacementMap in="SourceGraphic" in2="noise" scale="2.1" xChannelSelector="R" yChannelSelector="G" />
        </filter>
        <linearGradient id={`${id}-red`} x1="0" x2="1">
          <stop offset="0" stopColor="#c92f27" />
          <stop offset="0.48" stopColor="#ee4c3e" />
          <stop offset="1" stopColor="#ba251f" />
        </linearGradient>
      </defs>
      <g filter={`url(#${id}-roughness)`}>
        <path className="thread-shadow" d={path} />
        <path className="thread-body" d={path} stroke={`url(#${id}-red)`} />
        <path className="thread-fiber thread-fiber-dark" d={path} />
        <path className="thread-fiber thread-fiber-light" d={path} />
        <path className="thread-fiber thread-fiber-cross" d={path} />
      </g>
      <g className="thread-fray">
        <path d="M4 565 L-30 585" />
        <path d="M7 559 L-34 561" />
        <path d="M10 554 L-27 539" />
        <path d="M13 550 L-18 522" />
      </g>
    </svg>
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
        <RedThread className="hero-thread-art" id="hero-thread" />
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

        <div className="hero-product" aria-label="Ariadne student communication board preview">
          <div className="product-screenshot-frame">
            <Image
              alt="Ariadne student communication board showing Maya's personalized ARASAAC pictograms and classroom vocabulary"
              className="product-screenshot"
              height={1792}
              priority
              sizes="(max-width: 1050px) calc(100vw - 40px), 56vw"
              src="/ariadne-student-communication-board.png"
              width={3420}
            />
          </div>
          <div className="floating-proof proof-one"><ShieldCheck size={17} /> FERPA-minded privacy</div>
          <div className="floating-proof proof-two"><Sparkles size={17} /> Personalized learner view</div>
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
        <RedThread className="cta-thread-art" id="cta-thread" />
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
