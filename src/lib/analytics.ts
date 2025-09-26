import Constants from 'expo-constants';

interface AnalyticsEvent {
  name: string;
  properties?: Record<string, any>;
}

interface UserProperties {
  userId?: string;
  email?: string;
  provider?: string;
  [key: string]: any;
}

class Analytics {
  private isEnabled: boolean = false;
  private userId: string | null = null;

  constructor() {
    this.isEnabled = !__DEV__ && Constants.expoConfig?.extra?.analytics?.enabled;
  }

  // Initialize analytics with user info
  identify(userId: string, properties?: UserProperties) {
    if (!this.isEnabled) {
      console.log('[Analytics] Identify:', userId, properties);
      return;
    }

    this.userId = userId;
    
    // TODO: Initialize actual analytics service (Mixpanel, Amplitude, etc.)
    // Example:
    // Mixpanel.identify(userId);
    // Mixpanel.people.set(properties);
  }

  // Track events
  track(event: AnalyticsEvent) {
    if (!this.isEnabled) {
      console.log('[Analytics] Track:', event);
      return;
    }

    // TODO: Send to actual analytics service
    // Example:
    // Mixpanel.track(event.name, event.properties);
  }

  // Track screen views
  screen(screenName: string, properties?: Record<string, any>) {
    this.track({
      name: 'Screen View',
      properties: {
        screen: screenName,
        ...properties,
      },
    });
  }

  // Track user actions
  action(actionName: string, properties?: Record<string, any>) {
    this.track({
      name: actionName,
      properties,
    });
  }

  // Track dive-specific events
  diveEvent(eventName: string, diveData?: Record<string, any>) {
    this.track({
      name: `Dive ${eventName}`,
      properties: {
        category: 'diving',
        ...diveData,
      },
    });
  }

  // Track social interactions
  socialEvent(eventName: string, provider?: string, properties?: Record<string, any>) {
    this.track({
      name: `Social ${eventName}`,
      properties: {
        category: 'social',
        provider,
        ...properties,
      },
    });
  }

  // Track errors
  error(error: Error, context?: Record<string, any>) {
    this.track({
      name: 'Error',
      properties: {
        error: error.message,
        stack: error.stack,
        ...context,
      },
    });
  }

  // Reset analytics (on logout)
  reset() {
    this.userId = null;
    
    if (!this.isEnabled) {
      console.log('[Analytics] Reset');
      return;
    }

    // TODO: Reset actual analytics service
    // Example:
    // Mixpanel.reset();
  }
}

export const analytics = new Analytics();

// Convenience hooks for React components
export const useAnalytics = () => {
  return {
    track: analytics.track.bind(analytics),
    screen: analytics.screen.bind(analytics),
    action: analytics.action.bind(analytics),
    diveEvent: analytics.diveEvent.bind(analytics),
    socialEvent: analytics.socialEvent.bind(analytics),
    error: analytics.error.bind(analytics),
  };
};