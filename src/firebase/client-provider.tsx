'use client';

import {ReactNode, useMemo} from 'react';
import {FirebaseProvider} from './provider';
import {initializeFirebase} from '.';

type Props = {
  children: ReactNode;
};

export function FirebaseClientProvider({children}: Props) {
  const instances = useMemo(initializeFirebase, []);

  return <FirebaseProvider {...instances}>{children}</FirebaseProvider>;
}
