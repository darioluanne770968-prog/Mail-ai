/**
 * Calendar Integration Service
 *
 * Integrates with Google Calendar and Outlook Calendar
 * to create events and manage schedules from emails.
 */

import OpenAI from 'openai';
import { config } from '../../config/index.js';
import { logger } from '../../utils/logger.js';

interface CalendarEvent {
  id: string;
  title: string;
  description?: string;
  startTime: Date;
  endTime: Date;
  location?: string;
  attendees: string[];
  isOnline: boolean;
  meetingLink?: string;
  source: 'manual' | 'email' | 'ai_extracted';
  emailId?: string;
  reminders: Reminder[];
}

interface Reminder {
  type: 'email' | 'popup' | 'sms';
  minutesBefore: number;
}

interface ExtractedMeetingInfo {
  hasMeeting: boolean;
  confidence: number;
  title?: string;
  suggestedDate?: string;
  suggestedTime?: string;
  duration?: number; // minutes
  location?: string;
  isOnline?: boolean;
  attendees?: string[];
  agenda?: string[];
  uncertainties?: string[];
}

interface AvailabilitySlot {
  start: Date;
  end: Date;
  status: 'free' | 'busy' | 'tentative';
}

interface ScheduleSuggestion {
  slot: AvailabilitySlot;
  score: number;
  reason: string;
}

interface CalendarProvider {
  type: 'google' | 'outlook' | 'apple';
  accessToken?: string;
  refreshToken?: string;
  calendarId?: string;
}

export class CalendarService {
  private openai: OpenAI;
  private events: Map<string, CalendarEvent[]> = new Map(); // userId -> events
  private connectedCalendars: Map<string, CalendarProvider[]> = new Map();

  constructor() {
    this.openai = new OpenAI({ apiKey: config.openaiApiKey });
  }

  /**
   * Extract meeting information from email
   */
  async extractMeetingInfo(emailContent: string): Promise<ExtractedMeetingInfo> {
    try {
      const response = await this.openai.chat.completions.create({
        model: 'gpt-4-turbo-preview',
        messages: [
          {
            role: 'system',
            content: `Extract meeting/scheduling information from this email. Return JSON:
{
  "hasMeeting": boolean,
  "confidence": number (0-1),
  "title": "meeting title if found",
  "suggestedDate": "YYYY-MM-DD or relative like 'next Tuesday'",
  "suggestedTime": "HH:MM in 24h format or range like '2-3pm'",
  "duration": number (minutes, default 60),
  "location": "physical location or 'online'",
  "isOnline": boolean,
  "attendees": ["email addresses or names mentioned"],
  "agenda": ["agenda items if mentioned"],
  "uncertainties": ["things that need clarification"]
}

Be thorough but mark confidence appropriately. If no meeting info, set hasMeeting to false.`,
          },
          { role: 'user', content: emailContent },
        ],
        response_format: { type: 'json_object' },
        temperature: 0.2,
      });

      const result = JSON.parse(response.choices[0]?.message?.content || '{}');
      logger.debug({ msg: 'Meeting info extracted', hasMeeting: result.hasMeeting });
      return result;
    } catch (error) {
      logger.error({ msg: 'Failed to extract meeting info', error });
      return { hasMeeting: false, confidence: 0 };
    }
  }

  /**
   * Create calendar event from email
   */
  async createEventFromEmail(params: {
    userId: string;
    emailId: string;
    emailContent: string;
    overrides?: Partial<CalendarEvent>;
  }): Promise<CalendarEvent | null> {
    const meetingInfo = await this.extractMeetingInfo(params.emailContent);

    if (!meetingInfo.hasMeeting || meetingInfo.confidence < 0.5) {
      logger.info({ msg: 'No meeting info found in email', emailId: params.emailId });
      return null;
    }

    // Parse date and time
    const { startTime, endTime } = this.parseMeetingTime(
      meetingInfo.suggestedDate,
      meetingInfo.suggestedTime,
      meetingInfo.duration
    );

    const event: CalendarEvent = {
      id: `event_${Date.now()}_${Math.random().toString(36).slice(2)}`,
      title: params.overrides?.title || meetingInfo.title || 'Meeting',
      description: meetingInfo.agenda?.join('\n') || undefined,
      startTime,
      endTime,
      location: params.overrides?.location || meetingInfo.location,
      attendees: params.overrides?.attendees || meetingInfo.attendees || [],
      isOnline: meetingInfo.isOnline || false,
      source: 'email',
      emailId: params.emailId,
      reminders: [
        { type: 'popup', minutesBefore: 30 },
        { type: 'email', minutesBefore: 60 },
      ],
      ...params.overrides,
    };

    // Store event
    const userEvents = this.events.get(params.userId) || [];
    userEvents.push(event);
    this.events.set(params.userId, userEvents);

    logger.info({ msg: 'Calendar event created', eventId: event.id, title: event.title });
    return event;
  }

