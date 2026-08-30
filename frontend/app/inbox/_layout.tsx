import { Stack } from 'expo-router';

export default function InboxStackLayout() {
  return <Stack screenOptions={{ headerShown: false, animation: 'slide_from_right' }} />;
}
