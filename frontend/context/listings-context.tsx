import { apiFetch } from '@/lib/api';
import type { Department, Listing, ListingForm, ListingStatus } from '@/data/types';
import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';

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
  loading: boolean;
  form: ListingForm;
  refresh: () => Promise<void>;
  getListing: (id: string) => Listing | undefined;
  listingsForSeller: (username: string) => Listing[];
  setForm: (patch: Partial<ListingForm>) => void;
  resetForm: () => void;
  loadFormFromListing: (listing: Listing) => void;
  saveDraft: (seller: string) => Promise<Listing>;
  publish: (seller: string) => Promise<Listing | null>;
  updateListing: (id: string, patch: Partial<Listing>) => Promise<void>;
  setStatus: (id: string, status: ListingStatus) => Promise<void>;
  clearReservation: (id: string) => Promise<void>;
  removeListing: (id: string) => Promise<boolean>;
  canDelete: (id: string) => boolean;
  toggleSave: (listingId: string, username: string) => Promise<void>;
  hideActiveForSeller: (username: string) => Promise<void>;
  savedListingsFor: (username: string) => Promise<Listing[]>;
};

const ListingsContext = createContext<ListingsContextValue | null>(null);

function isDepartment(value: string): value is Department {
  return value === 'Women' || value === 'Men' || value === 'Kids';
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
  if (!form.category.trim()) return false;
  if (!form.condition.trim()) return false;
  return parseListingPrice(form.price) !== null;
}

export function ListingsProvider({ children }: { children: ReactNode }) {
  const [listings, setListings] = useState<Listing[]>([]);
  const [loading, setLoading] = useState(true);
  const [form, setFormState] = useState<ListingForm>(EMPTY_LISTING_FORM);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const data = await apiFetch<Listing[]>('/listings');
      setListings(data);
    } catch {
      // Backend offline or misconfigured — keep empty catalog; screens show offline/empty states
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const getListing = useCallback((id: string) => listings.find((listing) => listing.id === id), [listings]);

  const listingsForSeller = useCallback(
    async (username: string) => apiFetch<Listing[]>(`/listings/seller/${encodeURIComponent(username)}`),
    [],
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

  const saveDraft = useCallback(
    async (_seller: string) => {
      const body = {
        title: form.title,
        brand: form.brand,
        price: parseListingPrice(form.price) ?? 0,
        size: form.size,
        condition: form.condition,
        department: isDepartment(form.department) ? form.department : 'Women',
        category: form.category,
        description: form.description,
        photoUrls: form.photoCount > 0 ? [] : [],
      };

      const listing = form.id
        ? await apiFetch<Listing>(`/listings/${form.id}`, { method: 'PUT', body: JSON.stringify(body) })
        : await apiFetch<Listing>('/listings/draft', { method: 'POST', body: JSON.stringify(body) });

      setListings((current) => {
        const index = current.findIndex((item) => item.id === listing.id);
        if (index === -1) return [listing, ...current];
        const copy = [...current];
        copy[index] = listing;
        return copy;
      });
      setFormState((current) => ({ ...current, id: listing.id }));
      return listing;
    },
    [form],
  );

  const publish = useCallback(
    async (_seller: string) => {
      if (!isListingFormPublishable(form)) return null;
      const draft = await saveDraft(_seller);
      const listing = await apiFetch<Listing>(`/listings/${draft.id}/publish`, { method: 'POST' });
      setListings((current) => current.map((item) => (item.id === listing.id ? listing : item)));
      setFormState(EMPTY_LISTING_FORM);
      return listing;
    },
    [form, saveDraft],
  );

  const updateListing = useCallback(async (id: string, patch: Partial<Listing>) => {
    const listing = await apiFetch<Listing>(`/listings/${id}`, {
      method: 'PUT',
      body: JSON.stringify({
        title: patch.title,
        brand: patch.brand,
        price: patch.price,
        size: patch.size,
        condition: patch.condition,
        department: patch.department,
        category: patch.category,
        description: patch.description,
        colour: patch.colour,
      }),
    });
    setListings((current) => current.map((item) => (item.id === id ? listing : item)));
  }, []);

  const setStatus = useCallback(async (id: string, status: ListingStatus) => {
    if (status === 'reserved') {
      await apiFetch(`/listings/${id}/reserve`, { method: 'POST', body: '{}' });
    } else if (status === 'available') {
      await apiFetch(`/listings/${id}/release`, { method: 'POST' });
    } else if (status === 'sold') {
      await apiFetch(`/listings/${id}/sold`, { method: 'POST' });
    }
    setListings((current) => current.map((item) => (item.id === id ? { ...item, status } : item)));
  }, []);

  const clearReservation = useCallback(async (id: string) => {
    await apiFetch(`/listings/${id}/release`, { method: 'POST' });
    setListings((current) =>
      current.map((item) => (item.id === id && item.status === 'reserved' ? { ...item, status: 'available' } : item)),
    );
  }, []);

  const canDelete = useCallback(
    (id: string) => {
      const listing = listings.find((item) => item.id === id);
      return Boolean(listing && listing.status !== 'reserved');
    },
    [listings],
  );

  const removeListing = useCallback(async (id: string) => {
    const listing = listings.find((item) => item.id === id);
    if (!listing || listing.status === 'reserved') return false;
    await apiFetch(`/listings/${id}`, { method: 'DELETE' });
    setListings((current) => current.filter((item) => item.id !== id));
    return true;
  }, [listings]);

  const toggleSave = useCallback(async (listingId: string, username: string) => {
    const listing = listings.find((item) => item.id === listingId);
    const currentlySaved = listing?.savedBy.includes(username) ?? false;

    setListings((current) =>
      current.map((item) => {
        if (item.id !== listingId) return item;
        const nextSaved = currentlySaved
          ? item.savedBy.filter((user) => user !== username)
          : item.savedBy.includes(username)
            ? item.savedBy
            : [...item.savedBy, username];
        return { ...item, savedBy: nextSaved };
      }),
    );

    try {
      if (currentlySaved) {
        await apiFetch(`/listings/${listingId}/save`, { method: 'DELETE' });
      } else {
        await apiFetch(`/listings/${listingId}/save`, { method: 'POST' });
      }
    } catch {
      setListings((current) =>
        current.map((item) => {
          if (item.id !== listingId) return item;
          const nextSaved = currentlySaved
            ? item.savedBy.includes(username)
              ? item.savedBy
              : [...item.savedBy, username]
            : item.savedBy.filter((user) => user !== username);
          return { ...item, savedBy: nextSaved };
        }),
      );
      throw new Error('Could not update saved items.');
    }
  }, [listings]);

  const hideActiveForSeller = useCallback(async (_username: string) => {
    await refresh();
  }, [refresh]);

  const savedListingsFor = useCallback(async (_username: string) => {
    return apiFetch<Listing[]>('/listings/saved/me');
  }, []);

  const listingsForSellerSync = useCallback(
    (username: string) => listings.filter((listing) => listing.seller === username),
    [listings],
  );

  const value = useMemo(
    () => ({
      listings,
      loading,
      form,
      refresh,
      getListing,
      listingsForSeller: listingsForSellerSync,
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
      listingsForSellerSync,
      loadFormFromListing,
      loading,
      publish,
      refresh,
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
  if (!value) throw new Error('useListings must be used within ListingsProvider');
  return value;
}
