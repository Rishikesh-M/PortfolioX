import React, { useState, useEffect, useCallback } from 'react';
import { AuthUser, UserPortfolio, RecruiterQuizQuestion, CandidateQuizResponse } from '../types.ts';
import { db } from '../services/db.ts';

interface RecruiterQuizPanelProps {
    currentUser: AuthUser;
    shortlistedPortfolios: UserPortfolio[];
}

// ─── Sub-components ───────────────────────────────────────────────────────────

const Badge: React.FC<{ color: string; children: React.ReactNode }> = ({ color, children }) => (
    <span className="text-[9px] font-black px-2 py-0.5 rounded-full uppercase tracking-widest border"
        style={{ color, borderColor: `${color}40`, background: `${color}12` }}>
        {children}
    </span>
);

interface QuizQuestionFormProps {
    recruiterId: string;
    onSaved: (q: RecruiterQuizQuestion) => void;
    editingQuestion?: RecruiterQuizQuestion | null;
    onCancel?: () => void;
}

const QuizQuestionForm: React.FC<QuizQuestionFormProps> = ({ recruiterId, onSaved, editingQuestion, onCancel }) => {
    const [jobTitle, setJobTitle] = useState(editingQuestion?.jobTitle || '');
    const [question, setQuestion] = useState(editingQuestion?.question || '');
    const [options, setOptions] = useState<string[]>(editingQuestion?.options || ['', '', '', '']);
    const [correctAnswer, setCorrectAnswer] = useState(editingQuestion?.correctAnswer ?? 0);
    const [points, setPoints] = useState(editingQuestion?.points || 10);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const handleOptionChange = (idx: number, val: string) => {
        setOptions(prev => {
            const next = [...prev];
            next[idx] = val;
            return next;
        });
    };

    const handleSave = async () => {
        if (!jobTitle.trim() || !question.trim()) { setError('Job title and question are required.'); return; }
        const filledOptions = options.filter(o => o.trim());
        if (filledOptions.length < 2) { setError('Please provide at least 2 options.'); return; }
        if (!options[correctAnswer]?.trim()) { setError('Please select a correct option.'); return; }

        setSaving(true);
        setError(null);
        const q: RecruiterQuizQuestion = {
            id: editingQuestion?.id || `rq_${Date.now()}`,
            recruiterId,
            jobTitle: jobTitle.trim(),
            question: question.trim(),
            options: options.map(o => o.trim()).filter(Boolean),
            correctAnswer,
            points,
            createdAt: editingQuestion?.createdAt || new Date().toISOString(),
        };
        await db.saveQuizQuestion(q);
        setSaving(false);
        onSaved(q);
    };

    return (
        <div className="rounded-[24px] border border-blue-500/20 p-6 space-y-5 animate-in fade-in"
            style={{ background: 'rgba(10,15,30,0.8)' }}>
            <h3 className="font-black text-white text-lg flex items-center gap-2">
                ✏️ {editingQuestion ? 'Edit' : 'Create'} Quiz Question
            </h3>

            {error && (
                <div className="text-red-400 text-xs font-bold bg-red-500/10 border border-red-500/20 rounded-xl px-4 py-3">
                    ⚠️ {error}
                </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1">
                    <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest">Job Title / Context *</label>
                    <input className="recruiter-input" placeholder="e.g. Senior Frontend Engineer"
                        value={jobTitle} onChange={e => setJobTitle(e.target.value)} />
                </div>
                <div className="space-y-1">
                    <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest">Points Value</label>
                    <select className="recruiter-input recruiter-select" value={points} onChange={e => setPoints(Number(e.target.value))}>
                        {[5, 10, 15, 20, 25].map(p => <option key={p} value={p}>{p} pts</option>)}
                    </select>
                </div>
            </div>

            <div className="space-y-1">
                <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest">Question *</label>
                <textarea className="recruiter-input" rows={3} style={{ resize: 'vertical' }}
                    placeholder="e.g. What is the time complexity of binary search?"
                    value={question} onChange={e => setQuestion(e.target.value)} />
            </div>

            <div className="space-y-3">
                <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest">Answer Options (select the correct one)</label>
                {options.map((opt, idx) => (
                    <div key={idx} className="flex items-center gap-3">
                        <button
                            type="button"
                            onClick={() => setCorrectAnswer(idx)}
                            className="w-7 h-7 rounded-full border-2 shrink-0 flex items-center justify-center transition-all"
                            style={{
                                borderColor: correctAnswer === idx ? '#10b981' : 'rgba(255,255,255,0.1)',
                                background: correctAnswer === idx ? 'rgba(16,185,129,0.15)' : 'transparent',
                            }}
                            title="Mark as correct answer"
                        >
                            {correctAnswer === idx && <span className="text-emerald-400 text-xs">✓</span>}
                        </button>
                        <input className="recruiter-input" placeholder={`Option ${String.fromCharCode(65 + idx)}`}
                            value={opt} onChange={e => handleOptionChange(idx, e.target.value)} />
                        {correctAnswer === idx && (
                            <span className="text-emerald-400 text-[9px] font-black whitespace-nowrap">✓ Correct</span>
                        )}
                    </div>
                ))}
            </div>

            <div className="flex gap-3 pt-2">
                <button onClick={handleSave} disabled={saving}
                    className="flex-1 py-3 rounded-xl font-black text-white text-sm uppercase tracking-widest transition-all hover:scale-[1.02] disabled:opacity-60"
                    style={{ background: 'linear-gradient(135deg,#1d4ed8,#3b82f6)', boxShadow: '0 4px 20px rgba(59,130,246,0.3)' }}>
                    {saving ? '⏳ Saving...' : editingQuestion ? '💾 Update Question' : '+ Save Question'}
                </button>
                {onCancel && (
                    <button onClick={onCancel}
                        className="px-6 py-3 rounded-xl font-black text-slate-300 text-sm uppercase tracking-widest border border-white/10 hover:bg-white/5 transition-all">
                        Cancel
                    </button>
                )}
            </div>
        </div>
    );
};

// ─── Quiz Sender: Send a question to a candidate ──────────────────────────────
interface QuizSenderProps {
    questions: RecruiterQuizQuestion[];
    candidate: UserPortfolio;
    recruiterId: string;
    responses: CandidateQuizResponse[];
    onClose: () => void;
    onResponseSaved: () => void;
}

const QuizSender: React.FC<QuizSenderProps> = ({ questions, candidate, recruiterId, responses, onClose, onResponseSaved }) => {
    const [currentQuestionIdx, setCurrentQuestionIdx] = useState(0);
    const [selectedOption, setSelectedOption] = useState<number | null>(null);
    const [revealed, setRevealed] = useState(false);
    const [done, setDone] = useState(false);
    const [saving, setSaving] = useState(false);

    // Filter questions not already answered for this candidate
    const answeredIds = new Set(responses.filter(r => r.candidatePortfolioId === candidate.id).map(r => r.quizQuestionId));
    const pending = questions.filter(q => !answeredIds.has(q.id));

    const currentQ = pending[currentQuestionIdx];
    const totalScore = responses
        .filter(r => r.candidatePortfolioId === candidate.id && r.recruiterId === recruiterId)
        .reduce((sum, r) => sum + r.score, 0);

    const handleSubmit = async () => {
        if (selectedOption === null || !currentQ) return;
        setSaving(true);
        const isCorrect = selectedOption === currentQ.correctAnswer;
        const response: CandidateQuizResponse = {
            id: `cqr_${Date.now()}`,
            quizQuestionId: currentQ.id,
            recruiterId,
            candidatePortfolioId: candidate.id,
            selectedAnswer: selectedOption,
            isCorrect,
            score: isCorrect ? currentQ.points : 0,
            submittedAt: new Date().toISOString(),
        };
        await db.saveQuizResponse(response);
        setSaving(false);
        setRevealed(true);
        onResponseSaved();
    };

    const handleNext = () => {
        if (currentQuestionIdx + 1 >= pending.length) {
            setDone(true);
        } else {
            setCurrentQuestionIdx(i => i + 1);
            setSelectedOption(null);
            setRevealed(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.8)', backdropFilter: 'blur(12px)' }}>
            <div className="w-full max-w-xl rounded-[32px] border border-blue-500/20 p-8 space-y-6 relative"
                style={{ background: 'rgba(8,12,24,0.98)', boxShadow: '0 0 80px rgba(59,130,246,0.15)' }}>

                <button onClick={onClose} className="absolute top-4 right-4 w-9 h-9 rounded-xl bg-white/5 flex items-center justify-center text-slate-400 hover:bg-white/10 hover:text-white transition-all">✕</button>

                {/* Candidate Header */}
                <div className="flex items-center gap-4">
                    <img src={candidate.avatar} alt={candidate.fullName} className="w-12 h-12 rounded-2xl border border-white/10 object-cover" />
                    <div>
                        <div className="font-black text-white">{candidate.fullName}</div>
                        <div className="text-slate-500 text-xs">{candidate.role}</div>
                    </div>
                    <div className="ml-auto text-right">
                        <div className="text-xl font-black text-blue-400">{totalScore}</div>
                        <div className="text-[9px] text-slate-500 uppercase tracking-widest">Total Score</div>
                    </div>
                </div>

                {done || pending.length === 0 ? (
                    <div className="text-center space-y-4 py-8">
                        <div className="text-5xl">🏆</div>
                        <h3 className="text-2xl font-black text-white">Quiz Complete!</h3>
                        <p className="text-slate-400 text-sm">
                            {pending.length === 0
                                ? 'All questions have been answered by this candidate.'
                                : `All ${questions.length} questions completed.`}
                        </p>
                        <div className="bg-blue-500/10 border border-blue-500/20 rounded-2xl p-6 inline-block">
                            <div className="text-4xl font-black text-blue-400">{totalScore}</div>
                            <div className="text-xs text-slate-400 mt-1">Total Points Earned</div>
                        </div>
                        <button onClick={onClose}
                            className="w-full py-3 rounded-xl font-black text-white text-sm uppercase tracking-widest mt-4"
                            style={{ background: 'linear-gradient(135deg,#1d4ed8,#3b82f6)' }}>
                            Close
                        </button>
                    </div>
                ) : (
                    <>
                        {/* Progress */}
                        <div className="space-y-2">
                            <div className="flex justify-between text-xs text-slate-400 font-bold">
                                <span>Question {currentQuestionIdx + 1} of {pending.length}</span>
                                <Badge color="#3b82f6">{currentQ.jobTitle}</Badge>
                            </div>
                            <div className="h-2 bg-white/5 rounded-full overflow-hidden">
                                <div className="h-full rounded-full transition-all duration-500"
                                    style={{ width: `${((currentQuestionIdx) / pending.length) * 100}%`, background: 'linear-gradient(90deg,#1d4ed8,#3b82f6)' }} />
                            </div>
                        </div>

                        {/* Question */}
                        <div className="bg-white/3 rounded-2xl p-5 border border-white/5">
                            <div className="flex items-center justify-between mb-3">
                                <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest">Question</span>
                                <Badge color="#a855f7">{currentQ.points} pts</Badge>
                            </div>
                            <p className="text-white font-bold text-lg leading-relaxed">{currentQ.question}</p>
                        </div>

                        {/* Options */}
                        <div className="space-y-3">
                            {currentQ.options.map((opt, idx) => {
                                let borderColor = 'rgba(255,255,255,0.08)';
                                let bg = 'transparent';
                                let textColor = '#94a3b8';

                                if (revealed) {
                                    if (idx === currentQ.correctAnswer) {
                                        borderColor = 'rgba(16,185,129,0.5)';
                                        bg = 'rgba(16,185,129,0.12)';
                                        textColor = '#10b981';
                                    } else if (idx === selectedOption && selectedOption !== currentQ.correctAnswer) {
                                        borderColor = 'rgba(239,68,68,0.5)';
                                        bg = 'rgba(239,68,68,0.1)';
                                        textColor = '#ef4444';
                                    }
                                } else if (selectedOption === idx) {
                                    borderColor = 'rgba(59,130,246,0.5)';
                                    bg = 'rgba(59,130,246,0.1)';
                                    textColor = '#60a5fa';
                                }

                                return (
                                    <button key={idx} disabled={revealed}
                                        onClick={() => setSelectedOption(idx)}
                                        className="w-full text-left px-5 py-4 rounded-xl border transition-all font-bold text-sm flex items-center gap-4"
                                        style={{ borderColor, background: bg, color: textColor }}>
                                        <span className="w-7 h-7 rounded-lg border text-xs flex items-center justify-center shrink-0 font-black"
                                            style={{ borderColor, color: textColor }}>
                                            {String.fromCharCode(65 + idx)}
                                        </span>
                                        {opt}
                                        {revealed && idx === currentQ.correctAnswer && <span className="ml-auto text-emerald-400">✓ Correct</span>}
                                        {revealed && idx === selectedOption && selectedOption !== currentQ.correctAnswer && <span className="ml-auto text-red-400">✗ Wrong</span>}
                                    </button>
                                );
                            })}
                        </div>

                        {/* Revealed result */}
                        {revealed && (
                            <div className={`rounded-xl px-5 py-4 border text-sm font-bold animate-in fade-in ${selectedOption === currentQ.correctAnswer
                                ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'
                                : 'bg-red-500/10 border-red-500/30 text-red-400'
                                }`}>
                                {selectedOption === currentQ.correctAnswer
                                    ? `✅ Correct! +${currentQ.points} points awarded`
                                    : `❌ Incorrect. Correct answer: ${String.fromCharCode(65 + currentQ.correctAnswer)}`}
                            </div>
                        )}

                        {/* Actions */}
                        <div className="flex gap-3">
                            {!revealed ? (
                                <button onClick={handleSubmit} disabled={selectedOption === null || saving}
                                    className="flex-1 py-3 rounded-xl font-black text-white text-sm uppercase tracking-widest transition-all hover:scale-[1.02] disabled:opacity-50"
                                    style={{ background: 'linear-gradient(135deg,#1d4ed8,#3b82f6)' }}>
                                    {saving ? '⏳ Submitting...' : '⚡ Submit Answer'}
                                </button>
                            ) : (
                                <button onClick={handleNext}
                                    className="flex-1 py-3 rounded-xl font-black text-white text-sm uppercase tracking-widest transition-all hover:scale-[1.02]"
                                    style={{ background: 'linear-gradient(135deg,#1d4ed8,#3b82f6)' }}>
                                    {currentQuestionIdx + 1 >= pending.length ? '🏁 Finish Quiz' : 'Next Question →'}
                                </button>
                            )}
                        </div>
                    </>
                )}
            </div>
        </div>
    );
};

// ─── Main Panel ───────────────────────────────────────────────────────────────
const RecruiterQuizPanel: React.FC<RecruiterQuizPanelProps> = ({ currentUser, shortlistedPortfolios }) => {
    const [questions, setQuestions] = useState<RecruiterQuizQuestion[]>([]);
    const [responses, setResponses] = useState<CandidateQuizResponse[]>([]);
    const [showForm, setShowForm] = useState(false);
    const [editingQ, setEditingQ] = useState<RecruiterQuizQuestion | null>(null);
    const [quizTarget, setQuizTarget] = useState<UserPortfolio | null>(null);
    const [activeTab, setActiveTab] = useState<'questions' | 'results'>('questions');

    const loadData = useCallback(async () => {
        const [qs, rs] = await Promise.all([
            db.getQuizQuestionsByRecruiter(currentUser.id),
            db.getQuizResponsesByRecruiter(currentUser.id),
        ]);
        setQuestions(qs);
        setResponses(rs);
    }, [currentUser.id]);

    useEffect(() => { loadData(); }, [loadData]);

    const handleDeleteQuestion = async (id: string) => {
        if (!confirm('Delete this question?')) return;
        await db.deleteQuizQuestion(id);
        await loadData();
    };

    const getCandidateScore = (portfolioId: string) =>
        responses.filter(r => r.candidatePortfolioId === portfolioId).reduce((s, r) => s + r.score, 0);

    const getCandidateAnswers = (portfolioId: string) =>
        responses.filter(r => r.candidatePortfolioId === portfolioId).length;

    // Sort candidates by quiz score desc
    const rankedCandidates = [...shortlistedPortfolios].sort(
        (a, b) => getCandidateScore(b.id) - getCandidateScore(a.id)
    );

    return (
        <div className="space-y-8">
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

            {/* Header */}
            <div className="flex flex-col sm:flex-row justify-between items-start gap-4">
                <div>
                    <h2 className="text-2xl font-black text-white flex items-center gap-3">
                        🎯 Recruiter Quiz Manager
                    </h2>
                    <p className="text-slate-400 text-sm mt-1">
                        Create custom quiz questions to shortlist candidates — one by one, online interview style.
                    </p>
                </div>
                <button onClick={() => { setShowForm(true); setEditingQ(null); }}
                    className="px-5 py-3 rounded-xl text-xs font-black uppercase tracking-widest text-white whitespace-nowrap transition-all hover:scale-[1.02]"
                    style={{ background: 'linear-gradient(135deg,#1d4ed8,#3b82f6)', boxShadow: '0 4px 20px rgba(59,130,246,0.25)' }}>
                    + New Question
                </button>
            </div>

            {/* Stats Row */}
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                {[
                    { icon: '❓', label: 'Questions Created', value: questions.length, color: '#3b82f6' },
                    { icon: '📋', label: 'Candidates Tested', value: new Set(responses.map(r => r.candidatePortfolioId)).size, color: '#a855f7' },
                    { icon: '✅', label: 'Total Responses', value: responses.length, color: '#10b981' },
                ].map(s => (
                    <div key={s.label} className="bg-glass rounded-2xl p-5 border border-white/5 flex items-center gap-4">
                        <div className="w-12 h-12 rounded-xl flex items-center justify-center text-xl" style={{ background: `${s.color}20` }}>{s.icon}</div>
                        <div>
                            <div className="text-xl font-black text-white">{s.value}</div>
                            <div className="text-[9px] font-black text-slate-500 uppercase tracking-widest">{s.label}</div>
                        </div>
                    </div>
                ))}
            </div>

            {/* Tab Switcher */}
            <div className="flex gap-2">
                {[
                    { key: 'questions' as const, label: `Questions (${questions.length})`, icon: '❓' },
                    { key: 'results' as const, label: `Candidate Results (${shortlistedPortfolios.length})`, icon: '🏆' },
                ].map(tab => (
                    <button key={tab.key} onClick={() => setActiveTab(tab.key)}
                        className="flex items-center gap-2 px-5 py-3 rounded-2xl text-[11px] font-black uppercase tracking-widest transition-all"
                        style={activeTab === tab.key
                            ? { background: 'linear-gradient(135deg,#1d4ed8,#3b82f6)', color: 'white', boxShadow: '0 4px 20px rgba(59,130,246,0.25)' }
                            : { background: 'rgba(255,255,255,0.04)', color: '#94a3b8' }}>
                        <span>{tab.icon}</span> {tab.label}
                    </button>
                ))}
            </div>

            {/* Create/Edit Form */}
            {(showForm || editingQ) && (
                <QuizQuestionForm
                    recruiterId={currentUser.id}
                    editingQuestion={editingQ}
                    onSaved={async () => { setShowForm(false); setEditingQ(null); await loadData(); }}
                    onCancel={() => { setShowForm(false); setEditingQ(null); }}
                />
            )}

            {/* ── Tab: Questions ── */}
            {activeTab === 'questions' && (
                <div className="space-y-4 animate-in fade-in">
                    {questions.length === 0 ? (
                        <div className="py-20 text-center space-y-4 bg-glass rounded-[28px] border border-white/5">
                            <div className="text-5xl">❓</div>
                            <h3 className="text-xl font-black text-white">No Questions Yet</h3>
                            <p className="text-slate-500 text-sm">Click <strong className="text-blue-400">+ New Question</strong> to create your first quiz question.</p>
                        </div>
                    ) : (
                        questions.map((q, i) => (
                            <div key={q.id}
                                className="bg-glass rounded-[24px] border border-white/5 p-6 space-y-4 hover:border-blue-500/20 transition-all">
                                <div className="flex items-start justify-between gap-4 flex-wrap">
                                    <div className="space-y-1 flex-1">
                                        <div className="flex items-center gap-2 flex-wrap">
                                            <span className="text-[10px] font-black text-slate-600">Q{i + 1}</span>
                                            <Badge color="#3b82f6">{q.jobTitle}</Badge>
                                            <Badge color="#a855f7">{q.points} pts</Badge>
                                        </div>
                                        <p className="text-white font-bold leading-relaxed">{q.question}</p>
                                    </div>
                                    <div className="flex gap-2 shrink-0">
                                        <button onClick={() => { setEditingQ(q); setShowForm(false); }}
                                            className="px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest border border-white/10 text-slate-300 hover:bg-white/10 transition-all">
                                            Edit
                                        </button>
                                        <button onClick={() => handleDeleteQuestion(q.id)}
                                            className="px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest border border-red-500/20 text-red-400 hover:bg-red-500/10 transition-all">
                                            Delete
                                        </button>
                                    </div>
                                </div>
                                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                                    {q.options.map((opt, idx) => (
                                        <div key={idx}
                                            className="px-3 py-2 rounded-xl border text-xs font-bold flex items-center gap-2"
                                            style={idx === q.correctAnswer
                                                ? { borderColor: 'rgba(16,185,129,0.4)', background: 'rgba(16,185,129,0.08)', color: '#10b981' }
                                                : { borderColor: 'rgba(255,255,255,0.06)', background: 'rgba(255,255,255,0.02)', color: '#64748b' }
                                            }>
                                            <span className="font-black">{String.fromCharCode(65 + idx)}.</span>
                                            {opt}
                                            {idx === q.correctAnswer && <span className="ml-auto">✓</span>}
                                        </div>
                                    ))}
                                </div>

                                {/* Send to Candidate section */}
                                {shortlistedPortfolios.length > 0 && (
                                    <div className="border-t border-white/5 pt-4 space-y-2">
                                        <div className="text-[9px] font-black text-slate-500 uppercase tracking-widest">Send Individual Quiz to:</div>
                                        <div className="flex flex-wrap gap-2">
                                            {shortlistedPortfolios.map(p => {
                                                const already = responses.find(r => r.quizQuestionId === q.id && r.candidatePortfolioId === p.id);
                                                return (
                                                    <button key={p.id}
                                                        disabled={!!already}
                                                        onClick={() => setQuizTarget(p)}
                                                        className="flex items-center gap-2 px-3 py-2 rounded-xl border text-[10px] font-black transition-all"
                                                        style={already
                                                            ? { borderColor: 'rgba(16,185,129,0.3)', background: 'rgba(16,185,129,0.06)', color: '#6ee7b7', cursor: 'default' }
                                                            : { borderColor: 'rgba(59,130,246,0.3)', background: 'rgba(59,130,246,0.06)', color: '#60a5fa', cursor: 'pointer' }
                                                        }>
                                                        <img src={p.avatar} alt={p.fullName} className="w-5 h-5 rounded-lg object-cover" />
                                                        {p.fullName}
                                                        {already ? ` ✓ ${already.isCorrect ? '+' + already.score : '0'} pts` : ' → Start'}
                                                    </button>
                                                );
                                            })}
                                        </div>
                                    </div>
                                )}
                            </div>
                        ))
                    )}
                </div>
            )}

            {/* ── Tab: Results ── */}
            {activeTab === 'results' && (
                <div className="space-y-6 animate-in fade-in">
                    {shortlistedPortfolios.length === 0 ? (
                        <div className="py-20 text-center space-y-4 bg-glass rounded-[28px] border border-white/5">
                            <div className="text-5xl">📋</div>
                            <h3 className="text-xl font-black text-white">No Shortlisted Candidates</h3>
                            <p className="text-slate-500 text-sm">Shortlist candidates from the <strong className="text-blue-400">Find Talent</strong> tab first.</p>
                        </div>
                    ) : rankedCandidates.map((p, rank) => {
                        const score = getCandidateScore(p.id);
                        const answered = getCandidateAnswers(p.id);
                        const correct = responses.filter(r => r.candidatePortfolioId === p.id && r.isCorrect).length;
                        const accuracy = answered > 0 ? Math.round((correct / answered) * 100) : 0;
                        const maxScore = questions.reduce((s, q) => s + q.points, 0);

                        return (
                            <div key={p.id} className="bg-glass rounded-[24px] border border-white/5 p-6 hover:border-blue-500/20 transition-all">
                                <div className="flex items-center gap-5 flex-wrap">
                                    {/* Rank */}
                                    <div className="w-10 h-10 rounded-xl flex items-center justify-center font-black text-lg shrink-0"
                                        style={{
                                            background: rank === 0 ? 'linear-gradient(135deg,#f59e0b,#fbbf24)'
                                                : rank === 1 ? 'linear-gradient(135deg,#94a3b8,#cbd5e1)'
                                                    : rank === 2 ? 'linear-gradient(135deg,#b45309,#d97706)'
                                                        : 'rgba(255,255,255,0.06)',
                                            color: rank < 3 ? '#030712' : '#64748b',
                                        }}>
                                        {rank < 3 ? ['🥇', '🥈', '🥉'][rank] : rank + 1}
                                    </div>

                                    {/* Avatar & Name */}
                                    <img src={p.avatar} alt={p.fullName} className="w-12 h-12 rounded-2xl border border-white/10 object-cover" />
                                    <div className="flex-1 min-w-0">
                                        <div className="font-black text-white">{p.fullName}</div>
                                        <div className="text-slate-500 text-xs">{p.role}</div>
                                    </div>

                                    {/* Score */}
                                    <div className="text-right">
                                        <div className="text-2xl font-black text-blue-400">{score}</div>
                                        <div className="text-[9px] text-slate-500 uppercase tracking-widest">/ {maxScore} pts</div>
                                    </div>

                                    {/* Start Quiz */}
                                    <button onClick={() => setQuizTarget(p)}
                                        className="px-5 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest text-white whitespace-nowrap transition-all hover:scale-[1.02]"
                                        style={{ background: 'linear-gradient(135deg,#1d4ed8,#3b82f6)' }}>
                                        {answered > 0 ? '🎯 Continue Quiz' : '▶ Start Quiz'}
                                    </button>
                                </div>

                                {/* Progress Bar */}
                                {maxScore > 0 && (
                                    <div className="mt-4 space-y-1">
                                        <div className="flex justify-between text-[10px] text-slate-500 font-bold">
                                            <span>{answered}/{questions.length} questions answered</span>
                                            <span>{accuracy}% accuracy</span>
                                        </div>
                                        <div className="h-2 bg-white/5 rounded-full overflow-hidden">
                                            <div className="h-full rounded-full transition-all duration-700"
                                                style={{ width: `${(score / Math.max(maxScore, 1)) * 100}%`, background: 'linear-gradient(90deg,#1d4ed8,#3b82f6)' }} />
                                        </div>
                                    </div>
                                )}

                                {/* Per-question results */}
                                {answered > 0 && (
                                    <div className="mt-4 flex flex-wrap gap-2">
                                        {responses.filter(r => r.candidatePortfolioId === p.id && r.recruiterId === currentUser.id).map(r => {
                                            const q = questions.find(q => q.id === r.quizQuestionId);
                                            return (
                                                <div key={r.id} className="px-3 py-1.5 rounded-xl border text-[10px] font-bold flex items-center gap-1.5"
                                                    style={r.isCorrect
                                                        ? { borderColor: 'rgba(16,185,129,0.3)', background: 'rgba(16,185,129,0.08)', color: '#10b981' }
                                                        : { borderColor: 'rgba(239,68,68,0.3)', background: 'rgba(239,68,68,0.08)', color: '#ef4444' }
                                                    }>
                                                    {r.isCorrect ? '✓' : '✗'} {q ? q.jobTitle : 'Q'} {r.isCorrect ? `+${r.score}` : `0`} pts
                                                </div>
                                            );
                                        })}
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </div>
            )}

            {/* Quiz Sender Modal */}
            {quizTarget && questions.length > 0 && (
                <QuizSender
                    questions={questions}
                    candidate={quizTarget}
                    recruiterId={currentUser.id}
                    responses={responses}
                    onClose={() => setQuizTarget(null)}
                    onResponseSaved={loadData}
                />
            )}
        </div>
    );
};

export default RecruiterQuizPanel;
