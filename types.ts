
export interface SongRecommendation {
  id: string;
  date: string;
  title: string;
  composer: string;
  period: string;
  duration: string;
  historicalContext: string;
  musicalAnalysis: string;
  funFact: string;
  youtubeVideoId: string;
  isPopular: boolean;
}

export interface UserProgress {
  listened: boolean;
  thoughts: string;
  rating: number;
  savedAt?: string;
}

export interface ChatMessage {
  role: 'user' | 'model' | 'system';
  text: string;
  isThinking?: boolean;
}

export interface VideoAnalysisResult {
  summary: string;
  keyMoments: string[];
}
