
import React, { useState, useMemo, useEffect } from 'react';
import { UserPortfolio, AuthUser, DomainFilter } from '../types.ts';
import RecruiterQuizPanel from './RecruiterQuizPanel.tsx';
import MessagingPanel from './MessagingPanel.tsx';
import { db } from '../services/db.ts';

interface RecruiterDashboardProps {
    portfolios: UserPortfolio[];
    currentUser: AuthUser;
    onViewPortfolio: (p: UserPortfolio) => void;
}

// ─── Types ────────────────────────────────────────────────────────────────────
interface JobPosting {
    id: string;
    title: string;
    company: string;
    location: string;
    type: 'Full-Time' | 'Part-Time' | 'Internship' | 'Contract';
    domain: string;
    skills: string[];
    description: string;
    postedAt: string;
    applicants: number;
    status: 'active' | 'paused' | 'closed';
}

interface ShortlistedCandidate {
    portfolioId: string;
    note: string;
    status: 'reviewing' | 'shortlisted' | 'rejected' | 'offered';
    addedAt: string;
}

type DashTab = 'overview' | 'search' | 'jobs' | 'shortlist' | 'quiz' | 'messages' | 'analytics';

const DOMAINS: DomainFilter[] = ['All', 'Frontend', 'Backend', 'Full Stack', 'Security', 'AI/ML'];

const GRADE_COLOR: Record<string, string> = {
    S: '#f59e0b',
    A: '#10b981',
    B: '#3b82f6',
    C: '#6366f1',
    D: '#94a3b8',
};

const STATUS_STYLE: Record<string, { bg: string; text: string; label: string }> = {
    reviewing: { bg: 'rgba(251,191,36,0.1)', text: '#fbbf24', label: 'Reviewing' },
    shortlisted: { bg: 'rgba(16,185,129,0.1)', text: '#10b981', label: 'Shortlisted' },
    rejected: { bg: 'rgba(239,68,68,0.1)', text: '#ef4444', label: 'Rejected' },
    offered: { bg: 'rgba(99,102,241,0.1)', text: '#818cf8', label: 'Offered' },
};

// Seeded job postings
const DEFAULT_JOBS: JobPosting[] = [
    {
        id: 'j1', title: 'Senior Frontend Engineer', company: 'TechCorp',
        location: 'Remote', type: 'Full-Time', domain: 'Frontend',
        skills: ['React', 'TypeScript', 'CSS'], description: 'Build beautiful UIs at scale.',
        postedAt: new Date().toISOString(), applicants: 14, status: 'active',
    },
    {
        id: 'j2', title: 'Backend Python Developer', company: 'TechCorp',
        location: 'Bangalore, IN', type: 'Full-Time', domain: 'Backend',
        skills: ['Python', 'FastAPI', 'PostgreSQL'], description: 'Design robust APIs.',
        postedAt: new Date().toISOString(), applicants: 7, status: 'active',
    },
];

// ─── Sub-components ───────────────────────────────────────────────────────────

const StatCard: React.FC<{ icon: string; label: string; value: string | number; color: string }> = ({ icon, label, value, color }) => (
    <div className="bg-glass rounded-3xl p-6 border border-white/5 flex items-center gap-5 group hover:border-white/10 transition-all">
        <div className="w-14 h-14 rounded-2xl flex items-center justify-center text-2xl shrink-0"
            style={{ background: `${color}20` }}>
            {icon}
        </div>
        <div>
            <div className="text-2xl font-black text-white">{value}</div>
            <div className="text-[10px] font-black text-slate-500 uppercase tracking-widest">{label}</div>
        </div>
    </div>
);

