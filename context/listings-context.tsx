import { CATEGORY_MAP, DEFAULT_SHIPPING, LISTINGS } from '@/data/seed';
import type { Department, Listing, ListingForm, ListingStatus } from '@/data/types';
import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react';

export const EMPTY_LISTING_FORM: ListingForm = {
  photoCount: 0,
  title: '',
  department: '',
  category: '',
  brand: '',
  condition: '',
  size: '',
  price: '',
  description: '',
};

export const PREVIEW_ERROR = 'Add a photo, then fill in title, department, category, condition and price.';

type ListingsContextValue = {
  listings: Listing[];
  form: ListingForm;
  getListing: (id: string) => Listing | undefined;
  listingsForSeller: (username: string) => Listing[];
  setForm: (patch: Partial<ListingForm>) => void;
  resetForm: () => void;
  loadFormFromListing: (listing: Listing) => void;
  saveDraft: (seller: string) => Listing;
  publish: (seller: string) => Listing | null;
  updateListing: (id: string, patch: Partial<Listing>) => void;
  setStatus: (id: string, status: ListingStatus) => void;
  clearReservation: (id: string) => void;
  removeListing: (id: string) => boolean;
  canDelete: (id: string) => boolean;
  toggleSave: (listingId: string, username: string) => void;
  hideActiveForSeller: (username: string) => void;
  savedListingsFor: (username: string) => Listing[];
};

const ListingsContext = createContext<ListingsContextValue | null>(null);

function cloneListings() {
  return LISTINGS.map((listing) => ({ ...listing, savedBy: [...listing.savedBy] }));
}

function isDepartment(value: string): value is Department {
  return value === 'Women' || value === 'Men' || value === 'Kids';
}

function todayStamp() {
  return new Date().toISOString().slice(0, 10);
}

export function parseListingPrice(value: string) {
  const digits = value.replace(/[^\d]/g, '');
  if (!digits) return null;
  const amount = Number(digits);
  if (!Number.isFinite(amount) || amount <= 0) return null;
  return amount;
}

export function isListingFormPublishable(form: ListingForm) {
  if (form.photoCount < 1) return false;
  if (!form.title.trim()) return false;
  if (!isDepartment(form.department)) return false;
  const categories = CATEGORY_MAP[form.department];
  if (!form.category || !categories.includes(form.category)) return false;
  if (!form.condition.trim()) return false;
  return parseListingPrice(form.price) !== null;
}

function fallbackDepartment(value: string): Department {
  return isDepartment(value) ? value : 'Women';
}

function fallbackCategory(department: Department, category: string) {
  const categories = CATEGORY_MAP[department];
  if (category && categories.includes(category)) return category;
  return categories[0];
}

