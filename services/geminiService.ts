
import { GoogleGenAI, Type, Modality } from "@google/genai";
import { SongRecommendation } from "../types";

const getAI = () => new GoogleGenAI({ apiKey: process.env.API_KEY });

// World-class implementation of daily song generation
export const generateDailySong = async (date: string): Promise<SongRecommendation> => {
  const ai = getAI();
  const prompt = `You are a world-class music historian and artistic curator. Generate a premium music recommendation for: ${date}.
  
  AUDIENCE: Curious teens and adults.
  TONE: Eloquent, evocative, and deeply analytical, yet remaining accessible and engaging. Avoid dry academic lists; use narrative prose.
  
  GUIDELINES:
  - Alternate between Classical (Renaissance to Minimalist) and Influential Popular (Jazz, Motown, Art Rock, Hip-Hop Pioneers).
  - Duration: 2-6 minutes.
  - Historical Context: A narrative that contextualizes the piece within the world it was born into.
  - Musical Analysis: An auditory map describing what to feel and hear—the textures, the harmonic tensions, and the resolution.
  - Fun Fact: A humanizing or technical curiosity that is genuinely surprising.
  
  Return in strict JSON format. Use a high-quality YouTube Video ID for a performance.`;

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

// Fixed transcribeAudio to use correct structured parts for multimodal input
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
        { text: "Transcribe the following reflection into clean, readable prose." }
      ]
    }
  });
  return response.text || "";
};

// Implementation of high-quality speech generation using Gemini TTS
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

// Implementation of image editing using gemini-2.5-flash-image
export const editImageWithPrompt = async (image: string, prompt: string): Promise<string> => {
  const ai = getAI();
  const base64Data = image.split(',')[1];
  const mimeType = image.split(';')[0].split(':')[1];

  const response = await ai.models.generateContent({
    model: 'gemini-2.5-flash-image',
    contents: {
      parts: [
        { inlineData: { data: base64Data, mimeType: mimeType } },
        { text: prompt },
      ],
    },
  });

  let imageUrl = "";
  for (const part of response.candidates?.[0].content.parts || []) {
    if (part.inlineData) {
      imageUrl = `data:${part.inlineData.mimeType};base64,${part.inlineData.data}`;
      break;
    }
  }
  return imageUrl;
};

// Implementation of video generation using Veo 3.1 Fast
export const generateVeoVideo = async (image: string, prompt: string): Promise<string> => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  const base64Data = image.split(',')[1];
  const mimeType = image.split(';')[0].split(':')[1];

  let operation = await ai.models.generateVideos({
    model: 'veo-3.1-fast-generate-preview',
    prompt: prompt,
    image: {
      imageBytes: base64Data,
      mimeType: mimeType,
    },
    config: {
      numberOfVideos: 1,
      resolution: '720p',
      aspectRatio: '16:9'
    }
  });

  // Poll for operation completion
  while (!operation.done) {
    await new Promise(resolve => setTimeout(resolve, 10000));
    operation = await ai.operations.getVideosOperation({ operation: operation });
  }

  const downloadLink = operation.response?.generatedVideos?.[0]?.video?.uri;
  // Use current API key for download as required
  const videoResponse = await fetch(`${downloadLink}&key=${process.env.API_KEY}`);
  const blob = await videoResponse.blob();
  return URL.createObjectURL(blob);
};

// Implementation of complex chat logic with thinking budget support
export const getChatResponse = async (history: string[], useThinking: boolean): Promise<string> => {
  const ai = getAI();
  const model = useThinking ? 'gemini-3-pro-preview' : 'gemini-3-flash-preview';
  
  // Format history into required Content array
  const contents = history.map((text, i) => ({
    role: i % 2 === 0 ? 'user' : 'model',
    parts: [{ text }]
  }));

  const response = await ai.models.generateContent({
    model,
    contents,
    config: useThinking ? { 
      thinkingConfig: { thinkingBudget: 32768 } 
    } : {}
  });

  return response.text || "";
};

// Implementation of fast low-latency text response using flash lite
export const getFastResponse = async (prompt: string): Promise<string> => {
  const ai = getAI();
  const response = await ai.models.generateContent({
    model: 'gemini-flash-lite-latest',
    contents: prompt
  });
  return response.text || "";
};

// Implementation of video analysis using gemini-3-flash-preview
export const analyzeVideo = async (videoFile: File): Promise<string> => {
  const ai = getAI();
  const base64 = await new Promise<string>((resolve) => {
    const reader = new FileReader();
    reader.onload = () => resolve((reader.result as string).split(',')[1]);
    reader.readAsDataURL(videoFile);
  });

  const response = await ai.models.generateContent({
    model: 'gemini-3-flash-preview',
    contents: {
      parts: [
        { inlineData: { mimeType: videoFile.type, data: base64 } },
        { text: "Analyze this video and provide a summary of its musical content and key moments." }
      ]
    }
  });

  return response.text || "";
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
