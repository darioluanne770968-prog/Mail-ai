import { useState, useEffect, useCallback } from 'react';
import { EmailService } from '~/services/email.service';
import type { ExtractedEmailData, EmailProvider } from '~/types';

export function useEmail() {
  const [provider, setProvider] = useState<EmailProvider | null>(null);
  const [currentEmail, setCurrentEmail] = useState<ExtractedEmailData | null>(null);
  const [isComposing, setIsComposing] = useState(false);
  const [composeContent, setComposeContent] = useState('');

  useEffect(() => {
    // Detect provider on mount
    const detectedProvider = EmailService.detectProvider();
    setProvider(detectedProvider);

    // Set up observer for email changes
    const observer = new MutationObserver(() => {
      refreshEmailData();
    });

    observer.observe(document.body, {
      childList: true,
      subtree: true,
    });

    // Initial extraction
    refreshEmailData();

    return () => observer.disconnect();
  }, []);

  const refreshEmailData = useCallback(() => {
    const email = EmailService.extractCurrentEmail();
    setCurrentEmail(email);

    const composing = EmailService.isInCompose();
    setIsComposing(composing);

    if (composing) {
      const content = EmailService.getComposeContent();
      setComposeContent(content);
    }
  }, []);

  const insertContent = useCallback((content: string): boolean => {
    const success = EmailService.insertReply(content);
    if (success) {
      setComposeContent(content);
    }
    return success;
  }, []);

  const extractEmail = useCallback((): ExtractedEmailData | null => {
    return EmailService.extractCurrentEmail();
  }, []);

  return {
    provider,
    currentEmail,
    isComposing,
    composeContent,
    refreshEmailData,
    insertContent,
    extractEmail,
    hasEmail: !!currentEmail?.body,
  };
}
