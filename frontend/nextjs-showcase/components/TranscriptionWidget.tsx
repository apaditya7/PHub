'use client'

import { useCallback, useEffect, useRef, useState } from 'react';
import { useTranscriptionStore } from '../lib/transcriptionStore';
import { encodeWav } from '../lib/audio/wav';

export default function TranscriptionWidget() {
  const {
    isRecording,
    transcript,
    interimTranscript,
    isMinimized,
    setIsRecording,
    addTranscript,
    setInterimTranscript,
    clearTranscript,
    setIsMinimized,
  } = useTranscriptionStore();

  const [isSupported, setIsSupported] = useState(true);
  const [isSummarizing, setIsSummarizing] = useState(false);
  const [summary, setSummary] = useState('');
  const [copied, setCopied] = useState(false);

  const mediaStreamRef = useRef<MediaStream | null>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const processorRef = useRef<ScriptProcessorNode | null>(null);
  const sourceRef = useRef<MediaStreamAudioSourceNode | null>(null);
  const isUploadingRef = useRef<boolean>(false);
  const chunkBuffersRef = useRef<Float32Array[]>([]);
  const chunkSamplesTargetRef = useRef<number>(0);
  const sampleRateRef = useRef<number>(44100);
  const queueRef = useRef<Blob[]>([]);
  const processingQueueRef = useRef<boolean>(false);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const hasMedia = !!(navigator.mediaDevices && (window as any).MediaRecorder);
    setIsSupported(hasMedia);
    return () => {
      // Cleanup any active stream on unmount
      try {
        processorRef.current?.disconnect();
        sourceRef.current?.disconnect();
        audioCtxRef.current?.close();
      } catch {}
      mediaStreamRef.current?.getTracks().forEach(t => t.stop());
    };
  }, []);

  const transcribeBlob = useCallback(async (blob: Blob) => {
    if (!blob || blob.size === 0) return;
    isUploadingRef.current = true;
    setInterimTranscript('Transcribing…');
    try {
      const form = new FormData();
      const file = new File([blob], `chunk-${Date.now()}.wav`, { type: 'audio/wav' });
      form.append('audio', file);
      const res = await fetch('/api/transcribe', { method: 'POST', body: form });
      if (!res.ok) {
        try {
          const err = await res.json();
          console.error('Transcribe failed:', res.status, err);
        } catch {
          const txt = await res.text();
          console.error('Transcribe failed:', res.status, txt);
        }
        return;
      }
      const data = await res.json();
      const text = data?.text as string;
      if (text) addTranscript(text);
    } catch (e) {
      console.error('Transcription error:', e);
    } finally {
      setInterimTranscript('');
      isUploadingRef.current = false;
    }
  }, [addTranscript, setInterimTranscript]);

  const processQueue = useCallback(async () => {
    if (processingQueueRef.current) return;
    processingQueueRef.current = true;
    try {
      while (queueRef.current.length > 0) {
        const blob = queueRef.current.shift()!;
        await transcribeBlob(blob);
      }
    } finally {
      processingQueueRef.current = false;
    }
  }, [transcribeBlob]);

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      mediaStreamRef.current = stream;
      const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
      await ctx.resume().catch(() => {});
      audioCtxRef.current = ctx;
      sampleRateRef.current = ctx.sampleRate || 44100;
      const source = ctx.createMediaStreamSource(stream);
      sourceRef.current = source;
      const processor = ctx.createScriptProcessor(4096, 1, 1);
      processorRef.current = processor;
      chunkBuffersRef.current = [];
      chunkSamplesTargetRef.current = Math.floor(sampleRateRef.current * 2); // ~2s chunks

      processor.onaudioprocess = async (e) => {
        const input = e.inputBuffer.getChannelData(0);
        // Copy to avoid referencing the underlying buffer
        chunkBuffersRef.current.push(new Float32Array(input));
        const totalSamples = chunkBuffersRef.current.reduce((acc, cur) => acc + cur.length, 0);
        if (totalSamples >= chunkSamplesTargetRef.current && !isUploadingRef.current) {
          // Merge and encode current buffers
          const merged = new Float32Array(totalSamples);
          let offset = 0;
          for (const buf of chunkBuffersRef.current) {
            merged.set(buf, offset);
            offset += buf.length;
          }
          chunkBuffersRef.current = [];
          const wav = encodeWav(merged, sampleRateRef.current, 1);
          queueRef.current.push(wav);
          processQueue();
        }
      };

      source.connect(processor);
      // Keep node alive without audible output
      const sink = ctx.createGain();
      sink.gain.value = 0;
      processor.connect(sink);
      sink.connect(ctx.destination);
      setIsRecording(true);
    } catch (error) {
      console.error('Microphone permission denied or recorder error:', error);
      alert('Please allow microphone access to use transcription');
    }
  };

  const stopRecording = () => {
    try {
      processorRef.current?.disconnect();
      sourceRef.current?.disconnect();
      audioCtxRef.current?.close();
    } catch {}
    mediaStreamRef.current?.getTracks().forEach(t => t.stop());
    setIsRecording(false);
    // Flush any remaining buffer
    const totalSamples = chunkBuffersRef.current.reduce((acc, cur) => acc + cur.length, 0);
    if (totalSamples > 0) {
      const merged = new Float32Array(totalSamples);
      let offset = 0;
      for (const buf of chunkBuffersRef.current) { merged.set(buf, offset); offset += buf.length; }
      chunkBuffersRef.current = [];
      const wav = encodeWav(merged, sampleRateRef.current, 1);
      queueRef.current.push(wav);
      processQueue();
    }
  };

  const handleSummarize = async () => {
    if (!transcript.trim()) {
      alert('No transcript to summarize');
      return;
    }

    setIsSummarizing(true);
    setSummary('');

    try {
      const response = await fetch('/api/summarize', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ transcript: transcript.trim() })
      });

      if (!response.ok) {
        throw new Error('Summarization failed');
      }

      const data = await response.json();
      setSummary(data.summary);
    } catch (error) {
      console.error('Summarization error:', error);
      alert('Failed to summarize. Please try again.');
    } finally {
      setIsSummarizing(false);
    }
  };

  const handleCopySummary = async () => {
    if (!summary.trim()) return;
    try {
      await navigator.clipboard.writeText(summary);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch (e) {
      console.error('Copy failed:', e);
      alert('Failed to copy summary');
    }
  };

  const handleClearSummary = () => {
    setSummary('');
  };

  const downloadTranscript = () => {
    const blob = new Blob([transcript], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `transcript-${new Date().toISOString()}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  if (!isSupported) {
    return (
      <div className="fixed bottom-4 right-4 bg-red-500 text-white p-4 rounded-lg shadow-2xl max-w-sm">
        <p className="text-sm font-semibold">⚠️ Audio Recording Not Supported</p>
        <p className="text-xs mt-1">Please use a modern browser with MediaRecorder</p>
      </div>
    );
  }

  if (isMinimized) {
    return (
      <button
        onClick={() => setIsMinimized(false)}
        className="fixed bottom-4 right-4 w-14 h-14 bg-purple-600 hover:bg-purple-700 text-white rounded-full shadow-2xl flex items-center justify-center transition-all duration-200 hover:scale-110"
      >
        {isRecording && (
          <div className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 rounded-full animate-pulse" />
        )}
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
        </svg>
      </button>
    );
  }

  return (
    <div className="fixed bottom-4 right-4 bg-white rounded-xl shadow-2xl w-96 max-h-[600px] flex flex-col border border-gray-200 overflow-hidden">
      {/* Header */}
      <div className="bg-gradient-to-r from-purple-600 to-blue-600 text-white p-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
          </svg>
          <h3 className="font-semibold">Live Transcription</h3>
        </div>
        <button
          onClick={() => setIsMinimized(true)}
          className="text-white/80 hover:text-white transition-colors"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </button>
      </div>

      {/* Controls */}
      <div className="p-4 border-b border-gray-200 flex gap-2">
        {!isRecording ? (
          <button
            onClick={startRecording}
            className="flex-1 px-4 py-2 bg-red-500 hover:bg-red-600 text-white rounded-lg font-semibold transition-colors flex items-center justify-center gap-2"
          >
            <div className="w-3 h-3 bg-white rounded-full" />
            Start Recording
          </button>
        ) : (
          <button
            onClick={stopRecording}
            className="flex-1 px-4 py-2 bg-gray-600 hover:bg-gray-700 text-white rounded-lg font-semibold transition-colors flex items-center justify-center gap-2"
          >
            <div className="w-3 h-3 bg-white" />
            Stop
          </button>
        )}
        <button
          onClick={clearTranscript}
          className="px-4 py-2 bg-gray-200 hover:bg-gray-300 text-gray-700 rounded-lg font-semibold transition-colors"
          title="Clear transcript"
        >
          🗑️
        </button>
      </div>

      {/* Transcript Display */}
      <div className="flex-1 overflow-y-auto p-4 bg-gray-50 min-h-[200px] max-h-[300px]">
        {isRecording && (
          <div className="flex items-center gap-2 mb-2 text-red-600 text-sm font-semibold">
            <div className="w-2 h-2 bg-red-600 rounded-full animate-pulse" />
            Recording...
          </div>
        )}

        {transcript || interimTranscript ? (
          <div className="text-sm text-gray-800 leading-relaxed">
            <span>{transcript}</span>
            {interimTranscript && (
              <span className="text-gray-400 italic">{interimTranscript}</span>
            )}
          </div>
        ) : (
          <div className="text-gray-400 text-sm italic text-center mt-8">
            {isRecording ? 'Capturing audio…' : 'Click "Start Recording" to begin'}
          </div>
        )}
      </div>

      {/* Summary Section */}
      {summary && (
        <div className="p-4 bg-blue-50 border-t border-blue-200">
          <div className="flex items-center justify-between mb-1">
            <div className="text-xs font-semibold text-blue-800">AI Summary:</div>
            <div className="flex items-center gap-2">
              <button
                onClick={handleCopySummary}
                className="text-xs px-2 py-1 rounded border border-blue-300 text-blue-700 hover:bg-blue-100"
                title="Copy summary"
              >
                {copied ? '✓ Copied' : 'Copy'}
              </button>
              <button
                onClick={handleClearSummary}
                className="text-xs px-2 py-1 rounded border border-blue-300 text-blue-700 hover:bg-blue-100"
                title="Clear summary"
              >
                Clear
              </button>
            </div>
          </div>
          <div className="text-sm text-blue-900 whitespace-pre-wrap">{summary}</div>
        </div>
      )}

      {/* Action Buttons */}
      <div className="p-4 border-t border-gray-200 flex gap-2">
        <button
          onClick={handleSummarize}
          disabled={!transcript.trim() || isSummarizing}
          className="flex-1 px-4 py-2 bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white rounded-lg font-semibold transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
        >
          {isSummarizing ? (
            <>
              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              Summarizing...
            </>
          ) : (
            <>
              ✨ Summarize
            </>
          )}
        </button>
        <button
          onClick={downloadTranscript}
          disabled={!transcript.trim()}
          className="px-4 py-2 bg-gray-200 hover:bg-gray-300 text-gray-700 rounded-lg font-semibold transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          title="Download transcript"
        >
          💾
        </button>
      </div>

      {/* Info */}
      <div className="px-4 pb-2 text-xs text-gray-500 text-center">
        🎤 Microphone access required • English only
      </div>
    </div>
  );
}
