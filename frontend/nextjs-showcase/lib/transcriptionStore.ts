import { create } from 'zustand';

interface TranscriptionState {
  isRecording: boolean;
  transcript: string;
  interimTranscript: string;
  isMinimized: boolean;
  setIsRecording: (value: boolean) => void;
  addTranscript: (text: string) => void;
  setInterimTranscript: (text: string) => void;
  clearTranscript: () => void;
  setIsMinimized: (value: boolean) => void;
}

export const useTranscriptionStore = create<TranscriptionState>((set) => ({
  isRecording: false,
  transcript: '',
  interimTranscript: '',
  isMinimized: false,
  setIsRecording: (value) => set({ isRecording: value }),
  addTranscript: (text) => set((state) => ({
    transcript: (state.transcript + ' ' + text).trim(),
    interimTranscript: ''
  })),
  setInterimTranscript: (text) => set({ interimTranscript: text }),
  clearTranscript: () => set({ transcript: '', interimTranscript: '' }),
  setIsMinimized: (value) => set({ isMinimized: value }),
}));
