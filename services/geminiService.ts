
import { GoogleGenAI, Type, Modality } from "@google/genai";
import { SongRecommendation } from "../types";

const getAI = () => new GoogleGenAI({ apiKey: process.env.API_KEY });

export const generateDailySong = async (date: string): Promise<SongRecommendation> => {
  const ai = getAI();
  const prompt = `You are a world-class musicologist and educator. Generate a high-quality music recommendation for a student for: ${date}.
  
  TARGET AUDIENCE: Teens and Adults.
  LANGUAGE STYLE: Sophisticated, captivating, and elaborate, yet accessible. Avoid dry academic jargon; instead, use evocative storytelling. 
  
  CRITERIA:
  - Alternate between Classical (Baroque, Romantic, Impressionist, Minimalist) and Influential Popular (Jazz, Delta Blues, 70s Art Rock, 90s Trip Hop, etc.).
  - Duration: 2-6 minutes.
  - Historical Context: A deep, immersive narrative about the era's social climate and the composer's personal journey.
  - Musical Analysis: An evocative guide on what to listen for—texture, emotional arc, and instrumental nuances.
  - Fun Fact: A surprising, humanizing detail that brings the history to life.
  
  Return in strict JSON format. Use a high-quality YouTube Video ID.`;

  const response = await ai.models.generateContent({
    model: 'gemini-3-flash-preview',
    contents: prompt,
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          title: { type: Type.STRING },
          composer: { type: Type.STRING },
          period: { type: Type.STRING },
          duration: { type: Type.STRING },
          historicalContext: { type: Type.STRING },
          musicalAnalysis: { type: Type.STRING },
          funFact: { type: Type.STRING },
          youtubeVideoId: { type: Type.STRING },
          isPopular: { type: Type.BOOLEAN }
        },
        required: ["title", "composer", "period", "duration", "historicalContext", "musicalAnalysis", "funFact", "youtubeVideoId", "isPopular"]
      }
    }
  });

  return { ...JSON.parse(response.text || "{}"), id: `song-${date}`, date };
};

export const transcribeAudio = async (audioBlob: Blob): Promise<string> => {
  const ai = getAI();
  const reader = new FileReader();
  const base64Promise = new Promise<string>((resolve) => {
    reader.onload = () => resolve((reader.result as string).split(',')[1]);
    reader.readAsDataURL(audioBlob);
  });
  const base64 = await base64Promise;

  const response = await ai.models.generateContent({
    model: 'gemini-3-flash-preview',
    contents: [
      { inlineData: { mimeType: 'audio/wav', data: base64 } },
      { text: "Transcribe this audio. Just return the text of the reflection." }
    ]
  });
  return response.text || "";
};

export const generateSpeech = async (text: string): Promise<string> => {
  const ai = getAI();
  const response = await ai.models.generateContent({
    model: "gemini-2.5-flash-preview-tts",
    contents: [{ parts: [{ text }] }],
    config: {
      responseModalities: [Modality.AUDIO],
      speechConfig: { voiceConfig: { prebuiltVoiceConfig: { voiceName: 'Kore' } } }
    },
  });
  return response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data || "";
};

// Fix for AIHub.tsx: Implemented getChatResponse with thinking support
export const getChatResponse = async (history: string[], useThinking: boolean): Promise<string> => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  const prompt = history[history.length - 1];
  const response = await ai.models.generateContent({
    model: 'gemini-3-pro-preview',
    contents: prompt,
    config: useThinking ? { thinkingConfig: { thinkingBudget: 32768 } } : {}
  });
  return response.text || "";
};

// Fix for AIHub.tsx: Implemented getFastResponse using the lite model
export const getFastResponse = async (prompt: string): Promise<string> => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  const response = await ai.models.generateContent({
    model: 'gemini-flash-lite-latest',
    contents: prompt,
  });
  return response.text || "";
};

// Fix for AIHub.tsx: Implemented analyzeVideo for multimodal content
export const analyzeVideo = async (videoFile: File): Promise<string> => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  const base64Promise = new Promise<string>((resolve) => {
    const reader = new FileReader();
    reader.onload = () => resolve((reader.result as string).split(',')[1]);
    reader.readAsDataURL(videoFile);
  });
  const base64 = await base64Promise;

  const response = await ai.models.generateContent({
    model: 'gemini-3-flash-preview',
    contents: [
      { inlineData: { mimeType: videoFile.type, data: base64 } },
      { text: "Analyze this video and provide a summary of its musical content." }
    ]
  });
  return response.text || "";
};

// Fix for ImageEditor.tsx: Implemented editImageWithPrompt using gemini-2.5-flash-image
export const editImageWithPrompt = async (base64Image: string, prompt: string): Promise<string> => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  const imageData = base64Image.split(',')[1] || base64Image;
  const response = await ai.models.generateContent({
    model: 'gemini-2.5-flash-image',
    contents: {
      parts: [
        { inlineData: { data: imageData, mimeType: 'image/png' } },
        { text: prompt },
      ],
    },
  });
  for (const part of response.candidates?.[0]?.content?.parts || []) {
    if (part.inlineData) {
      return `data:image/png;base64,${part.inlineData.data}`;
    }
  }
  return "";
};

// Fix for ImageEditor.tsx: Implemented generateVeoVideo for high-quality animations
export const generateVeoVideo = async (base64Image: string, prompt: string): Promise<string> => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  const imageData = base64Image.split(',')[1] || base64Image;
  let operation = await ai.models.generateVideos({
    model: 'veo-3.1-fast-generate-preview',
    prompt: prompt,
    image: {
      imageBytes: imageData,
      mimeType: 'image/png',
    },
    config: {
      numberOfVideos: 1,
      resolution: '720p',
      aspectRatio: '1:1'
    }
  });
  while (!operation.done) {
    await new Promise(resolve => setTimeout(resolve, 10000));
    operation = await ai.operations.getVideosOperation({ operation: operation });
  }
  const downloadLink = operation.response?.generatedVideos?.[0]?.video?.uri;
  return `${downloadLink}&key=${process.env.API_KEY}`;
};

export function decodeBase64ToUint8(base64: string) {
  const binaryString = atob(base64);
  const bytes = new Uint8Array(binaryString.length);
  for (let i = 0; i < binaryString.length; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes;
}

export async function decodeAudioData(
  data: Uint8Array,
  ctx: AudioContext,
  sampleRate: number = 24000,
  numChannels: number = 1
): Promise<AudioBuffer> {
  const dataInt16 = new Int16Array(data.buffer);
  const frameCount = dataInt16.length / numChannels;
  const buffer = ctx.createBuffer(numChannels, frameCount, sampleRate);

  for (let channel = 0; channel < numChannels; channel++) {
    const channelData = buffer.getChannelData(channel);
    for (let i = 0; i < frameCount; i++) {
      channelData[i] = dataInt16[i * numChannels + channel] / 32768.0;
    }
  }
  return buffer;
}
