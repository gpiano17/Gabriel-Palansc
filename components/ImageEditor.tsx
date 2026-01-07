
import React, { useState, useRef } from 'react';
import { editImageWithPrompt, generateVeoVideo } from '../services/geminiService';

export const ImageEditor: React.FC = () => {
  const [image, setImage] = useState<string | null>(null);
  const [editedImage, setEditedImage] = useState<string | null>(null);
  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  const [prompt, setPrompt] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [isAnimating, setIsAnimating] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleEdit = async () => {
    if (!image || !prompt) return;
    setIsProcessing(true);
    try {
      const result = await editImageWithPrompt(image, prompt);
      setEditedImage(result);
    } finally { setIsProcessing(false); }
  };

  const handleAnimate = async () => {
    const targetImage = editedImage || image;
    if (!targetImage) return;
    
    // Veo safety check
    if (!(window as any).aistudio?.hasSelectedApiKey()) {
      await (window as any).aistudio?.openSelectKey();
    }

    setIsAnimating(true);
    try {
      const url = await generateVeoVideo(targetImage, prompt || "Animate this scene naturally");
      setVideoUrl(url);
    } catch (err) {
      console.error(err);
      alert("Video generation failed. Ensure you have selected a valid paid API key.");
    } finally { setIsAnimating(false); }
  };

  return (
    <div className="max-w-6xl mx-auto p-4 space-y-12">
      <div className="text-center space-y-2">
        <h2 className="serif text-5xl font-bold text-slate-900">Studio & Animation</h2>
        <p className="text-slate-500">Edit masterpieces with Nano Banana and animate them with Veo 3.1.</p>
      </div>

      <div className="grid lg:grid-cols-3 gap-8">
        <div className="space-y-4">
          <div onClick={() => fileInputRef.current?.click()} className="aspect-square rounded-[2rem] border-2 border-dashed border-slate-200 bg-white flex items-center justify-center cursor-pointer overflow-hidden group">
            {image ? <img src={image} className="w-full h-full object-cover" /> : <p className="text-slate-400 font-bold uppercase tracking-widest text-xs group-hover:text-indigo-600 transition-colors">Upload Canvas</p>}
            <input type="file" ref={fileInputRef} onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) {
                const r = new FileReader();
                r.onload = () => { setImage(r.result as string); setEditedImage(null); setVideoUrl(null); };
                r.readAsDataURL(file);
              }
            }} className="hidden" accept="image/*" />
          </div>
          <p className="text-center text-[10px] font-black text-slate-400 uppercase tracking-widest">Input</p>
        </div>

        <div className="space-y-4">
          <div className="aspect-square rounded-[2rem] border-2 border-slate-100 bg-white flex items-center justify-center overflow-hidden relative">
            {editedImage ? <img src={editedImage} className="w-full h-full object-cover" /> : <p className="text-slate-300">AI Preview</p>}
            {isProcessing && <div className="absolute inset-0 bg-white/80 backdrop-blur-sm flex items-center justify-center"><div className="animate-spin h-8 w-8 border-4 border-indigo-600 border-t-transparent rounded-full"></div></div>}
          </div>
          <p className="text-center text-[10px] font-black text-slate-400 uppercase tracking-widest">Edited (Nano Banana)</p>
        </div>

        <div className="space-y-4">
          <div className="aspect-square rounded-[2rem] border-2 border-slate-100 bg-slate-900 flex items-center justify-center overflow-hidden relative">
            {videoUrl ? (
              <video src={videoUrl} controls className="w-full h-full object-cover" autoPlay loop muted />
            ) : (
              <p className="text-slate-700">Animation Hub</p>
            )}
            {isAnimating && (
              <div className="absolute inset-0 bg-slate-900/90 backdrop-blur-md flex flex-col items-center justify-center p-8 text-center">
                <div className="animate-spin h-10 w-10 border-4 border-emerald-500 border-t-transparent rounded-full mb-4"></div>
                <p className="text-emerald-400 font-bold animate-pulse">Veo is dreaming your animation...</p>
                <p className="text-slate-500 text-xs mt-2">This usually takes about a minute.</p>
              </div>
            )}
          </div>
          <p className="text-center text-[10px] font-black text-slate-400 uppercase tracking-widest">Animated (Veo 3.1)</p>
        </div>
      </div>

      <div className="bg-white p-10 rounded-[3rem] shadow-xl border border-slate-100 space-y-8">
        <div className="space-y-4">
          <label className="text-xs font-black text-slate-400 uppercase tracking-widest ml-2">Direct AI Commands</label>
          <input 
            type="text" value={prompt} onChange={(e) => setPrompt(e.target.value)}
            placeholder='e.g., "Add a golden Baroque filter", "Make the composer dance"'
            className="w-full p-6 rounded-2xl bg-slate-50 border-none focus:ring-4 focus:ring-indigo-500/10 text-lg font-medium"
          />
        </div>
        <div className="flex flex-wrap gap-4">
          <button onClick={handleEdit} disabled={!image || isProcessing} className="flex-1 px-8 py-5 bg-indigo-600 text-white font-black uppercase tracking-widest text-xs rounded-2xl shadow-xl hover:bg-indigo-700 disabled:opacity-50 transition-all">
            Update Masterpiece
          </button>
          <button onClick={handleAnimate} disabled={!image || isAnimating} className="flex-1 px-8 py-5 bg-emerald-600 text-white font-black uppercase tracking-widest text-xs rounded-2xl shadow-xl hover:bg-emerald-700 disabled:opacity-50 transition-all">
            Animate Scene (Veo)
          </button>
        </div>
      </div>
    </div>
  );
};
