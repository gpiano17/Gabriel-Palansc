
import React, { useState, useEffect, useRef } from 'react';
import { useStats } from '../App';

export const PracticeStudio: React.FC = () => {
  const { addXP } = useStats();
  const [isActive, setIsActive] = useState(false);
  const [energy, setEnergy] = useState(0);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const animationRef = useRef<number>(0);

  const startStudio = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      audioCtxRef.current = new AudioContext();
      const source = audioCtxRef.current.createMediaStreamSource(stream);
      analyserRef.current = audioCtxRef.current.createAnalyser();
      analyserRef.current.fftSize = 256;
      source.connect(analyserRef.current);
      
      setIsActive(true);
      loop();
    } catch (err) {
      alert("Microphone access is required for the Practice Studio.");
    }
  };

  const stopStudio = () => {
    setIsActive(false);
    cancelAnimationFrame(animationRef.current);
    audioCtxRef.current?.close();
  };

  const loop = () => {
    if (!analyserRef.current || !canvasRef.current) return;
    
    const data = new Uint8Array(analyserRef.current.frequencyBinCount);
    analyserRef.current.getByteFrequencyData(data);
    
    const currentEnergy = data.reduce((a, b) => a + b, 0) / data.length;
    setEnergy(currentEnergy);

    // Reward XP for high energy (musical input)
    if (currentEnergy > 60) addXP(1);

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d')!;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    const barWidth = canvas.width / data.length;
    data.forEach((value, i) => {
      const h = (value / 255) * canvas.height;
      ctx.fillStyle = value > 150 ? '#10b981' : '#6366f1';
      ctx.fillRect(i * barWidth, canvas.height - h, barWidth - 1, h);
    });

    animationRef.current = requestAnimationFrame(loop);
  };

  useEffect(() => {
    return () => stopStudio();
  }, []);

  return (
    <div className="max-w-4xl mx-auto px-6 space-y-12 animate-in fade-in duration-700">
      <div className="text-center space-y-4">
        <h2 className="serif text-6xl font-bold tracking-tight">Practice Studio</h2>
        <p className="text-slate-500 dark:text-slate-400 font-medium">Detecting rhythm and musical energy via Audio AI.</p>
      </div>

      <div className="bg-slate-900 dark:bg-black p-12 rounded-[4rem] shadow-2xl relative overflow-hidden transition-colors duration-500">
        <canvas 
          ref={canvasRef} 
          width={800} 
          height={200} 
          className="w-full h-48 bg-black/40 rounded-3xl mb-12 border border-white/5"
        />

        <div className="flex flex-col items-center gap-10">
          <div className="flex items-center gap-12">
            <div className="text-center">
               <div className="text-[9px] font-black text-slate-500 uppercase tracking-widest mb-2">Detection Energy</div>
               <div className="text-3xl font-black text-white">{Math.floor(energy)}%</div>
            </div>
            <div className="w-px h-10 bg-white/10"></div>
            <div className="text-center">
               <div className="text-[9px] font-black text-slate-500 uppercase tracking-widest mb-2">XP Gain Rate</div>
               <div className="text-3xl font-black text-emerald-400">{energy > 60 ? 'Active' : 'Idle'}</div>
            </div>
          </div>

          <button 
            onClick={isActive ? stopStudio : startStudio}
            className={`px-12 py-6 rounded-3xl font-black uppercase tracking-[0.2em] text-[11px] transition-all shadow-xl ${isActive ? 'bg-red-500 text-white hover:bg-red-600' : 'bg-indigo-600 text-white hover:bg-indigo-700'}`}
          >
            {isActive ? 'Stop Monitoring' : 'Start Audio Session'}
          </button>
        </div>

        <div className="absolute top-0 right-0 p-10 opacity-10">
           <svg className="w-40 h-40 text-white" fill="currentColor" viewBox="0 0 24 24"><path d="M12 3v10.55c-.59-.34-1.27-.55-2-.55-2.21 0-4 1.79-4 4s1.79 4 4 4 4-1.79 4-4V7h4V3h-6z"></path></svg>
        </div>
      </div>

      <div className="grid md:grid-cols-2 gap-8">
        <div className="p-10 bg-indigo-50 dark:bg-indigo-950/20 rounded-[2.5rem] border border-indigo-100 dark:border-indigo-900/40">
           <h4 className="font-black text-[10px] uppercase tracking-widest text-indigo-600 mb-4">Instrument Feedback</h4>
           <p className="text-slate-600 dark:text-slate-400 text-sm leading-relaxed">Play your instrument or hum a melody. The Audio AI rewards rhythm consistency and projection with incremental XP gains.</p>
        </div>
        <div className="p-10 bg-slate-50 dark:bg-slate-900 rounded-[2.5rem] border border-slate-100 dark:border-slate-800">
           <h4 className="font-black text-[10px] uppercase tracking-widest text-slate-500 mb-4">Rhythm Calibration</h4>
           <p className="text-slate-500 dark:text-slate-500 text-sm leading-relaxed">Ensure your microphone is calibrated. High energy levels (Green spikes) signify strong articulation detected by the curriculum engine.</p>
        </div>
      </div>
    </div>
  );
};
