import { ScreenHeader } from '@/components/ui/screen-header';
import { Palette } from '@/constants/theme';
import { offerStatusStyle, useInbox } from '@/context/inbox-context';
import { useAuth } from '@/context/auth-context';
import { useListings } from '@/context/listings-context';
import type { Offer } from '@/data/types';
import { formatNaira, formatRelativeTime } from '@/lib/format';
import { Redirect, useRouter } from 'expo-router';
import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

export default function OffersCentreScreen() {
  const router = useRouter();
  const { session } = useAuth();
  const inbox = useInbox();
  const { getListing } = useListings();
  const [tab, setTab] = useState<'received' | 'sent'>('received');

  if (!session) {
    return <Redirect href="/(auth)/welcome" />;
  }

  const { received, sent } = inbox.offersFor(session.username);
  const list = tab === 'received' ? received : sent;

  return (
    <View style={styles.screen}>
      <ScreenHeader title="Offers centre" onBack={() => router.back()} />
      <View style={styles.tabs}>
        <Pressable onPress={() => setTab('received')} style={[styles.tab, tab === 'received' ? styles.tabOn : null]}>
          <Text style={[styles.tabLabel, tab === 'received' ? styles.tabLabelOn : null]}>Received</Text>
        </Pressable>
        <Pressable onPress={() => setTab('sent')} style={[styles.tab, tab === 'sent' ? styles.tabOn : null]}>
          <Text style={[styles.tabLabel, tab === 'sent' ? styles.tabLabelOn : null]}>Sent</Text>
        </Pressable>
      </View>
      <ScrollView contentContainerStyle={styles.body}>
        {list.length === 0 ? (
          <Text style={styles.empty}>{tab === 'received' ? 'No offers yet.' : 'No offers sent yet.'}</Text>
        ) : (
          list.map((offer) => (
            <OfferCard
              key={offer.id}
              offer={offer}
              listingTitle={getListing(offer.listingId)?.title ?? 'Listing'}
              counterpart={tab === 'received' ? (offer.initiator === 'buyer' ? offer.buyer : offer.seller) : offer.initiator === 'buyer' ? offer.seller : offer.buyer}
              prefix={tab === 'received' ? 'from' : 'to'}
              onPress={() => router.push(`/inbox/offer/${offer.id}`)}
            />
          ))
        )}
      </ScrollView>
    </View>
  );
}

function OfferCard({
  offer,
  listingTitle,
  counterpart,
  prefix,
  onPress,
}: {
  offer: Offer;
  listingTitle: string;
  counterpart: string;
  prefix: string;
  onPress: () => void;
}) {
  const status = offerStatusStyle(offer.status);
  return (
    <Pressable onPress={onPress} style={styles.card}>
      <View style={styles.cardTop}>
        <Text style={styles.cardTitle}>{listingTitle}</Text>
        <View style={[styles.chip, { backgroundColor: status.backgroundColor }]}>
          <Text style={[styles.chipText, { color: status.color }]}>{status.label}</Text>
        </View>
      </View>
      <Text style={styles.cardMeta}>
        {prefix} @{counterpart} · {formatRelativeTime(offer.createdAt)}
      </Text>
      <Text style={styles.cardAmount}>{formatNaira(offer.amount)}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: Palette.background,
  },
  tabs: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: Palette.borderSoft,
    marginHorizontal: 20,
    marginBottom: 10,
  },
  tab: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  tabOn: {
    borderBottomColor: Palette.text,
  },
  tabLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: Palette.muted3,
  },
  tabLabelOn: {
    fontWeight: '700',
    color: Palette.text,
  },
  body: {
    paddingHorizontal: 20,
    paddingBottom: 24,
  },
  empty: {
    textAlign: 'center',
    paddingTop: 40,
    fontSize: 13,
    color: Palette.muted3,
  },
  card: {
    borderWidth: 1,
    borderColor: Palette.borderSoft,
    borderRadius: 10,
    padding: 14,
    marginBottom: 12,
  },
  cardTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  cardTitle: {
    flex: 1,
    fontSize: 13,
    fontWeight: '600',
    color: Palette.text,
  },
  chip: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  chipText: {
    fontSize: 11,
    fontWeight: '600',
  },
  cardMeta: {
    marginTop: 4,
    fontSize: 12,
    color: Palette.muted2,
  },
  cardAmount: {
    marginTop: 8,
    fontSize: 17,
    fontWeight: '700',
    color: Palette.text,
  },
});
