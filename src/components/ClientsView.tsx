import React, { useState, useEffect } from 'react';
import { 
  Users, 
  Plus, 
  DollarSign, 
  Phone, 
  Mail, 
  FileText, 
  Sparkles, 
  Check, 
  MessageCircle,
  Briefcase
} from 'lucide-react';

export const ClientsView: React.FC = () => {
  const [leads, setLeads] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddLead, setShowAddLead] = useState(false);
  const [name, setName] = useState('');
  const [company, setCompany] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [notes, setNotes] = useState('');
  const [value, setValue] = useState('3500');

  const fetchLeads = async () => {
    try {
      const res = await fetch('/api/clients');
      const contentType = res.headers.get('content-type') || '';
      if (res.ok && contentType.includes('application/json')) {
        const data = await res.json();
        setLeads(data.leads || []);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLeads();
  }, []);

  const handleAddLead = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch('/api/clients', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, company, email, phone, notes, value })
      });
      if (res.ok) {
        fetchLeads();
        setShowAddLead(false);
        setName('');
        setCompany('');
        setEmail('');
        setPhone('');
        setNotes('');
      }
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <Users className="w-5 h-5 text-cyan-400" />
            <span>Client Relationship Management & Lead Pipeline</span>
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Real-time pipeline tracking, deal values, and AI-assisted proposal dispatch.
          </p>
        </div>

        <button
          onClick={() => setShowAddLead(true)}
          className="px-4 py-2 rounded-xl bg-gradient-to-r from-cyan-500 to-indigo-600 text-white font-bold text-xs shadow-md shadow-cyan-500/20 flex items-center gap-2 hover:opacity-90 transition"
        >
          <Plus className="w-4 h-4" />
          <span>Add Prospective Client</span>
        </button>
      </div>

      {/* Leads Pipeline Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {leads.map((lead) => (
          <div key={lead.id} className="p-5 rounded-2xl bg-slate-900/80 border border-white/10 shadow-xl space-y-3 flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between">
                <span className={`text-[10px] font-mono px-2 py-0.5 rounded-full font-bold uppercase ${
                  lead.status === 'won' ? 'bg-emerald-950 text-emerald-300 border border-emerald-800' :
                  lead.status === 'proposal_sent' ? 'bg-cyan-950 text-cyan-300 border border-cyan-800' :
                  'bg-slate-800 text-slate-300'
                }`}>
                  {lead.status.replace('_', ' ')}
                </span>
                <span className="text-sm font-extrabold text-emerald-400">
                  ${lead.value}
                </span>
              </div>

              <h3 className="text-sm font-bold text-white mt-2">{lead.name}</h3>
              <p className="text-xs text-cyan-300 font-medium">{lead.company}</p>
              <p className="text-xs text-slate-400 mt-2 leading-relaxed">{lead.notes}</p>
            </div>

            <div className="pt-3 border-t border-slate-800 space-y-2">
              <div className="flex items-center justify-between text-xs text-slate-400">
                <span className="flex items-center gap-1.5"><Mail className="w-3.5 h-3.5" /> {lead.email}</span>
                {lead.phone && <span className="flex items-center gap-1.5"><Phone className="w-3.5 h-3.5" /> {lead.phone}</span>}
              </div>

              {lead.phone && (
                <a
                  href={`https://wa.me/${lead.phone.replace(/[^0-9]/g, '')}?text=Hi%20${encodeURIComponent(lead.name)},%20following%20up%20on%20your%20project%20inquiry.`}
                  target="_blank"
                  rel="noreferrer"
                  className="w-full py-1.5 rounded-lg bg-emerald-500/15 hover:bg-emerald-500/25 border border-emerald-500/30 text-emerald-300 text-xs font-semibold flex items-center justify-center gap-1.5 transition"
                >
                  <MessageCircle className="w-3.5 h-3.5" />
                  <span>Reach via WhatsApp</span>
                </a>
              )}
            </div>
          </div>
        ))}
      </div>

      {showAddLead && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
          <div className="w-full max-w-lg rounded-2xl bg-slate-900 border border-white/10 p-6 shadow-2xl space-y-4">
            <h3 className="text-base font-bold text-white">Add New Client Lead</h3>
            <form onSubmit={handleAddLead} className="space-y-3 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-semibold text-slate-400 uppercase">Contact Name</label>
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Marcus Vance"
                    className="w-full mt-1 p-2 rounded-xl bg-slate-950 border border-slate-800 text-white"
                  />
                </div>
                <div>
                  <label className="font-semibold text-slate-400 uppercase">Company</label>
                  <input
                    type="text"
                    required
                    value={company}
                    onChange={(e) => setCompany(e.target.value)}
                    placeholder="Apex Club"
                    className="w-full mt-1 p-2 rounded-xl bg-slate-950 border border-slate-800 text-white"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-semibold text-slate-400 uppercase">Email</label>
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="marcus@apex.com"
                    className="w-full mt-1 p-2 rounded-xl bg-slate-950 border border-slate-800 text-white"
                  />
                </div>
                <div>
                  <label className="font-semibold text-slate-400 uppercase">WhatsApp / Phone</label>
                  <input
                    type="text"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="+1 555-0192"
                    className="w-full mt-1 p-2 rounded-xl bg-slate-950 border border-slate-800 text-white"
                  />
                </div>
              </div>

              <div>
                <label className="font-semibold text-slate-400 uppercase">Estimated Deal Value ($)</label>
                <input
                  type="number"
                  value={value}
                  onChange={(e) => setValue(e.target.value)}
                  className="w-full mt-1 p-2 rounded-xl bg-slate-950 border border-slate-800 text-white"
                />
              </div>

              <div>
                <label className="font-semibold text-slate-400 uppercase">Project Scope / Notes</label>
                <textarea
                  rows={2}
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Requested full website redevelopment with WhatsApp instant booking..."
                  className="w-full mt-1 p-2 rounded-xl bg-slate-950 border border-slate-800 text-white resize-none"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAddLead(false)}
                  className="px-4 py-2 rounded-xl bg-slate-800 text-slate-300 font-semibold hover:bg-slate-700"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-cyan-500 text-slate-950 font-bold hover:bg-cyan-400"
                >
                  Create Client Record
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
