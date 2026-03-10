
import React from 'react';
import { AppView } from '../types.ts';

interface LandingPageProps {
    onGetStarted: () => void;
    onExplore: () => void;
}

const LandingPage: React.FC<LandingPageProps> = ({ onGetStarted, onExplore }) => {
    return (
        <div className="relative overflow-hidden pt-16 pb-32">
            {/* Background Orbs */}
            <div className="absolute top-0 -left-4 w-72 h-72 bg-purple-500 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-blob"></div>
            <div className="absolute top-0 -right-4 w-72 h-72 bg-indigo-500 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-blob animation-delay-2000"></div>
            <div className="absolute -bottom-8 left-20 w-72 h-72 bg-pink-500 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-blob animation-delay-4000"></div>

            <div className="relative container mx-auto px-6 text-center">
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/5 border border-white/10 mb-8 animate-fade-in">
                    <span className="relative flex h-2 w-2">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-purple-400 opacity-75"></span>
                        <span className="relative inline-flex rounded-full h-2 w-2 bg-purple-500"></span>
                    </span>
                    <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Next Gen Portfolio Engine Now Live</span>
                </div>

                <h1 className="text-5xl md:text-7xl font-black mb-8 leading-tight tracking-tighter">
                    Forge Your <br />
                    <span className="text-gradient">Digital Legacy</span>
                </h1>

                <p className="text-slate-400 text-lg md:text-xl max-w-2xl mx-auto mb-12 font-medium leading-relaxed">
                    Instantly transform your social presence into a high-octane professional portfolio.
                    Powered by Generative AI for the elite developers and recruiters of the future.
                </p>

                <div className="flex flex-col sm:flex-row items-center justify-center gap-6">
                    <button
                        onClick={onGetStarted}
                        className="group relative px-8 py-4 bg-white text-black font-black uppercase tracking-widest rounded-xl hover:scale-105 transition-all duration-300"
                    >
                        Generate My Portfolio
                        <div className="absolute inset-0 rounded-xl bg-white/50 blur-lg group-hover:blur-xl transition-all -z-10 opacity-0 group-hover:opacity-100"></div>
                    </button>

                    <button
                        onClick={onExplore}
                        className="px-8 py-4 bg-white/5 text-white border border-white/10 font-black uppercase tracking-widest rounded-xl hover:bg-white/10 transition-all duration-300"
                    >
                        Explore Talent
                    </button>
                </div>

                <div className="mt-32 grid grid-cols-1 md:grid-cols-3 gap-8">
                    {[
                        {
                            title: "AI Synthesis",
                            desc: "Scrapes your GitHub, LinkedIn, and more to build a cohesive narrative.",
                            icon: "⚡"
                        },
                        {
                            title: "Discovery Hub",
                            desc: "Recursive search engine for recruiters to find top-tier talent instantly.",
                            icon: "🔍"
                        },
                        {
                            title: "Proof of Skill",
                            desc: "Embedded skill challenges and proof of work verification.",
                            icon: "🏆"
                        }
                    ].map((feature, i) => (
                        <div key={i} className="bg-glass p-8 rounded-3xl border border-white/5 group hover:border-purple-500/30 transition-all">
                            <div className="text-4xl mb-6">{feature.icon}</div>
                            <h3 className="text-xl font-bold mb-4">{feature.title}</h3>
                            <p className="text-slate-500 text-sm leading-relaxed">{feature.desc}</p>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
};

export default LandingPage;
