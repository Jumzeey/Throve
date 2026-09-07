import NetInfo, { type NetInfoState } from '@react-native-community/netinfo';
import { useEffect, useState } from 'react';

/** Only treat as offline when NetInfo is explicitly negative (null/unknown stays online). */
function deriveConnected(state: NetInfoState): boolean {
  if (state.isInternetReachable === false) return false;
  if (state.isConnected === false && state.isInternetReachable == null) {
    // iOS Simulator often reports isConnected=false while reachability is still unknown.
    return true;
  }
  return state.isConnected !== false;
}

export function useNetworkStatus() {
  const [isConnected, setIsConnected] = useState<boolean | null>(true);

  useEffect(() => {
    const unsub = NetInfo.addEventListener((state) => {
      setIsConnected(deriveConnected(state));
    });
    NetInfo.fetch().then((state) => {
      setIsConnected(deriveConnected(state));
    });
    return () => unsub();
  }, []);

  return { isConnected: isConnected !== false, isUnknown: isConnected === null };
}
