
import React, { useState } from 'react';
import { MusicSection } from './components/MusicSection';
import { JournalArchive } from './components/JournalArchive';

enum Tab {
  MUSIC = 'music',
  ARCHIVE = 'archive'
}

const App: React.FC = () => {
  const [activeTab, setActiveTab] = useState<Tab>(Tab.MUSIC);

  return (
    <div className="min-h-screen bg-[#fcfdfe] text-slate-900 flex flex-col font-sans selection:bg-indigo-100 selection:text-indigo-900">
      {/* Editorial Navigation */}
      <nav className="sticky top-0 z-50 bg-white/70 backdrop-blur-xl border-b border-slate-200/60 shadow-[0_2px_20px_-10px_rgba(0,0,0,0.05)]">
        <div className="max-w-6xl mx-auto px-6 h-24 flex items-center justify-between">
          <div className="flex items-center gap-4 group cursor-pointer" onClick={() => setActiveTab(Tab.MUSIC)}>
            <div className="w-12 h-12 bg-slate-900 rounded-2xl flex items-center justify-center text-white font-serif italic text-2xl shadow-2xl transition-transform group-hover:scale-110">
              M
            </div>
            <div className="hidden sm:block">
              <h1 className="serif font-black text-2xl tracking-tight leading-none text-slate-900">MelodyMind</h1>
              <span className="text-[9px] font-black uppercase text-indigo-600 tracking-[0.4em] mt-1 block">The curated auditory series</span>
            </div>
          </div>

          <div className="flex bg-slate-100/80 p-1.5 rounded-2xl border border-slate-200/40">
            <button 
              onClick={() => setActiveTab(Tab.MUSIC)}
              className={`px-8 py-3 rounded-xl font-black uppercase tracking-widest text-[10px] transition-all duration-500 ${activeTab === Tab.MUSIC ? 'bg-white text-slate-900 shadow-xl scale-105' : 'text-slate-500 hover:text-slate-800'}`}
            >
              Today's Volume
            </button>
            <button 
              onClick={() => setActiveTab(Tab.ARCHIVE)}
              className={`px-8 py-3 rounded-xl font-black uppercase tracking-widest text-[10px] transition-all duration-500 ${activeTab === Tab.ARCHIVE ? 'bg-white text-slate-900 shadow-xl scale-105' : 'text-slate-500 hover:text-slate-800'}`}
            >
              Archive
            </button>
          </div>

          <div className="hidden md:flex flex-col items-end">
             <span className="text-[10px] font-black uppercase tracking-[0.3em] text-indigo-500 mb-1">{new Date().toLocaleDateString('en-US', { weekday: 'long' })}</span>
             <span className="text-sm font-bold text-slate-900">{new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</span>
          </div>
        </div>
      </nav>

      {/* Main Narrative Content */}
      <main className="flex-1 py-16 lg:py-24">
        {activeTab === Tab.MUSIC ? <MusicSection /> : <JournalArchive />}
      </main>

      {/* Refined Footer */}
      <footer className="py-24 border-t border-slate-100 bg-white">
        <div className="max-w-5xl mx-auto px-6 text-center space-y-10">
          <div className="flex justify-center gap-4">
             <div className="w-1.5 h-1.5 rounded-full bg-slate-200"></div>
             <div className="w-1.5 h-1.5 rounded-full bg-slate-400"></div>
             <div className="w-1.5 h-1.5 rounded-full bg-slate-600"></div>
          </div>
          
          <div className="space-y-4">
            <p className="text-slate-400 text-[10px] font-black tracking-[0.5em] uppercase">MelodyMind Multimodal Curriculum</p>
            <p className="text-slate-500 text-sm max-w-xl mx-auto font-medium leading-relaxed">
              Synthesized by Gemini Intelligence in consultation with <span className="text-slate-900 font-bold">Teacher Gabriel Palansc</span>.
              Designed for the enduring pursuit of musical literacy and profound auditory reflection.
            </p>
          </div>

          <div className="pt-8 opacity-20 hover:opacity-100 transition-opacity">
            <span className="serif text-lg text-slate-900 font-bold italic tracking-tighter">Fine Arts Edition / No. {new Date().getFullYear()}</span>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default App;
