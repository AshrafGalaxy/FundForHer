

import type { ProviderProfile } from '@/server/db/user-data';
import { doc, getDoc, type Firestore } from 'firebase/firestore';


/**
 * Retrieves a provider's profile from Firestore.
 */
export const getProviderProfile = async (db: Firestore, uid: string): Promise<ProviderProfile | null> => {
    const providerRef = doc(db, 'providers', uid);
    const docSnap = await getDoc(providerRef);
    if (docSnap.exists()) {
        return { ...docSnap.data(), uid } as ProviderProfile;
    }
    return null;
};