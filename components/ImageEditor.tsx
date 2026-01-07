
import React, { useState, useRef } from 'react';
import { editImageWithPrompt, generateVeoVideo } from '../services/geminiService';

export const ImageEditor: React.FC = () => {
  const [image, setImage] = useState<string | null>(null);
  const [editedImage, setEditedImage] = useState<string | null>(null);
  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  const [prompt, setPrompt] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [isAnimating, setIsAnimating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleEdit = async () => {
    if (!image || !prompt) return;
    setIsProcessing(true);
    setError(null);
    try {
      const result = await editImageWithPrompt(image, prompt);
      setEditedImage(result);
    } catch (err) {
      setError("AI was unable to refine this masterpiece. Please check your command.");
    } finally { setIsProcessing(false); }
  };

  const handleAnimate = async () => {
    const targetImage = editedImage || image;
    if (!targetImage) return;
    setError(null);
    
    if (!(window as any).aistudio?.hasSelectedApiKey()) {
      await (window as any).aistudio?.openSelectKey();
    }

    setIsAnimating(true);
    try {
      const url = await generateVeoVideo(targetImage, prompt || "Create a cinematic animation of this scene");
      setVideoUrl(url);
    } catch (err: any) {
      console.error(err);
      if (err.message?.includes("Requested entity was not found")) {
        setError("API key verification failed. Please re-select your paid API key.");
        await (window as any).aistudio?.openSelectKey();
      } else {
        setError("Animation failed. Ensure you have a paid GCP project linked.");
      }
    } finally { setIsAnimating(false); }
  };

  return (
    <div className="max-w-7xl mx-auto px-6 space-y-16 animate-in fade-in duration-1000">
      <div className="flex flex-col md:flex-row justify-between items-end gap-6 border-b border-slate-100 dark:border-slate-800 pb-12 transition-colors">
        <div className="space-y-3">
          <h2 className="serif text-6xl font-bold text-slate-900 dark:text-white tracking-tight">Studio</h2>
          <p className="text-slate-500 dark:text-slate-400 text-lg font-medium">Refine with Nano Banana • Animate with Veo 3.1</p>
        </div>
        <a href="https://ai.google.dev/gemini-api/docs/billing" target="_blank" rel="noreferrer" className="text-[9px] font-black uppercase tracking-[0.2em] text-indigo-400 dark:text-indigo-400 hover:text-indigo-600 dark:hover:text-indigo-300 transition-colors">
          Billing Documentation & Keys →
        </a>
      </div>

      {error && (
        <div className="p-6 bg-red-50 dark:bg-red-950/20 border border-red-100 dark:border-red-900/50 rounded-[2rem] text-red-600 dark:text-red-400 text-sm font-bold flex items-center gap-4 animate-in slide-in-from-top-4">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
          {error}
        </div>
      )}

      <div className="grid lg:grid-cols-3 gap-10">
        <div className="space-y-6">
          <div onClick={() => fileInputRef.current?.click()} className="aspect-square rounded-[3.5rem] border-2 border-dashed border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 flex flex-col items-center justify-center cursor-pointer overflow-hidden group hover:border-indigo-300 dark:hover:border-indigo-500 hover:bg-indigo-50/20 dark:hover:bg-indigo-900/10 transition-all shadow-sm">
            {image ? (
              <img src={image} className="w-full h-full object-cover" alt="Input" />
            ) : (
              <div className="text-center space-y-4">
                <div className="w-16 h-16 bg-slate-50 dark:bg-slate-800 rounded-3xl mx-auto flex items-center justify-center group-hover:bg-white dark:group-hover:bg-slate-700 group-hover:scale-110 transition-all">
                   <svg className="w-8 h-8 text-slate-300 dark:text-slate-600 group-hover:text-indigo-600 dark:group-hover:text-indigo-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"></path></svg>
                </div>
                <p className="text-slate-400 dark:text-slate-600 font-black uppercase tracking-[0.2em] text-[10px]">Upload Canvas</p>
              </div>
            )}
            <input type="file" ref={fileInputRef} onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) {
                const r = new FileReader();
                r.onload = () => { setImage(r.result as string); setEditedImage(null); setVideoUrl(null); };
                r.readAsDataURL(file);
              }
            }} className="hidden" accept="image/*" />
          </div>
          <p className="text-center text-[10px] font-black text-slate-300 dark:text-slate-600 uppercase tracking-widest">Masterpiece Input</p>
        </div>

        <div className="space-y-6">
          <div className="aspect-square rounded-[3.5rem] bg-white dark:bg-slate-900 flex items-center justify-center overflow-hidden relative border border-slate-100 dark:border-slate-800 shadow-sm transition-colors">
            {editedImage ? <img src={editedImage} className="w-full h-full object-cover" alt="Edited" /> : (
              <div className="text-center opacity-20 dark:opacity-30 dark:text-white">
                <p className="font-serif italic text-2xl">Nano Banana Preview</p>
              </div>
            )}
            {isProcessing && (
              <div className="absolute inset-0 bg-white/90 dark:bg-slate-950/90 backdrop-blur-md flex flex-col items-center justify-center gap-4">
                <div className="w-12 h-12 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
                <p className="text-indigo-600 dark:text-indigo-400 font-black text-[9px] uppercase tracking-widest">Reimagining...</p>
              </div>
            )}
          </div>
          <p className="text-center text-[10px] font-black text-slate-300 dark:text-slate-600 uppercase tracking-widest">AI Stylization</p>
        </div>

        <div className="space-y-6">
          <div className="aspect-square rounded-[3.5rem] bg-slate-900 dark:bg-slate-950 flex items-center justify-center overflow-hidden relative shadow-2xl transition-colors">
            {videoUrl ? (
              <video src={videoUrl} controls className="w-full h-full object-cover" autoPlay loop muted />
            ) : (
              <div className="text-center opacity-30 text-white">
                <p className="font-serif italic text-2xl">Veo 3.1 Cinema</p>
              </div>
            )}
            {isAnimating && (
              <div className="absolute inset-0 bg-slate-950/95 dark:bg-black/95 backdrop-blur-xl flex flex-col items-center justify-center p-12 text-center">
                <div className="w-16 h-16 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin mb-8"></div>
                <p className="text-emerald-400 font-black text-[10px] uppercase tracking-[0.4em] animate-pulse">Veo is Dreaming</p>
                <p className="text-slate-500 dark:text-slate-400 text-xs mt-6 leading-relaxed max-w-xs mx-auto">High-fidelity video synthesis in progress. This typically takes 30-90 seconds.</p>
              </div>
            )}
          </div>
          <p className="text-center text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest">Cinematic Animation</p>
        </div>
      </div>

      <div className="bg-white dark:bg-slate-900 p-12 lg:p-16 rounded-[4rem] shadow-[0_48px_96px_-24px_rgba(0,0,0,0.12)] border border-slate-100 dark:border-slate-800 space-y-10 transition-all duration-500">
        <div className="space-y-4">
          <label className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-[0.3em] ml-4">Artistic Command</label>
          <input 
            type="text" value={prompt} onChange={(e) => setPrompt(e.target.value)}
            placeholder='e.g., "Add a warm Impressionist sunset", "Animate the composer conducting enthusiastically"'
            className="w-full p-8 rounded-[2rem] bg-slate-50 dark:bg-slate-800 border-none text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-600 focus:ring-8 focus:ring-indigo-100/50 dark:focus:ring-indigo-900/20 text-xl font-medium transition-all"
          />
        </div>
        <div className="grid sm:grid-cols-2 gap-6">
          <button onClick={handleEdit} disabled={!image || isProcessing} className="px-10 py-6 bg-indigo-600 text-white font-black uppercase tracking-[0.3em] text-[11px] rounded-[1.5rem] shadow-xl hover:bg-indigo-700 hover:-translate-y-1 disabled:opacity-50 transition-all">
            Stylize Canvas
          </button>
          <button onClick={handleAnimate} disabled={!image || isAnimating} className="px-10 py-6 bg-emerald-600 text-white font-black uppercase tracking-[0.3em] text-[11px] rounded-[1.5rem] shadow-xl hover:bg-emerald-700 hover:-translate-y-1 disabled:opacity-50 transition-all">
            Generate Video (Veo)
          </button>
        </div>
      </div>
    </div>
  );
};
