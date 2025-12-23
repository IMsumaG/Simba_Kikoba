import AsyncStorage from '@react-native-async-storage/async-storage';
import { initializeApp } from "firebase/app";
// @ts-ignore
import { getReactNativePersistence, initializeAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { Secrets } from "../constants/Secrets";

// TODO: Replace with your actual Firebase config
const firebaseConfig = {
    apiKey: Secrets.FIREBASE.API_KEY,
    authDomain: Secrets.FIREBASE.AUTH_DOMAIN,
    projectId: Secrets.FIREBASE.PROJECT_ID,
    storageBucket: Secrets.FIREBASE.STORAGE_BUCKET,
    messagingSenderId: Secrets.FIREBASE.MESSAGING_SENDER_ID,
    appId: Secrets.FIREBASE.APP_ID
};

const app = initializeApp(firebaseConfig);

// Initialize Auth with AsyncStorage persistence to keep users logged in
export const auth = initializeAuth(app, {
    persistence: getReactNativePersistence(AsyncStorage)
});

export const db = getFirestore(app);

export default app;
