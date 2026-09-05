import React, { useState } from 'react';
import { 
  Sparkles, 
  ArrowRight, 
  Check, 
  Globe, 
  Zap, 
  Shield, 
  Cpu, 
  Layers, 
  Users, 
  GitBranch, 
  MessageSquare, 
  Play, 
  ChevronDown, 
  ChevronUp, 
  Terminal,
  Crown,
  Database,
  Code2,
  Mic,
  ShieldCheck
} from 'lucide-react';
import { AuraCore } from './aura/AuraCore';
import { AuraLogo } from './aura/AuraLogo';
import { AuraState } from '../types';

interface LandingPageProps {
  onStartUsingAI: () => void;
  onOpenPricing?: () => void;
  onLogin?: () => void;
  onPromptSelect?: (prompt: string) => void;
}

export const LandingPage: React.FC<LandingPageProps> = ({
  onStartUsingAI,
  onOpenPricing,
  onLogin,
  onPromptSelect
}) => {
  const [openFaq, setOpenFaq] = useState<number | null>(0);
  const [heroState, setHeroState] = useState<AuraState>('IDLE');
  const [heroPrompt, setHeroPrompt] = useState<string>('');

  const samplePrompts = [
    'Create a modern gym website with pricing and WhatsApp VIP booking',
    'Orchestrate parallel UI design and code synthesis for a SaaS app',
    'Automate lead capture workflow via n8n webhooks',
    'Review desktop companion computer permissions sandbox'
  ];

  const handleHeroSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (heroPrompt.trim() && onPromptSelect) {
      onPromptSelect(heroPrompt.trim());
    } else {
      onStartUsingAI();
    }
  };

  const faqs = [
    {
      q: 'How does AURA AI differ from standard conversational chatbots?',
      a: 'AURA is a living AI partner powered by a parallel multi-agent cognitive architecture. Instead of returning plain text, AURA plans an execution DAG, assigning tasks simultaneously to specialized agents (PIXEL for UI design, CODE for full-stack engineering, SCOUT for deep research, and QA for security validation) while rendering live progress.'
    },
    {
      q: 'How does the AURA AI access model work?',
      a: 'AURA AI is 100% free for all users. Every user can create up to 5 full new projects per calendar day. Once a project is created, you can perform unlimited tasks, edits, design changes, and automation workflows inside that project without counting against your daily limit.'
    },
    {
      q: 'Are there any subscriptions, paid credits, or credit card requirements?',
      a: 'No. There are zero payment gateways, subscriptions, or credit card forms. All users enjoy free access to the living neural interface, autonomous website builder, memory engine, and parallel specialist workforce.'
    },
    {
      q: 'When does the daily project counter reset?',
      a: 'The daily project allowance automatically resets every new day at midnight (00:00 UTC), providing 5 fresh project slots every single day.'
    },
    {
      q: 'How does AURA ensure security when controlling computer tools?',
      a: 'AURA uses an explicit permission matrix (ALLOW, ASK, DENY) for filesystem access, terminal commands, browser actions, and screen capture. Nothing executes without transparent authorization.'
    },
    {
      q: 'How does the Voice Reactivity engine function?',
      a: 'AURA directly interfaces with browser Web Audio APIs. As AURA speaks or listens, an AnalyserNode measures live audio amplitude and frequency bands, dynamically pulsating the concentric orbital particles and central orb glow in real time.'
    }
  ];

  return (
    <div className="min-h-screen bg-[#030509] text-slate-100 font-sans selection:bg-cyan-500/30 selection:text-cyan-200">
      {/* 1. Public Top Navigation */}
      <nav className="border-b border-white/[0.08] bg-slate-950/70 backdrop-blur-xl px-6 py-4 flex items-center justify-between sticky top-0 z-50">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-cyan-500 via-blue-600 to-purple-600 p-0.5 shadow-lg shadow-cyan-500/20">
            <div className="w-full h-full bg-slate-950 rounded-[10px] flex items-center justify-center">
              <span className="text-cyan-400 font-extrabold text-xs">AI</span>
            </div>
          </div>
            <AuraLogo size={34} />
        </div>

        <div className="hidden md:flex items-center gap-7 text-xs font-medium text-slate-300">
          <a href="#demo" className="hover:text-cyan-400 transition">Demonstration</a>
          <a href="#capabilities" className="hover:text-cyan-400 transition">Capabilities</a>
          <a href="#how-it-works" className="hover:text-cyan-400 transition">How It Works</a>
          <a href="#workforce" className="hover:text-cyan-400 transition">AI Workforce</a>
          <a href="#access-model" className="hover:text-cyan-400 transition">Access Model</a>
          {onLogin && (
            <button onClick={onLogin} className="hover:text-cyan-400 transition">Sign In</button>
          )}
        </div>

        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={onStartUsingAI}
            className="px-5 py-2.5 rounded-xl text-xs font-bold bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-slate-950 shadow-lg shadow-cyan-500/20 transition flex items-center gap-2 cursor-pointer"
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>Talk to AURA</span>
          </button>
        </div>
      </nav>

      {/* 2. Hero Section Centered on the Living AURA AI */}
      <section className="relative pt-12 pb-20 px-4 sm:px-6 max-w-5xl mx-auto flex flex-col items-center text-center">
        {/* Living Circular AI Core with Real Programmatic Particles */}
        <div className="relative my-4">
          <AuraCore
            state={heroState}
            size="hero"
            showLabel
            onCoreClick={() => {
              setHeroState(prev => prev === 'IDLE' ? 'THINKING' : prev === 'THINKING' ? 'PLANNING' : 'IDLE');
            }}
          />
        </div>

        {/* Hero Headline & Subheadline */}
        <h1 className="text-4xl sm:text-6xl font-extrabold tracking-tight text-white max-w-3xl mt-6">
          Meet <span className="bg-gradient-to-r from-cyan-400 via-sky-300 to-blue-400 bg-clip-text text-transparent">AURA.</span>
        </h1>
        <p className="mt-4 text-base sm:text-lg text-slate-400 max-w-2xl leading-relaxed">
          Your intelligent AI partner that understands, creates, automates and gets work done through living particle physics and parallel agent orchestration.
        </p>

        {/* Action Buttons */}
        <div className="mt-8 flex flex-wrap items-center justify-center gap-4">
          <button
            type="button"
            onClick={onStartUsingAI}
            className="px-7 py-3.5 rounded-2xl text-sm font-bold bg-cyan-400 hover:bg-cyan-300 text-slate-950 shadow-xl shadow-cyan-500/25 transition flex items-center gap-2.5 cursor-pointer"
          >
            <Sparkles className="w-4 h-4" />
            <span>Talk to AURA</span>
            <ArrowRight className="w-4 h-4" />
          </button>

          <a
            href="#how-it-works"
            className="px-7 py-3.5 rounded-2xl text-sm font-bold bg-slate-900/80 hover:bg-slate-800 text-slate-200 border border-white/10 transition"
          >
            See How It Works
          </a>
        </div>

        {/* Quick Command Prompt Input right on the hero */}
        <form
          onSubmit={handleHeroSubmit}
          className="w-full max-w-2xl mt-10 p-2 rounded-2xl bg-slate-950/80 border border-cyan-500/30 backdrop-blur-xl shadow-2xl flex items-center gap-2"
        >
          <div className="p-2.5 text-cyan-400">
            <Mic className="w-4 h-4" />
          </div>
          <input
            type="text"
            value={heroPrompt}
            onChange={(e) => setHeroPrompt(e.target.value)}
            placeholder="Talk to AURA... (e.g., Create a gym website with WhatsApp VIP booking)"
            className="flex-1 bg-transparent text-sm text-slate-100 placeholder-slate-500 focus:outline-none"
          />
          <button
            type="submit"
            className="px-4 py-2 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold text-xs shadow transition"
          >
            Execute
          </button>
        </form>

        {/* Quick idea badges */}
        <div className="flex flex-wrap items-center justify-center gap-2 mt-4 max-w-2xl">
          {samplePrompts.map((p, idx) => (
            <button
              key={idx}
              type="button"
              onClick={() => {
                if (onPromptSelect) onPromptSelect(p);
                else onStartUsingAI();
              }}
              className="text-[11px] px-3 py-1 rounded-xl bg-slate-900/60 hover:bg-slate-800 border border-white/5 hover:border-cyan-500/30 text-slate-400 hover:text-cyan-300 transition text-left"
            >
              {p}
            </button>
          ))}
        </div>
      </section>

      {/* 3. Capabilities Section */}
      <section id="capabilities" className="py-20 px-6 border-t border-white/5 bg-slate-950/40">
        <div className="max-w-6xl mx-auto">
          <div className="text-center max-w-2xl mx-auto">
            <h2 className="text-2xl sm:text-3xl font-bold text-white tracking-tight">
              An AI Partner, Not Just Another Chatbot
            </h2>
            <p className="mt-2 text-sm text-slate-400">
              Engineered with real state reactivity, living particle physics, and autonomous parallel agent delegation.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-12">
            <div className="p-6 rounded-3xl bg-slate-900/50 border border-white/10 hover:border-cyan-500/30 transition">
              <div className="w-10 h-10 rounded-xl bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center text-cyan-400 mb-4">
                <Sparkles className="w-5 h-5" />
              </div>
              <h3 className="text-lg font-bold text-white">Living Neural Interface</h3>
              <p className="mt-2 text-xs leading-relaxed text-slate-400">
                Programmatic multi-layer particle orbits on Canvas 2D that physically breathe, accelerate, contract, and react to live audio frequencies.
              </p>
            </div>

            <div className="p-6 rounded-3xl bg-slate-900/50 border border-white/10 hover:border-cyan-500/30 transition">
              <div className="w-10 h-10 rounded-xl bg-purple-500/10 border border-purple-500/30 flex items-center justify-center text-purple-400 mb-4">
                <Cpu className="w-5 h-5" />
              </div>
              <h3 className="text-lg font-bold text-white">Parallel Task DAG</h3>
              <p className="mt-2 text-xs leading-relaxed text-slate-400">
                Complex prompts decompose into topological execution levels. Level 0 research and UI design run simultaneously before engineering begins.
              </p>
            </div>

            <div className="p-6 rounded-3xl bg-slate-900/50 border border-white/10 hover:border-cyan-500/30 transition">
              <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400 mb-4">
                <Globe className="w-5 h-5" />
              </div>
              <h3 className="text-lg font-bold text-white">Production Artifacts</h3>
              <p className="mt-2 text-xs leading-relaxed text-slate-400">
                From high-conversion responsive landing pages with WhatsApp VIP booking to n8n webhook automations, AURA synthesizes verified production code.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* 4. AI Workforce Section */}
      <section id="workforce" className="py-20 px-6 border-t border-white/5">
        <div className="max-w-6xl mx-auto">
          <div className="text-center max-w-2xl mx-auto">
            <h2 className="text-2xl sm:text-3xl font-bold text-white tracking-tight">
              AURA Specialist Workforce
            </h2>
            <p className="mt-2 text-sm text-slate-400">
              Each unit performs specialized tasks with verified tool clearances.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 mt-12">
            {[
              { code: 'AU', name: 'AURA', role: 'Cognitive Orchestrator', desc: 'Semantic understanding and DAG task planning.', color: 'border-cyan-500/40' },
              { code: 'PX', name: 'PIXEL', role: 'Visual UI/UX Design', desc: 'Design systems, themes, and spatial wireframes.', color: 'border-pink-500/40' },
              { code: 'CD', name: 'CODE', role: 'Full-Stack Engineer', desc: 'TypeScript code, APIs, and state machine handlers.', color: 'border-blue-500/40' },
              { code: 'SC', name: 'SCOUT', role: 'Deep Researcher', desc: 'Market intelligence, competitor data, and SEO/AEO.', color: 'border-amber-500/40' },
              { code: 'QA', name: 'QA', role: 'Quality & Security', desc: 'WCAG scans, syntax validation, and compliance tests.', color: 'border-emerald-500/40' }
            ].map((worker) => (
              <div
                key={worker.code}
                className={`p-5 rounded-2xl bg-slate-950 border ${worker.color} flex flex-col items-center text-center`}
              >
                <div className="w-10 h-10 rounded-xl bg-slate-900 flex items-center justify-center font-mono font-bold text-cyan-300 text-sm mb-3">
                  {worker.code}
                </div>
                <h4 className="font-bold text-sm text-white">{worker.name}</h4>
                <span className="text-[11px] font-mono text-slate-400 mb-2">{worker.role}</span>
                <p className="text-xs text-slate-400 leading-relaxed">{worker.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 5. Access Model Section (100% Free, 5 Projects / Day) */}
      <section id="access-model" className="py-20 px-6 border-t border-white/5 bg-slate-950/40">
        <div className="max-w-4xl mx-auto text-center">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-cyan-950 text-cyan-300 text-xs font-semibold border border-cyan-800 mb-3">
            <Sparkles className="w-3 h-3 text-cyan-400" />
            <span>Open & Free Creator Access</span>
          </div>
          <h2 className="text-2xl sm:text-3xl font-bold text-white tracking-tight">
            100% Free For All Users
          </h2>
          <p className="mt-2 text-sm text-slate-400 max-w-xl mx-auto">
            No credit card, no checkout, and no subscription plans. Every creator gets 5 new projects every calendar day with unlimited tasks per project.
          </p>

          <div className="mt-10 p-8 rounded-3xl bg-slate-900/80 border border-cyan-500/40 max-w-lg mx-auto shadow-2xl relative overflow-hidden">
            <div className="absolute top-0 right-0 px-4 py-1 rounded-bl-xl bg-cyan-500 text-slate-950 font-mono font-bold text-xs">
              FREE FOR EVERYONE
            </div>
            <h3 className="text-2xl font-bold text-white">Daily Creator Allowance</h3>
            <div className="mt-4 flex items-baseline justify-center gap-1.5">
              <span className="text-5xl font-extrabold text-cyan-400 font-mono">5</span>
              <span className="text-sm font-semibold text-slate-300">Projects / Day</span>
            </div>
            <p className="mt-3 text-xs text-slate-400">
              Resets automatically every day at midnight (00:00 UTC). Zero paywalls.
            </p>

            <ul className="mt-6 space-y-3 text-xs text-slate-300 text-left">
              <li className="flex items-center gap-2">
                <Check className="w-4 h-4 text-emerald-400 shrink-0" />
                <span><strong>5 New Projects Every Day</strong> — restaurant, gym, salon, portfolio & more</span>
              </li>
              <li className="flex items-center gap-2">
                <Check className="w-4 h-4 text-emerald-400 shrink-0" />
                <span><strong>Unlimited Tasks Per Project</strong> — endless edits, commands & workflows</span>
              </li>
              <li className="flex items-center gap-2">
                <Check className="w-4 h-4 text-emerald-400 shrink-0" />
                <span><strong>Living AURA Core</strong> with dynamic audio reactivity & Canvas physics</span>
              </li>
              <li className="flex items-center gap-2">
                <Check className="w-4 h-4 text-emerald-400 shrink-0" />
                <span><strong>Multi-agent execution</strong> with task planning and verification</span>
              </li>
              <li className="flex items-center gap-2">
                <Check className="w-4 h-4 text-emerald-400 shrink-0" />
                <span><strong>Zero Payment Forms</strong> — no credit cards, subscriptions, or upgrades</span>
              </li>
            </ul>

            <button
              type="button"
              onClick={onStartUsingAI}
              className="w-full mt-8 py-3.5 rounded-2xl bg-cyan-400 hover:bg-cyan-300 text-slate-950 font-bold text-sm shadow-xl shadow-cyan-500/20 transition cursor-pointer"
            >
              Start Creating Now
            </button>
          </div>
        </div>
      </section>

      {/* 6. FAQ */}
      <section id="faq" className="py-20 px-6 border-t border-white/5">
        <div className="max-w-3xl mx-auto">
          <h2 className="text-2xl font-bold text-white text-center mb-8">Frequently Asked Questions</h2>
          <div className="space-y-4">
            {faqs.map((faq, idx) => (
              <div key={idx} className="border border-white/10 rounded-2xl bg-slate-900/60 overflow-hidden">
                <button
                  type="button"
                  onClick={() => setOpenFaq(openFaq === idx ? null : idx)}
                  className="w-full p-5 text-left font-semibold text-sm flex items-center justify-between text-white"
                >
                  <span>{faq.q}</span>
                  {openFaq === idx ? <ChevronUp className="w-4 h-4 text-cyan-400" /> : <ChevronDown className="w-4 h-4 text-slate-400" />}
                </button>
                {openFaq === idx && (
                  <div className="px-5 pb-5 text-xs leading-relaxed text-slate-400 border-t border-white/5 pt-3">
                    {faq.a}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-8 px-6 border-t border-white/5 text-center text-xs text-slate-500">
        <p>AURA AI — Your Intelligent AI Partner. Living Neural Intelligence & Parallel Automation.</p>
      </footer>
    </div>
  );
};
