'use client';

import { firebaseConfig } from '@/firebase/config';
import { initializeApp, getApps, getApp, FirebaseApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { getStorage, setMaxUploadRetryTime, setMaxOperationRetryTime } from 'firebase/storage';

// IMPORTANT: DO NOT MODIFY THIS FUNCTION
export function initializeFirebase() {
  if (!getApps().length) {
    // We always initialize with the explicit config to ensure properties
    // like storageBucket are correctly applied, even in App Hosting.
    const firebaseApp = initializeApp(firebaseConfig);
    return getSdks(firebaseApp);
  }

  // If already initialized, return the SDKs with the already initialized App
  return getSdks(getApp());
}

export function getSdks(firebaseApp: FirebaseApp) {
  const storage = getStorage(firebaseApp);
  
  // Increase timeouts to prevent "Storage maximum time exceeded" errors
  // setMaxUploadRetryTime sets the max time to retry a single upload (e.g. 5 minutes)
  setMaxUploadRetryTime(storage, 300000);
  // setMaxOperationRetryTime sets the max time for any operation (e.g. 5 minutes)
  setMaxOperationRetryTime(storage, 300000);

  return {
    firebaseApp,
    auth: getAuth(firebaseApp),
    firestore: getFirestore(firebaseApp),
    storage
  };
}

export * from './provider';
export * from './client-provider';
export * from './firestore/use-collection';
export * from './firestore/use-doc';
export * from './non-blocking-updates';
export * from './non-blocking-login';
export * from './errors';
export * from './error-emitter';
