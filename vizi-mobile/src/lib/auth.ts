import {
  AppleAuthProvider,
  getAuth,
  GoogleAuthProvider,
  onAuthStateChanged,
  signInAnonymously,
  signInWithCredential,
  signOut,
  type User,
} from '@react-native-firebase/auth';
import { GoogleSignin } from '@react-native-google-signin/google-signin';
import * as AppleAuthentication from 'expo-apple-authentication';
import * as Crypto from 'expo-crypto';
import { useEffect, useState } from 'react';

// Firebase web client id (Firebase console → Auth → Google provider → Web SDK
// configuration). Required for Google Sign-In to mint Firebase-compatible
// tokens.
const GOOGLE_WEB_CLIENT_ID = process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID;

export type AuthUser = User;

let googleConfigured = false;

function ensureGoogleConfigured() {
  if (!GOOGLE_WEB_CLIENT_ID) {
    throw new Error(
      'Google Sign-In is not configured — set EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID in .env',
    );
  }
  if (!googleConfigured) {
    GoogleSignin.configure({ webClientId: GOOGLE_WEB_CLIENT_ID });
    googleConfigured = true;
  }
}

// undefined = still resolving persisted session, null = signed out.
export function useAuthUser(): AuthUser | null | undefined {
  const [user, setUser] = useState<AuthUser | null | undefined>(undefined);
  useEffect(() => onAuthStateChanged(getAuth(), setUser), []);
  return user;
}

export async function signInWithGoogle(): Promise<AuthUser> {
  ensureGoogleConfigured();
  console.log('[vizi:auth] google sign-in started');
  await GoogleSignin.hasPlayServices({ showPlayServicesUpdateDialog: true }).catch(() => {
    // iOS has no Play Services — ignore.
  });
  const result = await GoogleSignin.signIn();
  const idToken = result.data?.idToken;
  if (!idToken) {
    throw new Error('Google sign-in was cancelled');
  }
  const { user } = await signInWithCredential(getAuth(), GoogleAuthProvider.credential(idToken));
  console.log(`[vizi:auth] google sign-in ok (${user.uid})`);
  return user;
}

export async function signInWithApple(): Promise<AuthUser> {
  console.log('[vizi:auth] apple sign-in started');
  // Firebase requires the raw nonce; Apple receives its SHA-256 hash.
  const rawNonce = Crypto.randomUUID();
  const hashedNonce = await Crypto.digestStringAsync(
    Crypto.CryptoDigestAlgorithm.SHA256,
    rawNonce,
  );
  const appleCredential = await AppleAuthentication.signInAsync({
    requestedScopes: [
      AppleAuthentication.AppleAuthenticationScope.FULL_NAME,
      AppleAuthentication.AppleAuthenticationScope.EMAIL,
    ],
    nonce: hashedNonce,
  });
  if (!appleCredential.identityToken) {
    throw new Error('Apple sign-in was cancelled');
  }
  const { user } = await signInWithCredential(
    getAuth(),
    AppleAuthProvider.credential(appleCredential.identityToken, rawNonce),
  );
  console.log(`[vizi:auth] apple sign-in ok (${user.uid})`);
  return user;
}

export async function signInAsGuest(): Promise<AuthUser> {
  console.log('[vizi:auth] guest sign-in started');
  const { user } = await signInAnonymously(getAuth());
  console.log(`[vizi:auth] guest sign-in ok (${user.uid})`);
  return user;
}

export async function signOutUser(): Promise<void> {
  try {
    await GoogleSignin.signOut();
  } catch {
    // Not signed in with Google — nothing to do.
  }
  await signOut(getAuth());
  console.log('[vizi:auth] signed out');
}
