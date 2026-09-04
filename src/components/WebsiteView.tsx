import React, { useState } from 'react';
import { WebsiteProject } from '../types';
import { 
  Globe, 
  Smartphone, 
  Tablet, 
  Monitor, 
  ExternalLink, 
  Code, 
  CheckCircle2, 
  MessageSquare, 
  Copy, 
  Check, 
  Sparkles,
  Search,
  Eye
} from 'lucide-react';

interface WebsiteViewProps {
  websites: WebsiteProject[];
  onSelectSite?: (site: WebsiteProject) => void;
  onUpdateSite?: (site: WebsiteProject) => void;
}

export const WebsiteView: React.FC<WebsiteViewProps> = ({
  websites,
  onSelectSite,
  onUpdateSite
}) => {
  const [selectedSite, setSelectedSite] = useState<WebsiteProject>(websites[0] || null);
  const [deviceMode, setDeviceMode] = useState<'desktop' | 'tablet' | 'mobile'>('desktop');
  const [viewMode, setViewMode] = useState<'preview' | 'code' | 'seo'>('preview');
  const [copied, setCopied] = useState(false);

  if (!selectedSite) {
    return (
      <div className="p-12 text-center text-slate-500 rounded-3xl bg-slate-950 border border-white/10 font-mono text-xs">
        No synthesized website platforms found. Issue a command like "Create my gym website" to generate one.
      </div>
    );
  }

  const getContainerWidth = () => {
    switch (deviceMode) {
      case 'mobile': return 'max-w-[375px]';
      case 'tablet': return 'max-w-[768px]';
      default: return 'w-full';
    }
  };

  const copyHtml = () => {
    const htmlCode = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>${selectedSite.seo.metaTitle}</title>
  <meta name="description" content="${selectedSite.seo.metaDescription}">
  <script src="https://cdn.tailwindcss.com"></script>
</head>
<body class="bg-slate-950 text-white font-sans">
  <!-- Hero -->
  <section class="py-24 px-6 text-center max-w-4xl mx-auto">
    <h1 class="text-4xl font-extrabold mb-4">${selectedSite.headline}</h1>
    <p class="text-slate-400 text-lg mb-8">${selectedSite.description}</p>
    <a href="https://wa.me/${selectedSite.whatsappNumber?.replace(/[^0-9]/g, '')}" class="bg-emerald-500 text-slate-950 font-bold px-8 py-3 rounded-xl">${selectedSite.whatsappCtaText}</a>
  </section>
</body>
</html>`;
    navigator.clipboard.writeText(htmlCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="w-full space-y-6 select-none">
      {/* Platform Selector Bar */}
      <div className="p-4 rounded-3xl bg-slate-950 border border-white/10 flex items-center justify-between flex-wrap gap-4">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-2xl bg-cyan-500/10 border border-cyan-500/30 text-cyan-400">
            <Globe className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-sm font-bold text-white">{selectedSite.name}</span>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-cyan-950 text-cyan-300 border border-cyan-800 uppercase">
                {selectedSite.category}
              </span>
              <span className="text-[10px] font-mono text-emerald-400">STATUS: READY</span>
            </div>
            <p className="text-xs text-slate-400">Slug: /{selectedSite.slug}</p>
          </div>
        </div>

        {/* Device Mode & View Mode Toggles */}
        <div className="flex items-center gap-3">
          <div className="flex rounded-xl bg-slate-900 p-1 border border-white/10 text-xs">
            <button
              onClick={() => setDeviceMode('desktop')}
              className={`p-1.5 rounded-lg transition ${deviceMode === 'desktop' ? 'bg-cyan-500 text-slate-950' : 'text-slate-400 hover:text-white'}`}
              title="Desktop View (1440px)"
            >
              <Monitor className="w-4 h-4" />
            </button>
            <button
              onClick={() => setDeviceMode('tablet')}
              className={`p-1.5 rounded-lg transition ${deviceMode === 'tablet' ? 'bg-cyan-500 text-slate-950' : 'text-slate-400 hover:text-white'}`}
              title="Tablet View (768px)"
            >
              <Tablet className="w-4 h-4" />
            </button>
            <button
              onClick={() => setDeviceMode('mobile')}
              className={`p-1.5 rounded-lg transition ${deviceMode === 'mobile' ? 'bg-cyan-500 text-slate-950' : 'text-slate-400 hover:text-white'}`}
              title="Mobile View (375px)"
            >
              <Smartphone className="w-4 h-4" />
            </button>
          </div>

          <div className="flex rounded-xl bg-slate-900 p-1 border border-white/10 text-xs">
            <button
              onClick={() => setViewMode('preview')}
              className={`px-3 py-1 rounded-lg font-semibold transition ${viewMode === 'preview' ? 'bg-cyan-500 text-slate-950' : 'text-slate-400 hover:text-white'}`}
            >
              Preview
            </button>
            <button
              onClick={() => setViewMode('code')}
              className={`px-3 py-1 rounded-lg font-semibold transition ${viewMode === 'code' ? 'bg-cyan-500 text-slate-950' : 'text-slate-400 hover:text-white'}`}
            >
              HTML Code
            </button>
            <button
              onClick={() => setViewMode('seo')}
              className={`px-3 py-1 rounded-lg font-semibold transition ${viewMode === 'seo' ? 'bg-cyan-500 text-slate-950' : 'text-slate-400 hover:text-white'}`}
            >
              SEO Meta
            </button>
          </div>
        </div>
      </div>

      {/* Main Canvas Area */}
      <div className="w-full flex justify-center bg-slate-950/60 p-6 rounded-3xl border border-white/10 min-h-[560px]">
        <div className={`transition-all duration-300 ${getContainerWidth()} mx-auto`}>
          {viewMode === 'preview' && (
            <div className="rounded-2xl border border-white/10 bg-[#070A11] overflow-hidden shadow-2xl relative">
              {/* Fake Browser Top bar */}
              <div className="px-4 py-2.5 bg-slate-900/90 border-b border-white/10 flex items-center justify-between text-xs font-mono text-slate-400">
                <div className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-rose-500/80" />
                  <span className="w-2.5 h-2.5 rounded-full bg-amber-500/80" />
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-500/80" />
                </div>
                <div className="px-3 py-0.5 rounded-md bg-slate-950 border border-white/5 text-[11px]">
                  https://preview.aether.os/{selectedSite.slug}
                </div>
                <span className="text-[10px] text-emerald-400 font-bold">HTTPS SECURE</span>
              </div>

              {/* Website Content */}
              <div className="p-8 space-y-12">
                {/* Hero Header */}
                <div className="text-center max-w-2xl mx-auto space-y-4">
                  <span className="text-xs font-mono tracking-widest text-cyan-400 uppercase font-semibold">
                    {selectedSite.category.toUpperCase()} PERFORMANCE
                  </span>
                  <h1 className="text-3xl sm:text-4xl font-black text-white tracking-tight leading-tight">
                    {selectedSite.headline}
                  </h1>
                  <p className="text-sm text-slate-300 leading-relaxed max-w-xl mx-auto">
                    {selectedSite.description}
                  </p>
                  
                  {/* WhatsApp Hero CTA Button */}
                  {selectedSite.whatsappNumber && (
                    <div className="pt-2">
                      <a
                        href={`https://wa.me/${selectedSite.whatsappNumber.replace(/[^0-9]/g, '')}`}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs shadow-lg shadow-emerald-500/25 transition transform hover:-translate-y-0.5"
                      >
                        <MessageSquare className="w-4 h-4 fill-current" />
                        {selectedSite.whatsappCtaText || 'Connect via WhatsApp'}
                      </a>
                    </div>
                  )}
                </div>

                {/* Hero Image */}
                {selectedSite.heroImage && (
                  <div className="w-full h-64 sm:h-80 rounded-2xl overflow-hidden border border-white/10 relative shadow-2xl">
                    <img
                      src={selectedSite.heroImage}
                      alt={selectedSite.name}
                      referrerPolicy="no-referrer"
                      className="w-full h-full object-cover"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-[#070A11] via-transparent to-transparent" />
                  </div>
                )}

                {/* Pricing Cards Grid */}
                <div className="space-y-4">
                  <div className="text-center">
                    <h2 className="text-xl font-bold text-white">Membership Tiers & Pricing</h2>
                    <p className="text-xs text-slate-400">Transparent pricing with zero hidden fees</p>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-4">
                    {selectedSite.pricing.map((tier, idx) => (
                      <div
                        key={tier.name}
                        className={`p-6 rounded-2xl border flex flex-col justify-between ${
                          idx === 1 
                            ? 'bg-slate-900 border-cyan-500 shadow-lg shadow-cyan-500/10' 
                            : 'bg-slate-900/60 border-white/10'
                        }`}
                      >
                        <div className="space-y-3">
                          {idx === 1 && (
                            <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-cyan-950 text-cyan-300 font-bold">
                              MOST POPULAR
                            </span>
                          )}
                          <h3 className="text-base font-bold text-white">{tier.name}</h3>
                          <div className="flex items-baseline gap-1">
                            <span className="text-3xl font-black text-white">{tier.price}</span>
                            <span className="text-xs text-slate-400">{tier.period}</span>
                          </div>
                          <ul className="space-y-2 pt-2 text-xs text-slate-300">
                            {tier.features.map((feat) => (
                              <li key={feat} className="flex items-start gap-2">
                                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                                <span>{feat}</span>
                              </li>
                            ))}
                          </ul>
                        </div>

                        <div className="pt-6">
                          <button
                            onClick={() => alert(`Selected tier: ${tier.name}. Direct booking opened.`)}
                            className={`w-full py-2.5 rounded-xl font-bold text-xs transition ${
                              idx === 1 
                                ? 'bg-cyan-500 hover:bg-cyan-400 text-slate-950 shadow-md' 
                                : 'bg-slate-800 hover:bg-slate-700 text-white'
                            }`}
                          >
                            Select {tier.name}
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Content Sections */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-6 border-t border-white/10">
                  {selectedSite.sections.map((sec) => (
                    <div key={sec.id} className="space-y-2">
                      <h4 className="text-sm font-bold text-white">{sec.title}</h4>
                      <p className="text-xs text-slate-400 leading-relaxed">{sec.content}</p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Floating WhatsApp VIP CTA button at bottom right (matches memory rule!) */}
              {selectedSite.whatsappNumber && (
                <div className="sticky bottom-6 right-6 flex justify-end p-4 pointer-events-none">
                  <a
                    href={`https://wa.me/${selectedSite.whatsappNumber.replace(/[^0-9]/g, '')}`}
                    target="_blank"
                    rel="noreferrer"
                    className="pointer-events-auto flex items-center gap-2 px-4 py-2.5 rounded-full bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs shadow-2xl shadow-emerald-500/40 transition transform hover:scale-105"
                  >
                    <MessageSquare className="w-4 h-4 fill-current" />
                    <span>WhatsApp VIP Concierge</span>
                  </a>
                </div>
              )}
            </div>
          )}

          {viewMode === 'code' && (
            <div className="p-5 rounded-2xl bg-slate-900 border border-white/10 space-y-4 font-mono text-xs">
              <div className="flex items-center justify-between">
                <span className="text-slate-400">Synthesized HTML5 & Tailwind Source</span>
                <button
                  onClick={copyHtml}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold text-xs transition"
                >
                  {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                  {copied ? 'Copied' : 'Copy Code'}
                </button>
              </div>
              <pre className="p-4 rounded-xl bg-slate-950 text-slate-300 max-h-96 overflow-y-auto overflow-x-auto border border-white/5 leading-relaxed">
{`<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>${selectedSite.seo.metaTitle}</title>
  <meta name="description" content="${selectedSite.seo.metaDescription}">
  <script src="https://cdn.tailwindcss.com"></script>
</head>
<body class="bg-slate-950 text-white font-sans">
  <header class="py-20 px-6 text-center max-w-4xl mx-auto">
    <h1 class="text-4xl font-black mb-4">${selectedSite.headline}</h1>
    <p class="text-slate-400 text-lg mb-8">${selectedSite.description}</p>
    <a href="https://wa.me/${selectedSite.whatsappNumber?.replace(/[^0-9]/g, '')}" class="bg-emerald-500 text-slate-950 font-bold px-8 py-3 rounded-xl">${selectedSite.whatsappCtaText}</a>
  </header>
</body>
</html>`}
              </pre>
            </div>
          )}

          {viewMode === 'seo' && (
            <div className="p-6 rounded-2xl bg-slate-900 border border-white/10 space-y-4">
              <h3 className="text-sm font-bold text-white">SEO & Answer Engine Optimization (AEO)</h3>
              <div className="space-y-3 text-xs">
                <div className="p-3.5 rounded-xl bg-slate-950 border border-white/5 space-y-1">
                  <span className="text-slate-500 font-mono">Meta Title</span>
                  <div className="text-white font-semibold">{selectedSite.seo.metaTitle}</div>
                </div>
                <div className="p-3.5 rounded-xl bg-slate-950 border border-white/5 space-y-1">
                  <span className="text-slate-500 font-mono">Meta Description</span>
                  <div className="text-slate-300">{selectedSite.seo.metaDescription}</div>
                </div>
                <div className="p-3.5 rounded-xl bg-slate-950 border border-white/5 space-y-1.5">
                  <span className="text-slate-500 font-mono">Target Keywords</span>
                  <div className="flex flex-wrap gap-1.5">
                    {selectedSite.seo.keywords.map((kw) => (
                      <span key={kw} className="px-2 py-0.5 rounded-md bg-slate-800 text-cyan-300 font-mono text-[11px]">
                        #{kw}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
