import React, { useState, useRef, useEffect } from 'react';
import { Mic, MicOff, Volume2, VolumeX, Play, Square, Loader2 } from 'lucide-react';

interface VoiceAssistantProps {
  onEmailGenerated?: (email: { subject: string; body: string }) => void;
  onCommand?: (command: { action: string; parameters: any }) => void;
}

export function VoiceAssistant({ onEmailGenerated, onCommand }: VoiceAssistantProps) {
  const [isRecording, setIsRecording] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [mode, setMode] = useState<'compose' | 'command' | 'read'>('compose');
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        audioChunksRef.current.push(event.data);
      };

      mediaRecorder.onstop = async () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/wav' });
        await processAudio(audioBlob);
        stream.getTracks().forEach(track => track.stop());
      };

      mediaRecorder.start();
      setIsRecording(true);
    } catch (error) {
      console.error('Failed to start recording:', error);
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
    }
  };

  const processAudio = async (audioBlob: Blob) => {
    setIsProcessing(true);
    try {
      const base64 = await blobToBase64(audioBlob);

      if (mode === 'compose') {
        const response = await fetch('/api/v1/ultra/voice/to-email', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ audioBase64: base64, format: 'wav' }),
        });
        const result = await response.json();
        setTranscript(result.transcription?.text || '');
        if (onEmailGenerated && result.email) {
          onEmailGenerated(result.email);
        }
      } else if (mode === 'command') {
        const response = await fetch('/api/v1/ultra/voice/command', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ audioBase64: base64, format: 'wav' }),
        });
        const result = await response.json();
        setTranscript(result.text || '');
        if (onCommand && result.command) {
          onCommand(result.command);
        }
      }
    } catch (error) {
      console.error('Failed to process audio:', error);
    } finally {
      setIsProcessing(false);
    }
  };

  const blobToBase64 = (blob: Blob): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        const base64 = (reader.result as string).split(',')[1];
        resolve(base64);
      };
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  };

  const speakText = async (text: string) => {
    setIsSpeaking(true);
    try {
      // Use Web Speech API for now
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = 'zh-CN';
      utterance.onend = () => setIsSpeaking(false);
      speechSynthesis.speak(utterance);
    } catch (error) {
      console.error('Failed to speak:', error);
      setIsSpeaking(false);
    }
  };

  const stopSpeaking = () => {
    speechSynthesis.cancel();
    setIsSpeaking(false);
  };

  return (
    <div className="p-4 space-y-4">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Mic className="text-blue-500" size={20} />
          <h3 className="font-semibold">语音助手</h3>
        </div>
      </div>

      {/* Mode Selection */}
      <div className="flex gap-2 mb-4">
        {[
          { id: 'compose', label: '语音写邮件' },
          { id: 'command', label: '语音命令' },
          { id: 'read', label: '朗读邮件' },
        ].map((m) => (
          <button
            key={m.id}
            onClick={() => setMode(m.id as any)}
            className={`flex-1 py-2 text-sm rounded-lg transition-colors ${
              mode === m.id
                ? 'bg-blue-500 text-white'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            {m.label}
          </button>
        ))}
      </div>

      {/* Recording Button */}
      <div className="flex flex-col items-center gap-4">
        <button
          onClick={isRecording ? stopRecording : startRecording}
          disabled={isProcessing}
          className={`w-20 h-20 rounded-full flex items-center justify-center transition-all ${
            isRecording
              ? 'bg-red-500 animate-pulse'
              : isProcessing
              ? 'bg-gray-300'
              : 'bg-blue-500 hover:bg-blue-600'
          }`}
        >
          {isProcessing ? (
            <Loader2 className="text-white animate-spin" size={32} />
          ) : isRecording ? (
            <MicOff className="text-white" size={32} />
          ) : (
            <Mic className="text-white" size={32} />
          )}
        </button>

        <p className="text-sm text-gray-500">
          {isRecording
            ? '正在录音... 点击停止'
            : isProcessing
            ? '处理中...'
            : '点击开始录音'}
        </p>
      </div>

      {/* Transcript */}
      {transcript && (
        <div className="mt-4 p-3 bg-gray-50 rounded-lg">
          <p className="text-sm text-gray-600 mb-1">识别结果:</p>
          <p className="text-sm">{transcript}</p>
        </div>
      )}

      {/* Text-to-Speech Controls */}
      {mode === 'read' && (
        <div className="flex items-center gap-2 mt-4">
          <button
            onClick={() => isSpeaking ? stopSpeaking() : speakText('这是一段测试文本')}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg ${
              isSpeaking
                ? 'bg-red-100 text-red-600'
                : 'bg-green-100 text-green-600'
            }`}
          >
            {isSpeaking ? (
              <>
                <Square size={16} />
                停止朗读
              </>
            ) : (
              <>
                <Play size={16} />
                朗读邮件
              </>
            )}
          </button>
        </div>
      )}
    </div>
  );
}
