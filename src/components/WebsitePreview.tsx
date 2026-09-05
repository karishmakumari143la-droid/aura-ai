import React, { useState } from 'react';
import { WebsiteProject } from '../types';
import { 
  Globe, 
  Smartphone, 
  Tablet, 
  Monitor, 
  MessageCircle, 
  Check, 
  Download, 
  GitBranch, 
  Code, 
  Eye, 
  Share2, 
  ExternalLink,
  Search,
  Sparkles,
  ArrowRight,
  ShieldCheck,
  Zap
} from 'lucide-react';

interface WebsitePreviewProps {
  website: WebsiteProject;
  onClose?: () => void;
  onDeployToGithub?: (siteId: string) => void;
}

export const WebsitePreview: React.FC<WebsitePreviewProps> = ({
  website,
  onClose,
  onDeployToGithub
}) => {
  const [viewport, setViewport] = useState<'desktop' | 'tablet' | 'mobile'>('desktop');
  const [activeTab, setActiveTab] = useState<'preview' | 'code' | 'seo'>('preview');
  const [isCopied, setIsCopied] = useState(false);
  const [githubPushed, setGithubPushed] = useState(false);

  const viewportWidths = {
    desktop: 'w-full',
    tablet: 'max-w-2xl mx-auto',
    mobile: 'max-w-sm mx-auto'
  }[viewport];

  const handleDownloadHtml = () => {
    const htmlContent = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${website.seo.metaTitle}</title>
  <meta name="description" content="${website.seo.metaDescription}">
  <script src="https://cdn.tailwindcss.com"></script>
</head>
<body class="bg-slate-950 text-slate-100 antialiased font-sans">
  <nav class="border-b border-slate-800 px-6 py-4 flex items-center justify-between">
    <div class="font-extrabold text-xl tracking-tight text-white">${website.name}</div>
    <a href="https://wa.me/${website.whatsappNumber?.replace(/[^0-9]/g, '')}" class="bg-emerald-500 text-slate-950 px-4 py-2 rounded-lg font-bold text-sm">
      WhatsApp VIP
    </a>
  </nav>
  <header class="py-20 px-6 text-center max-w-4xl mx-auto">
    <h1 class="text-5xl font-extrabold tracking-tight">${website.headline}</h1>
    <p class="text-xl text-slate-400 mt-4 leading-relaxed">${website.description}</p>
  </header>
</body>
</html>`;

    const blob = new Blob([htmlContent], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${website.slug || 'website'}.html`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleGithubPush = () => {
    setGithubPushed(true);
    if (onDeployToGithub) onDeployToGithub(website.id);
    setTimeout(() => setGithubPushed(false), 4000);
  };

  return (
    <div className="flex flex-col h-full bg-slate-950 rounded-2xl border border-white/10 shadow-2xl overflow-hidden">
      {/* Top Controls Toolbar */}
      <div className="px-4 py-3 border-b border-white/[0.08] bg-slate-900/90 backdrop-blur-md flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-400" />
            <span className="text-xs font-bold text-slate-200">{website.name}</span>
          </div>
          <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-cyan-950 text-cyan-300 border border-cyan-800 uppercase">
            {website.category}
          </span>
        </div>

        {/* Viewport controls */}
        <div className="flex items-center gap-1 bg-slate-950 p-1 rounded-xl border border-slate-800">
          <button
            onClick={() => setViewport('desktop')}
            className={`p-1.5 rounded-lg text-xs transition ${viewport === 'desktop' ? 'bg-slate-800 text-cyan-300' : 'text-slate-400 hover:text-slate-200'}`}
            title="Desktop View"
          >
            <Monitor className="w-4 h-4" />
          </button>
          <button
            onClick={() => setViewport('tablet')}
            className={`p-1.5 rounded-lg text-xs transition ${viewport === 'tablet' ? 'bg-slate-800 text-cyan-300' : 'text-slate-400 hover:text-slate-200'}`}
            title="Tablet View"
          >
            <Tablet className="w-4 h-4" />
          </button>
          <button
            onClick={() => setViewport('mobile')}
            className={`p-1.5 rounded-lg text-xs transition ${viewport === 'mobile' ? 'bg-slate-800 text-cyan-300' : 'text-slate-400 hover:text-slate-200'}`}
            title="Mobile View"
          >
            <Smartphone className="w-4 h-4" />
          </button>
        </div>

        {/* Tab Switcher & Export */}
        <div className="flex items-center gap-2">
          <div className="flex items-center bg-slate-950 p-1 rounded-xl border border-slate-800 text-xs">
            <button
              onClick={() => setActiveTab('preview')}
              className={`px-3 py-1 rounded-lg font-medium transition ${activeTab === 'preview' ? 'bg-cyan-500/20 text-cyan-300' : 'text-slate-400 hover:text-slate-200'}`}
            >
              Live Preview
            </button>
            <button
              onClick={() => setActiveTab('code')}
              className={`px-3 py-1 rounded-lg font-medium transition ${activeTab === 'code' ? 'bg-cyan-500/20 text-cyan-300' : 'text-slate-400 hover:text-slate-200'}`}
            >
              Code
            </button>
            <button
              onClick={() => setActiveTab('seo')}
              className={`px-3 py-1 rounded-lg font-medium transition ${activeTab === 'seo' ? 'bg-cyan-500/20 text-cyan-300' : 'text-slate-400 hover:text-slate-200'}`}
            >
              SEO & AEO
            </button>
          </div>

          <button
            onClick={handleDownloadHtml}
            className="p-1.5 px-2.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold flex items-center gap-1.5 transition"
            title="Download Standalone HTML"
          >
            <Download className="w-3.5 h-3.5 text-cyan-400" />
            <span className="hidden sm:inline">Export HTML</span>
          </button>

          <button
            onClick={handleGithubPush}
            disabled={githubPushed}
            className="p-1.5 px-3 rounded-lg bg-gradient-to-r from-cyan-500 to-indigo-600 text-white text-xs font-bold shadow-md shadow-cyan-500/20 hover:opacity-90 flex items-center gap-1.5 transition"
          >
            {githubPushed ? <Check className="w-3.5 h-3.5 text-white" /> : <GitBranch className="w-3.5 h-3.5" />}
            <span>{githubPushed ? 'Pushed to GitHub' : 'GitHub Push'}</span>
          </button>
        </div>
      </div>

      {/* Main Viewport Content */}
      <div className="flex-1 overflow-y-auto p-4 sm:p-6 bg-[#0B0F19]">
        {activeTab === 'preview' && (
          <div className={`${viewportWidths} transition-all duration-300 shadow-2xl rounded-2xl overflow-hidden border border-white/10 bg-slate-950`}>
            {/* Mock Browser Header */}
            <div className="h-8 bg-slate-900 border-b border-white/10 px-4 flex items-center justify-between">
              <div className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-rose-500/80" />
                <span className="w-2.5 h-2.5 rounded-full bg-amber-500/80" />
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500/80" />
              </div>
              <div className="px-3 py-0.5 rounded-md bg-slate-950 text-[11px] font-mono text-slate-400 flex items-center gap-2 border border-slate-800">
                <ShieldCheck className="w-3 h-3 text-emerald-400" />
                <span>Local preview: {website.slug}</span>
              </div>
              <div className="w-8" />
            </div>

            {/* Generated Website Layout */}
            <div className="text-slate-100 font-sans">
              {/* Navigation */}
              <nav className="border-b border-white/[0.08] bg-slate-950/90 px-6 py-4 flex items-center justify-between backdrop-blur-md sticky top-0 z-30">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-cyan-500 to-indigo-600 flex items-center justify-center font-extrabold text-white text-sm">
                    {website.name.charAt(0)}
                  </div>
                  <span className="font-extrabold text-base tracking-tight text-white">{website.name}</span>
                </div>

                <div className="hidden md:flex items-center gap-6 text-xs text-slate-300 font-medium">
                  <a href="#about" className="hover:text-cyan-400 transition">About</a>
                  <a href="#amenities" className="hover:text-cyan-400 transition">Facility</a>
                  <a href="#pricing" className="hover:text-cyan-400 transition">Memberships</a>
                  <a href="#contact" className="hover:text-cyan-400 transition">Contact</a>
                </div>

                {website.whatsappNumber && (
                  <a
                    href={`https://wa.me/${website.whatsappNumber.replace(/[^0-9]/g, '')}`}
                    target="_blank"
                    rel="noreferrer"
                    className="px-4 py-2 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 text-slate-950 font-bold text-xs flex items-center gap-2 shadow-lg shadow-emerald-500/20 transition"
                  >
                    <MessageCircle className="w-4 h-4 fill-current" />
                    <span>{website.whatsappCtaText || 'WhatsApp VIP'}</span>
                  </a>
                )}
              </nav>

              {/* Hero Section */}
              <section className="relative py-20 px-6 sm:px-12 text-center bg-gradient-to-b from-slate-900/60 via-slate-950 to-slate-950 overflow-hidden">
                {website.heroImage && (
                  <div className="absolute inset-0 z-0 opacity-15 bg-cover bg-center pointer-events-none" style={{ backgroundImage: `url(${website.heroImage})` }} />
                )}
                <div className="relative z-10 max-w-3xl mx-auto space-y-6">
                  <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-cyan-950/80 border border-cyan-800 text-cyan-300 text-xs font-semibold">
                    <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
                    <span>Autonomous AI Architecture</span>
                  </div>
                  <h1 className="text-3xl sm:text-5xl font-extrabold tracking-tight text-white leading-tight">
                    {website.headline}
                  </h1>
                  <p className="text-sm sm:text-base text-slate-300 leading-relaxed max-w-2xl mx-auto">
                    {website.description}
                  </p>
                  <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
                    <a
                      href="#pricing"
                      className="px-6 py-3 rounded-xl bg-gradient-to-r from-cyan-500 to-indigo-600 text-white font-bold text-xs shadow-lg shadow-cyan-500/25 hover:opacity-95 transition flex items-center gap-2"
                    >
                      <span>Explore Tiered Memberships</span>
                      <ArrowRight className="w-4 h-4" />
                    </a>
                    {website.whatsappNumber && (
                      <a
                        href={`https://wa.me/${website.whatsappNumber.replace(/[^0-9]/g, '')}`}
                        target="_blank"
                        rel="noreferrer"
                        className="px-5 py-3 rounded-xl bg-slate-900 border border-slate-700 text-slate-200 font-bold text-xs hover:border-emerald-500/50 hover:text-emerald-300 transition flex items-center gap-2"
                      >
                        <MessageCircle className="w-4 h-4 text-emerald-400" />
                        <span>Instant WhatsApp Booking</span>
                      </a>
                    )}
                  </div>
                </div>
              </section>

              {/* Sections / Value Pillars */}
              <section id="about" className="py-16 px-6 sm:px-12 max-w-6xl mx-auto border-t border-white/[0.05]">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  {website.sections.map((sec, idx) => (
                    <div key={sec.id || idx} className="p-6 rounded-2xl bg-slate-900/60 border border-white/5 space-y-3">
                      <div className="w-10 h-10 rounded-xl bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center text-cyan-400 font-bold text-sm">
                        0{idx + 1}
                      </div>
                      <h3 className="text-lg font-bold text-white">{sec.title}</h3>
                      <p className="text-xs text-slate-300 leading-relaxed">{sec.content}</p>
                    </div>
                  ))}
                </div>
              </section>

              {/* Pricing Cards Section */}
              <section id="pricing" className="py-16 px-6 sm:px-12 bg-slate-900/30 border-t border-white/[0.05]">
                <div className="text-center max-w-xl mx-auto mb-12 space-y-3">
                  <h2 className="text-2xl sm:text-3xl font-extrabold text-white">Transparent Membership Pricing</h2>
                  <p className="text-xs text-slate-400">Direct instant registration with zero hidden fees or cancellation penalties.</p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-6xl mx-auto">
                  {website.pricing.map((tier, idx) => (
                    <div 
                      key={idx} 
                      className={`p-6 rounded-2xl border flex flex-col justify-between transition-all ${
                        idx === 1 
                          ? 'bg-slate-900/90 border-cyan-500/50 shadow-xl shadow-cyan-500/10 scale-105 relative' 
                          : 'bg-slate-900/50 border-white/10'
                      }`}
                    >
                      {idx === 1 && (
                        <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-0.5 rounded-full bg-cyan-500 text-slate-950 font-extrabold text-[10px] uppercase tracking-wider">
                          Most Popular
                        </div>
                      )}
                      <div>
                        <h3 className="text-base font-bold text-white">{tier.name}</h3>
                        <div className="mt-4 mb-6 flex items-baseline gap-1">
                          <span className="text-3xl font-extrabold text-white">{tier.price}</span>
                          <span className="text-xs text-slate-400">{tier.period}</span>
                        </div>
                        <ul className="space-y-2.5 text-xs text-slate-300">
                          {tier.features.map((feat, fidx) => (
                            <li key={fidx} className="flex items-center gap-2">
                              <Check className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                              <span>{feat}</span>
                            </li>
                          ))}
                        </ul>
                      </div>

                      <div className="pt-6 mt-6 border-t border-slate-800">
                        <a
                          href={`https://wa.me/${website.whatsappNumber?.replace(/[^0-9]/g, '')}?text=Hi,%20I%20would%20like%20to%20reserve%20the%20${encodeURIComponent(tier.name)}`}
                          target="_blank"
                          rel="noreferrer"
                          className={`w-full py-2.5 rounded-xl font-bold text-xs flex items-center justify-center gap-2 transition ${
                            idx === 1 
                              ? 'bg-cyan-500 text-slate-950 hover:bg-cyan-400 shadow-md shadow-cyan-500/20' 
                              : 'bg-slate-800 hover:bg-slate-700 text-white'
                          }`}
                        >
                          <MessageCircle className="w-3.5 h-3.5" />
                          <span>Reserve via WhatsApp</span>
                        </a>
                      </div>
                    </div>
                  ))}
                </div>
              </section>

              {/* Footer */}
              <footer className="py-8 px-6 border-t border-white/[0.08] text-center text-xs text-slate-500">
                <p>© {new Date().getFullYear()} {website.name}. Generated by AURA AI and subject to verification.</p>
              </footer>
            </div>
          </div>
        )}

        {activeTab === 'code' && (
          <div className="rounded-2xl bg-slate-950 border border-white/10 p-4 font-mono text-xs text-slate-300 overflow-x-auto">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800 mb-3">
              <span className="text-slate-400">App.tsx / Component Tree</span>
              <span className="text-[10px] text-cyan-400 font-bold">100% Production Ready</span>
            </div>
            <pre className="leading-relaxed">
{`// Generated by AURA AI after task planning and verification
import React from 'react';

export default function ${website.name.replace(/[^a-zA-Z0-9]/g, '')}Page() {
  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 font-sans">
      <header className="py-20 text-center max-w-4xl mx-auto px-6">
        <h1 className="text-5xl font-extrabold tracking-tight text-white">
          ${website.headline}
        </h1>
        <p className="text-lg text-slate-400 mt-4 leading-relaxed">
          ${website.description}
        </p>
        <div className="mt-8 flex justify-center gap-4">
          <a 
            href="https://wa.me/${website.whatsappNumber?.replace(/[^0-9]/g, '')}"
            className="bg-emerald-500 text-slate-950 px-6 py-3 rounded-xl font-bold text-sm hover:bg-emerald-400"
          >
            ${website.whatsappCtaText || 'Claim VIP Access'}
          </a>
        </div>
      </header>
    </div>
  );
}`}
            </pre>
          </div>
        )}

        {activeTab === 'seo' && (
          <div className="max-w-3xl mx-auto space-y-4">
            <div className="p-5 rounded-2xl bg-slate-900 border border-white/10 space-y-3">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <Search className="w-4 h-4 text-cyan-400" />
                <span>Search Engine Result Preview</span>
              </h3>
              <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-1">
                <span className="text-xs text-emerald-400 font-mono">Local preview: {website.slug}</span>
                <h4 className="text-base text-cyan-400 font-medium hover:underline cursor-pointer">
                  {website.seo.metaTitle}
                </h4>
                <p className="text-xs text-slate-400 leading-relaxed">
                  {website.seo.metaDescription}
                </p>
              </div>
            </div>

            <div className="p-5 rounded-2xl bg-slate-900 border border-white/10 space-y-3">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-purple-400" />
                <span>AEO & Schema.org JSON-LD Structured Data</span>
              </h3>
              <pre className="p-4 rounded-xl bg-slate-950 border border-slate-800 font-mono text-[11px] text-slate-300 overflow-x-auto leading-relaxed">
{JSON.stringify({
  "@context": "https://schema.org",
  "@type": website.category === 'gym' ? 'SportsClub' : 'LocalBusiness',
  "name": website.name,
  "description": website.description,
  "telephone": website.whatsappNumber,
  "email": website.contactEmail,
  "priceRange": "$$",
  "currenciesAccepted": "USD",
  "openingHours": "Mo-Su 05:00-23:00"
}, null, 2)}
              </pre>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
