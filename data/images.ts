import type { ImageSourcePropType } from 'react-native';

const listingImages: Record<string, ImageSourcePropType> = {
  l1: require('@/assets/hifi/womens-midi-dress.jpg'),
  l2: require('@/assets/hifi/white-trainers.jpg'),
  l3: require('@/assets/hifi/womens-denim-jacket.jpg'),
  l4: require('@/assets/hifi/womens-top.jpg'),
  l5: require('@/assets/hifi/brown-shoulder-bag.jpg'),
  l6: require('@/assets/hifi/kids-dress.jpg'),
  l7: require('@/assets/hifi/white-trainers.jpg'),
  l8: require('@/assets/hifi/gold-necklace.jpg'),
  l9: require('@/assets/hifi/fashion-scarf.jpg'),
  l10: require('@/assets/hifi/mens-shirt.jpg'),
  l11: require('@/assets/hifi/black-heels.jpg'),
  l12: require('@/assets/hifi/grooming-clippers.jpg'),
  l13: require('@/assets/hifi/beauty-lipstick.jpg'),
  l14: require('@/assets/hifi/black-handbag.jpg'),
  l15: require('@/assets/hifi/kids-trainers.jpg'),
  l16: require('@/assets/hifi/sandals.jpg'),
  l17: require('@/assets/hifi/watch.jpg'),
  l18: require('@/assets/hifi/kids-trainers.jpg'),
  l19: require('@/assets/hifi/fashion-belt.jpg'),
};

const sellerAvatars: Record<string, ImageSourcePropType> = {
  'ada.thrifts': require('@/assets/hifi/seller-ada.jpg'),
  'sneakerspot.ng': require('@/assets/hifi/seller-tobi.jpg'),
  'vintagevault.ng': require('@/assets/hifi/seller-zainab.jpg'),
  'lagos.preloved': require('@/assets/hifi/seller-amaka.jpg'),
  'tolu.styles': require('@/assets/hifi/seller-ada.jpg'),
};

const buyerAvatars: Record<string, ImageSourcePropType> = {
  'ijeoma.a': require('@/assets/hifi/buyer-chioma.jpg'),
  'chidinma.o': require('@/assets/hifi/buyer-maya.jpg'),
  'funke_b': require('@/assets/hifi/buyer-femi.jpg'),
  'femi.k': require('@/assets/hifi/buyer-kemi.jpg'),
  'ken.eze': require('@/assets/hifi/buyer-femi.jpg'),
};

const liveImages: Record<string, ImageSourcePropType> = {
  live1: require('@/assets/hifi/live-thrift-picks.jpg'),
  live2: require('@/assets/hifi/live-fashion-edit.jpg'),
};

const hostAvatars: Record<string, ImageSourcePropType> = {
  'host-dami': require('@/assets/hifi/host-dami.jpg'),
  'host-ife': require('@/assets/hifi/host-ife.jpg'),
};

export function getListingImage(id: string): ImageSourcePropType | null {
  return listingImages[id] ?? null;
}

export function getSellerAvatar(username: string): ImageSourcePropType | null {
  return sellerAvatars[username] ?? buyerAvatars[username] ?? null;
}

export function getLiveImage(id: string): ImageSourcePropType | null {
  return liveImages[id] ?? null;
}

export function getHostAvatar(key: string): ImageSourcePropType | null {
  return hostAvatars[key] ?? null;
}
