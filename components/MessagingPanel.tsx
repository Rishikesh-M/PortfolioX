import React, { useState, useEffect, useRef, useCallback } from 'react';
import { AuthUser, UserPortfolio, Conversation, Message } from '../types.ts';
import { db } from '../services/db.ts';

interface MessagingPanelProps {
    currentUser: AuthUser;
    allPortfolios: UserPortfolio[];
    /** Pre-select a conversation with a specific candidate (by portfolioId) */
    initialCandidateId?: string;
    onClose?: () => void;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────
function formatTime(iso: string): string {
    const d = new Date(iso);
    const now = new Date();
    const diff = now.getTime() - d.getTime();
    if (diff < 60000) return 'Just now';
    if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
    if (diff < 86400000) return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    return d.toLocaleDateString([], { month: 'short', day: 'numeric' });
}

// ─── Main Component ───────────────────────────────────────────────────────────
const MessagingPanel: React.FC<MessagingPanelProps> = ({
    currentUser, allPortfolios, initialCandidateId, onClose
}) => {
    const isRecruiter = currentUser.role === 'recruiter';
    const [conversations, setConversations] = useState<Conversation[]>([]);
    const [activeConvId, setActiveConvId] = useState<string | null>(null);
    const [messageText, setMessageText] = useState('');
    const [sending, setSending] = useState(false);
    const [loading, setLoading] = useState(true);
    const [showNewChat, setShowNewChat] = useState(false);
    const [selectedCandidate, setSelectedCandidate] = useState<UserPortfolio | null>(null);
    const [chatSubject, setChatSubject] = useState('');
    const messagesEndRef = useRef<HTMLDivElement>(null);

    const activeConv = conversations.find(c => c.id === activeConvId) || null;

    const loadConversations = useCallback(async () => {
        const convs = isRecruiter
            ? await db.getConversationsByRecruiter(currentUser.id)
            : await db.getConversationsByCandidate(
                allPortfolios.find(p => p.userId === currentUser.id)?.id || ''
            );
        setConversations(convs);
        // Auto-select first or initial
        if (initialCandidateId && !activeConvId) {
            const found = convs.find(c => c.candidatePortfolioId === initialCandidateId);
            if (found) setActiveConvId(found.id);
        } else if (convs.length > 0 && !activeConvId) {
            setActiveConvId(convs[0].id);
        }
        setLoading(false);
    }, [currentUser.id, isRecruiter, allPortfolios, initialCandidateId, activeConvId]);

    useEffect(() => { loadConversations(); }, [loadConversations]);

    // Scroll to bottom when messages change
    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [activeConvId, conversations]);

    // Mark messages read when opening a conversation
    useEffect(() => {
        if (activeConvId) {
            db.markMessagesRead(activeConvId, currentUser.id)
                .then(loadConversations);
        }
    }, [activeConvId, currentUser.id, loadConversations]);

