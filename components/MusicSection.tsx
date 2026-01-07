
import React, { useState, useEffect, useMemo, useRef } from 'react';
import { generateDailySong, generateSpeech, transcribeAudio, decodeBase64ToUint8, decodeAudioData } from '../services/geminiService';
import { SongRecommendation, UserProgress } from '../types';
import { useStats } from '../App';

export interface EraTheme {
  primary: string;
  secondary: string;
  accent: string;
  aura: string;
}

export const getEraTheme = (period: string): EraTheme => {
  const p = period.toLowerCase();
  if (p.includes('baroque')) return { 
    primary: 'text-amber-900 dark:text-amber-200', secondary: 'bg-amber-50 dark:bg-amber-950/40', accent: 'bg-amber-600', 
    aura: 'from-amber-900 via-stone-800 to-black'
  };
  if (p.includes('classical')) return { 
    primary: 'text-slate-900 dark:text-slate-200', secondary: 'bg-slate-50 dark:bg-slate-900/40', accent: 'bg-indigo-600', 
    aura: 'from-slate-700 via-indigo-900 to-slate-900'
  };
  if (p.includes('romantic')) return { 
    primary: 'text-rose-950 dark:text-rose-200', secondary: 'bg-rose-50 dark:bg-rose-950/40', accent: 'bg-rose-600', 
    aura: 'from-rose-800 via-purple-900 to-black'
  };
  if (p.includes('jazz') || p.includes('blues')) return { 
    primary: 'text-blue-950 dark:text-blue-200', secondary: 'bg-blue-50 dark:bg-blue-950/40', accent: 'bg-blue-700', 
    aura: 'from-blue-800 via-slate-900 to-black'
  };
  return { 
    primary: 'text-indigo-950 dark:text-indigo-200', secondary: 'bg-indigo-50 dark:bg-indigo-950/40', accent: 'bg-indigo-600', 
    aura: 'from-indigo-800 via-slate-900 to-black'
  };
};

