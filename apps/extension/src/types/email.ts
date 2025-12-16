export interface Email {
  id: string;
  subject: string;
  from: EmailAddress;
  to: EmailAddress[];
  cc?: EmailAddress[];
  body: string;
  htmlBody?: string;
  date: Date;
  threadId?: string;
  isRead: boolean;
  labels?: string[];
}

export interface EmailAddress {
  name?: string;
  email: string;
}

export interface EmailThread {
  id: string;
  subject: string;
  emails: Email[];
  participants: EmailAddress[];
  lastMessageDate: Date;
}

export interface ExtractedEmailData {
  subject: string;
  from: string;
  to: string[];
  body: string;
  threadContext?: string;
}

export type EmailProvider = 'gmail' | 'outlook';

export interface EmailContext {
  provider: EmailProvider;
  currentEmail?: ExtractedEmailData;
  threadEmails?: ExtractedEmailData[];
  isComposing: boolean;
  composeContent?: string;
}
