import { paymentMode } from '../checkout-fulfill.js';
import { flutterwaveProvider } from './flutterwave.js';
import { simulateProvider } from './simulate.js';

export type ProviderName = 'simulate' | 'flutterwave';

export type ProviderOpResult = {
  status: 'successful' | 'pending' | 'failed';
  providerRef: string | null;
  message?: string;
};

export type Bank = { code: string; name: string };

export type PayoutAccountInput = {
  sellerId: string;
  bankCode: string;
  bankName: string;
  accountNumber: string;
  accountName: string;
};

export interface PaymentsProvider {
  name: ProviderName;
  listBanks(): Promise<Bank[]>;
  resolveAccount(input: { bankCode: string; accountNumber: string; fallbackName: string }): Promise<{
    accountName: string;
  }>;
  createRecipient(account: PayoutAccountInput): Promise<{ recipientId: string }>;
  transfer(input: {
    payoutId: string;
    amount: number;
    recipientId: string;
    bankCode: string;
    accountNumber: string;
    narration: string;
  }): Promise<ProviderOpResult>;
  transferStatus(providerRef: string): Promise<ProviderOpResult>;
  refund(input: { refundId: string; txProviderRef: string | null; amount: number }): Promise<ProviderOpResult>;
  refundStatus(providerRef: string): Promise<ProviderOpResult>;
}

export function getPaymentsProvider(): PaymentsProvider {
  return paymentMode() === 'flutterwave' ? flutterwaveProvider : simulateProvider;
}

export function getProviderByName(name: string | null | undefined): PaymentsProvider {
  return name === 'flutterwave' ? flutterwaveProvider : simulateProvider;
}
