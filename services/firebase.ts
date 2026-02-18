import AsyncStorage from '@react-native-async-storage/async-storage';
import { initializeApp } from "firebase/app";
import { getAuth, initializeAuth } from "firebase/auth";
import { initializeFirestore, persistentLocalCache } from "firebase/firestore";
import { Platform } from 'react-native';

// Note: getReactNativePersistence is available in React Native/Expo environment
// but TypeScript doesn't recognize it in the standard firebase/auth types
// const { getReactNativePersistence } = require("firebase/auth") as any;

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

// Map of config keys to their corresponding environment variable names
const envVarMap: Record<string, string> = {
    apiKey: 'EXPO_PUBLIC_FIREBASE_API_KEY',
    authDomain: 'EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN',
    projectId: 'EXPO_PUBLIC_FIREBASE_PROJECT_ID',
    storageBucket: 'EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET',
    messagingSenderId: 'EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID',
    appId: 'EXPO_PUBLIC_FIREBASE_APP_ID'
};

const missingKeys = Object.keys(envVarMap).filter(key => !firebaseConfig[key as keyof typeof firebaseConfig]);

if (missingKeys.length > 0) {
    const missingVars = missingKeys.map(key => envVarMap[key]);
    throw new Error(
        `Firebase configuration is incomplete. Missing: ${missingKeys.join(', ')}. ` +
        `Please set the following environment variables in your .env.local or EAS secrets: \n${missingVars.join('\n')}`
    );
}

const app = initializeApp(firebaseConfig);

// Initialize Auth with AsyncStorage persistence to keep users logged in
export const auth = Platform.OS === "web"
    ? getAuth(app)
    : initializeAuth(app, {
        persistence: (require("firebase/auth") as any).getReactNativePersistence(AsyncStorage)
    });

// Initialize Firestore with persistent cache and long polling for stability in mobile/expo
export const db = initializeFirestore(app, {
    localCache: persistentLocalCache({}),
    experimentalForceLongPolling: true,
});

export default app;