export const MusicSection: React.FC = () => {
  const { addXP } = useStats();
  const [song, setSong] = useState<(SongRecommendation & { sources?: any[] }) | null>(null);
  const [progress, setProgress] = useState<UserProgress>({ listened: false, thoughts: '', rating: 0 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  
  const audioContextRef = useRef<AudioContext | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);

  useEffect(() => {
    const today = new Date().toISOString().split('T')[0];
    const saved = localStorage.getItem(`music-${today}`);
    if (saved) {
      try {
        const { song: s, progress: p } = JSON.parse(saved);
        setSong(s); setProgress(p); setLoading(false);
      } catch (e) { loadNewSong(today); }
    } else { loadNewSong(today); }
  }, []);

  const theme = useMemo(() => song ? getEraTheme(song.period) : null, [song]);

  const loadNewSong = async (date: string) => {
    setLoading(true);
    setError(null);
    try {
      const newSong = await generateDailySong(date);
      setSong(newSong);
      const initP = { listened: false, thoughts: '', rating: 0 };
      setProgress(initP);
      localStorage.setItem(`music-${newSong.date}`, JSON.stringify({ song: newSong, progress: initP }));
    } catch (err: any) {
      setError(err.message || "Archive connectivity error. Retrying search grounding...");
    } finally { setLoading(false); }
  };

  const handleSpeech = async (text: string) => {
    if (isSpeaking) return;
    setIsSpeaking(true);
    try {
      if (!audioContextRef.current) audioContextRef.current = new AudioContext();
      const ctx = audioContextRef.current;
      const base64 = await generateSpeech(text);
      const buffer = await decodeAudioData(decodeBase64ToUint8(base64), ctx);
      const source = ctx.createBufferSource();
      source.buffer = buffer;
      source.connect(ctx.destination);
      source.onended = () => setIsSpeaking(false);
      source.start();
    } catch { setIsSpeaking(false); }
  };

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream);
      mediaRecorderRef.current = recorder;
      chunksRef.current = [];
      recorder.ondataavailable = (e) => chunksRef.current.push(e.data);
      recorder.onstop = async () => {
        const text = await transcribeAudio(new Blob(chunksRef.current, { type: 'audio/wav' }));
        updateProgress({ thoughts: (progress.thoughts + " " + text).trim() });
        setIsRecording(false);
      };
      recorder.start();
      setIsRecording(true);
    } catch { setIsRecording(false); }
  };

  const updateProgress = (updates: Partial<UserProgress>) => {
    if (!song) return;
    const newProgress = { ...progress, ...updates };
    if (updates.listened && !progress.listened) addXP(100);
    setProgress(newProgress);
    localStorage.setItem(`music-${song.date}`, JSON.stringify({ song, progress: newProgress }));
  };

  if (loading) return (
    <div className="flex flex-col items-center justify-center py-48 gap-8">
      <div className="relative w-20 h-20">
        <div className="absolute inset-0 border-4 border-slate-100 dark:border-slate-800 rounded-full"></div>
        <div className="absolute inset-0 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
      </div>
      <p className="text-[10px] font-black uppercase tracking-[0.4em] text-slate-400 animate-pulse">Curating Masterpiece via Search Grounding</p>
    </div>
  );

  if (error || !song || !theme) return (
    <div className="max-w-md mx-auto py-40 text-center space-y-6">
      <h3 className="serif text-3xl font-bold">{error || "Connection lost"}</h3>
      <button onClick={() => loadNewSong(new Date().toISOString().split('T')[0])} className="px-8 py-3 bg-indigo-600 text-white rounded-xl font-bold">Retry Search</button>
    </div>
  );

  return (
    <div className="max-w-6xl mx-auto px-6 space-y-16 animate-in fade-in duration-1000">
      <div className="relative rounded-[3.5rem] overflow-hidden shadow-2xl bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 transition-all duration-500">
        <div className={`absolute inset-0 bg-gradient-to-br ${theme.aura} opacity-95`}></div>
        <div className="relative z-10 flex flex-col lg:flex-row min-h-[38rem]">
          <div className="flex-1 p-8 lg:p-16 flex flex-col justify-center">
            <div className="relative aspect-video rounded-[2.5rem] overflow-hidden shadow-2xl bg-black border-[12px] border-white/5 dark:border-white/10 ring-1 ring-white/10 group">
              <iframe 
                className="w-full h-full" 
                src={`https://www.youtube.com/embed/${song.youtubeVideoId}?autoplay=0&rel=0&modestbranding=1&origin=${window.location.origin}`} 
                title={song.title}
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
                loading="lazy"
              ></iframe>
              <button 
                onClick={() => { if(confirm("Broken video? Gemini will find a new recording.")) loadNewSong(song.date) }}
                className="absolute top-4 right-4 p-3 bg-black/40 backdrop-blur-md rounded-xl text-white opacity-0 group-hover:opacity-100 transition-opacity hover:bg-black/60"
                title="Regenerate Search"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"></path></svg>
              </button>
            </div>
          </div>

          <div className="lg:w-[35rem] p-12 lg:p-20 flex flex-col justify-center text-white space-y-8">
            <div className="space-y-4">
              <div className="flex gap-2">
                <span className="px-4 py-1.5 rounded-full bg-white/10 backdrop-blur-md text-[9px] font-black uppercase tracking-widest border border-white/20">{song.period}</span>
                <span className="px-4 py-1.5 rounded-full bg-white/10 backdrop-blur-md text-[9px] font-black uppercase tracking-widest border border-white/20">{song.duration}</span>
              </div>
              <h2 className="serif text-5xl lg:text-6xl font-bold leading-tight drop-shadow-md">{song.title}</h2>
              <p className="text-xl lg:text-2xl font-light italic opacity-80 font-serif">— {song.composer}</p>
            </div>
            
            <div className="pt-8 border-t border-white/10 flex justify-between items-center">
              <div className="flex flex-col">
                <span className="text-[9px] font-black uppercase tracking-widest text-white/40 mb-1">Session Value</span>
                <span className="text-emerald-400 font-black">+100 XP</span>
              </div>
              <div className="flex flex-col items-end">
                <span className="text-[9px] font-black uppercase tracking-widest text-white/40 mb-1">Search Verified</span>
                <span className="text-[10px] font-bold">Search Grounding 3.0</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="grid lg:grid-cols-12 gap-16 pb-20">
        <div className="lg:col-span-7 space-y-16">
          <section className="space-y-10">
            <div className="flex items-center justify-between">
              <h3 className="text-[11px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-[0.4em]">The Narrative</h3>
              <button 
                onClick={() => handleSpeech(song.historicalContext)}
                className={`p-4 rounded-2xl transition-all ${isSpeaking ? 'bg-indigo-600 text-white shadow-lg' : 'bg-slate-100 dark:bg-slate-800 text-slate-500'}`}
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15.536 8.464a5 5 0 010 7.072m2.828-9.9a9 9 0 010 12.728M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z"></path></svg>
              </button>
            </div>
            <p className="text-slate-800 dark:text-slate-200 text-2xl lg:text-3xl font-serif italic border-l-[10px] border-indigo-100 dark:border-indigo-900/40 pl-12 leading-relaxed">
              {song.historicalContext}
            </p>
          </section>

          <section className="grid sm:grid-cols-2 gap-10">
            <div className={`${theme.secondary} p-12 rounded-[3rem] border border-slate-100 dark:border-slate-800 transition-colors duration-500`}>
              <h4 className={`text-[10px] font-black uppercase tracking-[0.3em] mb-6 ${theme.primary}`}>Musical Texture</h4>
              <p className="text-slate-600 dark:text-slate-400 text-sm leading-relaxed">{song.musicalAnalysis}</p>
            </div>
            <div className="bg-amber-50 dark:bg-amber-950/20 p-12 rounded-[3rem] border border-amber-100 dark:border-amber-900/40 transition-colors duration-500">
              <h4 className="text-[10px] font-black text-amber-900 dark:text-amber-200 uppercase tracking-[0.3em] mb-6">Discovery</h4>
              <p className="text-slate-700 dark:text-slate-300 text-sm font-bold italic leading-relaxed">"{song.funFact}"</p>
            </div>
          </section>
        </div>

        <div className="lg:col-span-5">
          <div className="sticky top-32 space-y-10">
            <div className="bg-slate-900 dark:bg-slate-950 rounded-[3rem] p-10 text-white shadow-2xl transition-colors duration-500">
              <h3 className="font-black text-xl uppercase tracking-tighter mb-10">Musical Journal</h3>
              <div className="relative mb-8">
                <textarea
                  value={progress.thoughts}
                  onChange={(e) => updateProgress({ thoughts: e.target.value })}
                  className="w-full h-72 p-8 rounded-[2rem] bg-white/5 border-none text-white placeholder-slate-600 resize-none font-medium leading-relaxed focus:ring-4 focus:ring-indigo-500/20"
                  placeholder="Your resonance..."
                />
                <button 
                  onMouseDown={startRecording}
                  onMouseUp={() => mediaRecorderRef.current?.stop()}
                  className={`absolute bottom-6 right-6 p-5 rounded-2xl transition-all ${isRecording ? 'bg-red-500 animate-pulse scale-110' : 'bg-indigo-600 hover:scale-105'}`}
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-20a3 3 0 013 3v10a3 3 0 01-3 3 3 3 0 01-3-3V5a3 3 0 013-3z"></path></svg>
                </button>
              </div>
              <label className="flex items-center gap-4 cursor-pointer">
                <input 
                  type="checkbox" 
                  checked={progress.listened}
                  onChange={(e) => updateProgress({ listened: e.target.checked })}
                  className="w-6 h-6 rounded-lg text-indigo-500 border-none bg-slate-800"
                />
                <span className={`text-[10px] font-black uppercase tracking-widest transition-colors ${progress.listened ? 'text-emerald-400' : 'text-slate-500'}`}>
                  Mark Session as Complete
                </span>
              </label>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
