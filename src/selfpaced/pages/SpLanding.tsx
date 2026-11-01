import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { SpCourseCard, SpCourseCardData } from '@/selfpaced/components/SpCourseCard';
import {
  ArrowRight,
  ShoppingBag,
  Award,
  Users,
  BadgeCheck,
  Building2,
  ShieldCheck,
  CalendarDays,
  Sparkles,
  BookOpen,
  PlayCircle,
} from 'lucide-react';

// ─── Brand token overrides ────────────────────────────────────────────────────
// Prepnow brand:
//   Primary   → deep navy  #10233d  (institutional / credential tone)
//   Accent    → warm orange #f97316  (CTA / energy)
//   Design language: this is a *certifying body*, not a generic course shop —
//   every recurring shape (dashed ring, mono "cert code" tags, circular badges)
//   borrows from the vocabulary of an official certificate / seal, since that's
//   the thing Prepnow is actually selling trust on (NASSCOM recognition).
// ─────────────────────────────────────────────────────────────────────────────

const NAVY = '#10233d';
const ORANGE = '#f97316';
const NAVY_LIGHT = 'rgba(16,35,61,0.06)';
const ORANGE_LIGHT = 'rgba(249,115,22,0.10)';

const PARTNERSHIP_DETAILS = [
  { icon: Building2, label: 'Organization', value: 'PrepNOW Readiness Solutions' },
  { icon: BadgeCheck, label: 'Recognition Status', value: 'Recognised Skilling Partner' },
  { icon: Award, label: 'Certifying Authority', value: 'IT-ITeS SSC Nasscom' },
  { icon: CalendarDays, label: 'Validity Period', value: '24/11/2025 - 24/11/2026' },
];

const KNOWLEDGE_PARTNER_LOGOS = [
  { name: 'FutureSkills Prime', src: 'https://www.skillzrevo.com/logos/futureskills.webp' },
  { name: 'IT-ITeS SSC Nasscom', src: 'https://www.skillzrevo.com/logos/ites.webp' },
  { name: 'MeitY', src: 'https://www.skillzrevo.com/logos/meit.webp' },
  { name: 'Nasscom', src: 'https://www.skillzrevo.com/logos/nasscom.webp' },
  { name: 'NCVET', src: 'https://www.skillzrevo.com/logos/ncet.webp' },
  { name: 'NSDC', src: 'https://www.skillzrevo.com/logos/nsdc.webp' },
  { name: 'Skill India', src: 'https://www.skillzrevo.com/logos/skill-india.webp' },
];

// The four bodies that ring the hero seal — kept to the most recognisable
// government / apex marks so the badge reads clearly at small size.
const SEAL_ORBIT_LOGOS = [
  KNOWLEDGE_PARTNER_LOGOS[5], // NSDC
  KNOWLEDGE_PARTNER_LOGOS[3], // Nasscom
  KNOWLEDGE_PARTNER_LOGOS[2], // MeitY
  KNOWLEDGE_PARTNER_LOGOS[6], // Skill India
];

const WHY_CHOOSE_US = [
  { tag: 'EXPERT-LED', icon: BookOpen, title: 'Learn from people who\u2019ve shipped it', desc: 'Instructors bring real project work into every module, not slide-deck theory.' },
  { tag: 'HANDS-ON', icon: PlayCircle, title: 'Practice inside the course', desc: 'Video lessons are paired with graded projects and quizzes, so skill and proof build together.' },
  { tag: 'CERTIFIED', icon: Award, title: 'A certificate that carries weight', desc: 'Every completion is issued under our recognised NASSCOM skilling partnership.' },
  { tag: 'SUPPORTED', icon: Users, title: 'Never stuck alone', desc: 'Peers and instructors are reachable inside the course for the moments a video can\u2019t cover.' },
];

const validity = PARTNERSHIP_DETAILS.find((d) => d.label === 'Validity Period')?.value ?? '';

