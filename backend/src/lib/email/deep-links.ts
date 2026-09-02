/**
 * Email CTAs must use https:// — most mail clients (Gmail, Outlook) strip or
 * disable custom schemes like throveapp:// so buttons look non-clickable.
 * /open/* on the API bridges to the app scheme.
 */
function publicApiBase() {
  const raw =
    process.env.PUBLIC_API_URL?.trim() ||
    process.env.API_PUBLIC_URL?.trim() ||
    'https://throve-production.up.railway.app';
  return raw.replace(/\/$/, '');
}

function emailOpenLink(appPath: string) {
  const path = appPath.replace(/^\/+/, '').replace(/^throveapp:\/\//, '');
  return `${publicApiBase()}/open/${path}`;
}

/** Direct app scheme — for in-app use or the /open bridge target. */
export function appSchemeLink(appPath: string) {
  return `throveapp://${appPath.replace(/^\/+/, '')}`;
}

export const deepLinks = {
  authCallback: (query: string) =>
    emailOpenLink(`auth/callback${query.startsWith('?') ? query : `?${query}`}`),
  offer: (id: string) => emailOpenLink(`inbox/offer/${id}`),
  offersList: () => emailOpenLink('inbox/offers'),
  chat: (id: string) => emailOpenLink(`inbox/chat/${id}`),
  order: (id: string) => emailOpenLink(`checkout/order?id=${encodeURIComponent(id)}`),
  ordersList: () => emailOpenLink('profile/orders'),
  product: (id: string) => emailOpenLink(`product/${id}`),
  live: (id: string) => emailOpenLink(`live/${id}`),
  settings: () => emailOpenLink('profile/settings'),
};
