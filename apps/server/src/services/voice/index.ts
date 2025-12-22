/**
 * Voice Email Assistant Service
 * Voice-to-email, email-to-speech, voice memos
 */

import { AIService } from '../ai/index.js';

export interface VoiceTranscription {
  id: string;
  audioUrl: string;
  duration: number;
  language: string;
  transcription: string;
  confidence: number;
  timestamps: Array<{
    start: number;
    end: number;
    text: string;
  }>;
  createdAt: Date;
}

export interface VoiceEmail {
  id: string;
  userId: string;
  type: 'dictation' | 'memo' | 'meeting_notes';
  transcription: VoiceTranscription;
  generatedEmail?: {
    subject: string;
    body: string;
    tone: string;
    recipients?: string[];
  };
  status: 'transcribing' | 'processing' | 'ready' | 'sent';
  createdAt: Date;
}

export interface TextToSpeechResult {
  id: string;
  text: string;
  audioUrl: string;
  voice: string;
  speed: number;
  duration: number;
}

export interface VoiceMemo {
  id: string;
  userId: string;
  emailId?: string;
  transcription: string;
  summary: string;
  actionItems: string[];
  createdAt: Date;
}

export interface MeetingTranscript {
  id: string;
  meetingId: string;
  participants: string[];
  duration: number;
  transcription: VoiceTranscription;
  summary: {
    overview: string;
    keyPoints: string[];
    decisions: string[];
    actionItems: Array<{
      task: string;
      assignee?: string;
      deadline?: string;
    }>;
    followUpEmail: string;
  };
  createdAt: Date;
}

// In-memory storage
const voiceEmails = new Map<string, VoiceEmail>();
const voiceMemos = new Map<string, VoiceMemo>();
const meetingTranscripts = new Map<string, MeetingTranscript>();

export class VoiceAssistantService {
  private aiService: AIService;

  constructor() {
    this.aiService = new AIService();
  }

  /**
   * Simulate voice transcription (would use Whisper API in production)
   */
  async transcribeAudio(
    audioData: string | Buffer,
    language: string = 'zh'
  ): Promise<VoiceTranscription> {
    // Simulated transcription - in production would call Whisper API
    const transcription: VoiceTranscription = {
      id: `trans_${Date.now()}`,
      audioUrl: `audio://${Date.now()}`,
      duration: 30, // Simulated duration
      language,
      transcription: '这是模拟的语音转文字结果。在实际使用中，这里会是真实的语音识别内容。',
      confidence: 0.95,
      timestamps: [
        { start: 0, end: 5, text: '这是模拟的' },
        { start: 5, end: 10, text: '语音转文字结果' },
      ],
      createdAt: new Date(),
    };

    return transcription;
  }

  /**
   * Convert voice to email
   */
  async voiceToEmail(
    userId: string,
    transcription: string,
    context?: {
      recipient?: string;
      replyTo?: string;
      tone?: string;
    }
  ): Promise<VoiceEmail> {
    const voiceEmail: VoiceEmail = {
      id: `ve_${Date.now()}`,
      userId,
      type: 'dictation',
      transcription: {
        id: `trans_${Date.now()}`,
        audioUrl: '',
        duration: 0,
        language: 'zh',
        transcription,
        confidence: 1,
        timestamps: [],
        createdAt: new Date(),
      },
      status: 'processing',
      createdAt: new Date(),
    };

    // Generate email from transcription
    const prompt = `将以下语音转录内容转换为专业的邮件格式：

语音内容：
${transcription}

${context?.recipient ? `收件人：${context.recipient}` : ''}
${context?.replyTo ? `这是回复邮件，原邮件内容：${context.replyTo}` : ''}
${context?.tone ? `语气要求：${context.tone}` : ''}

返回 JSON：
{
  "subject": "邮件主题",
  "body": "邮件正文",
  "tone": "使用的语气",
  "suggestedRecipients": ["建议收件人"]
}`;

    try {
      const response = await this.aiService.generateReply({
        emailContent: prompt,
        tone: context?.tone as any || 'professional',
        length: 'moderate',
      });

      const result = JSON.parse(response.replies[0].content);
      voiceEmail.generatedEmail = result;
      voiceEmail.status = 'ready';
    } catch {
      voiceEmail.status = 'ready';
      voiceEmail.generatedEmail = {
        subject: '语音邮件',
        body: transcription,
        tone: 'professional',
      };
    }

    voiceEmails.set(voiceEmail.id, voiceEmail);
    return voiceEmail;
  }

