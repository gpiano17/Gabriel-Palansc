
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
      <div className="w-20 h-20 bg-slate-100 rounded-full mx-auto flex items-center justify-center text-slate-300">
        <svg className="w-10 h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"></path></svg>
      </div>
      <h3 className="serif text-3xl font-bold text-slate-900">Your collection is silent</h3>
      <p className="text-slate-500 max-w-sm mx-auto font-medium leading-relaxed">Listen to your daily curated masterpiece to begin building your musical repository.</p>
    </div>
  );

  return (
    <div className="max-w-5xl mx-auto p-4 space-y-16 animate-in fade-in duration-700 pb-32">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 border-b border-slate-200 pb-10">
        <div className="space-y-2">
          <h2 className="serif text-6xl font-bold tracking-tight text-slate-900">Museum of Sound</h2>
          <p className="text-slate-500 font-medium text-lg">Revisiting the milestones of your musical education.</p>
        </div>
        <div className="px-6 py-2.5 bg-indigo-50 text-indigo-700 rounded-2xl font-black text-[10px] uppercase tracking-[0.3em] border border-indigo-100/50">
          {entries.length} Vol. Archived
        </div>
      </div>

      <div className="grid gap-12">
        {entries.map((e) => {
          const theme = getEraTheme(e.song.period);
          return (
            <div key={e.song.id} className="group relative bg-white rounded-[2.5rem] p-10 border border-slate-100 shadow-sm flex flex-col md:flex-row gap-10 hover:shadow-2xl hover:-translate-y-1 transition-all duration-500">
              {/* Vertical Era Indicator */}
              <div className={`w-1 md:w-2 rounded-full shrink-0 bg-gradient-to-b ${theme.aura} opacity-80`}></div>
              
              <div className="flex-1 space-y-6">
                <div className="flex items-center gap-4">
                  <span className="text-[10px] font-black text-indigo-600 uppercase tracking-[0.3em]">{new Date(e.song.date).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}</span>
                  <span className={`px-3 py-1 rounded-lg text-[9px] font-black uppercase tracking-widest ${theme.secondary} ${theme.primary} border border-indigo-100/50`}>
                    {e.song.period}
                  </span>
                </div>
                
                <div className="space-y-1">
                  <h3 className="serif text-3xl font-bold text-slate-900 leading-tight transition-colors group-hover:text-indigo-600">
                    {e.song.title}
                  </h3>
                  <p className="text-xl text-slate-400 font-serif italic">— {e.song.composer}</p>
                </div>

                <div className="bg-slate-50/80 p-8 rounded-[2rem] italic text-slate-700 text-lg leading-relaxed border border-slate-100/50 relative">
                  <svg className="w-12 h-12 text-slate-100 absolute -top-4 -left-4" fill="currentColor" viewBox="0 0 24 24"><path d="M14.017 21L14.017 18C14.017 16.8954 14.9124 16 16.017 16H19.017C20.1216 16 21.017 15.1046 21.017 14V11H17.017C15.9124 11 15.017 10.1046 15.017 9V5H21.017V14C21.017 15.1046 20.1216 16 19.017 16H18.017L18.017 19C18.017 20.1046 17.1216 21 16.017 21H14.017ZM3.017 21L3.017 18C3.017 16.8954 3.91243 16 5.01703 16H8.01703C9.1216 16 10.017 15.1046 10.017 14V11H6.01703C4.91243 11 4.01703 10.1046 4.01703 9V5H10.017V14C10.017 15.1046 9.1216 16 8.01703 16H7.01703L7.01703 19C7.01703 20.1046 6.1216 21 5.01703 21H3.017Z" /></svg>
                  {e.progress.thoughts || "A profound moment captured in silence."}
                </div>
              </div>

              <div className="flex flex-col gap-3 shrink-0 justify-center">
                <a 
                  href={`https://www.youtube.com/watch?v=${e.song.youtubeVideoId}`} 
                  target="_blank" 
                  rel="noreferrer"
                  className="px-8 py-4 bg-slate-900 text-white rounded-2xl text-center text-[10px] font-black uppercase tracking-[0.2em] shadow-xl hover:bg-black hover:scale-105 active:scale-95 transition-all"
                >
                  Recall Sound
                </a>
                <button 
                  onClick={() => {
                    if (confirm("Remove this masterpiece from your library?")) {
                      localStorage.removeItem(`music-${e.song.date}`);
                      setEntries(prev => prev.filter(x => x.song.id !== e.song.id));
                    }
                  }} 
                  className="px-8 py-4 bg-red-50 text-red-600 rounded-2xl text-center text-[10px] font-black uppercase tracking-[0.2em] hover:bg-red-100 transition-all"
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