  /**
   * Parse date and time from extracted info
   */
  private parseMeetingTime(
    dateStr?: string,
    timeStr?: string,
    durationMinutes: number = 60
  ): { startTime: Date; endTime: Date } {
    const now = new Date();
    let startTime = new Date(now);

    // Parse date
    if (dateStr) {
      if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
        // ISO format
        const [year, month, day] = dateStr.split('-').map(Number);
        startTime.setFullYear(year, month - 1, day);
      } else if (/next\s+(\w+)/i.test(dateStr)) {
        // Relative date like "next Tuesday"
        const dayMatch = dateStr.match(/next\s+(\w+)/i);
        if (dayMatch) {
          const targetDay = this.getDayNumber(dayMatch[1]);
          if (targetDay !== -1) {
            const currentDay = now.getDay();
            const daysUntil = (targetDay - currentDay + 7) % 7 || 7;
            startTime.setDate(now.getDate() + daysUntil);
          }
        }
      } else if (/tomorrow/i.test(dateStr)) {
        startTime.setDate(now.getDate() + 1);
      }
    } else {
      // Default to next business day
      startTime.setDate(now.getDate() + 1);
      while (startTime.getDay() === 0 || startTime.getDay() === 6) {
        startTime.setDate(startTime.getDate() + 1);
      }
    }

    // Parse time
    if (timeStr) {
      const timeMatch = timeStr.match(/(\d{1,2})(?::(\d{2}))?\s*(am|pm)?/i);
      if (timeMatch) {
        let hours = parseInt(timeMatch[1], 10);
        const minutes = parseInt(timeMatch[2] || '0', 10);
        const period = timeMatch[3]?.toLowerCase();

        if (period === 'pm' && hours < 12) hours += 12;
        if (period === 'am' && hours === 12) hours = 0;

        startTime.setHours(hours, minutes, 0, 0);
      }
    } else {
      // Default to 10:00 AM
      startTime.setHours(10, 0, 0, 0);
    }

    const endTime = new Date(startTime.getTime() + durationMinutes * 60 * 1000);