export function ListingsProvider({ children }: { children: ReactNode }) {
  const [listings, setListings] = useState<Listing[]>(cloneListings);
  const [form, setFormState] = useState<ListingForm>(EMPTY_LISTING_FORM);

  const getListing = useCallback((id: string) => listings.find((listing) => listing.id === id), [listings]);

  const listingsForSeller = useCallback(
    (username: string) => listings.filter((listing) => listing.seller === username),
    [listings],
  );

  const setForm = useCallback((patch: Partial<ListingForm>) => {
    setFormState((current) => ({ ...current, ...patch }));
  }, []);

  const resetForm = useCallback(() => {
    setFormState(EMPTY_LISTING_FORM);
  }, []);

  const loadFormFromListing = useCallback((listing: Listing) => {
    setFormState({
      id: listing.id,
      photoCount: listing.photoCount,
      title: listing.title === 'Untitled draft' ? '' : listing.title,
      department: listing.department,
      category: listing.category,
      brand: listing.brand === 'Unbranded' ? '' : listing.brand,
      condition: listing.condition,
      size: listing.size === '—' ? '' : listing.size,
      price: listing.price > 0 ? String(listing.price) : '',
      description: listing.description === 'No description provided.' ? '' : listing.description,
    });
  }, []);

  const upsert = useCallback((next: Listing) => {
    setListings((current) => {
      const index = current.findIndex((listing) => listing.id === next.id);
      if (index === -1) return [next, ...current];
      const copy = [...current];
      copy[index] = next;
      return copy;
    });
    return next;
  }, []);

  const saveDraft = useCallback(
    (seller: string) => {
      const department = fallbackDepartment(form.department);
      const existing = form.id ? listings.find((listing) => listing.id === form.id) : undefined;
      const listing: Listing = {
        id: existing?.id ?? `l-${Date.now()}`,
        title: form.title.trim() || 'Untitled draft',
        brand: form.brand.trim() || 'Unbranded',
        price: parseListingPrice(form.price) ?? 0,
        size: form.size.trim() || '—',
        condition: form.condition.trim() || 'Good',
        department,
        category: fallbackCategory(department, form.category),
        seller: existing?.seller ?? seller,
        status: 'draft',
        description: form.description.trim() || 'No description provided.',
        shipping: DEFAULT_SHIPPING,
        photoCount: form.photoCount,
        createdAt: existing?.createdAt ?? todayStamp(),
        colour: existing?.colour,
        savedBy: existing?.savedBy ?? [],
      };
      upsert(listing);
      return listing;
    },
    [form, listings, upsert],
  );

  const publish = useCallback(
    (seller: string) => {
      if (!isListingFormPublishable(form) || !isDepartment(form.department)) return null;
      const existing = form.id ? listings.find((listing) => listing.id === form.id) : undefined;
      const listing: Listing = {
        id: existing?.id ?? `l-${Date.now()}`,
        title: form.title.trim(),
        brand: form.brand.trim() || 'Unbranded',
        price: parseListingPrice(form.price) ?? 0,
        size: form.size.trim() || '—',
        condition: form.condition,
        department: form.department,
        category: form.category,
        seller: existing?.seller ?? seller,
        status: 'available',
        description: form.description.trim() || 'No description provided.',
        shipping: DEFAULT_SHIPPING,
        photoCount: form.photoCount,
        createdAt: existing && existing.status !== 'draft' ? existing.createdAt : todayStamp(),
        colour: existing?.colour,
        savedBy: existing?.savedBy ?? [],
      };
      upsert(listing);
      setFormState(EMPTY_LISTING_FORM);
      return listing;
    },
    [form, listings, upsert],
  );

  const updateListing = useCallback((id: string, patch: Partial<Listing>) => {
    setListings((current) => current.map((listing) => (listing.id === id ? { ...listing, ...patch } : listing)));
  }, []);

  const setStatus = useCallback((id: string, status: ListingStatus) => {
    setListings((current) => current.map((listing) => (listing.id === id ? { ...listing, status } : listing)));
  }, []);

  const clearReservation = useCallback((id: string) => {
    setListings((current) =>
      current.map((listing) => (listing.id === id && listing.status === 'reserved' ? { ...listing, status: 'available' } : listing)),
    );
  }, []);

  const canDelete = useCallback(
    (id: string) => {
      const listing = listings.find((item) => item.id === id);
      return Boolean(listing && listing.status !== 'reserved');
    },
    [listings],
  );

  const removeListing = useCallback(
    (id: string) => {
      const listing = listings.find((item) => item.id === id);
      if (!listing || listing.status === 'reserved') return false;
      setListings((current) => current.filter((item) => item.id !== id));
      return true;
    },
    [listings],
  );

  const toggleSave = useCallback((listingId: string, username: string) => {
    setListings((current) =>
      current.map((listing) => {
        if (listing.id !== listingId) return listing;
        const saved = listing.savedBy.includes(username);
        return {
          ...listing,
          savedBy: saved ? listing.savedBy.filter((user) => user !== username) : [...listing.savedBy, username],
        };
      }),
    );
  }, []);

  const hideActiveForSeller = useCallback((username: string) => {
    setListings((current) =>
      current.map((listing) =>
        listing.seller === username && (listing.status === 'available' || listing.status === 'draft')
          ? { ...listing, status: 'hidden' as const }
          : listing,
      ),
    );
  }, []);

  const savedListingsFor = useCallback(
    (username: string) => listings.filter((listing) => listing.savedBy.includes(username)),
    [listings],
  );

  const value = useMemo(
    () => ({
      listings,
      form,
      getListing,
      listingsForSeller,
      setForm,
      resetForm,
      loadFormFromListing,
      saveDraft,
      publish,
      updateListing,
      setStatus,
      clearReservation,
      removeListing,
      canDelete,
      toggleSave,
      hideActiveForSeller,
      savedListingsFor,
    }),
    [
      canDelete,
      clearReservation,
      form,
      getListing,
      hideActiveForSeller,
      listings,
      listingsForSeller,
      loadFormFromListing,
      publish,
      removeListing,
      resetForm,
      saveDraft,
      savedListingsFor,
      setForm,
      setStatus,
      toggleSave,
      updateListing,
    ],
  );

  return <ListingsContext.Provider value={value}>{children}</ListingsContext.Provider>;
}

export function useListings() {
  const value = useContext(ListingsContext);
  if (!value) {
    throw new Error('useListings must be used within ListingsProvider');
  }
  return value;
}
