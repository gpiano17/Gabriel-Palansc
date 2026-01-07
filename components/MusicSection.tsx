
import React, { useState, useEffect, useMemo, useRef } from 'react';
import { generateDailySong, generateSpeech, transcribeAudio, decodeBase64ToUint8, decodeAudioData } from '../services/geminiService';
import { SongRecommendation, UserProgress } from '../types';

export interface EraTheme {
  primary: string;
  secondary: string;
  accent: string;
  aura: string;
}

export const getEraTheme = (period: string): EraTheme => {
  const p = period.toLowerCase();
  if (p.includes('baroque')) return { 
    primary: 'text-amber-900', secondary: 'bg-amber-50', accent: 'bg-amber-600', 
    aura: 'from-amber-900 via-stone-900 to-black'
  };
  if (p.includes('classical')) return { 
    primary: 'text-slate-900', secondary: 'bg-slate-50', accent: 'bg-indigo-600', 
    aura: 'from-slate-800 via-indigo-950 to-slate-950'
  };
  if (p.includes('romantic')) return { 
    primary: 'text-rose-950', secondary: 'bg-rose-50', accent: 'bg-rose-600', 
    aura: 'from-rose-900 via-purple-950 to-black'
  };
  if (p.includes('jazz') || p.includes('blues')) return { 
    primary: 'text-blue-950', secondary: 'bg-blue-50', accent: 'bg-blue-700', 
    aura: 'from-blue-900 via-slate-900 to-black'
  };
  return { 
    primary: 'text-indigo-950', secondary: 'bg-indigo-50', accent: 'bg-indigo-600', 
    aura: 'from-indigo-900 via-slate-900 to-black'
  };
};

