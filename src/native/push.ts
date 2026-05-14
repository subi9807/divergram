import type { PluginListenerHandle } from '@capacitor/core';
import { PushNotifications } from '@capacitor/push-notifications';
import { emitNativeState, emitRequestStart } from './bridge';
import type { NativeFeatureState } from './types';

export async function requestPushNative(): Promise<NativeFeatureState> {
  const requestId = emitRequestStart('push');

  try {
    let perm = await PushNotifications.checkPermissions();
    if (perm.receive !== 'granted') {
      perm = await PushNotifications.requestPermissions();
    }

    if (perm.receive !== 'granted') {
      const denied: NativeFeatureState = {
        feature: 'push',
        ok: false,
        available: true,
        permission: perm.receive,
        error: 'permission_denied',
        phase: 'response',
        requestId,
      };
      emitNativeState(denied);
      return denied;
    }

    let registrationHandle: PluginListenerHandle | null = null;
    let registrationErrorHandle: PluginListenerHandle | null = null;

    const cleanup = () => {
      if (registrationHandle) {
        void registrationHandle.remove();
        registrationHandle = null;
      }
      if (registrationErrorHandle) {
        void registrationErrorHandle.remove();
        registrationErrorHandle = null;
      }
    };

    const token = await new Promise<string>(async (resolve, reject) => {
      const timeout = window.setTimeout(() => {
        cleanup();
        reject(new Error('push_register_timeout'));
      }, 15000);

      registrationHandle = await PushNotifications.addListener('registration', (data) => {
        window.clearTimeout(timeout);
        cleanup();
        resolve(data.value);
      });

      registrationErrorHandle = await PushNotifications.addListener('registrationError', (error) => {
        window.clearTimeout(timeout);
        cleanup();
        reject(error);
      });

      await PushNotifications.register();
    });

    const result: NativeFeatureState = {
      feature: 'push',
      ok: true,
      available: true,
      permission: perm.receive,
      payload: { token },
      phase: 'response',
      requestId,
    };

    emitNativeState(result);
    return result;
  } catch (error) {
    const failed: NativeFeatureState = {
      feature: 'push',
      ok: false,
      available: true,
      error: String(error),
      phase: 'response',
      requestId,
    };
    emitNativeState(failed);
    return failed;
  }
}