const CandidateCard: React.FC<{
    portfolio: UserPortfolio;
    shortlisted?: ShortlistedCandidate;
    onView: () => void;
    onShortlist: () => void;
    onUpdateStatus?: (status: ShortlistedCandidate['status']) => void;
    isShortlisted: boolean;
}> = ({ portfolio: p, shortlisted, onView, onShortlist, onUpdateStatus, isShortlisted }) => (
    <div className="bg-glass rounded-3xl border border-white/5 overflow-hidden group hover:border-purple-500/20 hover:scale-[1.01] transition-all duration-300 flex flex-col">
        {/* Top banner */}
        <div className="h-20 relative"
            style={{ background: 'linear-gradient(135deg, #1e1b4b 0%, #312e81 50%, #1e3a5f 100%)' }}>
            <div className="absolute bottom-0 left-6 translate-y-1/2">
                <img src={p.avatar} alt={p.fullName} className="w-14 h-14 rounded-2xl border-2 border-[#030712] object-cover" />
            </div>
            {/* Grade badge */}
            <div className="absolute top-4 right-4 text-[10px] font-black px-2 py-1 rounded-lg border"
                style={{ color: GRADE_COLOR[p.grade] || '#94a3b8', background: `${GRADE_COLOR[p.grade]}18`, borderColor: `${GRADE_COLOR[p.grade]}30` }}>
                Grade {p.grade}
            </div>
        </div>

        <div className="pt-10 pb-6 px-6 flex-1 flex flex-col gap-4">
            <div>
                <h3 className="text-lg font-black text-white group-hover:text-purple-400 transition-colors">{p.fullName}</h3>
                <p className="text-slate-500 text-[10px] font-black uppercase tracking-widest">{p.role}</p>
                {p.domain && (
                    <span className="mt-2 inline-block text-[9px] font-black px-2 py-0.5 rounded-full bg-blue-500/10 text-blue-400 border border-blue-500/20 uppercase tracking-widest">
                        {p.domain}
                    </span>
                )}
            </div>

            <p className="text-sm text-slate-500 line-clamp-2 leading-relaxed">{p.bio}</p>

            <div className="flex flex-wrap gap-1.5">
                {p.skills.slice(0, 4).map((s, i) => (
                    <span key={i} className="text-[9px] font-black px-2.5 py-1 rounded-full bg-white/5 border border-white/5 text-slate-400">{s}</span>
                ))}
            </div>

            <div className="flex gap-4 py-3 border-t border-white/5 text-center">
                <div className="flex-1"><div className="font-black text-white">{p.stats.repos}</div><div className="text-[8px] text-slate-600 uppercase tracking-widest font-black">Repos</div></div>
                <div className="w-px bg-white/5" />
                <div className="flex-1"><div className="font-black text-white">{p.score}</div><div className="text-[8px] text-slate-600 uppercase tracking-widest font-black">Score</div></div>
                <div className="w-px bg-white/5" />
                <div className="flex-1"><div className="font-black text-white">{p.stats.followers}</div><div className="text-[8px] text-slate-600 uppercase tracking-widest font-black">Followers</div></div>
            </div>

            {shortlisted && onUpdateStatus && (
                <div className="space-y-2">
                    <div className="text-[9px] font-black text-slate-500 uppercase tracking-widest">Update Status</div>
                    <div className="flex flex-wrap gap-1.5">
                        {(['reviewing', 'shortlisted', 'rejected', 'offered'] as ShortlistedCandidate['status'][]).map(s => (
                            <button key={s} onClick={() => onUpdateStatus(s)}
                                className="text-[8px] font-black px-2.5 py-1 rounded-full border transition-all"
                                style={{
                                    background: shortlisted.status === s ? STATUS_STYLE[s].bg : 'transparent',
                                    color: STATUS_STYLE[s].text,
                                    borderColor: `${STATUS_STYLE[s].text}40`,
                                }}>
                                {STATUS_STYLE[s].label}
                            </button>
                        ))}
                    </div>
                </div>
            )}

            <div className="flex gap-2 mt-auto pt-2">
                <button onClick={onView}
                    className="flex-1 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all hover:bg-white/10 border border-white/10 text-slate-300">
                    View Profile
                </button>
                <button onClick={onShortlist}
                    className="flex-1 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all border"
                    style={isShortlisted
                        ? { background: 'rgba(239,68,68,0.1)', color: '#ef4444', borderColor: 'rgba(239,68,68,0.3)' }
                        : { background: 'linear-gradient(135deg,#1d4ed8,#3b82f6)', color: 'white', border: 'none' }}>
                    {isShortlisted ? '✕ Remove' : '+ Shortlist'}
                </button>
            </div>
        </div>
    </div>
);

