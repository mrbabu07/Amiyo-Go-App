export interface NewsletterEmail {
  idempotencyKey: string;
  to: string;
  subject: string;
  text: string;
}

export interface EmailProvider {
  readonly name: string;
  send(message: NewsletterEmail): Promise<{ id: string }>;
}

export class ResendEmailProvider implements EmailProvider {
  readonly name = "resend";

  constructor(private readonly config: { apiUrl: string; token: string | undefined; from: string | undefined }) {}

  async send(message: NewsletterEmail) {
    if (!this.config.token || !this.config.from) throw new Error("EMAIL_PROVIDER_NOT_CONFIGURED");
    const response = await fetch(this.config.apiUrl, { method: "POST", headers: { Authorization: `Bearer ${this.config.token}`, "Content-Type": "application/json", "Idempotency-Key": message.idempotencyKey }, body: JSON.stringify({ from: this.config.from, to: [message.to], subject: message.subject, text: message.text }) });
    const payload = await response.json().catch(() => null) as { id?: string; message?: string } | null;
    if (!response.ok || !payload?.id) throw new Error(payload?.message || `EMAIL_PROVIDER_FAILED_${response.status}`);
    return { id: payload.id };
  }
}
