import { apiFetch, apiUpload } from '@/lib/api';
import { isLocalListingPhotoUri, isUploadableLocalFileUri, listingPhotoFormPart } from '@/lib/listing-photos';
import { getCachedListingCatalog, listingFormIssues, fetchListingCatalog } from '@/lib/listing-catalog';
import { useAuth } from '@/context/auth-context';
import type { Department, Listing, ListingForm, ListingStatus } from '@/data/types';
import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';

export const EMPTY_LISTING_FORM: ListingForm = {
  photoCount: 0,
  photoUris: [],
  title: '',
  department: '',
  category: '',
  brand: '',
  condition: '',
  productType: '',
  size: '',
  colour: '',
  price: '',
  description: '',
  shippingMethod: '',
};

export const PREVIEW_ERROR = 'Add a photo, then fill in title, department, category, condition and price.';

type ListingsContextValue = {
  listings: Listing[];
  savedListings: Listing[];
  loading: boolean;
  form: ListingForm;
  refresh: () => Promise<boolean>;
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
  savedListingsFor: (username: string) => Listing[];
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
  const catalog = getCachedListingCatalog();
  if (catalog) return listingFormIssues(form, catalog).length === 0;
  if ((form.photoUris?.length ?? form.photoCount) < 1) return false;
  if (!form.title.trim()) return false;
  if (!isDepartment(form.department)) return false;
  if (!form.category.trim()) return false;
  if (!form.condition.trim()) return false;
  return parseListingPrice(form.price) !== null;
}

export function ListingsProvider({ children }: { children: ReactNode }) {
  const { isReady, session } = useAuth();
  const [listings, setListings] = useState<Listing[]>([]);
  const [savedListings, setSavedListings] = useState<Listing[]>([]);
  const [loading, setLoading] = useState(true);
  const [form, setFormState] = useState<ListingForm>(EMPTY_LISTING_FORM);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const catalog = await apiFetch<Listing[]>('/listings');
      let mine: Listing[] = [];
      let saved: Listing[] = [];
      if (session) {
        try {
          mine = await apiFetch<Listing[]>('/listings/mine');
        } catch {
          mine = [];
        }
        try {
          saved = await apiFetch<Listing[]>('/listings/saved/me');
        } catch {
          saved = [];
        }
      }
      const username = session?.username;
      const others = username ? catalog.filter((item) => item.seller !== username) : catalog;
      setListings(username ? [...mine, ...others] : catalog);
      setSavedListings(saved);
      void fetchListingCatalog().catch(() => undefined);
      return true;
    } catch {
      return false;
    } finally {
      setLoading(false);
    }
  }, [session]);

  useEffect(() => {
    if (!isReady) return;
    void refresh();
  }, [isReady, session?.userId, refresh]);

  const getListing = useCallback((id: string) => listings.find((listing) => listing.id === id), [listings]);

  const setForm = useCallback((patch: Partial<ListingForm>) => {
    setFormState((current) => ({ ...current, ...patch }));
  }, []);

  const resetForm = useCallback(() => {
    setFormState(EMPTY_LISTING_FORM);
  }, []);

  const loadFormFromListing = useCallback((listing: Listing) => {
    const photoUris = listing.photoUrls?.length ? [...listing.photoUrls] : [];
    setFormState({
      id: listing.id,
      photoCount: photoUris.length || listing.photoCount,
      photoUris,
      title: listing.title === 'Untitled draft' ? '' : listing.title,
      department: listing.department,
      category: listing.category,
      brand: listing.brand === 'Unbranded' ? '' : listing.brand,
      condition: listing.condition,
      productType: listing.category,
      size: listing.size === '—' ? '' : listing.size,
      colour: listing.colour ?? '',
      price: listing.price > 0 ? String(listing.price) : '',
      description: listing.description === 'No description provided.' ? '' : listing.description,
      shippingMethod: listing.shipping.toLowerCase().includes('express') ? 'Express' : 'Standard',
    });
  }, []);

  const resolvePhotoUrls = useCallback(async (uris: string[]) => {
    if (!uris.length) return [] as string[];

    const remote = uris.filter((uri) => !isLocalListingPhotoUri(uri));
    const local = uris.filter((uri) => isLocalListingPhotoUri(uri) && isUploadableLocalFileUri(uri));
    if (!local.length) return remote;

    const formData = new FormData();
    local.forEach((uri, index) => {
      formData.append('files', listingPhotoFormPart(uri, index) as unknown as Blob);
    });

    const uploaded = await apiUpload<{ urls: string[] }>('/media/listing-photos', formData);
    return [...remote, ...(uploaded.urls ?? [])];
  }, []);

  const saveDraft = useCallback(
    async (_seller: string) => {
      const photoUrls = await resolvePhotoUrls(form.photoUris ?? []);
      const body = {
        title: form.title,
        brand: form.brand,
        price: parseListingPrice(form.price) ?? 0,
        size: form.size,
        colour: form.colour,
        condition: form.condition,
        department: isDepartment(form.department) ? form.department : 'Women',
        category: form.category,
        description: form.description,
        photoUrls,
        shippingMethod: form.shippingMethod || undefined,
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
      setFormState((current) => ({
        ...current,
        id: listing.id,
        photoUris: listing.photoUrls?.length ? [...listing.photoUrls] : photoUrls,
        photoCount: listing.photoCount || photoUrls.length,
      }));
      return listing;
    },
    [form, resolvePhotoUrls],
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
    setSavedListings((current) => current.map((item) => (item.id === id ? { ...item, status } : item)));
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
      return Boolean(listing && listing.status !== 'reserved' && listing.status !== 'sold' && listing.status !== 'removed');
    },
    [listings],
  );

  const removeListing = useCallback(async (id: string) => {
    const listing = listings.find((item) => item.id === id);
    if (!listing || listing.status === 'reserved' || listing.status === 'sold') return false;
    await apiFetch(`/listings/${id}`, { method: 'DELETE' });
    setListings((current) => current.filter((item) => item.id !== id));
    setSavedListings((current) =>
      current.map((item) => (item.id === id ? { ...item, status: 'removed' as const } : item)),
    );
    return true;
  }, [listings]);

  const toggleSave = useCallback(async (listingId: string, username: string) => {
    const listing = listings.find((item) => item.id === listingId) ?? savedListings.find((item) => item.id === listingId);
    const currentlySaved =
      listing?.savedBy.includes(username) || savedListings.some((item) => item.id === listingId) || false;

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
    setSavedListings((current) => {
      if (currentlySaved) return current.filter((item) => item.id !== listingId);
      if (!listing) return current;
      if (current.some((item) => item.id === listingId)) return current;
      return [{ ...listing, savedBy: [...new Set([...listing.savedBy, username])] }, ...current];
    });

    try {
      if (currentlySaved) {
        await apiFetch(`/listings/${listingId}/save`, { method: 'DELETE' });
      } else {
        await apiFetch(`/listings/${listingId}/save`, { method: 'POST' });
      }
    } catch {
      await refresh();
      throw new Error('Could not update saved items.');
    }
  }, [listings, refresh, savedListings]);

  const hideActiveForSeller = useCallback(async (_username: string) => {
    await refresh();
  }, [refresh]);

  const savedListingsFor = useCallback(
    (_username: string) => savedListings,
    [savedListings],
  );

  const listingsForSellerSync = useCallback(
    (username: string) => listings.filter((listing) => listing.seller === username),
    [listings],
  );

  const value = useMemo(
    () => ({
      listings,
      savedListings,
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
      savedListings,
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