const SpLanding: React.FC = () => {
  const [featured, setFeatured] = useState<SpCourseCardData[]>([]);
  const [cats, setCats] = useState<any[]>([]);

  useEffect(() => {
    supabase.from('selfpaced_courses')
      .select('id,title,slug,short_description,thumbnail_url,level,duration_hours,price,original_price,currency,is_featured')
      .eq('is_published', true).order('is_featured', { ascending: false }).order('created_at', { ascending: false }).limit(8)
      .then(({ data }) => setFeatured((data as SpCourseCardData[]) ?? []));

    supabase.from('selfpaced_categories').select('*').eq('is_active', true).order('display_order').limit(8)
      .then(({ data }) => setCats(data ?? []));
  }, []);

  return (
    <>
      <style>{`
        /* Drop-in for now — for production, move this @import into index.html
           <head> instead so the fonts aren't re-requested per mount. */
        @import url('https://fonts.googleapis.com/css2?family=Poppins:wght@400;500;600;700;800&display=swap');

        .spl {
          --navy: ${NAVY};
          --navy-2: #1a3353;
          --navy-3: #1e3d63;
          --orange: ${ORANGE};
          --orange-deep: #c2410c;
          --paper: #f5f7fb;
          --ink: #10233d;
          --slate: #5c6c82;
          --line: #e1e7f0;
          --success: #16a34a;
          --f-display: 'Poppins', -apple-system, BlinkMacSystemFont, sans-serif;
          --f-body: 'Poppins', -apple-system, BlinkMacSystemFont, sans-serif;
          --f-mono: 'Poppins', -apple-system, BlinkMacSystemFont, sans-serif;
          font-family: var(--f-body);
          color: var(--ink);
        }
        .spl * { box-sizing: border-box; }
        .spl a:focus-visible, .spl button:focus-visible {
          outline: 2px solid var(--orange); outline-offset: 3px; border-radius: 4px;
        }

        .spl-mono-tag {
          font-family: var(--f-mono); font-size: .7rem; font-weight: 500;
          letter-spacing: .08em; text-transform: uppercase; color: var(--slate);
        }

        /* ── HERO ── */
        .spl-hero {
          padding: clamp(2rem,5vw,3.25rem) 1.25rem clamp(1.75rem,4vw,2.5rem);
          background: var(--paper);
          position: relative; overflow: hidden;
          border-bottom: 1px solid var(--line);
        }
        .spl-hero::before {
          content: '';
          position: absolute; inset: 0;
          background-image:
            linear-gradient(rgba(16,35,61,0.035) 1px, transparent 1px),
            linear-gradient(90deg, rgba(16,35,61,0.035) 1px, transparent 1px);
          background-size: 42px 42px;
          -webkit-mask-image: radial-gradient(ellipse 70% 65% at 50% 20%, #000 0%, transparent 75%);
          mask-image: radial-gradient(ellipse 70% 65% at 50% 20%, #000 0%, transparent 75%);
          pointer-events: none;
        }
        .spl-hero__grid {
          position: relative; max-width: 1180px; margin: 0 auto;
          display: grid; grid-template-columns: 1.15fr .85fr; gap: clamp(2rem,5vw,3rem);
          align-items: center;
        }
        @media (max-width: 860px) {
          .spl-hero__grid { grid-template-columns: 1fr; text-align: center; }
          .spl-hero__ctas { justify-content: center; }
          .spl-hero__stats { justify-content: center; }
          .spl-hero__seal { order: -1; }
        }

        .spl-eyebrow {
          display: inline-flex; align-items: center; gap: .4rem;
          font-family: var(--f-mono);
          font-size: .68rem; font-weight: 600; letter-spacing: .09em; text-transform: uppercase;
          border-radius: 100px; padding: .35rem .85rem .35rem .65rem; margin-bottom: 1.35rem;
          color: var(--navy); background: #fff;
          border: 1px solid var(--line);
        }
        .spl-eyebrow__dot { width: 6px; height: 6px; border-radius: 50%; background: var(--success); flex-shrink: 0; }
        .spl-eyebrow--orange { color: var(--orange-deep); background: var(--orange-light, ${ORANGE_LIGHT}); border-color: rgba(249,115,22,0.25); }
        .spl-eyebrow--navy { color: var(--navy); background: ${NAVY_LIGHT}; border-color: rgba(16,35,61,0.15); }

        .spl-hero h1 {
          font-family: var(--f-display);
          font-size: clamp(2rem,4.6vw,3.15rem);
          font-weight: 600; line-height: 1.08; letter-spacing: -.01em;
          margin: 0 0 1.1rem; color: var(--navy);
        }
        .spl-hero h1 em {
          font-style: normal; font-weight: 700; color: var(--orange-deep);
        }
        .spl-hero p {
          font-size: clamp(.95rem,1.6vw,1.08rem);
          color: var(--slate); max-width: 480px; margin: 0 0 1.9rem; line-height: 1.65;
        }
        @media (max-width: 860px) { .spl-hero p { margin-left: auto; margin-right: auto; } }

        .spl-hero__ctas { display: flex; gap: .75rem; flex-wrap: wrap; margin-bottom: 1.5rem; }

        .spl-btn-primary {
          display: inline-flex; align-items: center; gap: .45rem;
          background: var(--orange); color: #fff;
          font-weight: 700; font-size: .93rem;
          padding: .75rem 1.5rem; border-radius: 9px;
          text-decoration: none; border: none; cursor: pointer;
          transition: background .18s, transform .15s, box-shadow .18s;
          box-shadow: 0 5px 16px rgba(249,115,22,0.3);
        }
        .spl-btn-primary:hover { background: var(--orange-deep); transform: translateY(-1px); box-shadow: 0 7px 20px rgba(249,115,22,0.38); }

        .spl-btn-outline-navy {
          display: inline-flex; align-items: center; gap: .45rem;
          background: #fff; color: var(--navy);
          font-weight: 700; font-size: .93rem;
          padding: .73rem 1.5rem; border-radius: 9px;
          text-decoration: none; border: 1.5px solid var(--line);
          transition: background .18s, border-color .18s;
        }
        .spl-btn-outline-navy:hover { background: var(--paper); border-color: var(--navy); }

        /* Stats — read as a data strip off a credential, not marketing badges */
        .spl-hero__stats {
          display: flex; gap: 0; flex-wrap: wrap;
          border-top: 1px solid var(--line); padding-top: 1.1rem;
        }
        .spl-stat { padding: 0 1.2rem 0 0; margin-right: 1.2rem; border-right: 1px solid var(--line); }
        .spl-stat:last-child { border-right: none; margin-right: 0; padding-right: 0; }
        .spl-stat-num { font-family: var(--f-mono); font-size: 1.15rem; font-weight: 600; color: var(--navy); line-height: 1; }
        .spl-stat-lbl { font-size: .72rem; color: var(--slate); margin-top: .3rem; }

        /* ── SIGNATURE ELEMENT: the verification seal ── */
        .spl-hero__seal { display: flex; flex-direction: column; align-items: center; gap: .85rem; }
        .spl-seal { position: relative; width: clamp(260px,30vw,340px); aspect-ratio: 1; }
        .spl-seal-outer {
          position: absolute; inset: 0; border-radius: 50%;
          border: 1.5px dashed rgba(16,35,61,0.22);
        }
        .spl-seal-orbit {
          position: absolute; inset: 15%; border-radius: 50%;
          border: 1px dashed rgba(249,115,22,0.4);
          animation: spl-spin 46s linear infinite;
        }
        @keyframes spl-spin { to { transform: rotate(360deg); } }
        .spl-seal-pos { position: absolute; inset: 0; }
        .spl-seal-chip {
          position: absolute; top: -13%; left: 50%;
          width: 26%; aspect-ratio: 1; margin-left: -13%;
          border-radius: 50%; background: #fff; border: 1.5px solid var(--line);
          display: grid; place-items: center; box-shadow: 0 4px 12px rgba(16,35,61,.16);
          animation: spl-spin-counter 46s linear infinite;
        }
        .spl-seal-chip img { width: 78%; height: 78%; object-fit: contain; }
        @keyframes spl-spin-counter {
          from { transform: rotate(calc(var(--a) * -1)); }
          to { transform: rotate(calc(var(--a) * -1 - 360deg)); }
        }
        .spl-seal-core {
          position: absolute; inset: 26%; border-radius: 50%;
          background: linear-gradient(150deg, var(--navy) 0%, var(--navy-3) 100%);
          display: flex; flex-direction: column; align-items: center; justify-content: center; gap: .3rem;
          box-shadow: inset 0 0 0 1px rgba(255,255,255,0.08), 0 10px 26px rgba(16,35,61,0.28);
        }
        .spl-seal-core svg { color: var(--orange); }
        .spl-seal-core strong { color: #fff; font-family: var(--f-display); font-size: clamp(.85rem,1.6vw,1.05rem); letter-spacing: .01em; }
        .spl-seal-core span { color: rgba(255,255,255,0.55); font-family: var(--f-mono); font-size: .58rem; letter-spacing: .08em; text-transform: uppercase; }
        @media (prefers-reduced-motion: reduce) {
          .spl-seal-orbit, .spl-seal-chip { animation: none; }
        }
        .spl-seal-caption { font-family: var(--f-mono); font-size: .7rem; color: var(--slate); text-align: center; }
        .spl-seal-caption b { color: var(--navy); font-weight: 600; }

        /* ── SECTION WRAPPER ── */
        .spl-section { padding: clamp(1.75rem,4vw,2.75rem) 1.25rem; }
        .spl-section--alt { background: var(--paper); }
        .spl-inner { max-width: 1180px; margin: 0 auto; }
        .spl-divider { height: 1px; background: var(--line); max-width: 1180px; margin: 0 auto; }

        .spl-head { text-align: center; margin-bottom: 1.5rem; }
        .spl-head h2 {
          margin: .55rem 0 .5rem; font-family: var(--f-display);
          font-size: clamp(1.5rem,3.3vw,2.15rem); font-weight: 600; letter-spacing: -.01em; color: var(--navy);
        }
        .spl-head p { color: var(--slate); max-width: 540px; margin: 0 auto; font-size: .95rem; line-height: 1.65; }
        .spl-orange { color: var(--orange-deep); font-family: var(--f-display); font-weight: 700; }

        /* ── PARTNERS ── */
        .spl-partners-strip { border: 1px solid var(--line); border-radius: 16px; background: #fff; padding: 1.5rem 0; }
        @keyframes spl-scroll { from { transform: translateX(0); } to { transform: translateX(-50%); } }
        .spl-mvp { overflow: hidden; -webkit-mask-image: linear-gradient(90deg,transparent,#000 9%,#000 91%,transparent); mask-image: linear-gradient(90deg,transparent,#000 9%,#000 91%,transparent); }
        .spl-mvp:hover .spl-mvt { animation-play-state: paused; }
        .spl-mvt { display: flex; width: max-content; gap: 2.75rem; align-items: center; animation: spl-scroll 30s linear infinite; }
        @media (prefers-reduced-motion: reduce) { .spl-mvt { animation: none; } }
        .spl-logo-cell { display: grid; place-items: center; height: 46px; width: 118px; flex-shrink: 0; opacity: .85; }

        /* ── WHY CHOOSE ── */
        .spl-why-grid { display: grid; grid-template-columns: repeat(auto-fit,minmax(220px,1fr)); gap: 1rem; }
        .spl-feat-card {
          background: #fff; border: 1px solid var(--line); border-radius: 16px; padding: 1.5rem;
          transition: box-shadow .2s, transform .2s, border-color .2s;
        }
        .spl-feat-card:hover { box-shadow: 0 8px 26px rgba(16,35,61,0.1); transform: translateY(-2px); border-color: rgba(249,115,22,0.3); }
        .spl-feat-icon {
          width: 42px; height: 42px; border-radius: 50%;
          background: var(--navy); color: var(--orange);
          border: 3px solid ${NAVY_LIGHT};
          display: grid; place-items: center; margin-bottom: 1rem;
        }
        .spl-feat-card h3 { font-family: var(--f-display); font-size: 1.08rem; font-weight: 600; margin: 0 0 .4rem; color: var(--navy); line-height: 1.3; }
        .spl-feat-card p { font-size: .86rem; color: var(--slate); line-height: 1.6; margin: 0; }

        /* ── CERT ── */
        .spl-cert-grid {
          display: grid; grid-template-columns: minmax(240px,360px) 1fr;
          gap: 2rem; align-items: start;
        }
        @media (max-width: 720px) { .spl-cert-grid { grid-template-columns: 1fr; } }
        .spl-cert-img-wrap {
          border: 1.5px dashed rgba(16,35,61,0.25); border-radius: 14px; overflow: hidden; position: relative;
          padding: .6rem; background: var(--paper);
        }
        .spl-cert-img-wrap img { width: 100%; display: block; object-fit: contain; border-radius: 6px; }
        .spl-verified-badge {
          position: absolute; top: 18px; right: 18px;
          display: inline-flex; align-items: center; gap: .3rem;
          font-family: var(--f-mono); font-size: .68rem; font-weight: 600; letter-spacing: .03em;
          background: var(--success); color: #fff; border-radius: 100px; padding: .3rem .75rem;
          box-shadow: 0 3px 10px rgba(22,163,74,0.35);
        }
        .spl-cert-caption { text-align: center; padding: .9rem .5rem .3rem; }
        .spl-cert-caption small { font-family: var(--f-mono); font-size: .72rem; color: var(--slate); text-transform: uppercase; letter-spacing: .05em; }
        .spl-cert-caption strong { display: block; font-family: var(--f-display); font-size: 1.02rem; color: var(--navy); margin-top: 3px; font-weight: 600; }
        .spl-cert-right { display: flex; flex-direction: column; gap: 1.25rem; }
        .spl-details-card { background: #fff; border: 1px solid var(--line); border-radius: 16px; padding: 1.35rem; }
        .spl-details-card > .spl-mono-tag { display: block; margin-bottom: 1.1rem; }
        .spl-details-grid { display: grid; grid-template-columns: repeat(auto-fit,minmax(190px,1fr)); gap: 1.1rem; }
        .spl-detail-row { display: flex; gap: .65rem; align-items: flex-start; }
        .spl-detail-icon {
          width: 34px; height: 34px; border-radius: 50%;
          background: ${NAVY_LIGHT}; color: var(--navy);
          display: grid; place-items: center; flex-shrink: 0;
        }
        .spl-detail-lbl { font-size: .74rem; color: var(--slate); }
        .spl-detail-val { font-family: var(--f-mono); font-size: .87rem; font-weight: 500; color: var(--navy); }
        .spl-fs-banner {
          border-radius: 16px; padding: 1.35rem 1.5rem;
          background: linear-gradient(135deg, var(--navy) 0%, var(--navy-3) 100%);
          color: #fff; position: relative; overflow: hidden;
        }
        .spl-fs-banner::before {
          content: ''; position: absolute; inset: 0;
          background-image: radial-gradient(circle, rgba(255,255,255,0.5) 1px, transparent 1px);
          background-size: 14px 14px;
          -webkit-mask-image: radial-gradient(ellipse 60% 100% at 90% 0%, #000, transparent 70%);
          mask-image: radial-gradient(ellipse 60% 100% at 90% 0%, #000, transparent 70%);
          opacity: .15;
        }
        .spl-fs-banner h4 { position: relative; margin: 0 0 .35rem; font-family: var(--f-display); font-weight: 600; font-size: 1rem; display: flex; align-items: center; gap: .45rem; }
        .spl-fs-banner p { position: relative; margin: 0; font-size: .87rem; opacity: .85; line-height: 1.55; }
        .spl-fs-active { position: relative; display: inline-flex; align-items: center; gap: .4rem; margin-top: .75rem; font-family: var(--f-mono); font-size: .74rem; font-weight: 500; }
        .spl-fs-dot { width: 6px; height: 6px; border-radius: 50%; background: var(--orange); }
        .spl-cert-stats { display: flex; gap: 2rem; }
        .spl-cert-stat-num { font-family: var(--f-mono); font-size: 1.5rem; font-weight: 600; color: var(--navy); line-height: 1; }
        .spl-cert-stat-lbl { font-size: .76rem; color: var(--slate); margin-top: .3rem; }

        /* ── CATEGORIES ── */
        .spl-cats-header, .spl-courses-header {
          display: flex; justify-content: space-between; align-items: center;
          margin-bottom: 1.1rem; flex-wrap: wrap; gap: .5rem;
        }
        .spl-cats-header h2, .spl-courses-header h2 { margin: 0; font-family: var(--f-display); font-size: clamp(1.25rem,2.8vw,1.6rem); font-weight: 600; color: var(--navy); }
        .spl-view-all { color: var(--orange-deep); text-decoration: none; font-weight: 700; font-size: .88rem; }
        .spl-view-all:hover { text-decoration: underline; }
        .spl-cats-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(135px,1fr)); gap: .75rem; }
        @media (max-width: 480px) { .spl-cats-grid { grid-template-columns: repeat(auto-fill,minmax(105px,1fr)); } }
        .spl-cat-link {
          display: flex; flex-direction: column; align-items: center; gap: .5rem;
          padding: 1.15rem .75rem; border-radius: 14px; border: 1px solid var(--line); background: #fff;
          text-decoration: none; color: var(--navy); font-weight: 600; font-size: .87rem; text-align: center;
          transition: box-shadow .2s, transform .2s, border-color .2s;
        }
        .spl-cat-link:hover { border-color: var(--orange); box-shadow: 0 6px 18px rgba(249,115,22,0.14); transform: translateY(-2px); }
        .spl-cat-icon { width: 40px; height: 40px; border-radius: 50%; background: var(--paper); display: grid; place-items: center; font-size: 1.35rem; }

        /* ── COURSES ── */
        .spl-courses-grid { display: grid; grid-template-columns: repeat(auto-fill,minmax(240px,1fr)); gap: 1rem; }
        .spl-empty { padding: 2rem; text-align: center; color: var(--slate); border: 1px dashed var(--line); border-radius: 16px; background: #fff; }

        /* ── CTA ── */
        .spl-cta-inner {
          border-radius: 22px; padding: clamp(2.25rem,5vw,3.75rem) clamp(1.5rem,4vw,3rem);
          text-align: center; color: #fff; position: relative; overflow: hidden;
          background: linear-gradient(135deg, var(--navy) 0%, var(--navy-3) 55%, #0c1c30 100%);
        }
        .spl-cta-inner::before {
          content: ''; position: absolute; width: 480px; height: 480px; border-radius: 50%;
          border: 1.5px dashed rgba(249,115,22,0.3); top: 50%; right: -140px; transform: translateY(-50%);
        }
        .spl-cta-inner::after {
          content: ''; position: absolute; width: 340px; height: 340px; border-radius: 50%;
          border: 1px dashed rgba(255,255,255,0.15); top: 50%; right: -70px; transform: translateY(-50%);
        }
        .spl-cta-inner h2 {
          position: relative; margin: 0 0 .75rem; font-family: var(--f-display);
          font-size: clamp(1.5rem,3.6vw,2.15rem); font-weight: 600; letter-spacing: -.01em;
        }
        .spl-cta-inner p { position: relative; margin: 0 auto 1.75rem; max-width: 520px; opacity: .82; line-height: 1.6; font-size: .96rem; }
        .spl-cta-btns { position: relative; display: flex; gap: .75rem; justify-content: center; flex-wrap: wrap; }
        .spl-btn-cta-white {
          display: inline-flex; align-items: center; gap: .45rem; background: #fff; color: var(--navy);
          font-weight: 700; font-size: .93rem; padding: .73rem 1.5rem; border-radius: 9px; text-decoration: none;
          transition: background .18s, transform .15s; box-shadow: 0 3px 10px rgba(0,0,0,0.18);
        }
        .spl-btn-cta-white:hover { background: #eef2f7; transform: translateY(-1px); }
        .spl-btn-cta-orange {
          display: inline-flex; align-items: center; gap: .45rem; background: var(--orange); color: #fff;
          font-weight: 700; font-size: .93rem; padding: .73rem 1.5rem; border-radius: 9px; text-decoration: none;
          transition: background .18s, transform .15s; box-shadow: 0 5px 16px rgba(249,115,22,0.4);
        }
        .spl-btn-cta-orange:hover { background: var(--orange-deep); transform: translateY(-1px); }
      `}</style>

      <div className="spl">

        {/* ═══ HERO ═══ */}
        <section className="spl-hero">
          <div className="spl-hero__grid">
            <div>
              <div className="spl-eyebrow spl-eyebrow--navy">
                <span className="spl-eyebrow__dot" /> NASSCOM-Recognised Skilling Partner
              </div>
              <h1>
                Self-Paced Learning,<br /><em>Verified from day one.</em>
              </h1>
              <p>
                Browse industry-ready courses, add them to one cart, checkout once, and start immediately.
                Every certificate you earn is issued under our recognised NASSCOM skilling partnership.
              </p>
              <div className="spl-hero__ctas">
                <Link to="/selfpaced/courses" className="spl-btn-primary">
                  <ShoppingBag size={16} /> Browse courses
                </Link>
                <Link to="/selfpaced/auth?mode=signup" className="spl-btn-outline-navy">
                  Sign up free <ArrowRight size={16} />
                </Link>
              </div>

              <div className="spl-hero__stats">
                {[
                  { num: '50+', lbl: 'Courses available' },
                  { num: '10K+', lbl: 'Learners enrolled' },
                  { num: '100%', lbl: 'Industry certified' },
                  { num: '24/7', lbl: 'Lifetime access' },
                ].map((s, i) => (
                  <div key={i} className="spl-stat">
                    <div className="spl-stat-num">{s.num}</div>
                    <div className="spl-stat-lbl">{s.lbl}</div>
                  </div>
                ))}
              </div>
            </div>

            <div className="spl-hero__seal">
              <div className="spl-seal">
                <div className="spl-seal-outer" />
                <div className="spl-seal-orbit">
                  {SEAL_ORBIT_LOGOS.map((p, i) => {
                    const angle = i * 90;
                    return (
                      <div key={p.name} className="spl-seal-pos" style={{ transform: `rotate(${angle}deg)` }}>
                        <div
                          className="spl-seal-chip"
                          style={{ ['--a' as any]: `${angle}deg` }}
                        >
                          <img
                            src={p.src} alt={p.name}
                            onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = 'none'; }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
                <div className="spl-seal-core">
                  {/*<Award size={26} />
                  <strong>Prepnow</strong>*/}
                  <img src="/prepnowlogo.jpeg" alt="Prepnow" />
                  {/*<span>Verified partner</span>*/}
                </div>
              </div>
              {/* <div className="spl-seal-caption">Active partnership &middot; valid <b>{validity}</b></div>*/}
            </div>
          </div>
        </section>

        {/* ═══ PARTNERS ═══ */}
        <section className="spl-section">
          <div className="spl-inner">
            <div className="spl-partners-strip">
              <div style={{ textAlign: 'center', marginBottom: '1.1rem' }}>
                <span className="spl-mono-tag">Official partners &amp; certifying bodies</span>
              </div>
              <div className="spl-mvp">
                <div className="spl-mvt">
                  {[...KNOWLEDGE_PARTNER_LOGOS, ...KNOWLEDGE_PARTNER_LOGOS].map((p, i) => (
                    <div key={i} className="spl-logo-cell">
                      <img
                        src={p.src} alt={p.name}
                        style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain' }}
                        onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = 'none'; }}
                      />
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </section>

        <div className="spl-divider" />

        {/* ═══ WHY CHOOSE ═══ */}
        <section className="spl-section spl-section--alt">
          <div className="spl-inner">
            <div className="spl-head">
              <div className="spl-eyebrow spl-eyebrow--orange">Why choose us</div>
              <h2>What you actually get with <span className="spl-orange">Prepnow</span></h2>
              <p>Not just video lessons — a full loop of practice, proof, and people who answer.</p>
            </div>
            <div className="spl-why-grid">
              {WHY_CHOOSE_US.map((f, i) => (
                <div key={i} className="spl-feat-card">
                  <div className="spl-feat-icon"><f.icon size={19} /></div>
                  <div className="spl-mono-tag" style={{ marginBottom: '.4rem' }}>{f.tag}</div>
                  <h3>{f.title}</h3>
                  <p>{f.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <div className="spl-divider" />

        {/* ═══ CERTIFICATION ═══ */}
        <section className="spl-section">
          <div className="spl-inner">
            <div className="spl-head">
              <div className="spl-eyebrow spl-eyebrow--navy">
                <ShieldCheck size={13} /> Our certification
              </div>
              <h2>Recognised <span className="spl-orange">Skilling Partner</span></h2>
              <p>
                The displayed certificate names SkillzRevo Solutions Private Limited as a recognised skilling partner of IT-ITeS SSC NASSCOM.
              </p>
            </div>

            <div className="spl-cert-grid">
              <div>
                <div className="spl-cert-img-wrap">
                  <img
                    src="https://www.skillzrevo.com/sspl.jpeg"
                    alt="Certificate of Partnership — SkillzRevo Solutions Private Limited, Recognised Skilling Partner of IT-ITeS SSC Nasscom"
                  />
                  <span className="spl-verified-badge"><BadgeCheck size={12} /> Verified</span>
                </div>
                <div className="spl-cert-caption">
                  <small>Certificate of partnership</small>
                  <strong>SkillzRevo Solutions Private Limited</strong>
                </div>
              </div>

              <div className="spl-cert-right">
                <div className="spl-details-card">
                  <span className="spl-mono-tag">Partnership details</span>
                  <div className="spl-details-grid">
                    {PARTNERSHIP_DETAILS.map((d, i) => (
                      <div key={i} className="spl-detail-row">
                        <div className="spl-detail-icon"><d.icon size={16} /></div>
                        <div>
                          <div className="spl-detail-lbl">{d.label}</div>
                          <div className="spl-detail-val">{d.value}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="spl-fs-banner">
                  <h4><Sparkles size={16} /> FutureSkills Prime initiative</h4>
                  <p>A MeitY-Nasscom digital skilling initiative empowering professionals with cutting-edge IT skills.</p>
                  <div className="spl-fs-active"><span className="spl-fs-dot" /> Active partnership</div>
                </div>

                <div className="spl-cert-stats">
                  <div>
                    <div className="spl-cert-stat-num">10+</div>
                    <div className="spl-cert-stat-lbl">Year partnership</div>
                  </div>
                  <div>
                    <div className="spl-cert-stat-num">100%</div>
                    <div className="spl-cert-stat-lbl">Certified</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        <div className="spl-divider" />

        {/* ═══ CATEGORIES ═══ */}
        {cats.length > 0 && (
          <section className="spl-section spl-section--alt">
            <div className="spl-inner">
              <div className="spl-cats-header">
                <h2>Browse categories</h2>
                <Link to="/selfpaced/courses" className="spl-view-all">View all &rarr;</Link>
              </div>
              <div className="spl-cats-grid">
                {cats.map((c) => (
                  <Link key={c.id} to={`/selfpaced/courses?category=${c.slug}`} className="spl-cat-link">
                    {/* <span className="spl-cat-icon">{c.icon || '\ud83d\udcda'}</span> */}
                    <span>{c.name}</span>
                  </Link>
                ))}
              </div>
            </div>
          </section>
        )}

        {/* ═══ FEATURED COURSES ═══ */}
        <section className="spl-section">
          <div className="spl-inner">
            <div className="spl-courses-header">
              <h2>Featured courses</h2>
              <Link to="/selfpaced/courses" className="spl-view-all">View all &rarr;</Link>
            </div>
            {featured.length === 0
              ? <div className="spl-empty">No courses yet. Check back soon.</div>
              : <div className="spl-courses-grid">{featured.map((c) => <SpCourseCard key={c.id} course={c} />)}</div>
            }
          </div>
        </section>

        {/* ═══ CLOSING CTA ═══ */}
        <section className="spl-section">
          <div className="spl-inner">
            <div className="spl-cta-inner">
              <h2>Start your learning journey today</h2>
              <p>
                Join a certified, industry-recognised skilling partner. Browse the catalog, add courses to your cart,
                and get lifetime access from day one.
              </p>
              <div className="spl-cta-btns">
                <Link to="/selfpaced/courses" className="spl-btn-cta-white">
                  <ShoppingBag size={16} /> Browse courses
                </Link>
                <Link to="/selfpaced/auth?mode=signup" className="spl-btn-cta-orange">
                  Sign up free <ArrowRight size={16} />
                </Link>
              </div>
            </div>
          </div>
        </section>

      </div>
    </>
  );
};

export default SpLanding;