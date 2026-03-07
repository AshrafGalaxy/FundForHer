
// src/firebase/firestore/use-collection.tsx
'use client';
import { useState, useEffect } from 'react';
import { onSnapshot, type Query, type DocumentData } from 'firebase/firestore';

interface CollectionData<T> {
  data: T[];
  loading: boolean;
  error: Error | null;
}

export function useCollection<T extends DocumentData>(
  query: Query<T> | null
): CollectionData<T> {
  const [collectionState, setCollectionState] = useState<CollectionData<T>>({
    data: [],
    loading: true,
    error: null,
  });

  useEffect(() => {
    if (!query) {
      setCollectionState({ data: [], loading: false, error: null });
      return;
    }
    
    setCollectionState(prevState => ({ ...prevState, loading: true }));

    const unsubscribe = onSnapshot(
      query,
      (snapshot) => {
        const data: T[] = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as T));
        setCollectionState({ data, loading: false, error: null });
      },
      (err) => {
        console.error("Error fetching collection:", err);
        setCollectionState({ data: [], loading: false, error: err });
      }
    );

    return () => unsubscribe();
  }, [query]);

  return collectionState;
}

// Example usage:
// const db = useFirestore();
// const collectionQuery = useMemoFirebase(() => db ? collection(db, 'myCollection') : null, [db]);
// const { data, loading, error } = useCollection<MyType>(collectionQuery);
