import * as Notifications from 'expo-notifications';

export async function requestPermission(): Promise<boolean> {
  const settings = await Notifications.getPermissionsAsync();
  if (settings.status !== 'granted') {
    const res = await Notifications.requestPermissionsAsync();
    return res.status === 'granted';
  }
  return true;
}

export async function scheduleLocal(title: string, body: string, triggerDate: Date) {
  return Notifications.scheduleNotificationAsync({
    content: { title, body },
    trigger: triggerDate,
  });
}

export async function cancelNotification(id: string) {
  await Notifications.cancelScheduledNotificationAsync(id);
}
