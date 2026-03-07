
// src/firebase/firestore/use-doc.tsx
'use client';
import { useState, useEffect } from 'react';
import { onSnapshot, type DocumentReference, type DocumentData, doc, type Firestore } from 'firebase/firestore';
import { useFirestore } from '@/firebase';

interface DocData<T> {
  data: T | null;
  loading: boolean;
  error: Error | null;
}

export function useDoc<T extends DocumentData>(
  ref: DocumentReference<T> | null
): DocData<T> {
  const [docState, setDocState] = useState<DocData<T>>({
    data: null,
    loading: true,
    error: null,
  });

  useEffect(() => {
    if (!ref) {
      setDocState({ data: null, loading: false, error: null });
      return;
    }

    setDocState(prevState => ({ ...prevState, loading: true }));

    const unsubscribe = onSnapshot(
      ref,
      (snapshot) => {
        if (snapshot.exists()) {
          setDocState({
            data: { id: snapshot.id, ...snapshot.data() } as T,
            loading: false,
            error: null,
          });
        } else {
          setDocState({ data: null, loading: false, error: new Error('Document does not exist') });
        }
      },
      (err) => {
        console.error("Error fetching document:", err);
        setDocState({ data: null, loading: false, error: err });
      }
    );

    return () => unsubscribe();
  }, [ref]);

  return docState;
}

// Example usage:
// const db = useFirestore();
// const docRef = useMemoFirebase(() => db ? doc(db, 'collectionName', docId) : null, [db, docId]);
// const { data, loading, error } = useDoc<MyType>(docRef);
