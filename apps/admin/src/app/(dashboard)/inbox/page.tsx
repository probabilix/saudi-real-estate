'use client';

export const dynamic = 'force-dynamic';
import { useState, useEffect } from 'react';
import { AdminTopBar } from '@/components/AdminSidebar';
import { adminApi, ContactSubmission } from '@/lib/api';
import {
  Mail, Search, Trash2, Loader2, CheckCircle2, X, Calendar, User, Info, ArrowUpRight, Copy, Check
} from 'lucide-react';

export default function InboxPage() {
  const [submissions, setSubmissions] = useState<ContactSubmission[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedSubmission, setSelectedSubmission] = useState<ContactSubmission | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [filter, setFilter] = useState<'all' | 'pending' | 'replied'>('all');
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    loadSubmissions();
  }, []);

  async function loadSubmissions() {
    setLoading(true);
    const result = await adminApi.getAllSubmissions();
    if (result.success && result.data) {
      setSubmissions(result.data);
      // Auto-select first submission if available
      if (result.data.length > 0) {
        setSelectedSubmission(result.data[0]);
      }
    }
    setLoading(false);
  }

  const handleToggleReplied = async (id: string) => {
    const result = await adminApi.toggleSubmissionReplied(id);
    if (result.success && result.data) {
      const updated = result.data;
      setSubmissions(prev => prev.map(s => s.id === id ? updated : s));
      if (selectedSubmission?.id === id) {
        setSelectedSubmission(updated);
      }
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this enquiry? This action cannot be undone.')) return;
    const result = await adminApi.deleteSubmission(id);
    if (result.success) {
      setSubmissions(prev => prev.filter(s => s.id !== id));
      if (selectedSubmission?.id === id) {
        setSelectedSubmission(null);
      }
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // Filters and Searches
  const filteredSubmissions = submissions.filter(sub => {
    const matchesSearch = 
      sub.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      sub.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
      sub.message.toLowerCase().includes(searchQuery.toLowerCase());
    
    if (filter === 'pending') return matchesSearch && !sub.isReplied;
    if (filter === 'replied') return matchesSearch && sub.isReplied;
    return matchesSearch;
  });

  return (
    <div className="flex flex-col h-full bg-slate-100">
      <AdminTopBar title="Inbox CRM" />

      <div className="flex-1 flex overflow-hidden">
        {/* Submissions List Panel - Hardened border-r */}
        <div className="w-full md:w-[420px] shrink-0 border-r-2 border-slate-300 flex flex-col bg-white overflow-hidden shadow-md">
          {/* Header & Controls - Hardened border-b */}
          <div className="p-4 border-b-2 border-slate-200 space-y-3 shrink-0 bg-slate-50/50">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Mail className="w-5 h-5 text-primary-600" />
                <span className="font-extrabold text-slate-900 text-sm">Customer Enquiries</span>
              </div>
              <span className="text-[10px] font-black px-2 py-0.5 bg-slate-200 text-slate-800 rounded-full border border-slate-300">
                {submissions.length} Total
              </span>
            </div>

            {/* Search Input - Hardened border */}
            <div className="relative">
              <Search className="w-4 h-4 text-slate-500 absolute left-3 top-3" />
              <input
                type="text"
                placeholder="Search by name, email, keyword..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-4 py-2 bg-white border-2 border-slate-300 rounded-xl text-xs font-bold placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 transition-all shadow-sm"
              />
            </div>

            {/* Quick Filters - Hardened border */}
            <div className="flex gap-1.5 p-1 bg-slate-100 border-2 border-slate-200 rounded-xl text-[10px] font-extrabold">
              <button
                onClick={() => setFilter('all')}
                className={`flex-1 py-1.5 rounded-lg text-center transition-all cursor-pointer ${
                  filter === 'all' ? 'bg-white text-slate-900 shadow-md border border-slate-200' : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                All
              </button>
              <button
                onClick={() => setFilter('pending')}
                className={`flex-1 py-1.5 rounded-lg text-center transition-all cursor-pointer ${
                  filter === 'pending' ? 'bg-white text-slate-900 shadow-md border border-slate-200' : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                Unread ({submissions.filter(s => !s.isReplied).length})
              </button>
              <button
                onClick={() => setFilter('replied')}
                className={`flex-1 py-1.5 rounded-lg text-center transition-all cursor-pointer ${
                  filter === 'replied' ? 'bg-white text-slate-900 shadow-md border border-slate-200' : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                Replied
              </button>
            </div>
          </div>

          {/* Submissions Scroll View - Hardened dividers */}
          <div className="flex-1 overflow-y-auto divide-y-2 divide-slate-200">
            {loading ? (
              <div className="py-20 text-center flex flex-col items-center justify-center gap-2">
                <Loader2 className="w-6 h-6 animate-spin text-primary-600" />
                <span className="text-xs font-bold text-slate-500">Loading inbox...</span>
              </div>
            ) : filteredSubmissions.length === 0 ? (
              <div className="py-20 text-center px-4">
                <div className="w-12 h-12 bg-slate-100 border-2 border-slate-200 rounded-full flex items-center justify-center mx-auto mb-3">
                  <Mail className="w-6 h-6 text-slate-400" />
                </div>
                <h4 className="text-xs font-extrabold text-slate-800 mb-1">No enquiries found</h4>
                <p className="text-[10px] text-slate-500 max-w-[200px] mx-auto font-semibold">
                  Try adjusting your filters or search keywords.
                </p>
              </div>
            ) : (
              filteredSubmissions.map((sub) => {
                const isSelected = selectedSubmission?.id === sub.id;
                const date = new Date(sub.createdAt).toLocaleDateString(undefined, {
                  month: 'short',
                  day: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit'
                });

                return (
                  <div
                    key={sub.id}
                    onClick={() => setSelectedSubmission(sub)}
                    className={`p-4 cursor-pointer transition-all flex flex-col gap-2 relative border-l-4 ${
                      isSelected
                        ? 'bg-primary-50/40 border-primary-600 shadow-inner'
                        : sub.isReplied
                        ? 'border-transparent hover:bg-slate-50/60'
                        : 'bg-amber-50/20 border-amber-500 hover:bg-amber-50/40'
                    }`}
                  >
                    <div className="flex justify-between items-start">
                      <h4 className="text-xs font-black text-slate-900 truncate max-w-[200px]">
                        {sub.name}
                      </h4>
                      <span className="text-[9px] font-extrabold text-slate-500 shrink-0 bg-slate-100 px-1.5 py-0.5 rounded border border-slate-200">
                        {date}
                      </span>
                    </div>

                    <div className="text-[10px] text-slate-600 font-extrabold truncate">
                      {sub.email}
                    </div>

                    <p className="text-[11px] text-slate-700 font-medium line-clamp-2 leading-relaxed">
                      {sub.message}
                    </p>

                    <div className="flex items-center gap-2 mt-1">
                      <span className={`text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded-md border ${
                        sub.isReplied
                          ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                          : 'bg-amber-50 text-amber-700 border-amber-200'
                      }`}>
                        {sub.isReplied ? 'Replied' : 'Pending'}
                      </span>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Detailed Submission View Panel */}
        <div className="flex-1 bg-slate-100 overflow-y-auto p-6 md:p-8 flex flex-col">
          {selectedSubmission ? (
            <div className="max-w-3xl w-full mx-auto space-y-6 animate-in fade-in duration-200">
              {/* Top Glass Card Container - Hardened border-2 */}
              <div className="bg-white rounded-3xl border-2 border-slate-300 shadow-2xl overflow-hidden flex flex-col">
                {/* Header Section - Hardened border-b-2 */}
                <div className="p-6 border-b-2 border-slate-200 bg-slate-50 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-2xl bg-white border-2 border-slate-300 text-slate-700 flex items-center justify-center shrink-0 shadow-sm">
                      <User className="w-6 h-6" />
                    </div>
                    <div>
                      <h2 className="text-base font-black text-slate-900">{selectedSubmission.name}</h2>
                      <div className="flex items-center gap-2 text-xs font-bold text-slate-500 mt-1">
                        <span className="text-slate-800 bg-slate-200/50 px-2 py-0.5 rounded border border-slate-300">{selectedSubmission.email}</span>
                        <button
                          onClick={() => copyToClipboard(selectedSubmission.email)}
                          className="hover:text-slate-800 transition-colors p-1.5 bg-white hover:bg-slate-100 rounded-lg border border-slate-300 shadow-sm cursor-pointer"
                          title="Copy Email Address"
                        >
                          {copied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5 text-slate-600" />}
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Actions buttons - Hardened border-2 */}
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handleToggleReplied(selectedSubmission.id)}
                      className={`px-4 py-2.5 rounded-xl text-xs font-black transition-all flex items-center gap-2 cursor-pointer shadow-md border-2 ${
                        selectedSubmission.isReplied
                          ? 'bg-slate-100 hover:bg-slate-200 text-slate-800 border-slate-300'
                          : 'bg-primary-600 hover:bg-primary-500 text-white border-primary-700 shadow-primary-500/25'
                      }`}
                    >
                      <CheckCircle2 className="w-4 h-4" />
                      {selectedSubmission.isReplied ? 'Mark Unreplied' : 'Mark as Replied'}
                    </button>
                    
                    <button
                      onClick={() => handleDelete(selectedSubmission.id)}
                      className="p-2.5 bg-white text-red-600 hover:bg-red-50 rounded-xl border-2 border-slate-300 hover:border-red-300 shadow-md transition-all cursor-pointer"
                      title="Delete Submission"
                    >
                      <Trash2 className="w-4.5 h-4.5" />
                    </button>
                  </div>
                </div>

                {/* Body Message Content */}
                <div className="p-8 space-y-6">
                  <div className="flex flex-col gap-2 p-4 bg-slate-50 border border-slate-200 rounded-2xl shadow-sm">
                    <span className="text-[10px] font-black uppercase tracking-widest text-slate-500 flex items-center gap-1.5">
                      <Calendar className="w-3.5 h-3.5 text-slate-600" /> Received On
                    </span>
                    <span className="text-xs font-bold text-slate-900">
                      {new Date(selectedSubmission.createdAt).toLocaleString(undefined, {
                        weekday: 'long',
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit'
                      })}
                    </span>
                  </div>

                  <hr className="border-slate-200 border-t-2" />

                  <div className="flex flex-col gap-3">
                    <span className="text-[10px] font-black uppercase tracking-widest text-slate-500">Message Content</span>
                    <p className="text-sm text-slate-800 leading-relaxed font-bold bg-slate-50 p-6 rounded-2xl border-2 border-slate-200 whitespace-pre-wrap shadow-inner">
                      {selectedSubmission.message}
                    </p>
                  </div>
                </div>

                {/* Footer Section - Hardened border-t-2 */}
                <div className="p-6 bg-slate-50 border-t-2 border-slate-200 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                  <div className="flex items-center gap-2 text-[11px] font-bold text-slate-500">
                    <Info className="w-4 h-4 text-slate-600 shrink-0" />
                    <span>Ensure guest enquiries are verified before replying.</span>
                  </div>

                  <a
                    href={`mailto:${selectedSubmission.email}?subject=Re: Saudi RE Enquiry&body=Hi ${selectedSubmission.name},%0D%0A%0D%0AThank you for contacting Saudi Real Estate. In regards to your message:%0D%0A%0D%0A"${selectedSubmission.message}"%0D%0A%0D%0A...`}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={() => {
                      if (!selectedSubmission.isReplied) {
                        handleToggleReplied(selectedSubmission.id);
                      }
                    }}
                    className="px-5 py-3 bg-slate-950 hover:bg-slate-800 text-white border-2 border-slate-900 rounded-xl text-xs font-black shadow-lg shadow-slate-950/25 flex items-center justify-center gap-1.5 hover:-translate-y-0.5 active:translate-y-0 transition-all cursor-pointer"
                  >
                    Reply via Email <ArrowUpRight className="w-4 h-4" />
                  </a>
                </div>
              </div>
            </div>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center text-center p-8">
              <div className="w-16 h-16 bg-white rounded-3xl border-2 border-slate-300 shadow-lg flex items-center justify-center mb-4">
                <Mail className="w-8 h-8 text-slate-400" />
              </div>
              <h3 className="text-sm font-black text-slate-800">Select an enquiry</h3>
              <p className="text-xs text-slate-500 max-w-[240px] mt-1 font-semibold leading-relaxed">
                Click any customer message on the left sidebar list to view detail history.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

