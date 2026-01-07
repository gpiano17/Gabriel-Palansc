
import React, { useState, useRef, useEffect } from 'react';
import { getChatResponse, getFastResponse, analyzeVideo, decodeBase64ToUint8, decodeAudioData } from '../services/geminiService';
import { GoogleGenAI, Modality, LiveServerMessage } from '@google/genai';

export const AIHub: React.FC = () => {
  const [activeTool, setActiveTool] = useState<'chat' | 'video' | 'voice'>('chat');
  const [messages, setMessages] = useState<{ role: 'user' | 'model', text: string }[]>([]);
  const [input, setInput] = useState('');
  const [useThinking, setUseThinking] = useState(false);
  const [useFast, setUseFast] = useState(false);
  const [loading, setLoading] = useState(false);
  
  const [isVoiceActive, setIsVoiceActive] = useState(false);
  const voiceSessionRef = useRef<any>(null);
  const nextStartTimeRef = useRef<number>(0);
  const outputAudioContextRef = useRef<AudioContext | null>(null);
  const sourcesRef = useRef<Set<AudioBufferSourceNode>>(new Set());

  const handleChat = async () => {
    if (!input.trim()) return;
    const userMsg = input;
    setMessages(prev => [...prev, { role: 'user', text: userMsg }]);
    setInput('');
    setLoading(true);

    try {
      let response = "";
      if (useFast) {
        response = await getFastResponse(userMsg);
      } else {
        response = await getChatResponse([...messages.map(m => m.text), userMsg], useThinking);
      }
      setMessages(prev => [...prev, { role: 'model', text: response }]);
    } finally { setLoading(false); }
  };

  const handleVideoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setLoading(true);
    try {
      const summary = await analyzeVideo(file);
      setMessages(prev => [...prev, { role: 'model', text: `Video Analysis: ${summary}` }]);
    } finally { setLoading(false); }
  };

  const toggleVoice = async () => {
    if (isVoiceActive) {
      voiceSessionRef.current?.then((session: any) => session.close());
      setIsVoiceActive(false);
      return;
    }

    if (!outputAudioContextRef.current) {
      outputAudioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });
    }
    const ctx = outputAudioContextRef.current;

    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    const sessionPromise = ai.live.connect({
      model: 'gemini-2.5-flash-native-audio-preview-12-2025',
      callbacks: {
        onopen: () => {
          setIsVoiceActive(true);
          navigator.mediaDevices.getUserMedia({ audio: true }).then(stream => {
            const inputCtx = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 16000 });
            const source = inputCtx.createMediaStreamSource(stream);
            const scriptProcessor = inputCtx.createScriptProcessor(4096, 1, 1);
            
            scriptProcessor.onaudioprocess = (e) => {
              const inputData = e.inputBuffer.getChannelData(0);
              const l = inputData.length;
              const int16 = new Int16Array(l);
              for (let i = 0; i < l; i++) int16[i] = inputData[i] * 32768;
              
              let binary = '';
              const bytes = new Uint8Array(int16.buffer);
              const len = bytes.byteLength;
              for (let i = 0; i < len; i++) binary += String.fromCharCode(bytes[i]);
              const b64 = btoa(binary);
              
              sessionPromise.then(session => {
                session.sendRealtimeInput({
                  media: { data: b64, mimeType: 'audio/pcm;rate=16000' }
                });
              });
            };
            source.connect(scriptProcessor);
            scriptProcessor.connect(inputCtx.destination);
          });
        },
        onmessage: async (message: LiveServerMessage) => {
          const base64Audio = message.serverContent?.modelTurn?.parts[0]?.inlineData?.data;
          if (base64Audio) {
            nextStartTimeRef.current = Math.max(nextStartTimeRef.current, ctx.currentTime);
            const uint8 = decodeBase64ToUint8(base64Audio);
            const audioBuffer = await decodeAudioData(uint8, ctx);
            const source = ctx.createBufferSource();
            source.buffer = audioBuffer;
            source.connect(ctx.destination);
            
            source.start(nextStartTimeRef.current);
            nextStartTimeRef.current += audioBuffer.duration;
            sourcesRef.current.add(source);
            source.onended = () => sourcesRef.current.delete(source);
          }

          if (message.serverContent?.interrupted) {
            sourcesRef.current.forEach(s => s.stop());
            sourcesRef.current.clear();
            nextStartTimeRef.current = 0;
          }
        },
        onerror: () => setIsVoiceActive(false),
        onclose: () => setIsVoiceActive(false),
      },
      config: { 
        responseModalities: [Modality.AUDIO], 
        systemInstruction: "You are a musical AI tutor. Keep responses concise and melodic." 
      }
    });
    voiceSessionRef.current = sessionPromise;
  };

  return (
    <div className="max-w-6xl mx-auto p-4 space-y-8 animate-in fade-in duration-700">
      <div className="flex bg-slate-100 dark:bg-slate-800 p-2 rounded-2xl w-fit mx-auto shadow-inner transition-colors duration-500">
        {(['chat', 'video', 'voice'] as const).map(tool => (
          <button 
            key={tool} 
            onClick={() => setActiveTool(tool)} 
            className={`px-8 py-3 rounded-xl font-black uppercase tracking-widest text-[10px] transition-all ${activeTool === tool ? 'bg-white dark:bg-slate-700 text-indigo-600 dark:text-white shadow-md' : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'}`}
          >
            {tool}
          </button>
        ))}
      </div>

      <div className="bg-white dark:bg-slate-900 rounded-[3rem] shadow-2xl overflow-hidden border border-slate-100 dark:border-slate-800 h-[650px] flex flex-col transition-colors duration-500">
        {activeTool === 'chat' && (
          <>
            <div className="flex-1 overflow-y-auto p-10 space-y-6">
              {messages.length === 0 && (
                <div className="h-full flex flex-col items-center justify-center text-center space-y-4 opacity-30">
                   <div className="w-20 h-20 bg-indigo-50 dark:bg-indigo-900/20 rounded-full flex items-center justify-center text-indigo-600 dark:text-indigo-400">
                      <svg className="w-10 h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z"></path></svg>
                   </div>
                   <p className="font-serif italic text-xl dark:text-white">The digital composer is ready...</p>
                </div>
              )}
              {messages.map((m, i) => (
                <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                  <div className={`max-w-[80%] p-6 rounded-3xl ${m.role === 'user' ? 'bg-indigo-600 text-white shadow-lg' : 'bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200 shadow-sm'}`}>
                    <p className="text-sm font-medium leading-relaxed">{m.text}</p>
                  </div>
                </div>
              ))}
              {loading && <div className="text-slate-400 dark:text-slate-500 text-[10px] font-black uppercase tracking-widest animate-pulse pl-4">Gemini is processing...</div>}
            </div>
            <div className="p-8 border-t border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/50 space-y-4 transition-colors">
              <div className="flex gap-6 pl-2">
                <label className="flex items-center gap-3 cursor-pointer group">
                  <input type="checkbox" checked={useThinking} onChange={e => {setUseThinking(e.target.checked); if(e.target.checked) setUseFast(false)}} className="w-4 h-4 rounded text-indigo-600 border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 focus:ring-indigo-500" />
                  <span className="text-[10px] font-black uppercase tracking-widest text-slate-400 dark:text-slate-500 group-hover:text-indigo-600 dark:group-hover:text-indigo-400">Thinking Mode</span>
                </label>
                <label className="flex items-center gap-3 cursor-pointer group">
                  <input type="checkbox" checked={useFast} onChange={e => {setUseFast(e.target.checked); if(e.target.checked) setUseThinking(false)}} className="w-4 h-4 rounded text-indigo-600 border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 focus:ring-indigo-500" />
                  <span className="text-[10px] font-black uppercase tracking-widest text-slate-400 dark:text-slate-500 group-hover:text-indigo-600 dark:group-hover:text-indigo-400">Fast Lite</span>
                </label>
              </div>
              <div className="flex gap-4">
                <input 
                  value={input} 
                  onChange={e => setInput(e.target.value)} 
                  onKeyDown={e => e.key === 'Enter' && handleChat()} 
                  placeholder="Ask Gemini about music theory, history, or anything else..." 
                  className="flex-1 p-5 rounded-2xl bg-white dark:bg-slate-800 border-none text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 focus:ring-4 focus:ring-indigo-100 dark:focus:ring-indigo-900/30 shadow-inner" 
                />
                <button onClick={handleChat} className="bg-indigo-600 text-white px-10 rounded-2xl shadow-xl hover:bg-indigo-700 transition-all font-black text-xs uppercase tracking-widest">Send</button>
              </div>
            </div>
          </>
        )}

        {activeTool === 'video' && (
          <div className="flex-1 flex flex-col items-center justify-center p-20 space-y-8 text-center bg-slate-50/30 dark:bg-slate-950/20">
            <div className="w-24 h-24 bg-indigo-50 dark:bg-indigo-900/20 rounded-[2.5rem] flex items-center justify-center text-indigo-600 dark:text-indigo-400 shadow-inner">
              <svg className="w-12 h-12" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z"></path></svg>
            </div>
            <div className="space-y-3">
              <h3 className="text-3xl font-bold dark:text-white">Musical Video Analysis</h3>
              <p className="text-slate-500 dark:text-slate-400 max-w-sm mx-auto">Upload a performance for Gemini Pro to analyze harmonic shifts and technique.</p>
            </div>
            <input 
              type="file" 
              onChange={handleVideoUpload} 
              className="block w-fit mx-auto text-sm text-slate-500 file:mr-4 file:py-4 file:px-10 file:rounded-xl file:border-0 file:text-xs file:font-black file:uppercase file:bg-indigo-600 file:text-white hover:file:bg-indigo-700 cursor-pointer shadow-lg" 
            />
            {loading && (
              <div className="flex items-center gap-3 text-indigo-600 dark:text-indigo-400 font-bold animate-pulse">
                <div className="w-2 h-2 rounded-full bg-current"></div>
                Analyzing performance frames...
              </div>
            )}
          </div>
        )}

        {activeTool === 'voice' && (
          <div className="flex-1 flex flex-col items-center justify-center space-y-12 bg-slate-50/30 dark:bg-slate-950/20">
            <div className={`w-56 h-56 rounded-full border-4 flex items-center justify-center transition-all duration-700 ${isVoiceActive ? 'border-emerald-500 bg-emerald-50 dark:bg-emerald-950/20 shadow-[0_0_80px_rgba(16,185,129,0.2)] scale-110' : 'border-indigo-100 dark:border-slate-800 bg-indigo-50 dark:bg-slate-800/40'}`}>
               <button onClick={toggleVoice} className={`w-36 h-36 rounded-full flex items-center justify-center transition-all ${isVoiceActive ? 'bg-emerald-500 text-white animate-pulse' : 'bg-indigo-600 text-white hover:bg-indigo-700 shadow-xl scale-100 hover:scale-105 active:scale-95'}`}>
                {isVoiceActive ? <svg className="w-14 h-14" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M9 10a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1h-4a1 1 0 01-1-1v-4z"></path></svg> : <svg className="w-14 h-14" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-20a3 3 0 013 3v10a3 3 0 01-3 3 3 3 0 01-3-3V5a3 3 0 013-3z"></path></svg>}
               </button>
            </div>
            <div className="text-center space-y-2">
              <h3 className="text-3xl font-bold dark:text-white">{isVoiceActive ? 'Listening...' : 'Live Native Voice'}</h3>
              <p className="text-slate-500 dark:text-slate-400">Speak naturally with Gemini 2.5 Native Audio.</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
