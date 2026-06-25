import React, { useState } from 'react';
import {
  PlayCircle, BrainCircuit, LineChart, ShieldCheck, CheckCircle2,
  ArrowRight, BookOpen, GraduationCap, Menu, X, Zap, BarChart3, Lock, Sparkles
} from 'lucide-react';

const NAV_LINKS = [
  { label: 'Features', href: '/features' },
  { label: 'How it Works', href: '#how-it-works' },
  { label: 'Privacy', href: '#privacy' },
];

export default function Home() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <div className="min-h-screen bg-[#F8F7F4] text-stone-900 font-sans">

      {/* ── Navigation ── */}
      <nav className="sticky top-0 z-50 bg-white/80 backdrop-blur-xl border-b border-stone-200/70 shadow-sm">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <a href="/" className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-teal-500 to-teal-700 text-white flex items-center justify-center font-bold text-base shadow-md shadow-teal-500/30">A</div>
            <span className="font-bold text-xl tracking-tight text-stone-900">A-Quire</span>
          </a>

          <div className="hidden md:flex items-center gap-8 text-sm font-medium text-stone-600">
            {NAV_LINKS.map(l => (
              <a key={l.href} href={l.href} className="hover:text-teal-700 transition-colors">{l.label}</a>
            ))}
          </div>

          <div className="hidden md:flex items-center gap-3">
            <a href="/login" className="text-sm font-semibold text-stone-600 hover:text-teal-700 transition-colors px-3 py-2">Log in</a>
            <a href="/signup" className="text-sm font-semibold bg-gradient-to-r from-teal-600 to-teal-700 text-white px-5 py-2.5 rounded-xl hover:from-teal-700 hover:to-teal-800 transition-all shadow-md shadow-teal-600/20 flex items-center gap-2">
              Get Demo <ArrowRight className="w-3.5 h-3.5" />
            </a>
          </div>

          <button className="md:hidden p-2 text-stone-600 hover:bg-stone-100 rounded-lg" onClick={() => setMobileMenuOpen(!mobileMenuOpen)}>
            {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>

        {mobileMenuOpen && (
          <div className="md:hidden bg-white border-b border-stone-200 px-6 py-4 flex flex-col gap-3">
            {NAV_LINKS.map(l => <a key={l.href} href={l.href} className="text-stone-700 font-medium py-1">{l.label}</a>)}
            <hr className="border-stone-100" />
            <a href="/login" className="text-stone-700 font-medium py-1">Log in</a>
            <a href="/signup" className="bg-teal-700 text-white px-4 py-2.5 rounded-xl text-center font-semibold">Get Demo</a>
          </div>
        )}
      </nav>

      <main>
        {/* ── Hero ── */}
        <section className="relative overflow-hidden">
          {/* Dark gradient background */}
          <div className="absolute inset-0" style={{background: 'linear-gradient(to bottom, #0A0E14 0%, #0D2825 55%, #F8F7F4 100%)'}} />
          {/* Glowing orbs */}
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[900px] h-[500px] rounded-full blur-3xl pointer-events-none" style={{background: 'rgba(20,184,166,0.1)'}} />
          <div className="absolute top-20 left-1/4 w-64 h-64 rounded-full blur-3xl pointer-events-none" style={{background: 'rgba(52,211,153,0.07)'}} />
          <div className="absolute top-10 right-1/4 w-48 h-48 rounded-full blur-2xl pointer-events-none" style={{background: 'rgba(16,185,129,0.07)'}} />

          <div className="relative z-10 max-w-7xl mx-auto px-6 pt-24 pb-0 md:pt-36">
            {/* Badge */}
            <div className="flex justify-center mb-8">
              <span className="inline-flex items-center gap-2 bg-teal-500/10 border border-teal-500/25 text-teal-300 text-xs font-bold uppercase tracking-widest px-4 py-2 rounded-full backdrop-blur-sm">
                <span className="w-1.5 h-1.5 bg-teal-400 rounded-full animate-pulse" />
                Now in Beta — Free for Universities
              </span>
            </div>

            {/* Headline */}
            <div className="text-center max-w-4xl mx-auto mb-10">
              <h1 className="text-5xl md:text-7xl font-black tracking-tight leading-[1.05] mb-6 text-white">
                Real-time AI intervention<br />
                <span className="bg-gradient-to-r from-teal-300 via-teal-400 to-emerald-300 bg-clip-text text-transparent">
                  for every lecture.
                </span>
              </h1>
              <p className="text-lg md:text-xl text-slate-400 leading-relaxed max-w-2xl mx-auto">
                A-Quire detects struggle during video lectures and triggers Socratic AI guidance — ensuring no student falls behind silently.
              </p>
            </div>

            {/* CTA */}
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-14">
              <a href="/signup" className="w-full sm:w-auto bg-gradient-to-r from-teal-500 to-teal-600 text-white px-8 py-4 rounded-2xl hover:from-teal-400 hover:to-teal-500 transition-all font-bold shadow-2xl shadow-teal-500/25 flex items-center justify-center gap-2 text-base">
                Request a Demo <ArrowRight className="w-4 h-4" />
              </a>
              <a href="/login" className="w-full sm:w-auto bg-white/5 backdrop-blur border border-white/15 text-white px-8 py-4 rounded-2xl hover:bg-white/10 transition-all font-semibold text-center text-base">
                Sign in to Class
              </a>
            </div>

            {/* Trust stats */}
            <div className="flex flex-wrap items-center justify-center gap-6 mb-16">
              {[
                { icon: GraduationCap, text: '12,000+ Students' },
                { icon: ShieldCheck, text: 'FERPA Compliant' },
                { icon: Zap, text: '<200ms Response' },
              ].map(({ icon: Icon, text }) => (
                <div key={text} className="flex items-center gap-2 text-slate-400 text-sm font-medium">
                  <Icon className="w-4 h-4 text-teal-400" />
                  {text}
                </div>
              ))}
            </div>

            {/* Product screenshot mockup */}
            <div className="max-w-5xl mx-auto rounded-2xl overflow-hidden border border-white/10 shadow-[0_32px_80px_rgba(0,0,0,0.5)] bg-[#0F1117]">
              {/* Window chrome */}
              <div className="flex items-center gap-2 px-4 py-3 bg-[#1A1F2E] border-b border-white/5">
                <span className="w-3 h-3 rounded-full bg-red-500/70" />
                <span className="w-3 h-3 rounded-full bg-amber-400/70" />
                <span className="w-3 h-3 rounded-full bg-teal-500/70" />
                <span className="flex-1 text-center text-[11px] text-slate-600 font-mono">a-quire.io/lesson?id=4</span>
              </div>
              {/* App inside */}
              <div className="flex flex-col md:flex-row h-auto md:h-[360px]">
                {/* Video player area */}
                <div className="flex-1 bg-stone-950 relative flex items-center justify-center">
                  <div className="text-center">
                    <div className="w-16 h-16 rounded-full bg-white/10 flex items-center justify-center mx-auto mb-3 border border-white/10">
                      <PlayCircle className="w-8 h-8 text-teal-400" />
                    </div>
                    <p className="text-slate-500 text-xs font-mono tracking-wider">LECTURE · THERMODYNAMICS 301</p>
                    <p className="text-slate-600 text-xs mt-1">14:22 / 38:00</p>
                  </div>
                  {/* Progress bar */}
                  <div className="absolute bottom-0 left-0 right-0 h-1 bg-white/5">
                    <div className="w-[38%] h-full bg-gradient-to-r from-teal-500 to-teal-400" />
                  </div>
                  {/* Intervention pill */}
                  <div className="absolute top-4 left-4 flex items-center gap-2 bg-amber-500/90 backdrop-blur text-white text-xs font-bold px-3 py-1.5 rounded-full shadow-lg">
                    <span className="w-1.5 h-1.5 bg-white rounded-full animate-pulse" />
                    Struggle Detected
                  </div>
                </div>
                {/* AI Mentor panel */}
                <div className="w-full md:w-80 bg-[#131720] border-t md:border-l md:border-t-0 border-white/5 flex flex-col">
                  <div className="px-4 py-3.5 border-b border-white/5 flex items-center gap-2.5">
                    <div className="w-7 h-7 rounded-lg bg-teal-500/20 flex items-center justify-center">
                      <BrainCircuit className="w-3.5 h-3.5 text-teal-400" />
                    </div>
                    <span className="text-sm font-semibold text-white">AI Mentor</span>
                    <span className="ml-auto text-[10px] bg-teal-500/15 text-teal-400 border border-teal-500/20 px-2 py-0.5 rounded-full font-semibold">Active</span>
                  </div>
                  <div className="flex-1 p-4 space-y-3 overflow-hidden">
                    <div className="bg-white/5 rounded-xl rounded-tl-none p-3">
                      <p className="text-xs text-slate-300 leading-relaxed">I noticed you paused twice during this section. Can you tell me what you think the entropy formula is calculating?</p>
                    </div>
                    <div className="bg-teal-600/25 border border-teal-500/15 rounded-xl rounded-tr-none p-3 ml-6">
                      <p className="text-xs text-teal-100 leading-relaxed">I'm not sure what 'n' represents here...</p>
                    </div>
                  </div>
                  <div className="p-3 border-t border-white/5 space-y-2">
                    <button className="w-full text-left px-3 py-2 text-xs rounded-lg bg-white/5 border border-white/8 text-slate-300 hover:bg-white/10 transition-colors font-medium">
                      💡 Give me a hint
                    </button>
                    <button className="w-full text-left px-3 py-2 text-xs rounded-lg bg-white/5 border border-white/8 text-slate-300 hover:bg-white/10 transition-colors font-medium">
                      🔁 Replay from 12:00
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ── How It Works ── */}
        <section id="how-it-works" className="py-28 bg-white">
          <div className="max-w-7xl mx-auto px-6">
            <div className="text-center max-w-2xl mx-auto mb-16">
              <p className="text-teal-700 font-semibold text-sm uppercase tracking-widest mb-3">How It Works</p>
              <h2 className="text-4xl font-bold text-stone-900 mb-4">Intelligent intervention,<br />simplified.</h2>
              <p className="text-stone-500 leading-relaxed">Three steps between a struggling student and understanding.</p>
            </div>

            <div className="grid md:grid-cols-3 gap-8">
              {[
                { step: '01', icon: PlayCircle, title: 'Watch & Learn', desc: 'Students engage with video coursework via our custom player with dynamic transcripts and timeline markers.', color: 'teal' },
                { step: '02', icon: BrainCircuit, title: 'Struggle Detection', desc: 'Secure, local analysis notices when focus drops, replays occur, or confusion patterns arise during a lecture.', color: 'violet' },
                { step: '03', icon: BookOpen, title: 'Learning Recovery', desc: 'The AI Mentor panel opens with Socratic questions that guide the student to the answer organically.', color: 'emerald' },
              ].map(({ step, icon: Icon, title, desc, color }) => (
                <div key={step} className="relative bg-stone-50 border border-stone-200 rounded-2xl p-8 hover:shadow-lg hover:border-stone-300 transition-all group">
                  <div className="absolute top-6 right-6 text-5xl font-black text-stone-100 group-hover:text-stone-150 transition-colors select-none">{step}</div>
                  <div className={`w-12 h-12 rounded-xl flex items-center justify-center mb-6 ${
                    color === 'teal' ? 'bg-teal-50 text-teal-700 border border-teal-100' :
                    color === 'violet' ? 'bg-violet-50 text-violet-700 border border-violet-100' :
                    'bg-emerald-50 text-emerald-700 border border-emerald-100'
                  }`}>
                    <Icon className="w-6 h-6" />
                  </div>
                  <h3 className="text-xl font-bold text-stone-900 mb-3">{title}</h3>
                  <p className="text-stone-500 leading-relaxed text-sm">{desc}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ── Benefits ── */}
        <section className="py-28 bg-[#F8F7F4]">
          <div className="max-w-7xl mx-auto px-6">
            <div className="grid md:grid-cols-2 gap-16 items-start">
              {/* Students */}
              <div className="bg-white rounded-3xl p-10 border border-stone-200 shadow-sm">
                <div className="flex items-center gap-2.5 mb-6">
                  <div className="w-10 h-10 rounded-xl bg-teal-50 border border-teal-100 flex items-center justify-center">
                    <GraduationCap className="w-5 h-5 text-teal-700" />
                  </div>
                  <span className="text-xs font-bold text-teal-700 uppercase tracking-widest">For Students</span>
                </div>
                <h2 className="text-3xl font-bold text-stone-900 mb-8 leading-tight">Never fall behind<br />silently.</h2>
                <ul className="space-y-5">
                  {[
                    'Layered Socratic hints adapt to your level of understanding',
                    'Interactive, timestamped transcripts to revisit complex concepts',
                    'Voice-assisted support for conversational learning sessions',
                    'Adaptive self-check quizzes to ensure deep retention',
                  ].map((text, i) => (
                    <li key={i} className="flex gap-3.5">
                      <CheckCircle2 className="w-5 h-5 text-teal-600 shrink-0 mt-0.5" />
                      <span className="text-stone-600 leading-relaxed text-sm">{text}</span>
                    </li>
                  ))}
                </ul>
              </div>

              {/* Instructors */}
              <div className="bg-white rounded-3xl p-10 border border-stone-200 shadow-sm">
                <div className="flex items-center gap-2.5 mb-6">
                  <div className="w-10 h-10 rounded-xl bg-indigo-50 border border-indigo-100 flex items-center justify-center">
                    <BarChart3 className="w-5 h-5 text-indigo-700" />
                  </div>
                  <span className="text-xs font-bold text-indigo-700 uppercase tracking-widest">For Instructors & Institutions</span>
                </div>
                <h2 className="text-3xl font-bold text-stone-900 mb-8 leading-tight">Data-driven<br />academic support.</h2>
                <ul className="space-y-5">
                  {[
                    'Identify cohort-wide struggle points across syllabus timelines',
                    'Comprehensive analytics to diagnose ineffective lecture material',
                    'Seamless API integration into existing learning management systems',
                    'On-device processing ensures strict FERPA compliance and privacy',
                  ].map((text, i) => (
                    <li key={i} className="flex gap-3.5">
                      <CheckCircle2 className="w-5 h-5 text-indigo-600 shrink-0 mt-0.5" />
                      <span className="text-stone-600 leading-relaxed text-sm">{text}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        </section>

        {/* ── Socratic Workflow ── */}
        <section className="py-28 bg-white">
          <div className="max-w-7xl mx-auto px-6">
            <div className="text-center max-w-2xl mx-auto mb-16">
              <p className="text-teal-700 font-semibold text-sm uppercase tracking-widest mb-3">The Mentor Experience</p>
              <h2 className="text-4xl font-bold text-stone-900 mb-4">The Socratic Workflow</h2>
              <p className="text-stone-500 leading-relaxed">Designed to emulate a side-by-side tutoring session. We guide students to answers organically.</p>
            </div>

            <div className="max-w-5xl mx-auto rounded-2xl overflow-hidden border border-stone-200 shadow-xl flex flex-col md:flex-row h-auto md:h-[480px]">
              <div className="flex-1 bg-stone-900 relative flex items-center justify-center p-8">
                <div className="text-center">
                  <PlayCircle className="w-16 h-16 text-teal-500 mx-auto mb-3" />
                  <p className="text-stone-400 text-sm font-medium">Lecture paused at 14:22</p>
                </div>
                <div className="absolute top-4 left-4 bg-amber-500 text-white text-xs font-bold px-3 py-1.5 rounded-full flex items-center gap-1.5 shadow-lg">
                  <Sparkles className="w-3 h-3" /> Mentor activated
                </div>
              </div>
              <div className="w-full md:w-[380px] border-t md:border-l md:border-t-0 border-stone-200 flex flex-col bg-white">
                <div className="p-5 border-b border-stone-100 flex items-center gap-3 bg-stone-50">
                  <BrainCircuit className="w-5 h-5 text-teal-700" />
                  <span className="font-bold text-stone-900">AI Mentor</span>
                </div>
                <div className="p-5 flex-1 space-y-5">
                  <div className="flex gap-3">
                    <div className="w-8 h-8 rounded-full bg-teal-100 text-teal-700 flex items-center justify-center shrink-0">
                      <BrainCircuit className="w-4 h-4" />
                    </div>
                    <div className="bg-stone-50 rounded-xl rounded-tl-none p-4 text-sm text-stone-700 border border-stone-100 leading-relaxed">
                      I noticed you paused twice during this section. Should we break down the formula together?
                    </div>
                  </div>
                  <div className="flex gap-3 flex-row-reverse">
                    <div className="w-8 h-8 rounded-full bg-stone-200 text-stone-600 flex items-center justify-center shrink-0 text-xs font-bold">ST</div>
                    <div className="bg-teal-700 text-white rounded-xl rounded-tr-none p-4 text-sm leading-relaxed">
                      Yes, I don't understand what 'n' represents here.
                    </div>
                  </div>
                </div>
                <div className="p-4 border-t border-stone-100 bg-stone-50 space-y-2">
                  <button className="w-full text-left px-4 py-2.5 text-sm rounded-xl bg-white font-semibold border border-stone-200 hover:border-teal-400 hover:bg-teal-50 transition-all text-stone-700">
                    💡 What does 'n' represent here?
                  </button>
                  <button className="w-full text-left px-4 py-2.5 text-sm rounded-xl bg-white font-semibold border border-stone-200 hover:border-teal-400 hover:bg-teal-50 transition-all text-stone-700">
                    🔍 Give me a specific hint
                  </button>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ── Privacy ── */}
        <section id="privacy" className="py-28 relative overflow-hidden" style={{background: 'linear-gradient(to bottom, #0A0E14, #0D2825)'}}>
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_rgba(20,184,166,0.08)_0%,_transparent_60%)]" />
          <div className="relative z-10 max-w-4xl mx-auto px-6 text-center">
            <div className="w-16 h-16 bg-teal-500/10 border border-teal-500/20 rounded-2xl flex items-center justify-center mx-auto mb-8">
              <Lock className="w-8 h-8 text-teal-400" />
            </div>
            <h2 className="text-4xl font-bold text-white mb-6">Privacy by Design</h2>
            <p className="text-slate-400 text-xl leading-relaxed mb-10">
              All webcam data is{' '}
              <span className="text-white font-semibold">processed locally on-device.</span>{' '}
              No video recordings are ever stored or transmitted to our servers.
            </p>
            <div className="flex flex-wrap items-center justify-center gap-6">
              {[
                { icon: ShieldCheck, label: 'FERPA Compliant' },
                { icon: Lock, label: 'On-Device Processing' },
                { icon: CheckCircle2, label: 'No Video Storage' },
              ].map(({ icon: Icon, label }) => (
                <div key={label} className="flex items-center gap-2.5 bg-white/5 border border-white/10 px-5 py-2.5 rounded-full text-slate-300 text-sm font-medium">
                  <Icon className="w-4 h-4 text-teal-400" />
                  {label}
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ── Testimonial ── */}
        <section className="py-28 bg-white">
          <div className="max-w-5xl mx-auto px-6 text-center">
            <div className="text-5xl text-teal-200 mb-6 font-serif leading-none">"</div>
            <blockquote className="text-2xl md:text-3xl font-medium text-stone-800 leading-relaxed mb-10 max-w-4xl mx-auto">
              A-Quire bridges the educational gap between digital lectures and one-on-one tutoring. We've seen a measurable drop in syllabus abandonment since implementing their workflow.
            </blockquote>
            <div className="inline-flex flex-col items-center gap-1">
              <div className="w-12 h-12 rounded-full bg-gradient-to-br from-teal-500 to-teal-700 flex items-center justify-center text-white font-bold mb-2">EV</div>
              <span className="font-bold text-stone-900">Dr. Eleanor Vance</span>
              <span className="text-stone-500 text-sm">Dean of Digital Learning, State University</span>
            </div>
          </div>
        </section>

        {/* ── Final CTA ── */}
        <section className="py-28 relative overflow-hidden" style={{background: 'linear-gradient(135deg, #0F766E 0%, #0c5a54 50%, #0A2623 100%)'}}>
          <div className="absolute inset-0 opacity-5 bg-[radial-gradient(ellipse_at_top_right,_white,_transparent_60%)]" />
          <div className="absolute bottom-0 right-0 w-96 h-96 bg-teal-400/5 rounded-full blur-3xl" />
          <div className="relative z-10 max-w-4xl mx-auto px-6 text-center">
            <h2 className="text-4xl md:text-5xl font-black text-white mb-6 leading-tight">
              Ready to upgrade<br />your curriculum?
            </h2>
            <p className="text-teal-200 text-lg mb-10">
              Deploy A-Quire's intelligent intervention platform in your institution today.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <a href="/signup" className="w-full sm:w-auto bg-white text-teal-800 px-10 py-4 rounded-2xl hover:bg-teal-50 transition-all font-bold text-base shadow-xl">
                Request a Demo
              </a>
              <a href="/features" className="w-full sm:w-auto bg-white/10 backdrop-blur border border-white/20 text-white px-10 py-4 rounded-2xl hover:bg-white/20 transition-all font-semibold text-base text-center">
                Explore Features
              </a>
            </div>
          </div>
        </section>
      </main>

      {/* ── Footer ── */}
      <footer className="py-16 border-t border-white/5" style={{background: '#0A0E14'}}>
        <div className="max-w-7xl mx-auto px-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-10">
          <div className="lg:col-span-2">
            <div className="flex items-center gap-2.5 mb-5">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-teal-500 to-teal-700 text-white flex items-center justify-center font-bold shadow-md shadow-teal-500/30">A</div>
              <span className="font-bold text-xl text-white">A-Quire</span>
            </div>
            <p className="text-slate-500 leading-relaxed max-w-sm text-sm">
              AI-powered educational infrastructure ensuring no student struggles silently.
            </p>
          </div>

          {[
            { title: 'Product', links: [['Features', '/features'], ['How it Works', '#how-it-works'], ['Security', '#'], ['Pricing', '#']] },
            { title: 'Company', links: [['About Us', '#'], ['Careers', '#'], ['Contact Sales', '#']] },
            { title: 'Legal', links: [['Privacy Policy', '#'], ['Terms of Service', '#'], ['FERPA Compliance', '#']] },
          ].map(({ title, links }) => (
            <div key={title}>
              <h4 className="font-bold text-white mb-5 text-sm">{title}</h4>
              <ul className="space-y-3">
                {links.map(([label, href]) => (
                  <li key={label}><a href={href} className="text-slate-500 hover:text-teal-400 transition-colors text-sm">{label}</a></li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="max-w-7xl mx-auto px-6 mt-12 pt-8 border-t border-white/5 text-sm text-slate-600 flex flex-col md:flex-row justify-between items-center gap-4">
          <span>© {new Date().getFullYear()} A-Quire EdTech. All rights reserved.</span>
          <div className="flex gap-5">
            <span className="flex items-center gap-1.5"><ShieldCheck className="w-4 h-4 text-teal-500" /> Locally Processed</span>
            <span className="flex items-center gap-1.5"><CheckCircle2 className="w-4 h-4 text-teal-500" /> FERPA Compliant</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
