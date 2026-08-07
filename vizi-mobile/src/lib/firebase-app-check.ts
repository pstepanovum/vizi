import {
  ReactNativeFirebaseAppCheckProvider,
  getToken,
  initializeAppCheck,
  type AppCheck,
} from '@react-native-firebase/app-check';
import { getApp } from '@react-native-firebase/app';

let appCheckPromise: Promise<AppCheck> | null = null;

/**
 * App Check for the native iOS/Android app (`com.vizi.mobile.app`), not a web app.
 * Dev/Simulator uses the debug provider + EXPO_PUBLIC_FIREBASE_APP_CHECK_DEBUG_TOKEN
 * (register under Firebase Console → App Check → iOS app → Manage debug tokens).
 */
export function ensureAppCheck(): Promise<AppCheck> {
  if (!appCheckPromise) {
    appCheckPromise = (async () => {
      const app = getApp();
      const debugToken = process.env.EXPO_PUBLIC_FIREBASE_APP_CHECK_DEBUG_TOKEN;
      const provider = new ReactNativeFirebaseAppCheckProvider();
      provider.configure({
        apple: {
          provider: __DEV__ ? 'debug' : 'appAttestWithDeviceCheckFallback',
          ...(debugToken ? { debugToken } : {}),
        },
        android: {
          provider: __DEV__ ? 'debug' : 'playIntegrity',
          ...(debugToken ? { debugToken } : {}),
        },
      });

      const appCheck = initializeAppCheck(app, {
        provider,
        isTokenAutoRefreshEnabled: true,
      });

      try {
        await getToken(appCheck, true);
      } catch {
        // Token fetch can fail until the debug token is registered for com.vizi.mobile.app.
      }

      return appCheck;
    })();
  }

  return appCheckPromise;
}
