import React from 'react';
import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import { Platform } from 'react-native';
import { analytics } from './analytics';
import i18n from './i18n';
import { registerFcmToken } from '../services/notificationService';
import { useIntegrationStore } from '../stores/integrationStore';

// Configure notification behavior
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

interface NotificationData {
  type: 'dive_reminder' | 'community_update' | 'device_connected' | 'safety_alert';
  title: string;
  body: string;
  data?: Record<string, any>;
}

class NotificationManager {
  private pushToken: string | null = null;

  async initialize() {
    try {
      // Request permissions
      const { status: existingStatus } = await Notifications.getPermissionsAsync();
      let finalStatus = existingStatus;

      if (existingStatus !== 'granted') {
        const { status } = await Notifications.requestPermissionsAsync();
        finalStatus = status;
      }

      if (finalStatus !== 'granted') {
        console.log('Push notification permission denied');
        return null;
      }

      // Get push token
      if (!Device.isDevice) {
        const debugToken = String(process.env.EXPO_PUBLIC_SIMULATOR_FCM_TOKEN || '').trim();
        if (debugToken) {
          this.pushToken = debugToken;
          await this.registerPushToken();
          analytics.action('Push Token Registered', { platform: Platform.OS, simulator: true });
          return debugToken;
        }
        console.log('Must use physical device for push notifications');
        return null;
      }

      const token = await this.getFirebaseMessagingToken();
      if (!token) {
        console.log('Failed to resolve Firebase messaging token');
        return null;
      }

      this.pushToken = token;

      // Register token with backend
      await this.registerPushToken();

      analytics.action('Push Token Registered', { platform: Platform.OS });

      return token;
    } catch (error) {
      console.error('Error initializing notifications:', error);
      analytics.error(error as Error, { context: 'notification_init' });
      return null;
    }
  }

  private async getFirebaseMessagingToken() {
    if (Platform.OS === 'web') return null;

    try {
      const { default: messaging } = await import('@react-native-firebase/messaging');
      const firebaseMessaging = messaging();
      await firebaseMessaging.registerDeviceForRemoteMessages().catch(() => undefined);
      await firebaseMessaging.requestPermission().catch(() => undefined);
      const token = await firebaseMessaging.getToken();
      const normalizedToken = String(token || '').trim();
      return normalizedToken || null;
    } catch (error) {
      console.error('Failed to get Firebase messaging token:', error);
      return null;
    }
  }

  private async registerPushToken() {
    if (!this.pushToken) return;

    try {
      await registerFcmToken(this.pushToken, Platform.OS);
      useIntegrationStore.getState().updateIntegration('fcm', {
        connected: true,
        statusMessage: '활성',
        lastSyncAt: new Date().toISOString(),
      });
    } catch (error) {
      useIntegrationStore.getState().updateIntegration('fcm', {
        connected: false,
        statusMessage: '토큰 등록 실패',
      });
      console.error('Failed to register push token:', error);
    }
  }

  // Schedule local notification
  async scheduleLocal(notification: NotificationData, trigger?: Notifications.NotificationTriggerInput) {
    try {
      const id = await Notifications.scheduleNotificationAsync({
        content: {
          title: notification.title,
          body: notification.body,
          data: notification.data,
          sound: 'default',
        },
        trigger: trigger || null,
      });

      analytics.action('Local Notification Scheduled', {
        type: notification.type,
        notificationId: id,
      });

      return id;
    } catch (error) {
      console.error('Error scheduling local notification:', error);
      analytics.error(error as Error, { context: 'local_notification' });
      return null;
    }
  }

  // Schedule dive reminder
  async scheduleDiveReminder(diveDate: Date, location?: string) {
    const reminderTime = new Date(diveDate.getTime() - 24 * 60 * 60 * 1000); // 24 hours before

    return this.scheduleLocal(
      {
        type: 'dive_reminder',
        title: i18n.t('notifications.diveReminderTitle'),
        body: location
          ? i18n.t('notifications.diveReminderBodyWithLocation', { location })
          : i18n.t('notifications.diveReminderBody'),
        data: { diveDate: diveDate.toISOString(), location },
      },
      {
        type: Notifications.SchedulableTriggerInputTypes.DATE,
        date: reminderTime,
      }
    );
  }

  // Handle notification received while app is running
  addNotificationReceivedListener(handler: (notification: Notifications.Notification) => void) {
    return Notifications.addNotificationReceivedListener(handler);
  }

  // Handle notification tapped
  addNotificationResponseReceivedListener(
    handler: (response: Notifications.NotificationResponse) => void
  ) {
    return Notifications.addNotificationResponseReceivedListener(handler);
  }

  // Cancel notification
  async cancelNotification(notificationId: string) {
    try {
      await Notifications.cancelScheduledNotificationAsync(notificationId);
      analytics.action('Notification Cancelled', { notificationId });
    } catch (error) {
      console.error('Error cancelling notification:', error);
    }
  }

  // Cancel all notifications
  async cancelAllNotifications() {
    try {
      await Notifications.cancelAllScheduledNotificationsAsync();
      analytics.action('All Notifications Cancelled');
    } catch (error) {
      console.error('Error cancelling all notifications:', error);
    }
  }

  // Get scheduled notifications
  async getScheduledNotifications() {
    try {
      return await Notifications.getAllScheduledNotificationsAsync();
    } catch (error) {
      console.error('Error getting scheduled notifications:', error);
      return [];
    }
  }

  // Set notification categories (iOS)
  async setNotificationCategories() {
    if (Platform.OS === 'ios') {
      await Notifications.setNotificationCategoryAsync('dive_reminder', [
        {
          identifier: 'view_dive',
          buttonTitle: i18n.t('notifications.viewDive'),
          options: { opensAppToForeground: true },
        },
        {
          identifier: 'snooze',
          buttonTitle: i18n.t('notifications.remindLater'),
          options: { opensAppToForeground: false },
        },
      ]);
    }
  }
}

export const notificationManager = new NotificationManager();

// React hook for notifications
export const useNotifications = (enabled = true) => {
  const [fcmToken, setFcmToken] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (!enabled) return;
    notificationManager.initialize().then(setFcmToken);
  }, [enabled]);

  return {
    fcmToken,
    scheduleLocal: notificationManager.scheduleLocal.bind(notificationManager),
    scheduleDiveReminder: notificationManager.scheduleDiveReminder.bind(notificationManager),
    cancelNotification: notificationManager.cancelNotification.bind(notificationManager),
    cancelAllNotifications: notificationManager.cancelAllNotifications.bind(notificationManager),
    getScheduledNotifications: notificationManager.getScheduledNotifications.bind(notificationManager),
  };
};
