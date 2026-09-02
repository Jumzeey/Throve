const SCHEME = 'throveapp://';

export const deepLinks = {
  authCallback: (query: string) => `${SCHEME}auth/callback${query.startsWith('?') ? query : `?${query}`}`,
  offer: (id: string) => `${SCHEME}inbox/offer/${id}`,
  offersList: () => `${SCHEME}inbox/offers`,
  chat: (id: string) => `${SCHEME}inbox/chat/${id}`,
  order: (id: string) => `${SCHEME}checkout/order?id=${encodeURIComponent(id)}`,
  ordersList: () => `${SCHEME}profile/orders`,
  product: (id: string) => `${SCHEME}product/${id}`,
  live: (id: string) => `${SCHEME}live/${id}`,
  settings: () => `${SCHEME}profile/settings`,
};
