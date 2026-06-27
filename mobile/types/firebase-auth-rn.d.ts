// getReactNativePersistence exists in the RN bundle but not in the browser typedefs.
// Metro resolves firebase/auth to the RN build at runtime; this declaration keeps TS happy.
import type { Persistence } from 'firebase/auth';

declare module 'firebase/auth' {
  export function getReactNativePersistence(
    storage: import('@react-native-async-storage/async-storage').default
  ): Persistence;
}
