
// src/lib/auth.ts
'use client';
// Note: Functions now accept auth and db instances as parameters.

import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  updateProfile,
  type Auth,
  deleteUser,
  GoogleAuthProvider,
  signInWithPopup
} from 'firebase/auth';
import { createInitialUserProfile, deleteUserProfile, createInitialProviderProfile, getUserProfile } from '@/server/db/user-data';
import type { ProviderProfile } from '@/server/db/user-data';
import type { Firestore } from 'firebase/firestore';


// For Students
export const register = async (
  auth: Auth,
  db: Firestore,
  email: string,
  password: string,
  fullName: string,
  phone: string,
  dob: Date,
  qualification: string
) => {
  const userCredential = await createUserWithEmailAndPassword(auth, email, password);
  const user = userCredential.user;

  // Update Firebase Auth profile
  await updateProfile(user, {
    displayName: fullName,
  });

  // Create profile in Firestore
  await createInitialUserProfile(db, user.uid, {
    fullName,
    email,
    phone,
    dob,
    qualification
  });

  return user;
};

// For Providers
export const registerProvider = async (
  auth: Auth,
  db: Firestore,
  providerData: Omit<ProviderProfile, 'uid' | 'createdAt' | 'updatedAt'>,
  password: string
) => {
  const { email, companyName } = providerData;
  const userCredential = await createUserWithEmailAndPassword(auth, email, password);
  const user = userCredential.user;

  await updateProfile(user, {
    displayName: companyName,
  });

  await createInitialProviderProfile(db, user.uid, providerData);

  return user;
};


export const login = async (auth: Auth, email: string, password: string) => {
  const userCredential = await signInWithEmailAndPassword(auth, email, password);
  return userCredential.user;
};

export const logout = async (auth: Auth) => {
  return await signOut(auth);
};

export const deleteAccount = async (auth: Auth, db: Firestore, uid: string) => {
  const user = auth.currentUser;
  if (!user || user.uid !== uid) {
    throw new Error("No user is currently logged in or permission denied.");
  }

  // First, delete the user's profile data from Firestore.
  await deleteUserProfile(db, user.uid);

  // Then, delete the user from Firebase Authentication.
  await deleteUser(user);
};
