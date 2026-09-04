import React, { useState } from 'react';
import { WebsiteProject, ProjectQuotaStatus, User } from '../types';
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
  Eye,
  Plus,
  AlertCircle,
  Clock,
  FolderKanban,
  Crown,
  X,
  Layers,
  ArrowRight
} from 'lucide-react';

interface WebsiteViewProps {
  websites: WebsiteProject[];
  onSelectSite?: (site: WebsiteProject) => void;
  onUpdateSite?: (site: WebsiteProject) => void;
  onCreateProject?: (projectData: Partial<WebsiteProject>) => Promise<{ success: boolean; error?: string }>;
  quota?: ProjectQuotaStatus | null;
  onOpenAllowanceModal?: () => void;
  user?: User | null;
}

export const WebsiteView: React.FC<WebsiteViewProps> = ({
  websites,
  onSelectSite,
  onUpdateSite,
  onCreateProject,
  quota,
  onOpenAllowanceModal,
  user
}) => {
  const [selectedSiteId, setSelectedSiteId] = useState<string>(websites[0]?.id || '');
  const [deviceMode, setDeviceMode] = useState<'desktop' | 'tablet' | 'mobile'>('desktop');
  const [viewMode, setViewMode] = useState<'preview' | 'code' | 'seo'>('preview');
  const [copied, setCopied] = useState(false);
  
  // New Project Creation Dialog State
  const [isNewProjectModalOpen, setIsNewProjectModalOpen] = useState(false);
  const [newProjectName, setNewProjectName] = useState('');
  const [newProjectCategory, setNewProjectCategory] = useState('salon');
  const [newProjectHeadline, setNewProjectHeadline] = useState('');
  const [isCreating, setIsCreating] = useState(false);
  const [creationError, setCreationError] = useState<string | null>(null);

  const selectedSite = websites.find(w => w.id === selectedSiteId) || websites[0] || null;

  const isOwner = user?.isOwner || user?.role === 'OWNER' || quota?.isOwner;
  const used = quota?.used ?? Math.min(websites.length, 5);
  const limit = quota?.limit ?? 5;
  const remaining = isOwner ? 999999 : Math.max(0, limit - used);
  const isLimitReached = !isOwner && used >= limit;

  const projectTemplates = [
    { id: 'salon', label: 'Salon & Luxury Spa', defaultName: 'L’Elixir Organic Spa & Salon', headline: 'Pure Botanical Rituals & Master Hair Styling' },
    { id: 'realestate', label: 'Real Estate & Living', defaultName: 'Aura Heights Luxury Living', headline: 'Architectural Masterpieces & Modern Sanctuaries' },
    { id: 'portfolio', label: 'Creative Portfolio', defaultName: 'Alex Rivera — Systems & Spatial Design', headline: 'Designing Generative Realities & Production AI' },
    { id: 'saas', label: 'Developer SaaS', defaultName: 'AeroSync Cloud Telemetry', headline: 'Ultra Low-Latency Edge Logging & Pipeline Analytics' },
    { id: 'agency', label: 'Growth Agency', defaultName: 'Vanguard Growth Partners', headline: 'Scaling Enterprise Brands with Algorithmic Precision' }
  ];

  const handleOpenNewProject = () => {
    setCreationError(null);
    setNewProjectName(projectTemplates[0].defaultName);
    setNewProjectCategory(projectTemplates[0].id);
    setNewProjectHeadline(projectTemplates[0].headline);
    setIsNewProjectModalOpen(true);
  };

  const handleSubmitNewProject = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isLimitReached) {
      setCreationError("Today's 5-project limit is reached. Your project allowance will reset tomorrow.");
      return;
    }
    if (!newProjectName.trim()) return;

    if (!onCreateProject) return;

    setIsCreating(true);
    setCreationError(null);
    try {
      const result = await onCreateProject({
        name: newProjectName.trim(),
        category: newProjectCategory,
        headline: newProjectHeadline.trim() || `${newProjectName} — Official Experience`
      });

      if (result.success) {
        setIsNewProjectModalOpen(false);
      } else {
        setCreationError(result.error || "Today's 5-project limit is reached. Your project allowance will reset tomorrow.");
      }
    } catch (err: any) {
      setCreationError(err?.message || 'Failed to create project');
    } finally {
      setIsCreating(false);
    }
  };

  const getContainerWidth = () => {
    switch (deviceMode) {
      case 'mobile': return 'max-w-[375px]';
      case 'tablet': return 'max-w-[768px]';
      default: return 'w-full';
    }
  };

  const copyHtml = () => {
    if (!selectedSite) return;
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
      {/* 1. Daily Project Allowance Banner */}
      <div className={`p-4 sm:p-5 rounded-3xl border transition-all ${
        isLimitReached 
          ? 'bg-amber-950/20 border-amber-500/30 text-amber-200' 
          : isOwner
          ? 'bg-purple-950/20 border-purple-500/30 text-purple-200'
          : 'bg-slate-950/90 border-white/10'
      }`}>
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <FolderKanban className="w-4 h-4 text-cyan-400" />
              <span className="text-xs font-mono font-bold uppercase tracking-wider text-slate-300">
                Daily Project Allowance
              </span>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-cyan-950 text-cyan-300 border border-cyan-800 font-semibold">
                100% FREE
              </span>
            </div>

            <div className="text-sm font-bold text-white flex items-center gap-2">
              {isOwner ? (
                <span className="text-amber-300 flex items-center gap-1.5">
                  <Crown className="w-4 h-4" /> Owner Access: Unlimited Projects Allowed
                </span>
              ) : isLimitReached ? (
                <span className="text-amber-400 flex items-center gap-1.5">
                  <AlertCircle className="w-4 h-4" /> Today's 5-project limit is reached
                </span>
              ) : (
                <span>
                  {used} / {limit} projects created today <span className="text-emerald-400 font-mono text-xs font-normal">({remaining} remaining)</span>
                </span>
              )}
            </div>

            <p className="text-xs text-slate-400">
              {isLimitReached
                ? 'Your project allowance will reset tomorrow. All existing projects have unlimited task execution.'
                : 'Free daily access: 5 new projects every calendar day. Existing projects allow unlimited messages and edits.'}
            </p>
          </div>

          <div className="flex items-center gap-3 self-start md:self-auto">
            {/* 5-dot Segmented bar */}
            {!isOwner && (
              <div className="flex items-center gap-1.5 bg-slate-900/80 px-3 py-2 rounded-xl border border-white/5">
                {Array.from({ length: limit }).map((_, i) => (
                  <div
                    key={i}
                    className={`w-2.5 h-2.5 rounded-full transition-all ${
                      i < used 
                        ? 'bg-cyan-400 shadow-sm shadow-cyan-400/50' 
                        : 'bg-slate-800 border border-white/10'
                    }`}
                    title={`Slot ${i + 1}`}
                  />
                ))}
              </div>
            )}

            {onOpenAllowanceModal && (
              <button
                type="button"
                onClick={onOpenAllowanceModal}
                className="text-xs text-cyan-400 hover:text-cyan-300 px-3 py-2 rounded-xl bg-slate-900 border border-white/10 hover:border-cyan-500/30 transition font-medium whitespace-nowrap"
              >
                View Rules
              </button>
            )}

            <button
              type="button"
              onClick={handleOpenNewProject}
              className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold transition shadow-md whitespace-nowrap ${
                isLimitReached
                  ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40 hover:bg-amber-500/30'
                  : 'bg-cyan-500 hover:bg-cyan-400 text-slate-950 shadow-cyan-500/20'
              }`}
            >
              <Plus className="w-3.5 h-3.5" />
              <span>New Project</span>
            </button>
          </div>
        </div>
      </div>

      {/* 2. Project Switcher Bar */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-thin">
        <span className="text-[11px] font-mono text-slate-400 uppercase tracking-wider px-1 shrink-0">
          Projects ({websites.length}):
        </span>
        {websites.map((site) => {
          const isSelected = selectedSite?.id === site.id;
          return (
            <button
              key={site.id}
              type="button"
              onClick={() => {
                setSelectedSiteId(site.id);
                onSelectSite?.(site);
              }}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-medium transition shrink-0 border ${
                isSelected
                  ? 'bg-cyan-500/20 border-cyan-500/50 text-cyan-200 shadow-sm'
                  : 'bg-slate-950/80 border-white/10 text-slate-400 hover:text-white hover:bg-slate-900'
              }`}
            >
              <Globe className="w-3.5 h-3.5 text-cyan-400" />
              <span className="font-semibold">{site.name}</span>
              <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-black/40 text-slate-400 uppercase">
                {site.category}
              </span>
            </button>
          );
        })}
      </div>

      {/* 3. Platform Control Bar */}
      {selectedSite && (
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
                <span className="text-[10px] font-mono text-emerald-400">STATUS: LIVE</span>
              </div>
              <p className="text-xs text-slate-400">Project Slug: /{selectedSite.slug}</p>
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
      )}

      {/* 4. Main Canvas Area */}
      {selectedSite ? (
        <div className="w-full flex justify-center bg-slate-950/60 p-6 rounded-3xl border border-white/10 min-h-[560px]">
          <div className={`transition-all duration-300 ${getContainerWidth()} mx-auto`}>
            {viewMode === 'preview' && (
              <div className="rounded-2xl border border-white/10 bg-[#070A11] overflow-hidden shadow-2xl relative">
                {/* Browser Top bar */}
                <div className="px-4 py-2.5 bg-slate-900/90 border-b border-white/10 flex items-center justify-between text-xs font-mono text-slate-400">
                  <div className="flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-full bg-rose-500/80" />
                    <span className="w-2.5 h-2.5 rounded-full bg-amber-500/80" />
                    <span className="w-2.5 h-2.5 rounded-full bg-emerald-500/80" />
                  </div>
                  <div className="px-3 py-0.5 rounded-md bg-slate-950 border border-white/5 text-[11px]">
                    https://preview.aura.ai/{selectedSite.slug}
                  </div>
                  <span className="text-[10px] text-emerald-400 font-bold">HTTPS SECURE</span>
                </div>

                {/* Website Content */}
                <div className="p-8 space-y-12">
                  {/* Hero Header */}
                  <div className="text-center max-w-2xl mx-auto space-y-4">
                    <span className="text-xs font-mono tracking-widest text-cyan-400 uppercase font-semibold">
                      {selectedSite.category.toUpperCase()} PLATFORM
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
                              type="button"
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

                {/* Floating WhatsApp VIP CTA button */}
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
      ) : (
        <div className="p-12 text-center text-slate-500 rounded-3xl bg-slate-950 border border-white/10 font-mono text-xs">
          No projects found. Click &quot;New Project&quot; to synthesize one.
        </div>
      )}

      {/* 5. Create New Project Modal */}
      {isNewProjectModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
          <div className="relative w-full max-w-lg rounded-3xl bg-slate-950 border border-white/10 shadow-2xl overflow-hidden">
            <div className="p-6 border-b border-white/5 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-cyan-500/10 text-cyan-400 border border-cyan-500/30">
                  <FolderKanban className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-white">Synthesize New Project</h3>
                  <p className="text-xs text-slate-400">
                    {isOwner ? 'Unlimited Owner allowance active' : `${remaining} project slot${remaining === 1 ? '' : 's'} remaining today`}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsNewProjectModalOpen(false)}
                className="p-1 rounded-xl text-slate-400 hover:text-white hover:bg-slate-900 transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {isLimitReached ? (
              <div className="p-6 space-y-4">
                <div className="p-4 rounded-2xl bg-amber-950/30 border border-amber-500/40 text-amber-200 space-y-2">
                  <div className="flex items-center gap-2 text-amber-400 font-bold text-sm">
                    <AlertCircle className="w-4 h-4" />
                    <span>Today's 5-project limit is reached</span>
                  </div>
                  <p className="text-xs leading-relaxed text-slate-300">
                    Your project allowance will reset tomorrow. You can continue updating and adding tasks to your existing projects with zero limits!
                  </p>
                </div>

                <div className="p-3.5 rounded-xl bg-slate-900 border border-white/5 text-xs text-slate-400 space-y-1">
                  <span className="font-mono text-cyan-400 font-semibold">Tip for active work:</span>
                  <p>
                    Switch to any of your {websites.length} existing projects using the project selector tabs. AURA will happily adjust copy, add sections, update pricing, or refine design without using daily quota.
                  </p>
                </div>

                <div className="flex justify-end pt-2">
                  <button
                    type="button"
                    onClick={() => setIsNewProjectModalOpen(false)}
                    className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-white text-xs font-bold transition"
                  >
                    Got it
                  </button>
                </div>
              </div>
            ) : (
              <form onSubmit={handleSubmitNewProject} className="p-6 space-y-4">
                {creationError && (
                  <div className="p-3 rounded-xl bg-rose-950/40 border border-rose-500/40 text-rose-300 text-xs flex items-center gap-2">
                    <AlertCircle className="w-4 h-4 shrink-0" />
                    <span>{creationError}</span>
                  </div>
                )}

                {/* Quick Templates Selector */}
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-300">Choose Industry Preset</label>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                    {projectTemplates.map((t) => (
                      <button
                        key={t.id}
                        type="button"
                        onClick={() => {
                          setNewProjectCategory(t.id);
                          setNewProjectName(t.defaultName);
                          setNewProjectHeadline(t.headline);
                        }}
                        className={`p-2 rounded-xl text-left border text-xs transition ${
                          newProjectCategory === t.id
                            ? 'bg-cyan-500/20 border-cyan-500 text-cyan-200 font-semibold'
                            : 'bg-slate-900 border-white/5 text-slate-400 hover:text-white'
                        }`}
                      >
                        {t.label}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-300">Project Name</label>
                  <input
                    type="text"
                    value={newProjectName}
                    onChange={(e) => setNewProjectName(e.target.value)}
                    placeholder="e.g. L’Elixir Luxury Spa"
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-900 border border-white/10 text-white text-xs focus:outline-none focus:border-cyan-500 transition"
                    required
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-300">Hero Headline</label>
                  <input
                    type="text"
                    value={newProjectHeadline}
                    onChange={(e) => setNewProjectHeadline(e.target.value)}
                    placeholder="e.g. Bespoke Organic Healing & Master Styling"
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-900 border border-white/10 text-white text-xs focus:outline-none focus:border-cyan-500 transition"
                  />
                </div>

                <div className="p-3 rounded-xl bg-cyan-950/20 border border-cyan-800/30 text-xs text-slate-400">
                  <span>This will consume <strong className="text-white">1 of your 5 daily projects</strong>. After creation, you can edit it with unlimited tasks.</span>
                </div>

                <div className="flex items-center justify-end gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setIsNewProjectModalOpen(false)}
                    className="px-4 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-300 text-xs font-medium transition"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isCreating}
                    className="px-5 py-2 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold text-xs transition flex items-center gap-1.5 shadow-md shadow-cyan-500/20 disabled:opacity-50"
                  >
                    {isCreating ? 'Synthesizing...' : 'Create Project'}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
