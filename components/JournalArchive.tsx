
import React, { useState, useEffect } from 'react';
import { SongRecommendation, UserProgress } from '../types';
import { getEraTheme } from './MusicSection';

export const JournalArchive: React.FC = () => {
  const [entries, setEntries] = useState<{ song: SongRecommendation; progress: UserProgress }[]>([]);

  useEffect(() => {
    const all: any[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key?.startsWith('music-')) {
        try {
          all.push(JSON.parse(localStorage.getItem(key)!));
        } catch (e) { console.error("Malformed entry", key); }
      }
    }
    all.sort((a, b) => new Date(b.song.date).getTime() - new Date(a.song.date).getTime());
    setEntries(all);
  }, []);

  if (entries.length === 0) return (
    <div className="max-w-4xl mx-auto py-60 text-center space-y-6 px-4">
      <div className="w-24 h-24 bg-slate-50 rounded-full mx-auto flex items-center justify-center text-slate-200 border border-slate-100">
        <svg className="w-12 h-12" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"></path></svg>
      </div>
      <h3 className="serif text-4xl font-bold text-slate-900">Your archive is awaiting its first entry</h3>
      <p className="text-slate-500 max-w-sm mx-auto font-medium leading-relaxed">Listen to today's curated volume to begin building your personal musical repository.</p>
    </div>
  );

  return (
    <div className="max-w-5xl mx-auto px-6 space-y-20 animate-in fade-in duration-700 pb-40">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-8 border-b border-slate-200/60 pb-12">
        <div className="space-y-3">
          <h2 className="serif text-7xl font-bold tracking-tight text-slate-900">Archive</h2>
          <p className="text-slate-500 font-medium text-xl">The milestones of your auditory journey.</p>
        </div>
        <div className="px-8 py-3 bg-indigo-50 text-indigo-700 rounded-2xl font-black text-[10px] uppercase tracking-[0.4em] border border-indigo-100/50">
          {entries.length} Volumes Archived
        </div>
      </div>

      <div className="grid gap-14">
        {entries.map((e) => {
          const theme = getEraTheme(e.song.period);
          return (
            <div key={e.song.id} className="group relative bg-white rounded-[3.5rem] p-12 border border-slate-100 shadow-sm flex flex-col md:flex-row gap-12 hover:shadow-2xl hover:-translate-y-1 transition-all duration-700">
              {/* Genre Representative Visual Element */}
              <div className={`w-3 md:w-4 rounded-full shrink-0 bg-gradient-to-b ${theme.aura} opacity-70 shadow-lg`}></div>
              
              <div className="flex-1 space-y-8">
                <div className="flex items-center gap-6">
                  <span className="text-[10px] font-black text-indigo-600 uppercase tracking-[0.4em]">{new Date(e.song.date).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}</span>
                  <span className={`px-4 py-1.5 rounded-xl text-[9px] font-black uppercase tracking-widest ${theme.secondary} ${theme.primary} border border-indigo-100/30 shadow-sm`}>
                    {e.song.period}
                  </span>
                </div>
                
                <div className="space-y-2">
                  <h3 className="serif text-4xl font-bold text-slate-900 leading-tight transition-colors group-hover:text-indigo-600">
                    {e.song.title}
                  </h3>
                  <p className="text-2xl text-slate-400 font-serif italic font-light">— {e.song.composer}</p>
                </div>

                <div className="bg-slate-50/70 p-10 rounded-[2.5rem] italic text-slate-700 text-xl font-serif leading-relaxed border border-slate-100/50 relative overflow-hidden">
                  <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500/5 rounded-full blur-2xl -translate-y-1/2 translate-x-1/2"></div>
                  {e.progress.thoughts || "A profound moment captured in silence."}
                </div>
              </div>

              <div className="flex flex-col gap-4 shrink-0 justify-center">
                <a 
                  href={`https://www.youtube.com/watch?v=${e.song.youtubeVideoId}`} 
                  target="_blank" 
                  rel="noreferrer"
                  className="px-10 py-5 bg-slate-900 text-white rounded-2xl text-center text-[10px] font-black uppercase tracking-[0.3em] shadow-2xl hover:bg-black hover:scale-105 active:scale-95 transition-all"
                >
                  Recall Volume
                </a>
                <button 
                  onClick={() => {
                    if (confirm("Remove this masterpiece from your library?")) {
                      localStorage.removeItem(`music-${e.song.date}`);
                      setEntries(prev => prev.filter(x => x.song.id !== e.song.id));
                    }
                  }} 
                  className="px-10 py-5 bg-red-50 text-red-600 rounded-2xl text-center text-[10px] font-black uppercase tracking-[0.3em] hover:bg-red-100 transition-all font-bold"
                >
                  Discard
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
