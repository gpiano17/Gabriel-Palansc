
import React, { useState, useEffect, createContext, useContext } from 'react';
import { MusicSection } from './components/MusicSection';
import { JournalArchive } from './components/JournalArchive';
import { ImageEditor } from './components/ImageEditor';
import { AIHub } from './components/AIHub';
import { PracticeStudio } from './components/PracticeStudio';

enum Tab {
  MUSIC = 'music',
  PRACTICE = 'practice',
  STUDIO = 'studio',
  HUB = 'hub',
  ARCHIVE = 'archive'
}

interface StatsContextType {
  xp: number;
  level: number;
  streak: number;
  addXP: (amount: number) => void;
}

const StatsContext = createContext<StatsContextType | undefined>(undefined);

export const useStats = () => {
  const context = useContext(StatsContext);
  if (!context) throw new Error("useStats must be used within a StatsProvider");
  return context;
};

const App: React.FC = () => {
  const [activeTab, setActiveTab] = useState<Tab>(Tab.MUSIC);
  const [isDarkMode, setIsDarkMode] = useState(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('theme');
      return saved === 'dark' || (!saved && window.matchMedia('(prefers-color-scheme: dark)').matches);
    }
    return false;
  });

  const [xp, setXp] = useState(() => Number(localStorage.getItem('user-xp') || 0));
  const level = Math.floor(xp / 500) + 1;
  const [streak, setStreak] = useState(() => Number(localStorage.getItem('user-streak') || 1));

  useEffect(() => {
    if (isDarkMode) {
      document.documentElement.classList.add('dark');
      localStorage.setItem('theme', 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('theme', 'light');
    }
  }, [isDarkMode]);

  useEffect(() => {
    localStorage.setItem('user-xp', xp.toString());
  }, [xp]);

  const addXP = (amount: number) => setXp(prev => prev + amount);
  const toggleTheme = () => setIsDarkMode(!isDarkMode);

  return (
    <StatsContext.Provider value={{ xp, level, streak, addXP }}>
      <div className="min-h-screen bg-[#fcfdfe] dark:bg-midnight text-slate-900 dark:text-slate-100 flex flex-col font-sans transition-colors duration-500">
        <nav className="sticky top-0 z-50 bg-white/70 dark:bg-midnight/70 backdrop-blur-3xl border-b border-slate-200/40 dark:border-slate-800/40 shadow-sm">
          <div className="max-w-7xl mx-auto px-6 h-24 flex items-center justify-between">
            <div className="flex items-center gap-4 group cursor-pointer" onClick={() => setActiveTab(Tab.MUSIC)}>
              <div className="w-12 h-12 bg-slate-900 dark:bg-indigo-600 rounded-2xl flex items-center justify-center text-white font-serif italic text-2xl shadow-xl">
                M
              </div>
              <div className="hidden sm:block">
                <h1 className="serif font-black text-2xl tracking-tight leading-none">MelodyMind</h1>
                <span className="text-[9px] font-black uppercase text-indigo-600 dark:text-indigo-400 tracking-[0.4em] mt-1 block">Pedagogy Hub</span>
              </div>
            </div>

            <div className="flex bg-slate-100/60 dark:bg-slate-800/60 p-1.5 rounded-2xl border border-slate-200/20 dark:border-slate-700/20 backdrop-blur-md">
              {(Object.values(Tab) as Tab[]).map((tab) => (
                <button 
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className={`px-4 py-3 rounded-xl font-black uppercase tracking-widest text-[9px] transition-all duration-300 ${activeTab === tab ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-md' : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'}`}
                >
                  {tab.replace(/^\w/, c => c.toUpperCase())}
                </button>
              ))}
            </div>

            <div className="flex items-center gap-8">
              <div className="hidden lg:flex items-center gap-6 pr-6 border-r border-slate-200/50 dark:border-slate-800/50">
                <div className="text-right">
                  <div className="text-[9px] font-black text-slate-400 uppercase tracking-widest">XP</div>
                  <div className="text-sm font-black text-indigo-600 dark:text-indigo-400">{xp}</div>
                </div>
                <div className="text-right">
                  <div className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Lvl</div>
                  <div className="text-sm font-black text-slate-900 dark:text-white">{level}</div>
                </div>
                <div className="text-right">
                  <div className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Streak</div>
                  <div className="text-sm font-black text-amber-500">🔥 {streak}</div>
                </div>
              </div>

              <button 
                onClick={toggleTheme}
                className="p-3 rounded-2xl bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 transition-all"
              >
                {isDarkMode ? (
                  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M10 2a1 1 0 011 1v1a1 1 0 11-2 0V3a1 1 0 011-1zm4 8a4 4 0 11-8 0 4 4 0 018 0zm-.464 4.95l.707.707a1 1 0 001.414-1.414l-.707-.707a1 1 0 00-1.414 1.414zm2.12-10.607a1 1 0 010 1.414l-.706.707a1 1 0 11-1.414-1.414l.707-.707a1 1 0 011.414 0zM17 11a1 1 0 100-2h-1a1 1 0 100 2h1zm-7 4a1 1 0 011 1v1a1 1 0 11-2 0v-1a1 1 0 011-1zM5.05 6.464A1 1 0 106.465 5.05l-.708-.707a1 1 0 00-1.414 1.414l.707.707zm1.414 8.486l-.707.707a1 1 0 01-1.414-1.414l.707-.707a1 1 0 011.414 1.414zM4 11a1 1 0 100-2H3a1 1 0 000 2h1z" clipRule="evenodd"></path></svg>
                ) : (
                  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20"><path d="M17.293 13.293A8 8 0 016.707 2.707a8.001 8.001 0 1010.586 10.586z"></path></svg>
                )}
              </button>
            </div>
          </div>
        </nav>

        <main className="flex-1">
          <div className="py-12 lg:py-16">
            {activeTab === Tab.MUSIC && <MusicSection />}
            {activeTab === Tab.PRACTICE && <PracticeStudio />}
            {activeTab === Tab.STUDIO && <ImageEditor />}
            {activeTab === Tab.HUB && <AIHub />}
            {activeTab === Tab.ARCHIVE && <JournalArchive />}
          </div>
        </main>

        <footer className="py-16 border-t border-slate-100 dark:border-slate-800 text-center space-y-4">
           <p className="text-[9px] font-black text-slate-400 uppercase tracking-[0.4em]">Teacher Gabriel Palansc • MusicLingo Ultimate Edition</p>
        </footer>
      </div>
    </StatsContext.Provider>
  );
};

export default App;
