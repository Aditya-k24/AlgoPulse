import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import { Platform } from 'react-native';
import Constants, { ExecutionEnvironment } from 'expo-constants';
import { getRecallTimestamps } from '../utils/recall';
import { upsertRecalls } from '../utils/storage';

/**
 * Expo Go dropped Android push notification support in SDK 53, and
 * expo-notifications raises a console error the moment it is touched there.
 * That error surfaces as a full-screen red LogBox overlay, which is both
 * alarming and useless — the feature genuinely cannot work in Expo Go.
 *
 * Local scheduled notifications are unaffected in a development build, so
 * this only degrades the one environment that could never support it.
 */
export const NOTIFICATIONS_SUPPORTED =
  Constants.executionEnvironment !== ExecutionEnvironment.StoreClient;

if (NOTIFICATIONS_SUPPORTED) {
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowBanner: true,
      shouldShowList: true,
      shouldPlaySound: true,
      shouldSetBadge: false,
    }),
  });
}

export class NotificationService {
  static async requestPermissions(): Promise<boolean> {
    if (!NOTIFICATIONS_SUPPORTED) return false;
    if (!Device.isDevice) {
      console.log('Must use physical device for Push Notifications');
      return false;
    }

    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;

    if (existingStatus !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }

    if (finalStatus !== 'granted') {
      console.log('Failed to get push token for push notification!');
      return false;
    }

    return true;
  }

  static async scheduleRecallNotifications(
    problemId: string,
    problemTitle: string,
    solvedAt: Date,
    plan: 'baseline' | 'time_crunch'
  ): Promise<string[]> {
    if (!NOTIFICATIONS_SUPPORTED) return [];
    const recallDates = getRecallTimestamps(solvedAt, plan);
    const notificationIds: string[] = [];

    // Save recalls to local storage
    const recallItems = recallDates.map(date => ({
      id: problemId,
      dueAt: date.toISOString(),
      completed: false,
    }));
    await upsertRecalls(recallItems);

    // Schedule notifications
    for (let i = 0; i < recallDates.length; i++) {
      const date = recallDates[i];
      const notificationId = await Notifications.scheduleNotificationAsync({
        content: {
          title: '🔄 Time to Recall!',
          body: `Ready to practice "${problemTitle}" again?`,
          data: { 
            problemId, 
            type: 'recall',
            recallIndex: i + 1,
            totalRecalls: recallDates.length
          },
        },
        trigger: { type: Notifications.SchedulableTriggerInputTypes.DATE, date },
      });

      notificationIds.push(notificationId);
    }

    return notificationIds;
  }

  static async cancelRecallNotifications(problemId: string): Promise<void> {
    if (!NOTIFICATIONS_SUPPORTED) return;
    const scheduledNotifications = await Notifications.getAllScheduledNotificationsAsync();
    
    for (const notification of scheduledNotifications) {
      if (notification.content.data?.problemId === problemId) {
        await Notifications.cancelScheduledNotificationAsync(notification.identifier);
      }
    }
  }

  static async clearAllNotifications(): Promise<void> {
    if (!NOTIFICATIONS_SUPPORTED) return;
    await Notifications.cancelAllScheduledNotificationsAsync();
  }

  static async getUpcomingNotifications(): Promise<Notifications.NotificationRequest[]> {
    if (!NOTIFICATIONS_SUPPORTED) return [];
    return await Notifications.getAllScheduledNotificationsAsync();
  }

  static async markRecallCompleted(problemId: string, recallIndex: number): Promise<void> {
    // Update local storage
    const recalls = await import('../utils/storage').then(m => m.getRecalls());
    const recallKey = `${problemId}:${recallIndex}`;
    
    if (recalls[recallKey]) {
      recalls[recallKey].completed = true;

      const { upsertRecalls } = await import('../utils/storage');
      await upsertRecalls([recalls[recallKey]]);
    }
  }
}


