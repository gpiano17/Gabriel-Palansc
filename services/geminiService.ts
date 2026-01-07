
import { GoogleGenAI, Type, Modality } from "@google/genai";
import { SongRecommendation } from "../types";

const getAI = () => new GoogleGenAI({ apiKey: process.env.API_KEY });

const extractJson = (text: string) => {
  try {
    const cleaned = text.replace(/```json/g, '').replace(/```/g, '').trim();
    return JSON.parse(cleaned);
  } catch (e) {
    const firstBrace = text.indexOf('{');
    const lastBrace = text.lastIndexOf('}');
    if (firstBrace !== -1 && lastBrace !== -1) {
      try {
        return JSON.parse(text.substring(firstBrace, lastBrace + 1));
      } catch (innerE) {
        console.error("JSON extraction failed", innerE);
      }
    }
    throw new Error("Invalid AI Response. The archives are reorganizing—please try again.");
  }
};

export const generateDailySong = async (date: string): Promise<SongRecommendation & { sources?: any[] }> => {
  const ai = getAI();
  
  const prompt = `URGENT RESEARCH TASK:
  Find a VALID, OFFICIAL, and EMBEDDABLE YouTube video for a music masterpiece for: ${date}.
  
  SEARCH PROTOCOL:
  1. Search for "[Song Name] [Artist] Official Video YouTube".
  2. Verify the video is not "Private" or "Age Restricted".
  3. Ensure the ID is a valid 11-character string.
  
  CURRICULUM RULES:
  - Alternate between Classical (Renaissance to Contemporary) and Popular (Jazz, Rock, Soul, Avant-Garde).
  - Duration MUST be between 2-6 minutes.
  
  OUTPUT JSON:
  {
    "title": "Masterpiece Title",
    "composer": "Artist or Composer Name",
    "period": "Era/Year",
    "duration": "MM:SS",
    "historicalContext": "A 250-word deep dive into why this matters.",
    "musicalAnalysis": "A 150-word guide on the structure and texture.",
    "funFact": "A humanizing or surprising detail.",
    "youtubeVideoId": "VERIFIED_11_CHAR_ID",
    "isPopular": boolean
  }`;

  const response = await ai.models.generateContent({
    model: 'gemini-3-pro-preview',
    contents: prompt,
    config: {
      tools: [{ googleSearch: {} }],
    }
  });

  const data = extractJson(response.text || "{}");
  const sources = response.candidates?.[0]?.groundingMetadata?.groundingChunks || [];
  
  return { 
    ...data, 
    id: `song-${date}`, 
    date,
    sources 
  };
};

export const getChatResponse = async (history: string[], useThinking: boolean): Promise<string> => {
  const ai = getAI();
  const contents = history.map((text, i) => ({
    role: i % 2 === 0 ? 'user' : 'model',
    parts: [{ text }]
  }));

  const config: any = {};
  if (useThinking) {
    config.thinkingConfig = { thinkingBudget: 4000 };
    config.maxOutputTokens = 8000;
  }

  const response = await ai.models.generateContent({
    model: 'gemini-3-pro-preview',
    contents,
    config
  });

  return response.text || "";
};

export const getFastResponse = async (prompt: string): Promise<string> => {
  const ai = getAI();
  const response = await ai.models.generateContent({
    model: 'gemini-3-flash-preview',
    contents: prompt,
  });
  return response.text || "";
};

export const analyzeVideo = async (file: File): Promise<string> => {
  const ai = getAI();
  const base64 = await new Promise<string>((resolve) => {
    const reader = new FileReader();
    reader.onload = () => resolve((reader.result as string).split(',')[1]);
    reader.readAsDataURL(file);
  });

  const response = await ai.models.generateContent({
    model: 'gemini-3-flash-preview',
    contents: {
      parts: [
        { inlineData: { mimeType: file.type, data: base64 } },
        { text: "Act as a musicology professor. Provide a detailed analysis of this performance." }
      ]
    }
  });
  return response.text || "";
};

export const editImageWithPrompt = async (base64DataUrl: string, prompt: string): Promise<string> => {
  const ai = getAI();
  const mimeType = base64DataUrl.split(';')[0].split(':')[1];
  const base64Data = base64DataUrl.split(',')[1];

  const response = await ai.models.generateContent({
    model: 'gemini-2.5-flash-image',
    contents: {
      parts: [
        { inlineData: { data: base64Data, mimeType } },
        { text: prompt },
      ],
    },
  });

  for (const part of response.candidates?.[0]?.content?.parts || []) {
    if (part.inlineData) {
      return `data:${part.inlineData.mimeType};base64,${part.inlineData.data}`;
    }
  }
  return "";
};

export const generateVeoVideo = async (base64DataUrl: string, prompt: string): Promise<string> => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  const mimeType = base64DataUrl.split(';')[0].split(':')[1];
  const base64Data = base64DataUrl.split(',')[1];

  let operation = await ai.models.generateVideos({
    model: 'veo-3.1-fast-generate-preview',
    prompt,
    image: {
      imageBytes: base64Data,
      mimeType,
    },
    config: {
      numberOfVideos: 1,
      resolution: '720p',
      aspectRatio: '1:1'
    }
  });

  while (!operation.done) {
    await new Promise(resolve => setTimeout(resolve, 10000));
    operation = await ai.operations.getVideosOperation({ operation });
  }

  const downloadLink = operation.response?.generatedVideos?.[0]?.video?.uri;
  const res = await fetch(`${downloadLink}&key=${process.env.API_KEY}`);
  const blob = await res.blob();
  return URL.createObjectURL(blob);
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
    contents: {
      parts: [
        { inlineData: { mimeType: 'audio/wav', data: base64 } },
        { text: "Provide a clean transcription of this musical reflection." }
      ]
    }
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