    return { startTime, endTime };
  }

  /**
   * Get day number from name
   */
  private getDayNumber(dayName: string): number {
    const days: Record<string, number> = {
      sunday: 0, sun: 0,
      monday: 1, mon: 1,
      tuesday: 2, tue: 2,
      wednesday: 3, wed: 3,
      thursday: 4, thu: 4,
      friday: 5, fri: 5,
      saturday: 6, sat: 6,
    };
    return days[dayName.toLowerCase()] ?? -1;
  }

  /**
   * Check availability and suggest times
   */
  async checkAvailability(params: {
    userId: string;
    date: Date;
    duration: number; // minutes
    preferredHours?: { start: number; end: number }; // 0-23
  }): Promise<ScheduleSuggestion[]> {
    const userEvents = this.events.get(params.userId) || [];
    const { date, duration, preferredHours = { start: 9, end: 17 } } = params;

    const suggestions: ScheduleSuggestion[] = [];
    const dateStart = new Date(date);
    dateStart.setHours(preferredHours.start, 0, 0, 0);

    // Check each 30-minute slot
    for (let hour = preferredHours.start; hour < preferredHours.end; hour++) {
      for (const minute of [0, 30]) {
        const slotStart = new Date(dateStart);
        slotStart.setHours(hour, minute, 0, 0);
        const slotEnd = new Date(slotStart.getTime() + duration * 60 * 1000);

        // Check if slot fits within preferred hours
        if (slotEnd.getHours() > preferredHours.end) continue;

        // Check for conflicts
        const hasConflict = userEvents.some(event => {
          const eventStart = new Date(event.startTime);
          const eventEnd = new Date(event.endTime);
          return (
            eventStart.toDateString() === slotStart.toDateString() &&
            ((slotStart >= eventStart && slotStart < eventEnd) ||
             (slotEnd > eventStart && slotEnd <= eventEnd) ||
             (slotStart <= eventStart && slotEnd >= eventEnd))
          );
        });

        if (!hasConflict) {
          // Calculate score based on time preferences
          let score = 100;
          // Prefer mid-morning and early afternoon
          if (hour >= 10 && hour <= 11) score += 10;
          if (hour >= 14 && hour <= 15) score += 5;
          // Penalize very early or late slots
          if (hour < 10 || hour >= 16) score -= 10;

          suggestions.push({
            slot: {
              start: slotStart,
              end: slotEnd,
              status: 'free',
            },
            score,
            reason: this.getSlotReason(hour),
          });
        }
      }
    }

    return suggestions
      .sort((a, b) => b.score - a.score)
      .slice(0, 5);
  }

  /**
   * Get human-readable reason for slot suggestion
   */
  private getSlotReason(hour: number): string {
    if (hour >= 10 && hour <= 11) return 'Prime morning slot - high productivity time';
    if (hour >= 14 && hour <= 15) return 'Early afternoon - good for collaboration';
    if (hour < 10) return 'Early morning slot';
    if (hour >= 16) return 'Late afternoon slot';
    return 'Available time slot';
  }

  /**
   * Generate smart reply for meeting request
   */
  async generateMeetingReply(params: {
    emailContent: string;
    action: 'accept' | 'decline' | 'suggest_alternative';
    suggestedTime?: Date;
    reason?: string;
  }): Promise<string> {
    const meetingInfo = await this.extractMeetingInfo(params.emailContent);

    const actionPrompts: Record<string, string> = {
      accept: `Accept this meeting invitation professionally. Confirm the time and express willingness to attend.`,
      decline: `Politely decline this meeting invitation. ${params.reason ? `Reason: ${params.reason}` : 'Be apologetic but professional.'}`,
      suggest_alternative: `Suggest an alternative time for this meeting. ${params.suggestedTime ? `Proposed time: ${params.suggestedTime.toLocaleString()}` : 'Offer to find a mutually convenient time.'}`,
    };

    try {
      const response = await this.openai.chat.completions.create({
        model: 'gpt-3.5-turbo',
        messages: [
          {
            role: 'system',
            content: `${actionPrompts[params.action]} Keep the response concise and professional.`,
          },
          {
            role: 'user',
            content: `Original meeting request:\n${params.emailContent}\n\nMeeting details: ${JSON.stringify(meetingInfo, null, 2)}`,
          },
        ],
        temperature: 0.7,
        max_tokens: 300,
      });

      return response.choices[0]?.message?.content || '';
    } catch (error) {
      logger.error({ msg: 'Failed to generate meeting reply', error });
      throw error;
    }
  }

  /**
   * Get upcoming events
   */
  getUpcomingEvents(userId: string, days: number = 7): CalendarEvent[] {
    const userEvents = this.events.get(userId) || [];
    const now = new Date();
    const cutoff = new Date(now.getTime() + days * 24 * 60 * 60 * 1000);

    return userEvents
      .filter(event => {
        const start = new Date(event.startTime);
        return start >= now && start <= cutoff;
      })
      .sort((a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime());
  }

  /**
   * Get today's schedule summary
   */
  async getTodaySummary(userId: string): Promise<{
    events: CalendarEvent[];
    summary: string;
    freeSlots: AvailabilitySlot[];
    nextEvent?: CalendarEvent;
  }> {
    const today = new Date();
    const userEvents = this.events.get(userId) || [];

    const todayEvents = userEvents.filter(event => {
      const eventDate = new Date(event.startTime);
      return eventDate.toDateString() === today.toDateString();
    }).sort((a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime());

    // Find free slots
    const availabilityResults = await this.checkAvailability({
      userId,
      date: today,
      duration: 30,
    });
    const freeSlots = availabilityResults.map(r => r.slot);

    // Find next event
    const now = new Date();
    const nextEvent = todayEvents.find(e => new Date(e.startTime) > now);

    // Generate summary
    let summary = '';
    if (todayEvents.length === 0) {
      summary = 'Your calendar is clear today.';
    } else {
      summary = `You have ${todayEvents.length} event${todayEvents.length > 1 ? 's' : ''} today. `;
      if (nextEvent) {
        const timeUntil = Math.round((new Date(nextEvent.startTime).getTime() - now.getTime()) / 60000);
        summary += `Next: "${nextEvent.title}" in ${timeUntil} minutes.`;
      }
    }

    return {
      events: todayEvents,
      summary,
      freeSlots,
      nextEvent,
    };
  }

  /**
   * Connect calendar provider (placeholder for OAuth flow)
   */
  async connectCalendar(userId: string, provider: CalendarProvider['type']): Promise<{
    authUrl: string;
    state: string;
  }> {
    // In production, implement OAuth flow for each provider
    const state = `${userId}_${Date.now()}_${Math.random().toString(36).slice(2)}`;

    const authUrls: Record<string, string> = {
      google: `https://accounts.google.com/o/oauth2/v2/auth?client_id=YOUR_CLIENT_ID&redirect_uri=YOUR_REDIRECT_URI&scope=https://www.googleapis.com/auth/calendar&response_type=code&state=${state}`,
      outlook: `https://login.microsoftonline.com/common/oauth2/v2.0/authorize?client_id=YOUR_CLIENT_ID&redirect_uri=YOUR_REDIRECT_URI&scope=Calendars.ReadWrite&response_type=code&state=${state}`,
      apple: `https://appleid.apple.com/auth/authorize?client_id=YOUR_CLIENT_ID&redirect_uri=YOUR_REDIRECT_URI&scope=calendar&response_type=code&state=${state}`,
    };

    return {
      authUrl: authUrls[provider] || '',
      state,
    };
  }

  /**
   * Delete event
   */
  deleteEvent(userId: string, eventId: string): boolean {
    const userEvents = this.events.get(userId) || [];
    const index = userEvents.findIndex(e => e.id === eventId);
    if (index === -1) return false;

    userEvents.splice(index, 1);
    this.events.set(userId, userEvents);
    return true;
  }

  /**
   * Update event
   */
  updateEvent(userId: string, eventId: string, updates: Partial<CalendarEvent>): CalendarEvent | null {
    const userEvents = this.events.get(userId) || [];
    const event = userEvents.find(e => e.id === eventId);
    if (!event) return null;

    Object.assign(event, updates);
    return event;
  }
}

export const calendarService = new CalendarService();