export const MusicSection: React.FC = () => {
  const [song, setSong] = useState<SongRecommendation | null>(null);
  const [progress, setProgress] = useState<UserProgress>({ listened: false, thoughts: '', rating: 0 });
  const [loading, setLoading] = useState(true);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  
  const audioContextRef = useRef<AudioContext | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);

  useEffect(() => {
    const today = new Date().toISOString().split('T')[0];
    const saved = localStorage.getItem(`music-${today}`);
    if (saved) {
      const { song: s, progress: p } = JSON.parse(saved);
      setSong(s); setProgress(p); setLoading(false);
    } else { loadNewSong(today); }
  }, []);

  const theme = useMemo(() => song ? getEraTheme(song.period) : null, [song]);

  const loadNewSong = async (date: string) => {
    setLoading(true);
    try {
      const newSong = await generateDailySong(date);
      setSong(newSong);
      const initP = { listened: false, thoughts: '', rating: 0 };
      setProgress(initP);
      localStorage.setItem(`music-${newSong.date}`, JSON.stringify({ song: newSong, progress: initP }));
    } finally { setLoading(false); }
  };

  const handleSpeech = async (text: string) => {
    if (isSpeaking) return;
    setIsSpeaking(true);
    try {
      if (!audioContextRef.current) {
        audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
      }
      const ctx = audioContextRef.current;
      const base64 = await generateSpeech(text);
      const uint8 = decodeBase64ToUint8(base64);
      const buffer = await decodeAudioData(uint8, ctx);
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
        const blob = new Blob(chunksRef.current, { type: 'audio/wav' });
        const text = await transcribeAudio(blob);
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
    setProgress(newProgress);
    localStorage.setItem(`music-${song.date}`, JSON.stringify({ song, progress: newProgress }));
  };

  if (loading) return (
    <div className="flex flex-col items-center justify-center py-40 gap-8">
      <div className="relative w-20 h-20">
        <div className="absolute inset-0 border-4 border-slate-100 rounded-full"></div>
        <div className="absolute inset-0 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
      </div>
      <p className="text-slate-400 font-black text-[10px] uppercase tracking-[0.4em] animate-pulse">Designing Today's Masterpiece</p>
    </div>
  );

  if (!song || !theme) return null;

  return (
    <div className="max-w-6xl mx-auto px-6 space-y-16 animate-in fade-in duration-1000">
      {/* Immersive Header Card */}
      <div className="relative rounded-[3.5rem] overflow-hidden shadow-[0_48px_96px_-24px_rgba(0,0,0,0.15)] bg-white border border-slate-100">
        <div className={`absolute inset-0 bg-gradient-to-br ${theme.aura} opacity-95`}></div>
        <div className="absolute inset-0 opacity-[0.05] bg-[url('https://www.transparenttextures.com/patterns/stardust.png')]"></div>

        <div className="relative z-10 flex flex-col lg:flex-row min-h-[36rem]">
          <div className="flex-1 p-8 lg:p-14 flex flex-col justify-center">
            <div className="relative aspect-video rounded-[2.5rem] overflow-hidden shadow-2xl bg-black border-8 border-white/5 ring-1 ring-white/10 group">
              <iframe 
                className="w-full h-full" 
                src={`https://www.youtube.com/embed/${song.youtubeVideoId}?modestbranding=1&rel=0&showinfo=0`} 
                title="Performance" 
                allowFullScreen
              ></iframe>
            </div>
          </div>

          <div className="lg:w-[32rem] p-12 lg:p-20 flex flex-col justify-center text-white space-y-8">
            <div className="space-y-3">
              <div className="flex gap-2">
                <span className="px-4 py-1.5 rounded-full bg-white/10 backdrop-blur-md text-[9px] font-black uppercase tracking-[0.2em] border border-white/20">
                  {song.period}
                </span>
                <span className="px-4 py-1.5 rounded-full bg-white/10 backdrop-blur-md text-[9px] font-black uppercase tracking-[0.2em] border border-white/20">
                  {song.duration}
                </span>
              </div>
              <h2 className="serif text-5xl lg:text-7xl font-bold leading-[1.05] tracking-tight">
                {song.title}
              </h2>
              <p className="text-2xl font-light italic text-indigo-100/80 font-serif">— {song.composer}</p>
            </div>
            
            <div className="flex items-center gap-10 pt-6 border-t border-white/10">
              <div className="flex flex-col">
                <span className="text-[9px] font-black uppercase tracking-widest text-indigo-300/60 mb-1">Curated Series</span>
                <span className="text-sm font-bold opacity-90">Gabriel Palansc</span>
              </div>
              <div className="flex flex-col">
                <span className="text-[9px] font-black uppercase tracking-widest text-indigo-300/60 mb-1">Pedagogy</span>
                <span className="text-sm font-bold opacity-90">Fine Arts Edition</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="grid lg:grid-cols-12 gap-16">
        <div className="lg:col-span-7 space-y-16">
          <section className="space-y-10">
            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.4em]">Historical Immersion</h3>
                <div className="h-1 w-16 bg-indigo-600 rounded-full"></div>
              </div>
              <button 
                onClick={() => handleSpeech(song.historicalContext)}
                className={`flex items-center gap-2 px-6 py-3 rounded-2xl font-black text-[10px] uppercase tracking-widest transition-all ${isSpeaking ? 'bg-indigo-600 text-white shadow-xl' : 'bg-slate-100 text-slate-600 hover:bg-indigo-50 hover:text-indigo-600'}`}
              >
                {isSpeaking ? 'Speaking...' : 'Narration'}
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M15.536 8.464a5 5 0 010 7.072m2.828-9.9a9 9 0 010 12.728M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z"></path></svg>
              </button>
            </div>
            <p className="text-slate-800 text-2xl lg:text-3xl font-serif italic border-l-[10px] border-indigo-100/60 pl-12 leading-relaxed drop-shadow-sm">
              {song.historicalContext}
            </p>
          </section>

          <section className="grid sm:grid-cols-2 gap-10">
            <div className={`${theme.secondary} p-12 rounded-[3rem] border border-slate-100 shadow-sm transition-all hover:shadow-xl`}>
              <h4 className={`text-[10px] font-black uppercase tracking-[0.3em] mb-6 ${theme.primary}`}>Auditory Cartography</h4>
              <p className="text-slate-600 text-sm leading-relaxed font-medium">{song.musicalAnalysis}</p>
            </div>
            <div className="bg-amber-50 p-12 rounded-[3rem] border border-amber-100/50 shadow-sm transition-all hover:shadow-xl">
              <h4 className="text-[10px] font-black text-amber-800 uppercase tracking-[0.3em] mb-6">A Curiosity</h4>
              <p className="text-slate-700 text-sm font-bold italic leading-relaxed">"{song.funFact}"</p>
            </div>
          </section>
        </div>

        <div className="lg:col-span-5 relative">
          <div className="sticky top-32 space-y-8">
            <div className="bg-slate-900 rounded-[3.5rem] p-12 text-white shadow-2xl relative overflow-hidden">
              <div className="absolute -top-20 -right-20 w-64 h-64 bg-indigo-500/10 rounded-full blur-[80px]"></div>
              
              <div className="relative z-10 space-y-10">
                <div className="flex items-center justify-between">
                  <h3 className="font-black text-2xl tracking-tight">Musical Journal</h3>
                  <span className="text-[9px] font-black uppercase tracking-widest text-slate-500">{new Date(song.date).toLocaleDateString()}</span>
                </div>

                <div className="relative">
                  <textarea
                    value={progress.thoughts}
                    onChange={(e) => updateProgress({ thoughts: e.target.value })}
                    className="w-full h-80 p-8 rounded-[2.5rem] bg-white/5 border-none text-white placeholder-slate-600 resize-none font-medium leading-relaxed focus:ring-4 focus:ring-indigo-500/20 text-lg transition-all"
                    placeholder="Capture your reflection here..."
                  />
                  <button 
                    onMouseDown={startRecording}
                    onMouseUp={() => mediaRecorderRef.current?.stop()}
                    className={`absolute bottom-6 right-6 p-6 rounded-3xl shadow-2xl transition-all ${isRecording ? 'bg-red-500 animate-pulse scale-110' : 'bg-indigo-600 hover:bg-indigo-700 hover:scale-105 active:scale-95'}`}
                    title="Audio Journal"
                  >
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-20a3 3 0 013 3v10a3 3 0 01-3 3 3 3 0 01-3-3V5a3 3 0 013-3z"></path></svg>
                  </button>
                </div>

                <div className="flex items-center justify-center gap-6">
                  <div className="h-px bg-white/10 flex-1"></div>
                  <label className="flex items-center gap-4 cursor-pointer group">
                    <input 
                      type="checkbox" 
                      checked={progress.listened}
                      onChange={(e) => updateProgress({ listened: e.target.checked })}
                      className="w-7 h-7 rounded-xl text-indigo-500 border-white/10 bg-slate-800 focus:ring-indigo-500 transition-all cursor-pointer"
                    />
                    <span className={`text-[9px] font-black uppercase tracking-[0.3em] transition-colors ${progress.listened ? 'text-emerald-400' : 'text-slate-500 group-hover:text-white'}`}>
                      Listened
                    </span>
                  </label>
                  <div className="h-px bg-white/10 flex-1"></div>
                </div>
              </div>
            </div>
            
            <p className="text-center text-[9px] font-black text-slate-300 uppercase tracking-[0.5em] leading-relaxed">
              Curriculum series curated by Gabriel Palansc
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
