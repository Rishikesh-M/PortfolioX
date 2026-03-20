
import React from 'react';
import { AppView, AuthUser } from '../types.ts';

interface HeaderProps {
  currentView: AppView;
  onNavigate: (view: AppView) => void;
  currentUser: AuthUser | null;
  onLogout: () => void;
}

const Header: React.FC<HeaderProps> = ({ currentView, onNavigate, currentUser, onLogout }) => {
  const isRecruiter = currentUser?.role === 'recruiter';

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 px-4 sm:px-6 py-3.5 sm:py-4 flex justify-between items-center bg-[#050811]/80 backdrop-blur-md border-b border-white/5">
      <div
        className="flex items-center gap-2 cursor-pointer transition-opacity hover:opacity-80"
        onClick={() => onNavigate(AppView.LANDING)}
      >
        <span className="text-xl sm:text-2xl font-black text-gradient tracking-tighter">PortfolioX</span>
        {isRecruiter && (
          <span className="hidden sm:inline text-[8px] font-black px-2 py-0.5 rounded-full uppercase tracking-widest"
            style={{ background: 'rgba(59,130,246,0.15)', color: '#60a5fa', border: '1px solid rgba(59,130,246,0.3)' }}>
            Recruiter
          </span>
        )}
      </div>

      <div className="flex gap-4 sm:gap-6 md:gap-8 items-center">

        {/* ── Job Seeker & Guest Nav ── */}
        {!isRecruiter && (
          <>
            {currentUser && (
              <>
                <button
                  onClick={() => onNavigate(AppView.QUIZ)}
                  className={`text-[10px] sm:text-xs md:text-sm font-bold uppercase tracking-widest transition-colors ${currentView === AppView.QUIZ ? 'text-purple-400' : 'text-slate-400 hover:text-white'}`}
                >
                  Quiz Arena
                </button>
                <button
                  onClick={() => onNavigate(AppView.MESSAGES)}
                  className={`flex items-center gap-1 text-[10px] sm:text-xs md:text-sm font-bold uppercase tracking-widest transition-colors ${currentView === AppView.MESSAGES ? 'text-blue-400' : 'text-slate-400 hover:text-white'}`}
                >
                  <span>💬</span>
                  <span className="hidden sm:inline">Messages</span>
                </button>
              </>
            )}
          </>
        )}

        {/* ── Recruiter Nav ── */}
        {isRecruiter && (
          <>
            <button
              onClick={() => onNavigate(AppView.RECRUITER)}
              className={`text-[10px] sm:text-xs md:text-sm font-bold uppercase tracking-widest transition-colors ${currentView === AppView.RECRUITER ? 'text-blue-400' : 'text-slate-400 hover:text-white'}`}
            >
              Dashboard
            </button>
            <button
              onClick={() => onNavigate(AppView.DISCOVER)}
              className={`text-[10px] sm:text-xs md:text-sm font-bold uppercase tracking-widest transition-colors ${currentView === AppView.DISCOVER ? 'text-blue-400' : 'text-slate-400 hover:text-white'}`}
            >
              Browse Talent
            </button>
          </>
        )}

        {currentUser ? (
          <>
            {/* Generate button only for Job Seekers */}
            {!isRecruiter && (
              <button
                onClick={() => onNavigate(AppView.GENERATOR)}
                className={`px-3 sm:px-5 py-2 sm:py-2.5 rounded-xl text-[10px] sm:text-xs md:text-sm font-black transition-all ${currentView === AppView.GENERATOR ? 'purple-gradient text-white shadow-lg shadow-purple-500/20' : 'bg-white/5 text-slate-300 hover:bg-white/10'}`}
              >
                {currentView === AppView.GENERATOR ? 'Synthesizing...' : 'Generate'}
              </button>
            )}

            <div className="flex items-center gap-3 sm:gap-4 pl-3 sm:pl-4 border-l border-white/10">
              <div className="hidden sm:flex flex-col items-end">
                <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">
                  {currentUser.fullName.split(' ')[0]}
                </span>
                {currentUser.company && (
                  <span className="text-[8px] font-bold text-blue-400/70 uppercase tracking-widest">
                    {currentUser.company}
                  </span>
                )}
              </div>
              <button
                onClick={onLogout}
                className="text-[9px] sm:text-[10px] font-black text-red-500/70 hover:text-red-400 transition-colors uppercase tracking-widest"
              >
                Logout
              </button>
            </div>
          </>
        ) : (
          <button
            onClick={() => onNavigate(AppView.AUTH)}
            className="px-5 sm:px-7 py-2 sm:py-2.5 purple-gradient rounded-xl font-black text-white shadow-lg shadow-purple-600/20 text-[10px] sm:text-xs md:text-sm uppercase tracking-widest"
          >
            Join the Elite
          </button>
        )}
      </div>
    </nav>
  );
};

export default Header;