  /**
   * Convert email to speech
   */
  async emailToSpeech(
    emailContent: string,
    options: {
      voice?: 'male' | 'female';
      speed?: number;
      language?: string;
      summarize?: boolean;
    } = {}
  ): Promise<TextToSpeechResult> {
    let textToRead = emailContent;

    // Summarize if requested
    if (options.summarize) {
      const prompt = `将以下邮件简化为适合语音朗读的版本（简洁、口语化）：

${emailContent}

只返回简化后的文本，不要任何额外说明。`;

      try {
        const response = await this.aiService.generateReply({
          emailContent: prompt,
          tone: 'casual',
          length: 'concise',
        });
        textToRead = response.replies[0].content;
      } catch {
        // Use original content
      }
    }

    // Simulate TTS result (would use actual TTS API)
    return {
      id: `tts_${Date.now()}`,
      text: textToRead,
      audioUrl: `tts://${Date.now()}.mp3`,
      voice: options.voice || 'female',
      speed: options.speed || 1.0,
      duration: Math.ceil(textToRead.length / 5), // Rough estimate
    };
  }

  /**
   * Create voice memo linked to email
   */
  async createVoiceMemo(
    userId: string,
    transcription: string,
    emailId?: string
  ): Promise<VoiceMemo> {
    // Analyze and summarize memo
    const prompt = `分析以下语音备忘录，提取摘要和行动项：

${transcription}

返回 JSON：
{
  "summary": "一句话摘要",
  "actionItems": ["行动项1", "行动项2"]
}`;

    let summary = transcription.slice(0, 100);
    let actionItems: string[] = [];

    try {
      const response = await this.aiService.generateReply({
        emailContent: prompt,
        tone: 'professional',
        length: 'concise',
      });
      const result = JSON.parse(response.replies[0].content);
      summary = result.summary;
      actionItems = result.actionItems;
    } catch {
      // Use defaults
    }

    const memo: VoiceMemo = {
      id: `memo_${Date.now()}`,
      userId,
      emailId,
      transcription,
      summary,
      actionItems,
      createdAt: new Date(),
    };

    voiceMemos.set(memo.id, memo);
    return memo;
  }

  /**
   * Process meeting recording
   */
  async processMeetingRecording(
    meetingId: string,
    transcription: string,
    participants: string[]
  ): Promise<MeetingTranscript> {
    const prompt = `分析以下会议录音转录，生成会议摘要和跟进邮件：

会议参与者：${participants.join(', ')}

会议内容：
${transcription}

返回 JSON：
{
  "overview": "会议概述（2-3句话）",
  "keyPoints": ["要点1", "要点2", "要点3"],
  "decisions": ["决定1", "决定2"],
  "actionItems": [
    {"task": "任务描述", "assignee": "负责人", "deadline": "截止日期"}
  ],
  "followUpEmail": "会议跟进邮件内容"
}`;

    let summaryResult = {
      overview: '会议摘要生成中...',
      keyPoints: [] as string[],
      decisions: [] as string[],
      actionItems: [] as Array<{ task: string; assignee?: string; deadline?: string }>,
      followUpEmail: '',
    };

    try {
      const response = await this.aiService.generateReply({
        emailContent: prompt,
        tone: 'professional',
        length: 'detailed',
      });
      summaryResult = JSON.parse(response.replies[0].content);
    } catch {
      summaryResult.overview = '无法自动生成摘要';
    }

    const transcript: MeetingTranscript = {
      id: `mt_${Date.now()}`,
      meetingId,
      participants,
      duration: Math.ceil(transcription.length / 100),
      transcription: {
        id: `trans_${Date.now()}`,
        audioUrl: '',
        duration: 0,
        language: 'zh',
        transcription,
        confidence: 0.9,
        timestamps: [],
        createdAt: new Date(),
      },
      summary: summaryResult,
      createdAt: new Date(),
    };

    meetingTranscripts.set(transcript.id, transcript);
    return transcript;
  }

  /**
   * Get voice commands for email actions
   */
  parseVoiceCommand(command: string): {
    action: string;
    parameters: Record<string, string>;
  } {
    const commandPatterns = [
      { pattern: /回复(.+)/i, action: 'reply', paramName: 'content' },
      { pattern: /转发给(.+)/i, action: 'forward', paramName: 'recipient' },
      { pattern: /删除(这封)?邮件/i, action: 'delete', paramName: null },
      { pattern: /标记为(.+)/i, action: 'label', paramName: 'label' },
      { pattern: /存档/i, action: 'archive', paramName: null },
      { pattern: /写(一封)?邮件给(.+)/i, action: 'compose', paramName: 'recipient' },
      { pattern: /朗读邮件/i, action: 'read_aloud', paramName: null },
      { pattern: /总结(这封)?邮件/i, action: 'summarize', paramName: null },
    ];

    for (const { pattern, action, paramName } of commandPatterns) {
      const match = command.match(pattern);
      if (match) {
        const parameters: Record<string, string> = {};
        if (paramName && match[1]) {
          parameters[paramName] = match[1].trim();
        }
        return { action, parameters };
      }
    }

    return { action: 'unknown', parameters: { raw: command } };
  }

  /**
   * Get user's voice memos
   */
  getUserMemos(userId: string): VoiceMemo[] {
    return Array.from(voiceMemos.values())
      .filter(m => m.userId === userId)
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  }

  /**
   * Get voice email by ID
   */
  getVoiceEmail(id: string): VoiceEmail | null {
    return voiceEmails.get(id) || null;
  }
}

export const voiceAssistantService = new VoiceAssistantService();
