export type Department = 'Women' | 'Men' | 'Kids';
export type ListingStatus = 'available' | 'reserved' | 'sold' | 'draft' | 'hidden';
export type LiveStatus = 'live' | 'upcoming' | 'ended';

export type Listing = {
  id: string;
  title: string;
  brand: string;
  price: number;
  size: string;
  condition: string;
  department: Department;
  category: string;
  seller: string;
  status: ListingStatus;
  description: string;
  savedBy: string[];
};

export type LiveSession = {
  id: string;
  host: string;
  title: string;
  status: LiveStatus;
  viewers?: number;
  scheduledAt?: string;
  pinnedListingId?: string;
};

export type Review = {
  buyer: string;
  rating: number;
  comment: string;
  date: string;
};

export type UserProfile = {
  userId: string;
  email: string;
  name: string;
  username: string;
  dob: string;
  bio: string;
  location: string;
  photoUri?: string;
  setupComplete: boolean;
};
