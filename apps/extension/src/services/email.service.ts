import type { ExtractedEmailData, EmailProvider } from '~/types';

class EmailServiceClass {
  detectProvider(): EmailProvider | null {
    const url = window.location.href;
    if (url.includes('mail.google.com')) {
      return 'gmail';
    }
    if (url.includes('outlook.live.com') || url.includes('outlook.office.com')) {
      return 'outlook';
    }
    return null;
  }

  extractGmailEmail(): ExtractedEmailData | null {
    try {
      // Get email subject
      const subjectEl = document.querySelector('h2[data-thread-perm-id]');
      const subject = subjectEl?.textContent?.trim() || '';

      // Get sender info
      const senderEl = document.querySelector('[email]');
      const from = senderEl?.getAttribute('email') || '';

      // Get recipients
      const toElements = document.querySelectorAll('[data-hovercard-id]');
      const to: string[] = [];
      toElements.forEach((el) => {
        const email = el.getAttribute('data-hovercard-id');
        if (email && email.includes('@')) {
          to.push(email);
        }
      });

      // Get email body
      const bodyEl = document.querySelector('[data-message-id] .a3s.aiL');
      let body = '';
      if (bodyEl) {
        body = bodyEl.textContent?.trim() || '';
      }

      // Try alternative selector for email body
      if (!body) {
        const altBodyEl = document.querySelector('.ii.gt');
        body = altBodyEl?.textContent?.trim() || '';
      }

      // Get thread context
      const threadMessages = document.querySelectorAll('[data-message-id]');
      let threadContext = '';
      if (threadMessages.length > 1) {
        threadMessages.forEach((msg, index) => {
          if (index < threadMessages.length - 1) {
            const msgBody = msg.querySelector('.a3s.aiL');
            if (msgBody) {
              threadContext += `---\n${msgBody.textContent?.trim()}\n`;
            }
          }
        });
      }

      return {
        subject,
        from,
        to,
        body,
        threadContext: threadContext || undefined,
      };
    } catch (error) {
      console.error('Error extracting Gmail email:', error);
      return null;
    }
  }

  extractOutlookEmail(): ExtractedEmailData | null {
    try {
      // Get email subject
      const subjectEl = document.querySelector('[role="heading"][aria-level="2"]');
      const subject = subjectEl?.textContent?.trim() || '';

      // Get sender info
      const senderEl = document.querySelector('[data-testid="sender-link"]');
      const from = senderEl?.textContent?.trim() || '';

      // Get email body
      const bodyEl = document.querySelector('[aria-label="Message body"]');
      const body = bodyEl?.textContent?.trim() || '';

      // Get recipients
      const toEl = document.querySelector('[data-testid="to-line"]');
      const toText = toEl?.textContent || '';
      const to = toText.split(/[,;]/).map((e) => e.trim()).filter(Boolean);

      return {
        subject,
        from,
        to,
        body,
      };
    } catch (error) {
      console.error('Error extracting Outlook email:', error);
      return null;
    }
  }

  extractCurrentEmail(): ExtractedEmailData | null {
    const provider = this.detectProvider();
    if (provider === 'gmail') {
      return this.extractGmailEmail();
    }
    if (provider === 'outlook') {
      return this.extractOutlookEmail();
    }
    return null;
  }

  getComposeContent(): string {
    const provider = this.detectProvider();

    if (provider === 'gmail') {
      const composeEl = document.querySelector('[role="textbox"][aria-label*="Message Body"]');
      if (!composeEl) {
        const altComposeEl = document.querySelector('.Am.Al.editable');
        return altComposeEl?.textContent?.trim() || '';
      }
      return composeEl.textContent?.trim() || '';
    }

    if (provider === 'outlook') {
      const composeEl = document.querySelector('[aria-label="Message body"]');
      return composeEl?.textContent?.trim() || '';
    }

    return '';
  }

  insertReply(content: string): boolean {
    const provider = this.detectProvider();

    try {
      if (provider === 'gmail') {
        return this.insertGmailReply(content);
      }
      if (provider === 'outlook') {
        return this.insertOutlookReply(content);
      }
      return false;
    } catch (error) {
      console.error('Error inserting reply:', error);
      return false;
    }
  }

  private insertGmailReply(content: string): boolean {
    // Find the compose box
    const composeBox = document.querySelector(
      '[role="textbox"][aria-label*="Message Body"], .Am.Al.editable, [g_editable="true"]'
    ) as HTMLElement;

    if (!composeBox) {
      console.error('Gmail compose box not found');
      return false;
    }

    // Focus and insert content
    composeBox.focus();

    // Clear existing content and insert new
    if (composeBox.getAttribute('contenteditable') === 'true') {
      composeBox.innerHTML = content.replace(/\n/g, '<br>');
    } else {
      (composeBox as HTMLTextAreaElement).value = content;
    }

    // Trigger input event to notify Gmail of changes
    composeBox.dispatchEvent(new Event('input', { bubbles: true }));

    return true;
  }

  private insertOutlookReply(content: string): boolean {
    const composeBox = document.querySelector(
      '[aria-label="Message body"][role="textbox"]'
    ) as HTMLElement;

    if (!composeBox) {
      console.error('Outlook compose box not found');
      return false;
    }

    composeBox.focus();
    composeBox.innerHTML = content.replace(/\n/g, '<br>');
    composeBox.dispatchEvent(new Event('input', { bubbles: true }));

    return true;
  }

  isInCompose(): boolean {
    const provider = this.detectProvider();

    if (provider === 'gmail') {
      return !!document.querySelector('.Am.Al.editable, [role="textbox"][aria-label*="Message Body"]');
    }

    if (provider === 'outlook') {
      return !!document.querySelector('[aria-label="Message body"][role="textbox"]');
    }

    return false;
  }
}

export const EmailService = new EmailServiceClass();
