import { randomUUID } from 'crypto';
import { NIGERIAN_BANKS } from './nigerian-banks.js';
import type { PaymentsProvider, ProviderOpResult } from './provider.js';

function simRef(prefix: string) {
  return `SIM-${prefix}-${randomUUID().slice(0, 8).toUpperCase()}`;
}

function succeeded(prefix: string): ProviderOpResult {
  return { status: 'successful', providerRef: simRef(prefix) };
}

export const simulateProvider: PaymentsProvider = {
  name: 'simulate',
  async listBanks() {
    return NIGERIAN_BANKS;
  },
  async resolveAccount({ fallbackName }) {
    return { accountName: `${fallbackName.trim() || 'Throve Seller'} (test)` };
  },
  async createRecipient() {
    return { recipientId: simRef('RCP') };
  },
  async transfer() {
    return succeeded('TRF');
  },
  async transferStatus(providerRef) {
    return { status: 'successful', providerRef };
  },
  async refund() {
    return succeeded('RFD');
  },
  async refundStatus(providerRef) {
    return { status: 'successful', providerRef };
  },
};
