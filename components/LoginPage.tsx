
import React, { useState } from 'react';
import { AuthUser, UserRole } from '../types.ts';
import { db, lookupGSTIN, validateGSTIN, GSTINLookupResult } from '../services/db.ts';

interface LoginPageProps {
    onAuthSuccess: (user: AuthUser) => void;
}

type Step = 'role-select' | 'auth';

const LoginPage: React.FC<LoginPageProps> = ({ onAuthSuccess }) => {
    const [step, setStep] = useState<Step>('role-select');
    const [selectedRole, setSelectedRole] = useState<UserRole | null>(null);
    const [isLogin, setIsLogin] = useState(true);
    const [loading, setLoading] = useState(false);
    const [apiError, setApiError] = useState<string | null>(null);

    // Form fields
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [fullName, setFullName] = useState('');
    const [company, setCompany] = useState('');
    const [website, setWebsite] = useState('');
    const [gstin, setGstin] = useState('');
    const [gstinLookup, setGstinLookup] = useState<GSTINLookupResult | null>(null);
    const [showPassword, setShowPassword] = useState(false);

    const handleGstinChange = (val: string) => {
        const upper = val.toUpperCase();
        setGstin(upper);
        if (upper.length === 15) {
            const result = lookupGSTIN(upper);
            setGstinLookup(result);
            // Auto-fill company name from registry
            if (result.status === 'registered' && result.tradeName && !company) {
                setCompany(result.tradeName);
            }
        } else {
            setGstinLookup(null);
        }
    };

    const handleRoleSelect = (role: UserRole) => {
        setSelectedRole(role);
        setStep('auth');
        setIsLogin(true);
    };

    const handleBack = () => {
        setStep('role-select');
        setSelectedRole(null);
        setEmail('');
        setPassword('');
        setFullName('');
        setCompany('');
        setWebsite('');
        setGstin('');
        setGstinLookup(null);
        setApiError(null);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedRole) return;
        setLoading(true);
        setApiError(null);

        try {
            let authUser: AuthUser;
            if (isLogin) {
                authUser = await db.login({ email, password, role: selectedRole });
            } else {
                // Client-side GSTIN validation before trying to register
                if (selectedRole === 'recruiter') {
                    if (!gstin) { setApiError('GSTIN is required for recruiter registration.'); setLoading(false); return; }
                    const lookup = lookupGSTIN(gstin);
                    if (lookup.status === 'invalid') {
                        setApiError('Invalid GSTIN format. Please enter a valid 15-character GSTIN (e.g. 27AAACR5055K1ZK or 22AAAAA0000A1Z5).');
                        setLoading(false);
                        return;
                    }
                }
                authUser = await db.register({
                    fullName,
                    email,
                    password,
                    role: selectedRole,
                    ...(selectedRole === 'recruiter' && { company, website, gstin }),
                });
            }
            localStorage.setItem('portfoliox_user', JSON.stringify(authUser));
            onAuthSuccess(authUser);
        } catch (err: unknown) {
            let msg: string;
            if (err && typeof err === 'object' && (err as { isNetworkError?: boolean }).isNetworkError) {
                msg = '🔌 Cannot reach the server. Start the API server locally (cd server && npm run dev), or ensure your Vercel deployment is live.';
            } else if (err instanceof Error) {
                msg = err.message;
            } else {
                msg = 'Authentication failed. Please try again.';
            }
            setApiError(msg);
        } finally {
            setLoading(false);
        }
    };

    const isRecruiter = selectedRole === 'recruiter';

    return (
        <div className="min-h-screen flex items-center justify-center px-4 py-20 relative overflow-hidden">
            {/* Animated Gradient Orbs */}
            <div
                className="absolute pointer-events-none"
                style={{
                    top: '-20%', left: '-10%',
                    width: '60%', height: '60%',
                    background: isRecruiter
                        ? 'radial-gradient(circle, rgba(59,130,246,0.15) 0%, transparent 70%)'
                        : 'radial-gradient(circle, rgba(168,85,247,0.15) 0%, transparent 70%)',
                    filter: 'blur(60px)',
                    transition: 'background 0.8s ease',
                }}
            />
            <div
                className="absolute pointer-events-none"
                style={{
                    bottom: '-20%', right: '-10%',
                    width: '50%', height: '50%',
                    background: isRecruiter
                        ? 'radial-gradient(circle, rgba(16,185,129,0.1) 0%, transparent 70%)'
                        : 'radial-gradient(circle, rgba(99,102,241,0.15) 0%, transparent 70%)',
                    filter: 'blur(80px)',
                    transition: 'background 0.8s ease',
                }}
            />

            <div className="w-full max-w-4xl relative z-10">

                {/* ─── Step 1 — Role Selection ─── */}
                {step === 'role-select' && (
                    <div style={{ animation: 'fadeSlideUp 0.6s ease forwards' }}>
                        <style>{`
              @keyframes fadeSlideUp {
                from { opacity: 0; transform: translateY(30px); }
                to   { opacity: 1; transform: translateY(0); }
              }
              @keyframes floatCard {
                0%, 100% { transform: translateY(0px); }
                50%       { transform: translateY(-8px); }
              }
              @keyframes shimmer {
                from { background-position: -200% center; }
                to   { background-position:  200% center; }
              }
              .role-card { transition: transform 0.35s ease, box-shadow 0.35s ease, border-color 0.35s ease; }
              .role-card:hover { transform: translateY(-10px) scale(1.02); }
            `}</style>

                        <div className="text-center mb-14 space-y-4">
                            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest border border-white/10 bg-white/5 text-purple-400 mb-4">
                                <span className="w-1.5 h-1.5 rounded-full bg-purple-400 animate-pulse inline-block" />
                                PortfolioX Platform
                            </div>
                            <h1 className="text-5xl sm:text-6xl font-black tracking-tighter text-white leading-none">
                                Who Are <span style={{
                                    background: 'linear-gradient(135deg, #a855f7 0%, #6366f1 50%, #3b82f6 100%)',
                                    backgroundSize: '200% auto',
                                    WebkitBackgroundClip: 'text',
                                    WebkitTextFillColor: 'transparent',
                                    animation: 'shimmer 3s linear infinite',
                                }}>You?</span>
                            </h1>
                            <p className="text-slate-400 text-lg font-medium max-w-md mx-auto">
                                Choose your role to access a tailored experience built just for you.
                            </p>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 lg:gap-10">

                            {/* Recruiter Card */}
                            <button
                                id="role-recruiter-btn"
                                className="role-card group relative text-left rounded-[36px] overflow-hidden border border-blue-500/20 bg-[rgba(15,23,42,0.5)] backdrop-blur-xl p-8 sm:p-10 cursor-pointer"
                                style={{ boxShadow: '0 0 60px rgba(59,130,246,0.08)' }}
                                onClick={() => handleRoleSelect('recruiter')}
                            >
                                {/* Gradient Corner */}
                                <div className="absolute top-0 right-0 w-48 h-48 rounded-full"
                                    style={{ background: 'radial-gradient(circle, rgba(59,130,246,0.2) 0%, transparent 70%)', filter: 'blur(20px)' }} />

                                <div className="relative space-y-6">
                                    {/* Icon */}
                                    <div className="w-16 h-16 rounded-2xl flex items-center justify-center text-3xl shadow-xl"
                                        style={{ background: 'linear-gradient(135deg, #1d4ed8 0%, #3b82f6 100%)' }}>
                                        🏢
                                    </div>

                                    <div className="space-y-2">
                                        <h2 className="text-3xl font-black text-white tracking-tight">Recruiter</h2>
                                        <p className="text-slate-400 text-sm leading-relaxed">
                                            Find top talent, review portfolios, post jobs, and connect with skilled professionals.
                                        </p>
                                    </div>

                                    <ul className="space-y-3">
                                        {['Search & filter developer portfolios', 'Post job openings & internships', 'Shortlist and manage candidates', 'AI-powered talent matching'].map((f, i) => (
                                            <li key={i} className="flex items-center gap-3 text-sm text-slate-300">
                                                <span className="w-5 h-5 rounded-full flex items-center justify-center shrink-0 text-[10px]"
                                                    style={{ background: 'linear-gradient(135deg, #1d4ed8 0%, #3b82f6 100%)' }}>✓</span>
                                                {f}
                                            </li>
                                        ))}
                                    </ul>

                                    <div className="flex items-center gap-3 pt-2">
                                        <span className="flex-1 text-xs font-black text-blue-400 uppercase tracking-widest group-hover:gap-3 transition-all">
                                            Continue as Recruiter
                                        </span>
                                        <span className="w-10 h-10 rounded-xl bg-blue-500/20 flex items-center justify-center text-blue-400 group-hover:bg-blue-500 group-hover:text-white transition-all">→</span>
                                    </div>
                                </div>
                            </button>

                            {/* Job Seeker Card */}
                            <button
                                id="role-jobseeker-btn"
                                className="role-card group relative text-left rounded-[36px] overflow-hidden border border-purple-500/20 bg-[rgba(15,23,42,0.5)] backdrop-blur-xl p-8 sm:p-10 cursor-pointer"
                                style={{ boxShadow: '0 0 60px rgba(168,85,247,0.08)' }}
                                onClick={() => handleRoleSelect('jobseeker')}
                            >
                                <div className="absolute top-0 right-0 w-48 h-48 rounded-full"
                                    style={{ background: 'radial-gradient(circle, rgba(168,85,247,0.2) 0%, transparent 70%)', filter: 'blur(20px)' }} />

                                <div className="relative space-y-6">
                                    <div className="w-16 h-16 rounded-2xl flex items-center justify-center text-3xl shadow-xl"
                                        style={{ background: 'linear-gradient(135deg, #7c3aed 0%, #a855f7 100%)' }}>
                                        🚀
                                    </div>

                                    <div className="space-y-2">
                                        <h2 className="text-3xl font-black text-white tracking-tight">Job Seeker</h2>
                                        <p className="text-slate-400 text-sm leading-relaxed">
                                            Build a stunning AI portfolio, get discovered by recruiters, and level up your career.
                                        </p>
                                    </div>

                                    <ul className="space-y-3">
                                        {['Generate AI-powered portfolio', 'Get discovered by top companies', 'Track your profile score & grade', 'Earn XP in the Quiz Arena'].map((f, i) => (
                                            <li key={i} className="flex items-center gap-3 text-sm text-slate-300">
                                                <span className="w-5 h-5 rounded-full flex items-center justify-center shrink-0 text-[10px]"
                                                    style={{ background: 'linear-gradient(135deg, #7c3aed 0%, #a855f7 100%)' }}>✓</span>
                                                {f}
                                            </li>
                                        ))}
                                    </ul>

                                    <div className="flex items-center gap-3 pt-2">
                                        <span className="flex-1 text-xs font-black text-purple-400 uppercase tracking-widest">
                                            Continue as Job Seeker
                                        </span>
                                        <span className="w-10 h-10 rounded-xl bg-purple-500/20 flex items-center justify-center text-purple-400 group-hover:bg-purple-500 group-hover:text-white transition-all">→</span>
                                    </div>
                                </div>
                            </button>
                        </div>
                    </div>
                )}

                {/* ─── Step 2 — Auth Form ─── */}
                {step === 'auth' && selectedRole && (
                    <div className="max-w-md mx-auto" style={{ animation: 'fadeSlideUp 0.5s ease forwards' }}>
                        <style>{`
              @keyframes fadeSlideUp {
                from { opacity: 0; transform: translateY(24px); }
                to   { opacity: 1; transform: translateY(0); }
              }
              .input-field {
                width: 100%;
                padding: 14px 16px;
                background: rgba(0,0,0,0.35);
                border: 1px solid rgba(255,255,255,0.08);
                border-radius: 14px;
                color: white;
                font-size: 14px;
                font-weight: 500;
                outline: none;
                transition: border-color 0.2s, box-shadow 0.2s;
                box-sizing: border-box;
              }
              .input-field::placeholder { color: rgba(148,163,184,0.5); }
              .input-field:focus {
                border-color: ${isRecruiter ? 'rgba(59,130,246,0.6)' : 'rgba(168,85,247,0.6)'};
                box-shadow: 0 0 0 3px ${isRecruiter ? 'rgba(59,130,246,0.12)' : 'rgba(168,85,247,0.12)'};
              }
            `}</style>

                        {/* Back Button */}
                        <button
                            onClick={handleBack}
                            className="flex items-center gap-2 text-slate-400 hover:text-white transition-colors mb-8 text-sm font-bold"
                            id="back-to-role-btn"
                        >
                            <span className="w-8 h-8 rounded-xl bg-white/5 flex items-center justify-center hover:bg-white/10">←</span>
                            Change Role
                        </button>

                        {/* Card */}
                        <div
                            className="rounded-[32px] p-8 sm:p-10 space-y-8 border backdrop-blur-xl"
                            style={{
                                background: 'rgba(10,15,28,0.7)',
                                borderColor: isRecruiter ? 'rgba(59,130,246,0.2)' : 'rgba(168,85,247,0.2)',
                                boxShadow: isRecruiter
                                    ? '0 0 80px rgba(59,130,246,0.08)'
                                    : '0 0 80px rgba(168,85,247,0.08)',
                            }}
                        >
                            {/* Header */}
                            <div className="text-center space-y-3">
                                <div className="w-14 h-14 rounded-2xl mx-auto flex items-center justify-center text-2xl"
                                    style={{ background: isRecruiter ? 'linear-gradient(135deg,#1d4ed8,#3b82f6)' : 'linear-gradient(135deg,#7c3aed,#a855f7)' }}>
                                    {isRecruiter ? '🏢' : '🚀'}
                                </div>
                                <div className="space-y-1">
                                    <div className="inline-block px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest border"
                                        style={{
                                            color: isRecruiter ? '#60a5fa' : '#c084fc',
                                            borderColor: isRecruiter ? 'rgba(59,130,246,0.3)' : 'rgba(168,85,247,0.3)',
                                            background: isRecruiter ? 'rgba(59,130,246,0.1)' : 'rgba(168,85,247,0.1)',
                                        }}>
                                        {isRecruiter ? 'Recruiter' : 'Job Seeker'}
                                    </div>
                                    <h2 className="text-3xl font-black text-white">
                                        {isLogin ? 'Welcome Back' : `Join as ${isRecruiter ? 'Recruiter' : 'Job Seeker'}`}
                                    </h2>
                                    <p className="text-slate-400 text-sm">
                                        {isLogin
                                            ? 'Sign in to continue to your dashboard'
                                            : isRecruiter
                                                ? 'Start finding top developer talent today'
                                                : 'Build your professional identity with AI'}
                                    </p>
                                </div>
                            </div>

                            {/* Form */}
                            <form onSubmit={handleSubmit} className="space-y-4">
                                {!isLogin && (
                                    <div className="space-y-1.5">
                                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Full Name</label>
                                        <input id="auth-fullname" className="input-field" type="text" required placeholder="John Doe"
                                            value={fullName} onChange={e => setFullName(e.target.value)} />
                                    </div>
                                )}

                                {!isLogin && isRecruiter && (
                                    <>
                                        <div className="space-y-1.5">
                                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Company Name</label>
                                            <input id="auth-company" className="input-field" type="text" required placeholder="Acme Corp"
                                                value={company} onChange={e => setCompany(e.target.value)} />
                                        </div>
                                        <div className="space-y-1.5">
                                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Company Website</label>
                                            <input id="auth-website" className="input-field" type="url" placeholder="https://company.com"
                                                value={website} onChange={e => setWebsite(e.target.value)} />
                                        </div>
                                        {/* ── GSTIN Verification Field ── */}
                                        <div className="space-y-2">
                                            <label className="text-[10px] font-black uppercase tracking-widest flex items-center gap-2"
                                                style={{ color: '#fbbf24' }}>
                                                🏛️ GSTIN Number <span className="text-red-400">*</span>
                                                <span className="bg-yellow-500/10 text-yellow-400 border border-yellow-500/20 px-1.5 py-0.5 rounded text-[8px] font-black">REQUIRED</span>
                                            </label>

                                            {/* Input */}
                                            <div className="relative">
                                                <input
                                                    id="auth-gstin"
                                                    className="input-field"
                                                    type="text"
                                                    required
                                                    placeholder="e.g. 27AAACR5055K1ZK"
                                                    maxLength={15}
                                                    value={gstin}
                                                    onChange={e => handleGstinChange(e.target.value)}
                                                    style={{
                                                        letterSpacing: '0.12em',
                                                        fontFamily: 'monospace',
                                                        fontSize: '13px',
                                                        borderColor:
                                                            gstinLookup?.status === 'invalid'
                                                                ? 'rgba(239,68,68,0.6)'
                                                                : gstinLookup?.status === 'registered'
                                                                    ? 'rgba(16,185,129,0.6)'
                                                                    : gstinLookup?.status === 'format-valid'
                                                                        ? 'rgba(251,191,36,0.6)'
                                                                        : undefined,
                                                    }}
                                                />
                                                <span className="absolute right-4 top-1/2 -translate-y-1/2 text-sm">
                                                    {gstinLookup?.status === 'registered' ? '✅'
                                                        : gstinLookup?.status === 'format-valid' ? '🟡'
                                                            : gstinLookup?.status === 'invalid' ? '❌'
                                                                : gstin.length > 0 ? `${gstin.length}/15` : ''}
                                                </span>
                                            </div>

                                            {/* ── Verification Result Card ── */}
                                            {gstinLookup?.status === 'registered' && (
                                                <div style={{
                                                    background: 'rgba(16,185,129,0.08)',
                                                    border: '1px solid rgba(16,185,129,0.3)',
                                                    borderRadius: '14px',
                                                    padding: '14px 16px',
                                                    animation: 'fadeSlideUp 0.4s ease forwards',
                                                }}>
                                                    <div className="flex items-center gap-2 mb-2">
                                                        <span className="text-base">✅</span>
                                                        <span className="text-emerald-400 text-[10px] font-black uppercase tracking-widest">Verified — Found in GST Registry</span>
                                                    </div>
                                                    <div className="space-y-1.5">
                                                        <div className="flex items-center gap-2">
                                                            <span className="text-slate-500 text-[10px] font-bold w-24 shrink-0">Legal Name</span>
                                                            <span className="text-white text-xs font-black">{gstinLookup.legalName}</span>
                                                        </div>
                                                        {gstinLookup.tradeName && gstinLookup.tradeName !== gstinLookup.legalName && (
                                                            <div className="flex items-center gap-2">
                                                                <span className="text-slate-500 text-[10px] font-bold w-24 shrink-0">Trade Name</span>
                                                                <span className="text-slate-300 text-xs font-bold">{gstinLookup.tradeName}</span>
                                                            </div>
                                                        )}
                                                        <div className="flex items-center gap-2">
                                                            <span className="text-slate-500 text-[10px] font-bold w-24 shrink-0">State</span>
                                                            <span className="text-slate-300 text-xs font-bold">{gstinLookup.state}</span>
                                                        </div>
                                                        <div className="flex items-center gap-2">
                                                            <span className="text-slate-500 text-[10px] font-bold w-24 shrink-0">Type</span>
                                                            <span className="text-slate-300 text-xs font-bold">{gstinLookup.businessType}</span>
                                                        </div>
                                                        <div className="flex items-center gap-2">
                                                            <span className="text-slate-500 text-[10px] font-bold w-24 shrink-0">GST Status</span>
                                                            <span className="text-emerald-400 text-xs font-black">{gstinLookup.gstStatus}</span>
                                                        </div>
                                                        {gstinLookup.registrationDate && (
                                                            <div className="flex items-center gap-2">
                                                                <span className="text-slate-500 text-[10px] font-bold w-24 shrink-0">Registered</span>
                                                                <span className="text-slate-400 text-xs font-bold">
                                                                    {new Date(gstinLookup.registrationDate).toLocaleDateString('en-IN', { year: 'numeric', month: 'long', day: 'numeric' })}
                                                                </span>
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>
                                            )}

                                            {gstinLookup?.status === 'format-valid' && (
                                                <div style={{
                                                    background: 'rgba(251,191,36,0.06)',
                                                    border: '1px solid rgba(251,191,36,0.3)',
                                                    borderRadius: '12px',
                                                    padding: '10px 14px',
                                                    display: 'flex',
                                                    alignItems: 'flex-start',
                                                    gap: '8px',
                                                }}>
                                                    <span>🟡</span>
                                                    <div>
                                                        <p className="text-yellow-400 text-[10px] font-black">Format Valid — Not in Pre-Verified Registry</p>
                                                        <p className="text-slate-500 text-[9px] mt-0.5">GSTIN format is correct but not found in our verified business registry. You can still register — your GSTIN will be noted for manual review.</p>
                                                    </div>
                                                </div>
                                            )}

                                            {gstinLookup?.status === 'invalid' && (
                                                <p className="text-red-400 text-[10px] font-bold">❌ Invalid GSTIN format. Must match: 2-digit state + 5 letters + 4 digits + letter + digit + Z + checksum (15 chars)</p>
                                            )}

                                            <p className="text-slate-700 text-[9px]">Format: 2-digit state code · 10-char PAN · entity no. · Z · checksum — 15 chars total</p>

                                            {/* Quick Reference */}
                                            <details className="group">
                                                <summary className="text-[9px] font-black text-slate-600 uppercase tracking-widest cursor-pointer hover:text-slate-400 transition-colors select-none">
                                                    📋 Sample GSTINs from registry (click to expand)
                                                </summary>
                                                <div className="mt-2 space-y-1.5 pl-2 border-l border-white/5">
                                                    {[
                                                        { gstin: '27AAACR5055K1ZK', name: 'Reliance Industries' },
                                                        { gstin: '29AABCT1332L1ZQ', name: 'TCS' },
                                                        { gstin: '29AABCW0340E1ZN', name: 'Wipro' },
                                                        { gstin: '22AAAAA0000A1Z5', name: 'Demo Company (test)' },
                                                        { gstin: '27AABCD1234E1Z5', name: 'TestRecruit (test)' },
                                                    ].map(s => (
                                                        <button
                                                            key={s.gstin}
                                                            type="button"
                                                            onClick={() => handleGstinChange(s.gstin)}
                                                            className="flex items-center gap-3 w-full text-left px-2.5 py-1.5 rounded-lg hover:bg-white/5 transition-all group/item"
                                                        >
                                                            <span className="font-mono text-[10px] text-blue-400 group-hover/item:text-blue-300">{s.gstin}</span>
                                                            <span className="text-[9px] text-slate-600">— {s.name}</span>
                                                        </button>
                                                    ))}
                                                </div>
                                            </details>
                                        </div>
                                    </>
                                )}

                                <div className="space-y-1.5">
                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Email Address</label>
                                    <input id="auth-email" className="input-field" type="email" required placeholder="name@company.com"
                                        value={email} onChange={e => setEmail(e.target.value)} />
                                </div>

                                <div className="space-y-1.5">
                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Password</label>
                                    <div className="relative">
                                        <input id="auth-password" className="input-field" style={{ paddingRight: '48px' }}
                                            type={showPassword ? 'text' : 'password'} required placeholder="••••••••"
                                            value={password} onChange={e => setPassword(e.target.value)} />
                                        <button type="button" onClick={() => setShowPassword(p => !p)}
                                            className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300 transition-colors text-xs font-bold">
                                            {showPassword ? 'HIDE' : 'SHOW'}
                                        </button>
                                    </div>
                                </div>

                                {apiError && (
                                    <div style={{
                                        background: 'rgba(239,68,68,0.1)',
                                        border: '1px solid rgba(239,68,68,0.3)',
                                        borderRadius: '12px',
                                        padding: '12px 16px',
                                        color: '#fca5a5',
                                        fontSize: '13px',
                                        fontWeight: 600,
                                    }}>
                                        ⚠️ {apiError}
                                    </div>
                                )}

                                <button
                                    id="auth-submit-btn"
                                    type="submit"
                                    disabled={loading}
                                    className="w-full py-4 mt-2 rounded-2xl font-black text-white text-sm uppercase tracking-widest transition-all hover:scale-[1.02] active:scale-[0.98] disabled:opacity-60"
                                    style={{
                                        background: loading
                                            ? (isRecruiter ? '#1d4ed8' : '#7c3aed')
                                            : (isRecruiter
                                                ? 'linear-gradient(135deg, #1d4ed8 0%, #3b82f6 100%)'
                                                : 'linear-gradient(135deg, #7c3aed 0%, #a855f7 100%)'),
                                        boxShadow: isRecruiter
                                            ? '0 8px 32px rgba(59,130,246,0.3)'
                                            : '0 8px 32px rgba(168,85,247,0.3)',
                                    }}
                                >
                                    {loading
                                        ? '⏳ Authenticating...'
                                        : isLogin
                                            ? `Sign In →`
                                            : `Create ${isRecruiter ? 'Recruiter' : 'Job Seeker'} Account →`}
                                </button>
                            </form>

                            {/* Toggle */}
                            <div className="text-center pt-2 border-t border-white/5">
                                <button
                                    id="auth-toggle-btn"
                                    onClick={() => { setIsLogin(l => !l); setApiError(null); }}
                                    className="text-sm font-medium transition-colors"
                                    style={{ color: isRecruiter ? '#60a5fa' : '#c084fc' }}
                                >
                                    {isLogin
                                        ? `New here? Create a ${isRecruiter ? 'Recruiter' : 'Job Seeker'} account`
                                        : 'Already have an account? Sign in'}
                                </button>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default LoginPage;
