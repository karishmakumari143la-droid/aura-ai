import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { MemoryItem, MemoryProposal, MemoryCategory } from '../types';
import { 
  Brain, 
  Search, 
  Trash2, 
  Plus, 
  Check, 
  X, 
  Sparkles, 
  ShieldAlert, 
  Sliders, 
  Clock, 
  Tag, 
  Lock,
  Flame,
  AlertCircle
} from 'lucide-react';

interface MemoryManagerProps {
  memories?: MemoryItem[];
  proposals?: MemoryProposal[];
  onAddMemory?: (memory: Partial<MemoryItem>) => void;
  onDeleteMemory?: (id: string) => void;
  onApproveProposal?: (id: string) => void;
  onRejectProposal?: (id: string) => void;
  onForgetAll?: () => void;
}

const CATEGORIES: MemoryCategory[] = [
  'USER_PREFERENCES',
  'BUSINESS_RULES',
  'BRAND_GUIDELINES',
  'PROJECTS',
  'CLIENTS',
  'TEMPLATES',
  'PRICING',
  'WORKFLOWS',
  'IMPORTANT_DECISIONS',
  'SUCCESSFUL_PATTERNS',
  'FAILED_PATTERNS',
  'TOOL_PREFERENCES'
];

export const MemoryManager: React.FC<MemoryManagerProps> = ({
  memories: propsMemories,
  proposals: propsProposals,
  onAddMemory,
  onDeleteMemory,
  onApproveProposal,
  onRejectProposal,
  onForgetAll
}) => {
  const [internalMemories, setInternalMemories] = useState<MemoryItem[]>([]);
  const [internalProposals, setInternalProposals] = useState<MemoryProposal[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);

  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [confirmWipe, setConfirmWipe] = useState(false);

  // New Memory Form State
  const [newTitle, setNewTitle] = useState('');
  const [newContent, setNewContent] = useState('');
  const [newCategory, setNewCategory] = useState<MemoryCategory>('USER_PREFERENCES');
  const [newImportance, setNewImportance] = useState<'low' | 'medium' | 'high'>('high');

  // Fetch from backend if props aren't provided
  useEffect(() => {
    if (!propsMemories) {
      fetchMemories();
    }
  }, [propsMemories]);

  const fetchMemories = async () => {
    setIsLoading(true);
    try {
      const res = await fetch('/api/memory');
      const data = await res.json();
      if (data.memories) {
        setInternalMemories(data.memories);
      }
      if (data.proposals) {
        setInternalProposals(data.proposals);
      }
    } catch (err) {
      console.error('Failed to fetch memories:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const activeMemories = propsMemories ?? internalMemories;
  const activeProposals = propsProposals ?? internalProposals;

  const filteredMemories = (activeMemories || []).filter(m => {
    if (!m) return false;
    const matchesCategory = selectedCategory === 'ALL' || m.category === selectedCategory;
    const matchesSearch = (m.title || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
                          (m.content || '').toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim() || !newContent.trim()) return;

    const payload = {
      title: newTitle.trim(),
      content: newContent.trim(),
      category: newCategory,
      importance: newImportance
    };

    if (onAddMemory) {
      onAddMemory(payload);
    } else {
      try {
        const res = await fetch('/api/memory', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });
        const data = await res.json();
        if (data.memory) {
          setInternalMemories(prev => [data.memory, ...prev]);
        }
      } catch (err) {
        console.error('Failed to create memory:', err);
      }
    }

    setNewTitle('');
    setNewContent('');
    setShowAddModal(false);
  };

  const handleDelete = async (id: string) => {
    if (onDeleteMemory) {
      onDeleteMemory(id);
    } else {
      try {
        await fetch(`/api/memory/${id}`, { method: 'DELETE' });
        setInternalMemories(prev => prev.filter(m => m.memoryId !== id));
      } catch (err) {
        console.error('Failed to delete memory:', err);
      }
    }
  };

  const handleApprove = async (id: string) => {
    if (onApproveProposal) {
      onApproveProposal(id);
    } else {
      try {
        const res = await fetch(`/api/memory/proposals/${id}/approve`, { method: 'POST' });
        const data = await res.json();
        if (data.memory) {
          setInternalMemories(prev => [data.memory, ...prev]);
        }
        setInternalProposals(prev => prev.filter(p => p.id !== id));
      } catch (err) {
        console.error('Failed to approve proposal:', err);
      }
    }
  };

  const handleReject = async (id: string) => {
    if (onRejectProposal) {
      onRejectProposal(id);
    } else {
      try {
        await fetch(`/api/memory/proposals/${id}/reject`, { method: 'POST' });
        setInternalProposals(prev => prev.filter(p => p.id !== id));
      } catch (err) {
        console.error('Failed to reject proposal:', err);
      }
    }
  };

  const handleWipe = async () => {
    if (onForgetAll) {
      onForgetAll();
    } else {
      try {
        await fetch('/api/memory/forget-all', { method: 'POST' });
        setInternalMemories(prev => prev.filter(m => m.source === 'system_default'));
        setInternalProposals([]);
      } catch (err) {
        console.error('Failed to wipe memories:', err);
      }
    }
    setConfirmWipe(false);
  };

  return (
    <div className="w-full space-y-6 select-none">
      {/* Self-Developing Memory Proposals Banner */}
      <AnimatePresence>
        {(activeProposals || []).length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="p-5 rounded-3xl bg-gradient-to-r from-purple-950/60 via-indigo-950/40 to-slate-950 border border-purple-500/30 shadow-2xl"
          >
            <div className="flex items-center gap-2 mb-3">
              <Sparkles className="w-4 h-4 text-purple-400 animate-spin" />
              <span className="text-xs font-bold text-purple-300 uppercase tracking-wide">
                Self-Developing Memory Proposal Detected
              </span>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-purple-900/60 text-purple-200 border border-purple-700">
                {(activeProposals || []).length} Pending
              </span>
            </div>

            <div className="space-y-3">
              {(activeProposals || []).map((prop) => (
                <div key={prop.id} className="p-4 rounded-2xl bg-slate-900/90 border border-white/10 flex items-center justify-between flex-wrap gap-4">
                  <div className="space-y-1 max-w-xl">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-white">{prop.title}</span>
                      <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-800 text-purple-300">
                        {prop.category}
                      </span>
                      <span className="text-[10px] font-mono text-emerald-400">
                        Confidence: {((prop.confidence || 0.9) * 100).toFixed(0)}%
                      </span>
                    </div>
                    <p className="text-xs text-slate-200 font-medium">"{prop.content}"</p>
                    <p className="text-[11px] text-slate-400">{prop.reason}</p>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handleApprove(prop.id)}
                      className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-purple-500 hover:bg-purple-400 text-white font-bold text-xs shadow-md transition"
                    >
                      <Check className="w-3.5 h-3.5" />
                      Save as Permanent Rule
                    </button>
                    <button
                      onClick={() => handleReject(prop.id)}
                      className="p-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Main Memory Engine Header */}
      <div className="p-6 rounded-3xl bg-slate-950 border border-white/10 shadow-2xl flex flex-col gap-6">
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div className="flex items-center gap-3">
            <div className="p-3 rounded-2xl bg-purple-500/10 border border-purple-500/30 text-purple-400">
              <Brain className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-lg font-bold text-white">Structured Memory Engine</h3>
                <span className="text-xs font-mono px-2 py-0.5 rounded-full bg-slate-900 text-purple-300 border border-purple-900">
                  {(activeMemories || []).length} Active Records
                </span>
              </div>
              <p className="text-xs text-slate-400">
                Associative long-term rules injected into AURA Brain for zero hallucination and verified recall.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowAddModal(true)}
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold text-xs transition shadow-lg shadow-cyan-500/20 cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              Add Memory Rule
            </button>
            <button
              onClick={() => setConfirmWipe(true)}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-slate-900 hover:bg-rose-950 text-slate-400 hover:text-rose-300 border border-white/10 hover:border-rose-800 font-semibold text-xs transition cursor-pointer"
            >
              <Trash2 className="w-3.5 h-3.5" />
              Wipe Custom Rules
            </button>
          </div>
        </div>

        {/* Confirmation Wipe Dialog */}
        {confirmWipe && (
          <div className="p-4 rounded-2xl bg-rose-950/40 border border-rose-800 flex items-center justify-between flex-wrap gap-3">
            <div className="flex items-center gap-2">
              <ShieldAlert className="w-5 h-5 text-rose-400" />
              <span className="text-xs text-rose-200">
                Are you sure you want to forget all user-learned preferences? System baseline protocols will be preserved.
              </span>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={handleWipe}
                className="px-3 py-1.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs transition cursor-pointer"
              >
                Yes, Wipe Clean
              </button>
              <button
                onClick={() => setConfirmWipe(false)}
                className="px-3 py-1.5 rounded-xl bg-slate-800 text-slate-300 hover:bg-slate-700 text-xs cursor-pointer"
              >
                Cancel
              </button>
            </div>
          </div>
        )}

        {/* Search & Category Filter Pills */}
        <div className="flex flex-col gap-3">
          <div className="relative">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
            <input
              type="text"
              placeholder="Search across all memory rules, business directives, or brand styles..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 rounded-2xl bg-slate-900/90 border border-white/10 text-white text-xs placeholder:text-slate-500 focus:outline-none focus:border-cyan-500 transition"
            />
          </div>

          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-xs">
            <button
              onClick={() => setSelectedCategory('ALL')}
              className={`px-3 py-1.5 rounded-xl font-semibold whitespace-nowrap transition cursor-pointer ${
                selectedCategory === 'ALL' ? 'bg-cyan-500 text-slate-950' : 'bg-slate-900 text-slate-400 hover:text-white'
              }`}
            >
              All Categories
            </button>
            {CATEGORIES.map((cat) => (
              <button
                key={cat}
                onClick={() => setSelectedCategory(cat)}
                className={`px-3 py-1.5 rounded-xl font-mono text-[11px] whitespace-nowrap transition cursor-pointer ${
                  selectedCategory === cat ? 'bg-purple-500 text-white' : 'bg-slate-900 text-slate-400 hover:text-white'
                }`}
              >
                {cat.replace(/_/g, ' ')}
              </button>
            ))}
          </div>
        </div>

        {/* Memory Items Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredMemories.map((item) => (
            <div
              key={item.memoryId}
              className="p-5 rounded-2xl bg-slate-900/60 border border-white/10 hover:border-cyan-500/40 transition flex flex-col justify-between group relative overflow-hidden"
            >
              <div className="space-y-2">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-800 text-purple-300">
                    {(item.category || '').replace(/_/g, ' ')}
                  </span>
                  <div className="flex items-center gap-1">
                    {item.source === 'self_learned' && (
                      <span className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-emerald-950 text-emerald-400 border border-emerald-800">
                        LEARNED
                      </span>
                    )}
                    <span className={`text-[9px] font-mono px-1.5 py-0.5 rounded uppercase ${
                      item.importance === 'high' ? 'bg-rose-950 text-rose-300' : 'bg-slate-800 text-slate-400'
                    }`}>
                      {item.importance}
                    </span>
                  </div>
                </div>

                <h4 className="text-sm font-bold text-white group-hover:text-cyan-300 transition">
                  {item.title}
                </h4>
                <p className="text-xs text-slate-300 leading-relaxed">{item.content}</p>
              </div>

              <div className="mt-4 pt-3 border-t border-white/5 flex items-center justify-between text-[10px] text-slate-500 font-mono">
                <span>Confidence: {((item.confidence || 0.95) * 100).toFixed(0)}%</span>
                <button
                  onClick={() => handleDelete(item.memoryId)}
                  title="Remove Memory"
                  className="text-slate-500 hover:text-rose-400 transition cursor-pointer"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          ))}

          {filteredMemories.length === 0 && !isLoading && (
            <div className="col-span-full p-8 text-center rounded-2xl border border-white/5 text-slate-400 text-xs">
              No memory rules found matching the active category or search query.
            </div>
          )}
        </div>
      </div>

      {/* Add Memory Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <motion.div
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="w-full max-w-lg p-6 rounded-3xl bg-slate-900 border border-white/10 shadow-2xl space-y-4"
          >
            <div className="flex items-center justify-between">
              <h3 className="text-base font-bold text-white">Add Permanent Memory Rule</h3>
              <button
                onClick={() => setShowAddModal(false)}
                className="text-slate-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreate} className="space-y-4 text-xs">
              <div>
                <label className="block text-slate-400 font-mono mb-1">Rule Title</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Design Palette Preference"
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  className="w-full px-3.5 py-2 rounded-xl bg-slate-950 border border-white/10 text-white focus:outline-none focus:border-cyan-500"
                />
              </div>

              <div>
                <label className="block text-slate-400 font-mono mb-1">Rule Content</label>
                <textarea
                  required
                  rows={3}
                  placeholder="Detailed rule or preference to persist into AURA neural core..."
                  value={newContent}
                  onChange={(e) => setNewContent(e.target.value)}
                  className="w-full px-3.5 py-2 rounded-xl bg-slate-950 border border-white/10 text-white focus:outline-none focus:border-cyan-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-400 font-mono mb-1">Category</label>
                  <select
                    value={newCategory}
                    onChange={(e) => setNewCategory(e.target.value as MemoryCategory)}
                    className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-white/10 text-white focus:outline-none"
                  >
                    {CATEGORIES.map(c => (
                      <option key={c} value={c}>{c.replace(/_/g, ' ')}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-slate-400 font-mono mb-1">Priority</label>
                  <select
                    value={newImportance}
                    onChange={(e) => setNewImportance(e.target.value as any)}
                    className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-white/10 text-white focus:outline-none"
                  >
                    <option value="high">High</option>
                    <option value="medium">Medium</option>
                    <option value="low">Low</option>
                  </select>
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 rounded-xl bg-slate-800 text-slate-300 font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold"
                >
                  Save to Memory
                </button>
              </div>
            </form>
          </motion.div>
        </div>
      )}
    </div>
  );
};
