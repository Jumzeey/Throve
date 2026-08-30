import type { ChatMessage, Conversation, Offer } from '@/data/types';

const HOUR = 60 * 60 * 1000;
const DAY = 24 * HOUR;
export const OFFER_TTL_MS = DAY;

const now = Date.now();

export const SEED_CONVERSATIONS: Conversation[] = [
  {
    id: 'c1',
    listingId: 'l2',
    participants: ['ada.thrifts', 'sneakerspot.ng'],
    lastMessage: 'Sure, I can do ₦26,000 if you pick up in Abuja.',
    updatedAt: now - 2 * HOUR,
    unreadBy: ['ada.thrifts'],
  },
  {
    id: 'c2',
    listingId: 'l5',
    participants: ['ada.thrifts', 'lagos.preloved'],
    lastMessage: 'Offer accepted — I will package it today.',
    updatedAt: now - DAY,
    unreadBy: [],
  },
  {
    id: 'c3',
    listingId: 'l1',
    participants: ['ada.thrifts', 'chidinma.o'],
    lastMessage: 'I sent an offer of ₦14,000, let me know!',
    updatedAt: now - 3 * DAY,
    unreadBy: [],
  },
];

export const SEED_MESSAGES: Record<string, ChatMessage[]> = {
  c1: [
    { id: 'm1', from: 'ada.thrifts', text: 'Hi! Would you accept ₦26,000 for the Air Max?', createdAt: now - 3 * HOUR },
    { id: 'm2', from: 'sneakerspot.ng', text: 'Sure, I can do ₦26,000 if you pick up in Abuja.', createdAt: now - 2 * HOUR },
  ],
  c2: [
    { id: 'm3', from: 'ada.thrifts', text: 'Hi, is the Coach bag still available?', createdAt: now - DAY - HOUR },
    { id: 'm4', from: 'lagos.preloved', text: 'Yes! Happy to do ₦40,000.', createdAt: now - DAY - 30 * 60 * 1000 },
    { id: 'm5', from: 'lagos.preloved', text: 'Offer accepted — I will package it today.', createdAt: now - DAY },
  ],
  c3: [
    { id: 'm6', from: 'chidinma.o', text: 'Hi! Is the wrap dress still available?', createdAt: now - 3 * DAY },
    { id: 'm7', from: 'chidinma.o', text: 'I sent an offer of ₦14,000, let me know!', createdAt: now - 3 * DAY + HOUR },
  ],
};

export const SEED_OFFERS: Offer[] = [
  {
    id: 'o1',
    listingId: 'l1',
    buyer: 'chidinma.o',
    seller: 'ada.thrifts',
    amount: 14000,
    status: 'pending',
    createdAt: now - 2 * DAY,
    expiresAt: now - DAY,
    initiator: 'buyer',
  },
  {
    id: 'o2',
    listingId: 'l1',
    buyer: 'funke_b',
    seller: 'ada.thrifts',
    amount: 16000,
    status: 'pending',
    createdAt: now - 5 * HOUR,
    expiresAt: now - 5 * HOUR + OFFER_TTL_MS,
    initiator: 'buyer',
  },
  {
    id: 'o3',
    listingId: 'l9',
    buyer: 'ken.eze',
    seller: 'ada.thrifts',
    amount: 4500,
    status: 'rejected',
    createdAt: now - 7 * DAY,
    expiresAt: now - 6 * DAY,
    initiator: 'buyer',
  },
  {
    id: 'o4',
    listingId: 'l2',
    buyer: 'ada.thrifts',
    seller: 'sneakerspot.ng',
    amount: 26000,
    status: 'pending',
    createdAt: now - 10 * HOUR,
    expiresAt: now - 10 * HOUR + OFFER_TTL_MS,
    initiator: 'buyer',
  },
  {
    id: 'o5',
    listingId: 'l5',
    buyer: 'ada.thrifts',
    seller: 'lagos.preloved',
    amount: 40000,
    status: 'accepted',
    createdAt: now - 4 * DAY,
    expiresAt: now - 3 * DAY,
    initiator: 'buyer',
  },
  {
    id: 'o6',
    listingId: 'l3',
    buyer: 'ada.thrifts',
    seller: 'vintagevault.ng',
    amount: 10000,
    status: 'rejected',
    createdAt: now - 14 * DAY,
    expiresAt: now - 13 * DAY,
    initiator: 'buyer',
  },
];