// ─── Main Component ───────────────────────────────────────────────────────────
const RecruiterDashboard: React.FC<RecruiterDashboardProps> = ({ portfolios, currentUser, onViewPortfolio }) => {
    const [activeTab, setActiveTab] = useState<DashTab>('overview');
    const [domainFilter, setDomainFilter] = useState<DomainFilter>('All');
    const [search, setSearch] = useState('');
    const [gradeFilter, setGradeFilter] = useState<string>('All');
    const [minScore, setMinScore] = useState(0);
    const [shortlisted, setShortlisted] = useState<ShortlistedCandidate[]>([]);
    const [jobs, setJobs] = useState<JobPosting[]>(DEFAULT_JOBS);
    const [aiQuery, setAiQuery] = useState('');
    const [aiResult, setAiResult] = useState('');
    const [aiLoading, setAiLoading] = useState(false);
    const [showNewJob, setShowNewJob] = useState(false);
    const [newJob, setNewJob] = useState<Partial<JobPosting>>({ type: 'Full-Time', domain: 'Frontend', status: 'active', applicants: 0 });
    const [unreadMsgCount, setUnreadMsgCount] = useState(0);

    // Load unread message count
    useEffect(() => {
        const loadUnread = async () => {
            const convs = await db.getConversationsByRecruiter(currentUser.id);
            const total = convs.reduce((sum, c) =>
                sum + c.messages.filter(m => m.senderId !== currentUser.id && !m.read).length, 0
            );
            setUnreadMsgCount(total);
        };
        loadUnread();
        const interval = setInterval(loadUnread, 15000); // refresh every 15s
        return () => clearInterval(interval);
    }, [currentUser.id]);

    // Search & filter portfolios
    const filtered = useMemo(() => {
        let r = [...portfolios];
        if (search) {
            const q = search.toLowerCase();
            r = r.filter(p => p.fullName.toLowerCase().includes(q) || p.role.toLowerCase().includes(q) || p.skills.some(s => s.toLowerCase().includes(q)));
        }
        if (domainFilter !== 'All') r = r.filter(p => p.domain === domainFilter);
        if (gradeFilter !== 'All') r = r.filter(p => p.grade === gradeFilter);
        r = r.filter(p => p.score >= minScore);
        r.sort((a, b) => b.score - a.score);
        return r;
    }, [portfolios, search, domainFilter, gradeFilter, minScore]);

    const shortlistedPortfolios = useMemo(() =>
        shortlisted.map(sl => ({ ...sl, portfolio: portfolios.find(p => p.id === sl.portfolioId) }))
            .filter(sl => sl.portfolio),
        [shortlisted, portfolios]);

    const handleShortlist = (portfolioId: string) => {
        setShortlisted(prev => {
            if (prev.find(s => s.portfolioId === portfolioId)) {
                return prev.filter(s => s.portfolioId !== portfolioId);
            }
            return [...prev, { portfolioId, note: '', status: 'reviewing', addedAt: new Date().toISOString() }];
        });
    };

    const updateStatus = (portfolioId: string, status: ShortlistedCandidate['status']) => {
        setShortlisted(prev => prev.map(s => s.portfolioId === portfolioId ? { ...s, status } : s));
    };

    const handleAIMatch = () => {
        if (!aiQuery.trim()) return;
        setAiLoading(true);
        setTimeout(() => {
            const matches = portfolios
                .filter(p => p.skills.some(s => aiQuery.toLowerCase().includes(s.toLowerCase())) || aiQuery.toLowerCase().includes(p.domain.toLowerCase()))
                .slice(0, 3)
                .map(p => `• ${p.fullName} (${p.role}) — Score ${p.score}, Skills: ${p.skills.slice(0, 3).join(', ')}`)
                .join('\n');
            setAiResult(matches
                ? `🎯 Best matches for "${aiQuery}":\n\n${matches}\n\nThese candidates have the closest skill alignment to your requirements.`
                : `No exact matches found for "${aiQuery}". Try broader terms like a technology name or domain (e.g. "React", "Security", "AI/ML").`);
            setAiLoading(false);
        }, 1500);
    };

    const handlePostJob = () => {
        if (!newJob.title || !newJob.company) return;
        const job: JobPosting = {
            id: `j${Date.now()}`,
            title: newJob.title || '',
            company: newJob.company || currentUser.company || '',
            location: newJob.location || 'Remote',
            type: newJob.type as JobPosting['type'] || 'Full-Time',
            domain: newJob.domain || 'Frontend',
            skills: (newJob.skills as string[] | undefined) || [],
            description: newJob.description || '',
            postedAt: new Date().toISOString(),
            applicants: 0,
            status: 'active',
        };
        setJobs(prev => [job, ...prev]);
        setNewJob({ type: 'Full-Time', domain: 'Frontend', status: 'active', applicants: 0 });
        setShowNewJob(false);
    };

    const toggleJobStatus = (id: string) => {
        setJobs(prev => prev.map(j => j.id === id ? { ...j, status: j.status === 'active' ? 'paused' : 'active' } : j));
    };

    const deleteJob = (id: string) => {
        setJobs(prev => prev.filter(j => j.id !== id));
    };

    // ── Tabs definition ──
    const TABS: { key: DashTab; icon: string; label: string }[] = [
        { key: 'overview', icon: '📊', label: 'Overview' },
        { key: 'search', icon: '🔍', label: 'Find Talent' },
        { key: 'jobs', icon: '💼', label: 'Job Postings' },
        { key: 'shortlist', icon: '⭐', label: `Shortlist (${shortlisted.length})` },
        { key: 'quiz', icon: '🎯', label: 'Quiz & Screen' },
        { key: 'messages', icon: '💬', label: unreadMsgCount > 0 ? `Messages (${unreadMsgCount})` : 'Messages' },
        { key: 'analytics', icon: '📈', label: 'AI Match' },
    ];

    return (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 pt-24 sm:pt-32 pb-24 space-y-10">
            <style>{`
        .recruiter-input {
          width: 100%; padding: 12px 16px;
          background: rgba(0,0,0,0.3); border: 1px solid rgba(255,255,255,0.08);
          border-radius: 12px; color: white; font-size: 13px; font-weight: 500; outline: none;
          transition: border-color 0.2s, box-shadow 0.2s; box-sizing: border-box;
        }
        .recruiter-input::placeholder { color: rgba(148,163,184,0.4); }
        .recruiter-input:focus { border-color: rgba(59,130,246,0.5); box-shadow: 0 0 0 3px rgba(59,130,246,0.1); }
        .recruiter-select { appearance: none; }
      `}</style>

            {/* ── Header ── */}
            <div className="flex flex-col sm:flex-row justify-between gap-6 items-start">
                <div className="space-y-2">
                    <div className="flex items-center gap-3">
                        <div className="w-12 h-12 rounded-2xl flex items-center justify-center text-2xl"
                            style={{ background: 'linear-gradient(135deg,#1d4ed8,#3b82f6)' }}>🏢</div>
                        <div>
                            <h1 className="text-3xl font-black text-white tracking-tight">Recruiter Hub</h1>
                            <p className="text-slate-500 text-sm">
                                {currentUser.company ? `${currentUser.company} · ` : ''}{currentUser.email}
                            </p>
                        </div>
                    </div>
                </div>
                <div className="flex items-center gap-3">
                    <button onClick={() => { setActiveTab('jobs'); setShowNewJob(true); }}
                        id="post-job-btn"
                        className="px-5 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest text-white transition-all hover:scale-[1.03]"
                        style={{ background: 'linear-gradient(135deg,#1d4ed8,#3b82f6)', boxShadow: '0 4px 20px rgba(59,130,246,0.25)' }}>
                        + Post a Job
                    </button>
                </div>
            </div>

            {/* ── Tab Navigation ── */}
            <div className="flex gap-2 overflow-x-auto no-scrollbar pb-1">
                {TABS.map(tab => (
                    <button key={tab.key} id={`tab-${tab.key}`}
                        onClick={() => setActiveTab(tab.key)}
                        className="whitespace-nowrap flex items-center gap-2 px-5 py-3 rounded-2xl text-[11px] font-black uppercase tracking-widest transition-all"
                        style={activeTab === tab.key
                            ? { background: 'linear-gradient(135deg,#1d4ed8,#3b82f6)', color: 'white', boxShadow: '0 4px 20px rgba(59,130,246,0.25)' }
                            : { background: 'rgba(255,255,255,0.04)', color: '#94a3b8' }}>
                        <span>{tab.icon}</span> {tab.label}
                    </button>
                ))}
            </div>

            {/* ══════════════════════════ TAB: OVERVIEW ══════════════════════════ */}
            {activeTab === 'overview' && (
                <div className="space-y-10 animate-in fade-in duration-500">
                    {/* Stats */}
                    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                        <StatCard icon="👥" label="Total Profiles" value={portfolios.length} color="#3b82f6" />
                        <StatCard icon="⭐" label="Shortlisted" value={shortlisted.length} color="#f59e0b" />
                        <StatCard icon="💼" label="Active Jobs" value={jobs.filter(j => j.status === 'active').length} color="#10b981" />
                        <StatCard icon="🤝" label="Offers Extended" value={shortlisted.filter(s => s.status === 'offered').length} color="#a855f7" />
                    </div>

                    {/* Top Candidates */}
                    <div className="space-y-6">
                        <h2 className="text-xl font-black text-white">🏆 Top Ranked Candidates</h2>
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                            {[...portfolios].sort((a, b) => b.score - a.score).slice(0, 3).map(p => (
                                <CandidateCard key={p.id} portfolio={p} isShortlisted={!!shortlisted.find(s => s.portfolioId === p.id)}
                                    onView={() => onViewPortfolio(p)} onShortlist={() => handleShortlist(p.id)} />
                            ))}
                        </div>
                    </div>

                    {/* Active Job Postings */}
                    <div className="space-y-4">
                        <h2 className="text-xl font-black text-white">📋 Your Active Job Postings</h2>
                        {jobs.filter(j => j.status === 'active').length === 0
                            ? <p className="text-slate-500 text-sm">No active postings. <button onClick={() => { setActiveTab('jobs'); setShowNewJob(true); }} className="text-blue-400 hover:underline">Post a job now →</button></p>
                            : (
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                    {jobs.filter(j => j.status === 'active').slice(0, 4).map(job => (
                                        <div key={job.id} className="bg-glass rounded-2xl p-5 border border-white/5 flex items-center justify-between gap-4">
                                            <div>
                                                <div className="font-black text-white">{job.title}</div>
                                                <div className="text-xs text-slate-400">{job.location} · {job.type}</div>
                                                <div className="text-[10px] text-slate-500 mt-1">{job.applicants} applicants</div>
                                            </div>
                                            <span className="text-[9px] font-black px-2 py-1 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 uppercase tracking-widest whitespace-nowrap">
                                                Active
                                            </span>
                                        </div>
                                    ))}
                                </div>
                            )}
                    </div>
                </div>
            )}

            {/* ══════════════════════════ TAB: SEARCH ══════════════════════════ */}
            {activeTab === 'search' && (
                <div className="space-y-8 animate-in fade-in duration-500">
                    {/* Filters */}
                    <div className="bg-glass rounded-[28px] p-6 border border-white/5 space-y-5">
                        <h2 className="text-lg font-black text-white">🔍 Find Talent</h2>
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                            <div className="relative sm:col-span-2">
                                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500">🔎</span>
                                <input id="talent-search" type="text" placeholder="Search by name, role, or skill..."
                                    className="recruiter-input" style={{ paddingLeft: '40px' }}
                                    value={search} onChange={e => setSearch(e.target.value)} />
                            </div>

                            <select id="domain-filter" value={domainFilter} onChange={e => setDomainFilter(e.target.value as DomainFilter)}
                                className="recruiter-input recruiter-select">
                                {DOMAINS.map(d => <option key={d} value={d}>{d === 'All' ? 'All Domains' : d}</option>)}
                            </select>

                            <select id="grade-filter" value={gradeFilter} onChange={e => setGradeFilter(e.target.value)}
                                className="recruiter-input recruiter-select">
                                {['All', 'S', 'A', 'B', 'C'].map(g => <option key={g} value={g}>{g === 'All' ? 'All Grades' : `Grade ${g}`}</option>)}
                            </select>
                        </div>

                        <div className="space-y-2">
                            <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">
                                Minimum Score: <span className="text-blue-400">{minScore}</span>
                            </label>
                            <input type="range" min={0} max={100} value={minScore} onChange={e => setMinScore(Number(e.target.value))}
                                className="w-full accent-blue-500" />
                        </div>
                    </div>

                    <div className="flex items-center justify-between">
                        <p className="text-slate-400 text-sm font-bold">{filtered.length} candidates found</p>
                        <button onClick={() => { setSearch(''); setDomainFilter('All'); setGradeFilter('All'); setMinScore(0); }}
                            className="text-xs text-slate-500 hover:text-slate-300 transition-colors font-bold">Reset Filters</button>
                    </div>

                    {filtered.length === 0
                        ? (
                            <div className="py-20 text-center space-y-4">
                                <div className="text-6xl">🔍</div>
                                <h3 className="text-2xl font-black text-white">No Results</h3>
                                <p className="text-slate-500">Try adjusting your filters.</p>
                            </div>
                        )
                        : (
                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                                {filtered.map(p => (
                                    <CandidateCard key={p.id} portfolio={p}
                                        isShortlisted={!!shortlisted.find(s => s.portfolioId === p.id)}
                                        onView={() => onViewPortfolio(p)} onShortlist={() => handleShortlist(p.id)} />
                                ))}
                            </div>
                        )}
                </div>
            )}

            {/* ══════════════════════════ TAB: JOBS ══════════════════════════ */}
            {activeTab === 'jobs' && (
                <div className="space-y-8 animate-in fade-in duration-500">
                    <div className="flex items-center justify-between">
                        <h2 className="text-xl font-black text-white">💼 Job Postings</h2>
                        <button id="new-job-btn" onClick={() => setShowNewJob(v => !v)}
                            className="px-5 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest text-white"
                            style={{ background: 'linear-gradient(135deg,#1d4ed8,#3b82f6)' }}>
                            {showNewJob ? '✕ Cancel' : '+ New Posting'}
                        </button>
                    </div>

                    {showNewJob && (
                        <div className="bg-glass rounded-[28px] p-6 border border-blue-500/20 space-y-5 animate-in fade-in">
                            <h3 className="font-black text-white text-lg">Post a New Job</h3>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <div className="space-y-1"><label className="text-[9px] font-black text-slate-500 uppercase tracking-widest">Job Title *</label>
                                    <input id="job-title" className="recruiter-input" placeholder="e.g. Senior Frontend Engineer"
                                        value={newJob.title || ''} onChange={e => setNewJob(j => ({ ...j, title: e.target.value }))} /></div>
                                <div className="space-y-1"><label className="text-[9px] font-black text-slate-500 uppercase tracking-widest">Company *</label>
                                    <input id="job-company" className="recruiter-input" placeholder={currentUser.company || 'Company Name'}
                                        value={newJob.company || ''} onChange={e => setNewJob(j => ({ ...j, company: e.target.value }))} /></div>
                                <div className="space-y-1"><label className="text-[9px] font-black text-slate-500 uppercase tracking-widest">Location</label>
                                    <input id="job-location" className="recruiter-input" placeholder="Remote / City, Country"
                                        value={newJob.location || ''} onChange={e => setNewJob(j => ({ ...j, location: e.target.value }))} /></div>
                                <div className="space-y-1"><label className="text-[9px] font-black text-slate-500 uppercase tracking-widest">Job Type</label>
                                    <select id="job-type" className="recruiter-input recruiter-select"
                                        value={newJob.type} onChange={e => setNewJob(j => ({ ...j, type: e.target.value as JobPosting['type'] }))}>
                                        {['Full-Time', 'Part-Time', 'Internship', 'Contract'].map(t => <option key={t}>{t}</option>)}
                                    </select></div>
                                <div className="space-y-1"><label className="text-[9px] font-black text-slate-500 uppercase tracking-widest">Domain</label>
                                    <select id="job-domain" className="recruiter-input recruiter-select"
                                        value={newJob.domain} onChange={e => setNewJob(j => ({ ...j, domain: e.target.value }))}>
                                        {['Frontend', 'Backend', 'Full Stack', 'Security', 'AI/ML'].map(d => <option key={d}>{d}</option>)}
                                    </select></div>
                                <div className="space-y-1"><label className="text-[9px] font-black text-slate-500 uppercase tracking-widest">Required Skills (comma separated)</label>
                                    <input id="job-skills" className="recruiter-input" placeholder="React, TypeScript, Node.js"
                                        onChange={e => setNewJob(j => ({ ...j, skills: e.target.value.split(',').map(s => s.trim()) }))} /></div>
                            </div>
                            <div className="space-y-1"><label className="text-[9px] font-black text-slate-500 uppercase tracking-widest">Job Description</label>
                                <textarea id="job-desc" className="recruiter-input" rows={3} placeholder="Describe the role and responsibilities..."
                                    value={newJob.description || ''} onChange={e => setNewJob(j => ({ ...j, description: e.target.value }))}
                                    style={{ resize: 'vertical' }} /></div>
                            <button id="post-job-submit" onClick={handlePostJob}
                                className="w-full py-3 rounded-xl font-black text-white text-sm uppercase tracking-widest"
                                style={{ background: 'linear-gradient(135deg,#1d4ed8,#3b82f6)' }}>
                                Publish Job Posting →
                            </button>
                        </div>
                    )}

                    {jobs.length === 0
                        ? <div className="py-20 text-center text-slate-500">No job postings yet. Create one above!</div>
                        : (
                            <div className="space-y-4">
                                {jobs.map(job => (
                                    <div key={job.id} className="bg-glass rounded-2xl p-6 border border-white/5 flex flex-col sm:flex-row gap-4 sm:items-center justify-between">
                                        <div className="space-y-2 flex-1">
                                            <div className="flex items-center gap-3 flex-wrap">
                                                <h3 className="font-black text-white text-lg">{job.title}</h3>
                                                <span className="text-[9px] font-black px-2 py-0.5 rounded-full uppercase tracking-widest"
                                                    style={job.status === 'active'
                                                        ? { background: 'rgba(16,185,129,0.1)', color: '#10b981', border: '1px solid rgba(16,185,129,0.3)' }
                                                        : { background: 'rgba(251,191,36,0.1)', color: '#fbbf24', border: '1px solid rgba(251,191,36,0.3)' }}>
                                                    {job.status}
                                                </span>
                                            </div>
                                            <div className="flex flex-wrap gap-3 text-xs text-slate-400">
                                                <span>🏢 {job.company}</span>
                                                <span>📍 {job.location}</span>
                                                <span>⏱ {job.type}</span>
                                                <span>🎯 {job.domain}</span>
                                                <span>👥 {job.applicants} applicants</span>
                                            </div>
                                            <div className="flex flex-wrap gap-1.5 mt-1">
                                                {job.skills.map((s, i) => (
                                                    <span key={i} className="text-[9px] px-2 py-0.5 rounded-full bg-blue-500/10 text-blue-400 border border-blue-500/20 font-bold">{s}</span>
                                                ))}
                                            </div>
                                        </div>
                                        <div className="flex gap-2 shrink-0">
                                            <button onClick={() => toggleJobStatus(job.id)}
                                                className="px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest border border-white/10 text-slate-300 hover:bg-white/10 transition-all">
                                                {job.status === 'active' ? 'Pause' : 'Resume'}
                                            </button>
                                            <button onClick={() => deleteJob(job.id)}
                                                className="px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest border border-red-500/20 text-red-400 hover:bg-red-500/10 transition-all">
                                                Delete
                                            </button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )
                    }
                </div>
            )}

            {/* ══════════════════════════ TAB: SHORTLIST ══════════════════════════ */}
            {activeTab === 'shortlist' && (
                <div className="space-y-8 animate-in fade-in duration-500">
                    <h2 className="text-xl font-black text-white">⭐ Shortlisted Candidates</h2>
                    {shortlistedPortfolios.length === 0
                        ? (
                            <div className="py-24 text-center space-y-4 bg-glass rounded-[28px] border border-white/5">
                                <div className="text-5xl">📋</div>
                                <h3 className="text-xl font-black text-white">No Candidates Shortlisted</h3>
                                <p className="text-slate-500 text-sm">Head to <button onClick={() => setActiveTab('search')} className="text-blue-400 hover:underline">Find Talent</button> to start building your list.</p>
                            </div>
                        )
                        : (
                            <>
                                {/* Status summary */}
                                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                                    {(['reviewing', 'shortlisted', 'offered', 'rejected'] as ShortlistedCandidate['status'][]).map(s => (
                                        <div key={s} className="bg-glass rounded-xl p-4 border border-white/5 text-center">
                                            <div className="text-xl font-black" style={{ color: STATUS_STYLE[s].text }}>
                                                {shortlisted.filter(sl => sl.status === s).length}
                                            </div>
                                            <div className="text-[9px] font-black uppercase tracking-widest text-slate-500">{STATUS_STYLE[s].label}</div>
                                        </div>
                                    ))}
                                </div>

                                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                                    {shortlistedPortfolios.map(sl => sl.portfolio && (
                                        <CandidateCard key={sl.portfolioId} portfolio={sl.portfolio}
                                            shortlisted={sl as ShortlistedCandidate}
                                            isShortlisted onView={() => onViewPortfolio(sl.portfolio!)}
                                            onShortlist={() => handleShortlist(sl.portfolioId)}
                                            onUpdateStatus={s => updateStatus(sl.portfolioId, s)} />
                                    ))}
                                </div>
                            </>
                        )}
                </div>
            )}

            {/* ══════════════════════════ TAB: AI MATCH ══════════════════════════ */}
            {activeTab === 'analytics' && (
                <div className="space-y-8 animate-in fade-in duration-500">
                    <div className="space-y-2">
                        <h2 className="text-xl font-black text-white">🤖 AI Talent Matcher</h2>
                        <p className="text-slate-400 text-sm">Describe your ideal candidate and let AI find the best matches from the talent pool.</p>
                    </div>

                    <div className="bg-glass rounded-[28px] p-6 sm:p-8 border border-blue-500/10 space-y-5">
                        <div className="space-y-2">
                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Describe Your Ideal Candidate</label>
                            <textarea id="ai-match-query"
                                className="recruiter-input" rows={4}
                                style={{ resize: 'vertical', paddingTop: '12px' }}
                                placeholder="e.g. I need a senior React developer with TypeScript and GraphQL experience who has worked on enterprise SaaS products..."
                                value={aiQuery} onChange={e => setAiQuery(e.target.value)} />
                        </div>
                        <button id="ai-match-btn" onClick={handleAIMatch} disabled={aiLoading || !aiQuery.trim()}
                            className="px-8 py-3 rounded-xl font-black text-white text-sm uppercase tracking-widest transition-all hover:scale-[1.02] disabled:opacity-50"
                            style={{ background: 'linear-gradient(135deg,#1d4ed8,#3b82f6)', boxShadow: '0 4px 20px rgba(59,130,246,0.25)' }}>
                            {aiLoading ? '⏳ Matching...' : '⚡ Find Matches'}
                        </button>

                        {aiResult && (
                            <div className="p-6 rounded-2xl border border-blue-500/20 whitespace-pre-line text-sm text-slate-300 leading-relaxed animate-in fade-in"
                                style={{ background: 'rgba(29,78,216,0.05)' }}>
                                {aiResult}
                            </div>
                        )}
                    </div>

                    {/* Domain Distribution Chart */}
                    <div className="bg-glass rounded-[28px] p-6 sm:p-8 border border-white/5 space-y-5">
                        <h3 className="font-black text-white text-lg">📊 Talent Pool Analytics</h3>
                        <div className="space-y-3">
                            {DOMAINS.filter(d => d !== 'All').map(domain => {
                                const count = portfolios.filter(p => p.domain === domain).length;
                                const pct = portfolios.length > 0 ? Math.round((count / portfolios.length) * 100) : 0;
                                return (
                                    <div key={domain} className="space-y-1">
                                        <div className="flex justify-between text-xs text-slate-400 font-bold">
                                            <span>{domain}</span>
                                            <span>{count} candidates ({pct}%)</span>
                                        </div>
                                        <div className="h-2 bg-white/5 rounded-full overflow-hidden">
                                            <div className="h-full rounded-full transition-all duration-700"
                                                style={{ width: `${pct}%`, background: 'linear-gradient(90deg,#1d4ed8,#3b82f6)' }} />
                                        </div>
                                    </div>
                                );
                            })}
                        </div>

                        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 pt-4 border-t border-white/5">
                            <div className="text-center">
                                <div className="text-2xl font-black text-white">{Math.round(portfolios.reduce((a, p) => a + p.score, 0) / Math.max(portfolios.length, 1))}</div>
                                <div className="text-[9px] font-black text-slate-500 uppercase tracking-widest">Avg. Score</div>
                            </div>
                            <div className="text-center">
                                <div className="text-2xl font-black text-white">{portfolios.filter(p => p.grade === 'S' || p.grade === 'A').length}</div>
                                <div className="text-[9px] font-black text-slate-500 uppercase tracking-widest">Elite Candidates</div>
                            </div>
                            <div className="text-center">
                                <div className="text-2xl font-black text-white">{[...new Set(portfolios.flatMap(p => p.skills))].length}</div>
                                <div className="text-[9px] font-black text-slate-500 uppercase tracking-widest">Unique Skills</div>
                            </div>
                        </div>
                    </div>
                </div>
            )}
            {/* ══════════════════════════ TAB: QUIZ ══════════════════════════ */}
            {activeTab === 'quiz' && (
                <div className="animate-in fade-in duration-500">
                    <RecruiterQuizPanel
                        currentUser={currentUser}
                        shortlistedPortfolios={shortlistedPortfolios
                            .map(sl => sl.portfolio)
                            .filter((p): p is UserPortfolio => !!p)}
                    />
                </div>
            )}

            {/* ══════════════════════════ TAB: MESSAGES ══════════════════════════ */}
            {activeTab === 'messages' && (
                <div className="animate-in fade-in duration-500">
                    <MessagingPanel
                        currentUser={currentUser}
                        allPortfolios={portfolios}
                    />
                </div>
            )}
        </div>
    );
};

export default RecruiterDashboard;
