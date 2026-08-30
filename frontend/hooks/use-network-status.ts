import NetInfo from '@react-native-community/netinfo';
import { useEffect, useState } from 'react';

export function useNetworkStatus() {
  const [isConnected, setIsConnected] = useState<boolean | null>(true);

  useEffect(() => {
    const unsub = NetInfo.addEventListener((state) => {
      setIsConnected(state.isConnected ?? state.isInternetReachable ?? true);
    });
    NetInfo.fetch().then((state) => {
      setIsConnected(state.isConnected ?? state.isInternetReachable ?? true);
    });
    return () => unsub();
  }, []);

  return { isConnected: isConnected !== false, isUnknown: isConnected === null };
}
