
// src/lib/user-data.ts
// Note: All functions now require a Firestore 'db' instance to be passed in.

import { doc, setDoc, getDoc, serverTimestamp, updateDoc, deleteDoc, Timestamp, type Firestore } from 'firebase/firestore';

// For Students
export interface UserProfile {
  uid: string;
  fullName: string;
  email: string;
  phone: string;
  age: number;
  dob: Date | Timestamp;
  qualification: string;
  address: string | null;
  college: string | null;
  fieldOfStudy: string | null;
  aadhar: string | null;
  createdAt: any;
  updatedAt: any;
}

// For Scholarship Providers
export interface ProviderProfile {
  uid: string;
  companyName: string;
  email: string;
  companyPhone: string;
  registrationNumber: string;
  gstNumber: string;
  kycStatus: 'pending' | 'verified' | 'rejected' | 'require_more_info';
  kycDocumentUrl: string | null;
  createdAt: any;
  updatedAt: any;
}


/**
 * Creates an initial user profile document in Firestore when a user registers.
 */
export const createInitialUserProfile = async (db: Firestore, uid: string, data: { fullName: string, email: string, phone: string, dob: Date, qualification: string }): Promise<void> => {
  const userRef = doc(db, 'users', uid);

  // Calculate strict age securely on the backend
  const today = new Date();
  let calculatedAge = today.getFullYear() - data.dob.getFullYear();
  const m = today.getMonth() - data.dob.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < data.dob.getDate())) {
    calculatedAge--;
  }

  const newProfile: Omit<UserProfile, 'uid'> = {
    fullName: data.fullName,
    email: data.email,
    phone: data.phone,
    age: calculatedAge,
    dob: data.dob,
    qualification: data.qualification,
    address: null,
    college: null,
    fieldOfStudy: null,
    aadhar: null,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  };
  await setDoc(userRef, newProfile);
};

/**
 * Creates an initial provider profile document in Firestore when a provider registers.
 */
export const createInitialProviderProfile = async (db: Firestore, uid: string, data: Omit<ProviderProfile, 'uid' | 'createdAt' | 'updatedAt'>): Promise<void> => {
  const providerRef = doc(db, 'providers', uid);
  const newProfile = {
    ...data,
    uid: uid,
    kycStatus: data.kycStatus || 'pending',
    kycDocumentUrl: data.kycDocumentUrl || null,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  };
  await setDoc(providerRef, newProfile);
};


/**
 * Retrieves a user's profile from Firestore.
 */
export const getUserProfile = async (db: Firestore, uid: string): Promise<UserProfile | null> => {
  const userRef = doc(db, 'users', uid);
  const docSnap = await getDoc(userRef);

  if (docSnap.exists()) {
    const data = docSnap.data();
    // Convert Firestore Timestamp to JS Date object if it exists
    if (data.dob && typeof data.dob.toDate === 'function') {
      data.dob = data.dob.toDate();
    }
    return { ...data, uid } as UserProfile;
  }
  return null;
};


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
}

/**
 * Updates a user's profile in Firestore.
 */
export const updateUserProfile = async (db: Firestore, uid: string, data: Partial<Omit<UserProfile, 'uid'>>) => {
  const userRef = doc(db, 'users', uid);

  await updateDoc(userRef, {
    ...data,
    updatedAt: serverTimestamp(),
  });
};

/**
 * Deletes a user's profile document from Firestore.
 */
export const deleteUserProfile = async (db: Firestore, uid: string) => {
  const userRef = doc(db, 'users', uid);
  await deleteDoc(userRef);
}

/**
 * Updates a provider's profile in Firestore (e.g., for setting KYC URL).
 */
export const updateProviderProfile = async (db: Firestore, uid: string, data: Partial<Omit<ProviderProfile, 'uid'>>) => {
  const providerRef = doc(db, 'providers', uid);
  await updateDoc(providerRef, {
    ...data,
    updatedAt: serverTimestamp(),
  });
};
