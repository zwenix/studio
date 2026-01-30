import {createContext, useContext, ReactNode} from 'react';
import {FirebaseApp} from 'firebase/app';
import {Auth} from 'firebase/auth';
import {Firestore} from 'firebase/firestore';
import { FirebaseInstances } from '.';

const FirebaseContext = createContext<FirebaseInstances | undefined>(undefined);

type Props = {
  children: ReactNode;
} & FirebaseInstances;

export function FirebaseProvider({children, ...rest}: Props) {
  return (
    <FirebaseContext.Provider value={rest}>{children}</FirebaseContext.Provider>
  );
}

export function useFirebase() {
  const context = useContext(FirebaseContext);
  if (!context) {
    throw new Error('useFirebase must be used within a FirebaseProvider');
  }
  return context;
}

export function useFirebaseApp() {
    return useFirebase().app;
}

export function useAuth() {
    return useFirebase().auth;
}

export function useFirestore() {
    return useFirebase().firestore;
}
