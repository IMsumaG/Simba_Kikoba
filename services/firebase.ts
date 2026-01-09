import AsyncStorage from '@react-native-async-storage/async-storage';
import { initializeApp } from "firebase/app";
// @ts-ignore
import { getReactNativePersistence, initializeAuth } from "firebase/auth";
import { initializeFirestore, persistentLocalCache } from "firebase/firestore";

// Load Firebase config from environment variables
// In Expo, public environment variables must be prefixed with EXPO_PUBLIC_
const firebaseConfig = {
    apiKey: process.env.EXPO_PUBLIC_FIREBASE_API_KEY,
    authDomain: process.env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN,
    projectId: process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID,
    storageBucket: process.env.EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET,
    messagingSenderId: process.env.EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
    appId: process.env.EXPO_PUBLIC_FIREBASE_APP_ID
};

// Validate that all required config values are present
const requiredConfigKeys = ['apiKey', 'authDomain', 'projectId', 'storageBucket', 'messagingSenderId', 'appId'];
const missingKeys = requiredConfigKeys.filter(key => !firebaseConfig[key as keyof typeof firebaseConfig]);

if (missingKeys.length > 0) {
    throw new Error(
        `Firebase configuration is incomplete. Missing: ${missingKeys.join(', ')}. ` +
        `Please set the following environment variables: ${missingKeys.map(k => `EXPO_PUBLIC_FIREBASE_${k.toUpperCase()}`).join(', ')}`
    );
}

const app = initializeApp(firebaseConfig);

// Initialize Auth with AsyncStorage persistence to keep users logged in
export const auth = initializeAuth(app, {
    persistence: getReactNativePersistence(AsyncStorage)
});

// Initialize Firestore with persistent cache and long polling for stability in mobile/expo
export const db = initializeFirestore(app, {
    localCache: persistentLocalCache({}),
    experimentalForceLongPolling: true,
});

export default app;
