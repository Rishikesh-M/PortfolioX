
import React, { useState, useCallback, useEffect } from 'react';
import Header from './components/Header.tsx';
import GeneratorForm from './components/GeneratorForm.tsx';
import PortfolioView from './components/PortfolioView.tsx';
import DiscoveryGallery from './components/DiscoveryGallery.tsx';
import LoginPage from './components/LoginPage.tsx';
import PortfolioEditor from './components/PortfolioEditor.tsx';
import QuizPage from './components/QuizPage.tsx';
import LandingPage from './components/LandingPage.tsx';
import RecruiterDashboard from './components/RecruiterDashboard.tsx';
import { AppView, UserPortfolio, AuthUser } from './types.ts';
import { generatePortfolioFromLinks } from './geminiService.ts';
import { db } from './services/db.ts';

const App: React.FC = () => {
  const [currentView, setCurrentView] = useState<AppView>(AppView.LANDING);
  const [currentUser, setCurrentUser] = useState<AuthUser | null>(null);
  const [currentPortfolio, setCurrentPortfolio] = useState<UserPortfolio | null>(null);
  const [lastLinks, setLastLinks] = useState<{ github: string; linkedin: string; otherLink: string; context?: string } | undefined>(undefined);
  const [allPortfolios, setAllPortfolios] = useState<UserPortfolio[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isDbLoading, setIsDbLoading] = useState(true);

  useEffect(() => {
    const loadData = async () => {
      setIsDbLoading(true);

      const savedUserStr = localStorage.getItem('portfoliox_user');
      if (savedUserStr) {
        try {
          const stored: AuthUser = JSON.parse(savedUserStr);
          setCurrentUser(stored);
          const portfolios = await db.getPortfolios();
          setAllPortfolios(portfolios);

          const myPortfolio = portfolios.find(p => p.userId === stored.id);
          if (myPortfolio) setCurrentPortfolio(myPortfolio);

          // Route to role-specific dashboard
          if (stored.role === 'recruiter') setCurrentView(AppView.RECRUITER);
          else if (myPortfolio) setCurrentView(AppView.PORTFOLIO);
          else setCurrentView(AppView.GENERATOR);
        } catch {
          localStorage.removeItem('portfoliox_user');
          setCurrentView(AppView.LANDING);
        }
      } else {
        const portfolios = await db.getPortfolios();
        setAllPortfolios(portfolios);
        setCurrentView(AppView.LANDING);
      }
      setIsDbLoading(false);
    };
    loadData();
  }, []);

  const handleGenerate = async (links: { github: string; linkedin: string; otherLink: string; context?: string }) => {
    setIsLoading(true);
    setLastLinks(links);
    try {
      if (!currentUser) {
        setIsLoading(false);
        setCurrentView(AppView.AUTH);
        return;
      }

      const newPortfolio = await generatePortfolioFromLinks(links);
      newPortfolio.userId = currentUser.id;

      await db.savePortfolio(newPortfolio);

      setCurrentPortfolio(newPortfolio);
      setAllPortfolios(prev => {
        const index = prev.findIndex(p => p.id === newPortfolio.id);
        if (index !== -1) {
          const updated = [...prev];
          updated[index] = newPortfolio;
          return updated;
        }
        return [newPortfolio, ...prev];
      });

      setCurrentView(AppView.PORTFOLIO);
    } catch (error) {
      console.error("Failed to generate portfolio:", error);
      const errorMessage = error instanceof Error ? error.message : "Use a valid API KEY";
      alert(`AI Synth failed: ${errorMessage}`);
    } finally {
      setIsLoading(false);
    }
  };

  const handleEdit = () => {
    if (currentPortfolio) {
      setCurrentView(AppView.EDITOR);
    }
  };

  const handleSaveEdit = async (updatedPortfolio: UserPortfolio) => {
    setIsLoading(true);
    try {
      await db.savePortfolio(updatedPortfolio);
      setCurrentPortfolio(updatedPortfolio);
      setAllPortfolios(prev => {
        const index = prev.findIndex(p => p.id === updatedPortfolio.id);
        if (index !== -1) {
          const updated = [...prev];
          updated[index] = updatedPortfolio;
          return updated;
        }
        return prev;
      });
      setCurrentView(AppView.PORTFOLIO);
    } catch (error) {
      console.error("Failed to save portfolio:", error);
      alert("Failed to save changes.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleCancelEdit = () => {
    setCurrentView(AppView.PORTFOLIO);
  };

  const handleDeletePortfolio = async (id: string) => {
    if (confirm("Permanently delete this portfolio?")) {
      await db.deletePortfolio(id);
      setAllPortfolios(prev => prev.filter(p => p.id !== id));
      if (currentPortfolio?.id === id) setCurrentPortfolio(null);
    }
  };

  const handleViewPortfolio = (portfolio: UserPortfolio) => {
    setCurrentPortfolio(portfolio);
    setCurrentView(AppView.PORTFOLIO);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleAuthSuccess = (user: AuthUser) => {
    setCurrentUser(user);
    // Route to role-specific dashboard
    if (user.role === 'recruiter') {
      setCurrentView(AppView.RECRUITER);
    } else {
      const myPortfolio = allPortfolios.find(p => p.userId === user.id);
      if (myPortfolio) {
        setCurrentPortfolio(myPortfolio);
        setCurrentView(AppView.PORTFOLIO);
      } else {
        setCurrentView(AppView.GENERATOR);
      }
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('portfoliox_user');
    setCurrentUser(null);
    setCurrentPortfolio(null);
    setCurrentView(AppView.LANDING);
  };

  const handleQuizUpdate = async (points: number, level: number) => {
    if (!currentPortfolio || !currentUser) return;

    const updatedPortfolio = {
      ...currentPortfolio,
      quizStats: {
        points,
        level,
        maxLevel: 15
      },
      score: Math.min(100, (currentPortfolio.score || 0) + 5)
    };

    await db.savePortfolio(updatedPortfolio);
    setCurrentPortfolio(updatedPortfolio);
    setAllPortfolios(prev => {
      const index = prev.findIndex(p => p.id === updatedPortfolio.id);
      if (index !== -1) {
        const updated = [...prev];
        updated[index] = updatedPortfolio;
        return updated;
      }
      return prev;
    });
  };

  const navigateToAuth = () => setCurrentView(AppView.AUTH);
  const navigateToDiscover = () => setCurrentView(AppView.DISCOVER);

  return (
    <div className="min-h-screen selection:bg-purple-500/30">
      <Header
        currentView={currentView}
        onNavigate={setCurrentView}
        currentUser={currentUser}
        onLogout={handleLogout}
      />

      <main className="container mx-auto pb-20">
        {isDbLoading ? (
          <div className="flex items-center justify-center min-h-[80vh]">
            <div className="flex flex-col items-center gap-6">
              <div className="w-16 h-16 border-4 border-purple-500 border-t-transparent rounded-full animate-spin"></div>
              <p className="text-slate-500 font-bold tracking-widest uppercase text-xs animate-pulse">Syncing Engine...</p>
            </div>
          </div>
        ) : (
          <div className="transition-all duration-500">
            {currentView === AppView.LANDING && (
              <LandingPage
                onGetStarted={currentUser ? () => setCurrentView(AppView.GENERATOR) : navigateToAuth}
                onExplore={currentUser?.role === 'recruiter' ? navigateToDiscover : navigateToAuth}
              />
            )}
            {currentView === AppView.AUTH && <LoginPage onAuthSuccess={handleAuthSuccess} />}
            {currentView === AppView.GENERATOR && <GeneratorForm onGenerate={handleGenerate} isLoading={isLoading} initialLinks={lastLinks} />}
            {currentView === AppView.PORTFOLIO && currentPortfolio && <PortfolioView portfolio={currentPortfolio} onEdit={handleEdit} currentUser={currentUser} />}
            {currentView === AppView.EDITOR && currentPortfolio && (
              <PortfolioEditor
                portfolio={currentPortfolio}
                onSave={handleSaveEdit}
                onCancel={handleCancelEdit}
              />
            )}
            {currentView === AppView.QUIZ && (
              <QuizPage
                currentUserPortfolio={currentPortfolio}
                onUpdateStats={handleQuizUpdate}
                onBack={() => {
                  if (currentUser?.role === 'recruiter') setCurrentView(AppView.RECRUITER);
                  else setCurrentView(AppView.PORTFOLIO);
                }}
              />
            )}
            {currentView === AppView.DISCOVER && currentUser?.role === 'recruiter' && (
              <DiscoveryGallery
                portfolios={allPortfolios}
                onViewPortfolio={handleViewPortfolio}
                onDeletePortfolio={handleDeletePortfolio}
                currentUser={currentUser}
              />
            )}
            {currentView === AppView.RECRUITER && currentUser?.role === 'recruiter' && (
              <RecruiterDashboard
                portfolios={allPortfolios}
                currentUser={currentUser}
                onViewPortfolio={handleViewPortfolio}
              />
            )}
          </div>
        )}
      </main>

      <footer className="py-20 text-center border-t border-white/5 space-y-4">
        <div className="text-gradient font-black text-2xl">PortfolioX</div>
        <p className="text-slate-700 text-[10px] font-black uppercase tracking-[0.4em]">&copy; 2024 PortfolioX • Built for the elite</p>
      </footer>
    </div>
  );
};

export default App;
