import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios from 'axios';
import * as crypto from 'crypto';

@Injectable()
export class PaystackProvider {
  private readonly baseUrl = 'https://api.paystack.co';
  private readonly secretKey: string;

  constructor(private configService: ConfigService) {
    this.secretKey = this.configService.get<string>('PAYSTACK_SECRET_KEY') || '';
  }

  async initializeTransaction(email: string, amountInKobo: number, reference: string, requestedCallbackUrl?: string) {
  const frontendUrl = this.configService.get<string>('FRONTEND_URL') || '';
  const defaultCallback = `${frontendUrl}/payments/callback`;

  let callbackUrl = defaultCallback;

  if (requestedCallbackUrl) {
    try {
      const requested = new URL(requestedCallbackUrl);
      const allowed = new URL(frontendUrl);
      if (requested.hostname === allowed.hostname) {
        callbackUrl = requestedCallbackUrl;
      }
    } catch {
      // invalid URL supplied — fall back to default, don't throw
    }
  }

  const response = await axios.post(
    `${this.baseUrl}/transaction/initialize`,
    { email, amount: amountInKobo, reference, callback_url: callbackUrl },
    { headers: { Authorization: `Bearer ${this.secretKey}` } },
  );
  return response.data.data;
}

  async verifyTransaction(reference: string) {
    const response = await axios.get(
      `${this.baseUrl}/transaction/verify/${reference}`,
      { headers: { Authorization: `Bearer ${this.secretKey}` } },
    );
    return response.data.data; // { status: 'success' | 'failed' | ..., amount, reference, ... }
  }

  verifyWebhookSignature(rawBody: string, signature: string): boolean {
    const hash = crypto.createHmac('sha512', this.secretKey).update(rawBody).digest('hex');
    return hash === signature;
  }
}