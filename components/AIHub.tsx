
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

  // Fixed toggleVoice to implement real-time PCM audio streaming and playback following SDK guidelines
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
          // Start capturing microphone audio
          navigator.mediaDevices.getUserMedia({ audio: true }).then(stream => {
            const inputCtx = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 16000 });
            const source = inputCtx.createMediaStreamSource(stream);
            const scriptProcessor = inputCtx.createScriptProcessor(4096, 1, 1);
            
            scriptProcessor.onaudioprocess = (e) => {
              const inputData = e.inputBuffer.getChannelData(0);
              const l = inputData.length;
              const int16 = new Int16Array(l);
              for (let i = 0; i < l; i++) int16[i] = inputData[i] * 32768;
              
              // Manual base64 encoding for raw PCM stream
              let binary = '';
              const bytes = new Uint8Array(int16.buffer);
              const len = bytes.byteLength;
              for (let i = 0; i < len; i++) binary += String.fromCharCode(bytes[i]);
              const b64 = btoa(binary);
              
              // Use sessionPromise to prevent race conditions during initialization
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
            // Decode raw PCM data using the world-class utility function
            const audioBuffer = await decodeAudioData(uint8, ctx);
            const source = ctx.createBufferSource();
            source.buffer = audioBuffer;
            source.connect(ctx.destination);
            
            // Precise scheduling for gapless playback
            source.start(nextStartTimeRef.current);
            nextStartTimeRef.current += audioBuffer.duration;
            sourcesRef.current.add(source);
            source.onended = () => sourcesRef.current.delete(source);
          }

          // Handle interruptions to clear audio queue
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
    <div className="max-w-6xl mx-auto p-4 space-y-8">
      <div className="flex bg-slate-100 p-2 rounded-2xl w-fit mx-auto shadow-inner">
        {(['chat', 'video', 'voice'] as const).map(tool => (
          <button key={tool} onClick={() => setActiveTool(tool)} className={`px-8 py-3 rounded-xl font-black uppercase tracking-widest text-[10px] transition-all ${activeTool === tool ? 'bg-white text-indigo-600 shadow-md' : 'text-slate-500 hover:text-slate-900'}`}>{tool}</button>
        ))}
      </div>

      <div className="bg-white rounded-[3rem] shadow-2xl overflow-hidden border border-slate-100 h-[600px] flex flex-col">
        {activeTool === 'chat' && (
          <>
            <div className="flex-1 overflow-y-auto p-10 space-y-6">
              {messages.map((m, i) => (
                <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                  <div className={`max-w-[80%] p-6 rounded-3xl ${m.role === 'user' ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-800'}`}>
                    <p className="text-sm font-medium leading-relaxed">{m.text}</p>
                  </div>
                </div>
              ))}
              {loading && <div className="text-slate-400 text-[10px] font-black uppercase tracking-widest animate-pulse">Gemini is processing...</div>}
            </div>
            <div className="p-8 border-t border-slate-100 bg-slate-50 space-y-4">
              <div className="flex gap-4">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="checkbox" checked={useThinking} onChange={e => {setUseThinking(e.target.checked); if(e.target.checked) setUseFast(false)}} />
                  <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Thinking Mode</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="checkbox" checked={useFast} onChange={e => {setUseFast(e.target.checked); if(e.target.checked) setUseThinking(false)}} />
                  <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Fast Lite</span>
                </label>
              </div>
              <div className="flex gap-4">
                <input value={input} onChange={e => setInput(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleChat()} placeholder="Ask Gemini about music theory, history, or anything else..." className="flex-1 p-5 rounded-2xl border-none focus:ring-4 focus:ring-indigo-100 shadow-inner" />
                <button onClick={handleChat} className="bg-indigo-600 text-white px-8 rounded-2xl shadow-xl hover:bg-indigo-700 transition-all font-black text-xs uppercase tracking-widest">Send</button>
              </div>
            </div>
          </>
        )}

        {activeTool === 'video' && (
          <div className="flex-1 flex flex-col items-center justify-center p-20 space-y-8 text-center">
            <div className="w-24 h-24 bg-indigo-50 rounded-[2rem] flex items-center justify-center text-indigo-600 shadow-inner">
              <svg className="w-12 h-12" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z"></path></svg>
            </div>
            <div>
              <h3 className="text-2xl font-bold mb-2">Musical Video Analysis</h3>
              <p className="text-slate-500 max-w-sm">Upload a concert or documentary for Gemini Pro to analyze key information.</p>
            </div>
            <input type="file" onChange={handleVideoUpload} className="block w-fit text-sm text-slate-500 file:mr-4 file:py-3 file:px-8 file:rounded-xl file:border-0 file:text-xs file:font-black file:uppercase file:bg-indigo-600 file:text-white hover:file:bg-indigo-700 cursor-pointer" />
            {loading && <p className="text-indigo-600 font-bold animate-pulse">Analyzing frames...</p>}
          </div>
        )}

        {activeTool === 'voice' && (
          <div className="flex-1 flex flex-col items-center justify-center space-y-12">
            <div className={`w-48 h-48 rounded-full border-4 flex items-center justify-center transition-all ${isVoiceActive ? 'border-emerald-500 bg-emerald-50 shadow-[0_0_50px_rgba(16,185,129,0.2)] scale-110' : 'border-indigo-100 bg-indigo-50'}`}>
               <button onClick={toggleVoice} className={`w-32 h-32 rounded-full flex items-center justify-center transition-all ${isVoiceActive ? 'bg-emerald-500 text-white animate-pulse' : 'bg-indigo-600 text-white hover:bg-indigo-700 shadow-xl'}`}>
                {isVoiceActive ? <svg className="w-12 h-12" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M9 10a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1h-4a1 1 0 01-1-1v-4z"></path></svg> : <svg className="w-12 h-12" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-20a3 3 0 013 3v10a3 3 0 01-3 3 3 3 0 01-3-3V5a3 3 0 013-3z"></path></svg>}
               </button>
            </div>
            <div className="text-center">
              <h3 className="text-2xl font-bold">{isVoiceActive ? 'Listening...' : 'Live Native Voice'}</h3>
              <p className="text-slate-500 mt-2">Speak naturally with Gemini 2.5 Native Audio.</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