    const handleSend = async () => {
        if (!messageText.trim() || !activeConvId) return;
        setSending(true);
        await db.sendMessage(activeConvId, {
            senderId: currentUser.id,
            senderName: currentUser.fullName,
            senderRole: currentUser.role,
            content: messageText.trim(),
            sentAt: new Date().toISOString(),
            read: false,
        });
        setMessageText('');
        setSending(false);
        await loadConversations();
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleSend();
        }
    };

    const handleStartChat = async () => {
        if (!selectedCandidate) return;
        const myPortfolio = allPortfolios.find(p => p.userId === currentUser.id);
        const conv = await db.getOrCreateConversation(
            currentUser.id,
            currentUser.fullName,
            currentUser.company,
            selectedCandidate.id,
            selectedCandidate.fullName,
            chatSubject || `Chat with ${selectedCandidate.fullName}`,
        );
        setShowNewChat(false);
        setSelectedCandidate(null);
        setChatSubject('');
        await loadConversations();
        setActiveConvId(conv.id);
    };

    const getUnread = (conv: Conversation) =>
        conv.messages.filter(m => m.senderId !== currentUser.id && !m.read).length;

    const totalUnread = conversations.reduce((sum, c) => sum + getUnread(c), 0);

    // Candidates the recruiter can chat with (those with portfolios)
    const eligibleCandidates = allPortfolios.filter(p => p.userId && p.userId !== currentUser.id);

    if (loading) {
        return (
            <div className="flex items-center justify-center py-24">
                <div className="w-10 h-10 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" />
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between gap-4 flex-wrap">
                <div>
                    <h2 className="text-2xl font-black text-white flex items-center gap-3">
                        💬 Messages
                        {totalUnread > 0 && (
                            <span className="w-6 h-6 rounded-full bg-blue-500 text-white text-[10px] font-black flex items-center justify-center">{totalUnread}</span>
                        )}
                    </h2>
                    <p className="text-slate-400 text-sm mt-1">
                        {isRecruiter ? 'Communicate personally with shortlisted candidates' : 'Your conversations with recruiters'}
                    </p>
                </div>
                {isRecruiter && (
                    <button onClick={() => setShowNewChat(true)}
                        className="px-5 py-3 rounded-xl text-xs font-black uppercase tracking-widest text-white transition-all hover:scale-[1.02]"
                        style={{ background: 'linear-gradient(135deg,#1d4ed8,#3b82f6)', boxShadow: '0 4px 20px rgba(59,130,246,0.25)' }}>
                        + New Conversation
                    </button>
                )}
            </div>

            {/* New Chat Modal */}
            {showNewChat && isRecruiter && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.8)', backdropFilter: 'blur(12px)' }}>
                    <div className="w-full max-w-md rounded-[28px] border border-blue-500/20 p-8 space-y-6"
                        style={{ background: 'rgba(8,12,24,0.98)', boxShadow: '0 0 80px rgba(59,130,246,0.15)' }}>
                        <h3 className="font-black text-white text-xl">💬 Start a Conversation</h3>

                        <div className="space-y-1">
                            <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest">Select Candidate</label>
                            <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
                                {eligibleCandidates.length === 0 ? (
                                    <p className="text-slate-500 text-sm py-4 text-center">No candidates with portfolios found.</p>
                                ) : eligibleCandidates.map(p => (
                                    <button key={p.id}
                                        onClick={() => setSelectedCandidate(p)}
                                        className="w-full flex items-center gap-3 px-4 py-3 rounded-xl border transition-all text-left"
                                        style={selectedCandidate?.id === p.id
                                            ? { borderColor: 'rgba(59,130,246,0.5)', background: 'rgba(59,130,246,0.1)', color: '#60a5fa' }
                                            : { borderColor: 'rgba(255,255,255,0.06)', background: 'rgba(255,255,255,0.02)', color: '#94a3b8' }}>
                                        <img src={p.avatar} alt={p.fullName} className="w-9 h-9 rounded-xl object-cover border border-white/10" />
                                        <div>
                                            <div className="font-black text-sm text-white">{p.fullName}</div>
                                            <div className="text-[10px] text-slate-500">{p.role}</div>
                                        </div>
                                        {selectedCandidate?.id === p.id && <span className="ml-auto text-blue-400">✓</span>}
                                    </button>
                                ))}
                            </div>
                        </div>

                        <div className="space-y-1">
                            <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest">Subject (optional)</label>
                            <input className="msg-input"
                                placeholder="e.g. Interview Invitation for Senior Dev Role"
                                value={chatSubject}
                                onChange={e => setChatSubject(e.target.value)} />
                        </div>

                        <style>{`
              .msg-input {
                width: 100%; padding: 12px 16px;
                background: rgba(0,0,0,0.3); border: 1px solid rgba(255,255,255,0.08);
                border-radius: 12px; color: white; font-size: 13px; font-weight: 500; outline: none;
                transition: border-color 0.2s; box-sizing: border-box;
              }
              .msg-input::placeholder { color: rgba(148,163,184,0.4); }
              .msg-input:focus { border-color: rgba(59,130,246,0.5); }
            `}</style>

                        <div className="flex gap-3">
                            <button onClick={handleStartChat} disabled={!selectedCandidate}
                                className="flex-1 py-3 rounded-xl font-black text-white text-sm uppercase tracking-widest disabled:opacity-50 transition-all hover:scale-[1.02]"
                                style={{ background: 'linear-gradient(135deg,#1d4ed8,#3b82f6)' }}>
                                Start Chat →
                            </button>
                            <button onClick={() => { setShowNewChat(false); setSelectedCandidate(null); setChatSubject(''); }}
                                className="px-6 py-3 rounded-xl font-black text-slate-300 text-sm uppercase tracking-widest border border-white/10 hover:bg-white/5 transition-all">
                                Cancel
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Main Chat Layout */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-0 bg-glass rounded-[28px] border border-white/5 overflow-hidden"
                style={{ minHeight: '550px' }}>

                {/* Left: Conversation List */}
                <div className="lg:col-span-1 border-r border-white/5 flex flex-col">
                    <div className="p-4 border-b border-white/5">
                        <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">
                            {conversations.length} Conversation{conversations.length !== 1 ? 's' : ''}
                        </p>
                    </div>
                    <div className="flex-1 overflow-y-auto">
                        {conversations.length === 0 ? (
                            <div className="flex flex-col items-center justify-center h-full p-8 text-center space-y-3">
                                <div className="text-4xl">💬</div>
                                <p className="text-slate-500 text-sm font-bold">
                                    {isRecruiter
                                        ? 'No conversations yet. Start one by clicking + New Conversation.'
                                        : 'No messages yet. Recruiters will reach out when interested in your profile.'}
                                </p>
                            </div>
                        ) : conversations.map(conv => {
                            const unread = getUnread(conv);
                            const lastMsg = conv.messages[conv.messages.length - 1];
                            const isActive = conv.id === activeConvId;
                            const displayName = isRecruiter ? conv.candidateName : conv.recruiterName;
                            const subText = isRecruiter
                                ? allPortfolios.find(p => p.id === conv.candidatePortfolioId)?.role || 'Candidate'
                                : conv.recruiterCompany || 'Recruiter';

                            return (
                                <button key={conv.id}
                                    onClick={() => setActiveConvId(conv.id)}
                                    className="w-full text-left px-4 py-4 border-b border-white/5 transition-all hover:bg-white/5 flex items-start gap-3"
                                    style={isActive ? { background: 'rgba(29,78,216,0.1)' } : {}}>
                                    {/* Avatar placeholder */}
                                    <div className="w-10 h-10 rounded-xl flex items-center justify-center font-black text-sm shrink-0"
                                        style={{ background: isActive ? 'rgba(59,130,246,0.2)' : 'rgba(255,255,255,0.05)', color: isActive ? '#60a5fa' : '#64748b' }}>
                                        {displayName.charAt(0).toUpperCase()}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center justify-between gap-2">
                                            <span className={`font-black text-sm truncate ${isActive ? 'text-blue-400' : 'text-white'}`}>{displayName}</span>
                                            {unread > 0 && (
                                                <span className="w-5 h-5 rounded-full bg-blue-500 text-white text-[9px] font-black flex items-center justify-center shrink-0">{unread}</span>
                                            )}
                                        </div>
                                        <div className="text-[10px] text-slate-500 truncate">{subText}</div>
                                        {lastMsg && (
                                            <div className="text-[10px] text-slate-600 truncate mt-0.5">
                                                {lastMsg.senderId === currentUser.id ? 'You: ' : ''}{lastMsg.content}
                                            </div>
                                        )}
                                        {lastMsg && (
                                            <div className="text-[9px] text-slate-700 mt-0.5">{formatTime(lastMsg.sentAt)}</div>
                                        )}
                                    </div>
                                </button>
                            );
                        })}
                    </div>
                </div>

                {/* Right: Chat Window */}
                <div className="lg:col-span-2 flex flex-col">
                    {!activeConv ? (
                        <div className="flex-1 flex flex-col items-center justify-center p-8 text-center space-y-4">
                            <div className="text-5xl">💬</div>
                            <h3 className="text-xl font-black text-white">Select a Conversation</h3>
                            <p className="text-slate-500 text-sm">Click a conversation on the left to start chatting.</p>
                        </div>
                    ) : (
                        <>
                            {/* Chat Header */}
                            <div className="px-6 py-4 border-b border-white/5 flex items-center gap-4">
                                <div className="w-10 h-10 rounded-xl bg-blue-500/20 flex items-center justify-center font-black text-sm text-blue-400">
                                    {isRecruiter
                                        ? activeConv.candidateName.charAt(0).toUpperCase()
                                        : activeConv.recruiterName.charAt(0).toUpperCase()}
                                </div>
                                <div>
                                    <div className="font-black text-white">
                                        {isRecruiter ? activeConv.candidateName : activeConv.recruiterName}
                                    </div>
                                    <div className="text-[10px] text-slate-500">
                                        {activeConv.subject || (isRecruiter
                                            ? allPortfolios.find(p => p.id === activeConv.candidatePortfolioId)?.role || 'Candidate'
                                            : activeConv.recruiterCompany || 'Recruiter')}
                                    </div>
                                </div>
                            </div>

                            {/* Messages */}
                            <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4" style={{ minHeight: 0, maxHeight: '400px' }}>
                                {activeConv.messages.length === 0 ? (
                                    <div className="flex flex-col items-center justify-center h-full text-center space-y-3 opacity-60">
                                        <div className="text-4xl">👋</div>
                                        <p className="text-slate-500 text-sm">Say hello! Start the conversation.</p>
                                    </div>
                                ) : activeConv.messages.map((msg: Message) => {
                                    const isMine = msg.senderId === currentUser.id;
                                    return (
                                        <div key={msg.id} className={`flex ${isMine ? 'justify-end' : 'justify-start'} gap-3`}>
                                            {!isMine && (
                                                <div className="w-8 h-8 rounded-xl bg-white/5 flex items-center justify-center text-sm font-black text-slate-400 shrink-0 mt-1">
                                                    {msg.senderName.charAt(0).toUpperCase()}
                                                </div>
                                            )}
                                            <div className={`max-w-[75%] space-y-1`}>
                                                {!isMine && (
                                                    <div className="text-[9px] font-black text-slate-500 uppercase tracking-widest px-1">
                                                        {msg.senderName}
                                                    </div>
                                                )}
                                                <div className="px-4 py-3 rounded-2xl text-sm leading-relaxed font-medium"
                                                    style={isMine
                                                        ? { background: 'linear-gradient(135deg,#1d4ed8,#3b82f6)', color: 'white', borderRadius: '18px 18px 4px 18px' }
                                                        : { background: 'rgba(255,255,255,0.06)', color: '#cbd5e1', borderRadius: '18px 18px 18px 4px' }
                                                    }>
                                                    {msg.content}
                                                </div>
                                                <div className={`text-[9px] text-slate-600 px-1 ${isMine ? 'text-right' : 'text-left'}`}>
                                                    {formatTime(msg.sentAt)}
                                                    {isMine && msg.read && <span className="ml-1 text-blue-400">✓✓</span>}
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })}
                                <div ref={messagesEndRef} />
                            </div>

                            {/* Input */}
                            <div className="px-6 py-4 border-t border-white/5">
                                <div className="flex items-end gap-3">
                                    <textarea
                                        className="flex-1 px-4 py-3 rounded-2xl border border-white/10 bg-white/5 text-white text-sm font-medium outline-none focus:border-blue-500/50 focus:ring-2 focus:ring-blue-500/10 resize-none transition-all placeholder-slate-600"
                                        rows={1}
                                        placeholder="Type a message... (Enter to send, Shift+Enter for newline)"
                                        value={messageText}
                                        onChange={e => setMessageText(e.target.value)}
                                        onKeyDown={handleKeyDown}
                                        style={{ boxSizing: 'border-box', width: '100%', minHeight: '48px', maxHeight: '120px' }}
                                    />
                                    <button onClick={handleSend} disabled={!messageText.trim() || sending}
                                        className="w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 transition-all hover:scale-[1.05] disabled:opacity-50"
                                        style={{ background: 'linear-gradient(135deg,#1d4ed8,#3b82f6)', boxShadow: '0 4px 20px rgba(59,130,246,0.3)' }}>
                                        {sending ? (
                                            <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                                        ) : (
                                            <svg width="18" height="18" viewBox="0 0 24 24" fill="white" xmlns="http://www.w3.org/2000/svg">
                                                <path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z" />
                                            </svg>
                                        )}
                                    </button>
                                </div>
                            </div>
                        </>
                    )}
                </div>
            </div>
        </div>
    );
};

export default MessagingPanel;
