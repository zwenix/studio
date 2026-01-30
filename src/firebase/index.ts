import {initializeApp, getApps, FirebaseApp} from 'firebase/app';
import {Auth, getAuth} from 'firebase/auth';
import {Firestore, getFirestore} from 'firebase/firestore';

import {firebaseConfig} from './config';
import {FirebaseProvider, useAuth, useFirebase, useFirebaseApp, useFirestore} from './provider';
import {FirebaseClientProvider} from './client-provider';
import {useUser} from './auth/use-user';


export type FirebaseInstances = {
  app: FirebaseApp;
  auth: Auth;
  firestore: Firestore;
};

let firebaseInstances: FirebaseInstances | null = null;

export function initializeFirebase(): FirebaseInstances {
  if (firebaseInstances) {
    return firebaseInstances;
  }

  if (getApps().length > 0) {
    const app = getApps()[0];
    const auth = getAuth(app);
    const firestore = getFirestore(app);
    firebaseInstances = {app, auth, firestore};
    return firebaseInstances;
  }

  const app = initializeApp(firebaseConfig);
  const auth = getAuth(app);
  const firestore = getFirestore(app);

  firebaseInstances = {app, auth, firestore};
  return firebaseInstances;
}


export {
    FirebaseProvider,
    FirebaseClientProvider,
    useUser,
    useFirebase,
    useFirebaseApp,
    useFirestore,
    useAuth,
}
