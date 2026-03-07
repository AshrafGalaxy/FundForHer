
'use client';
import * as React from 'react';
import { useMemo, type DependencyList } from 'react';
import { type DocumentReference, type Query } from 'firebase/firestore';

// Helper function to compare Firestore queries and references
function isEqual(a: any, b: any): boolean {
  if (a === b) return true;
  if (!a || !b) return false;
  
  if (typeof a.isEqual === 'function') {
    return a.isEqual(b);
  }

  return false;
}

export function useMemoFirebase<T extends DocumentReference | Query | null>(
  factory: () => T,
  deps: DependencyList
): T {
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const value = useMemo(factory, deps);

  const previousValueRef = React.useRef<T>(value);
  
  React.useEffect(() => {
    if (!isEqual(value, previousValueRef.current)) {
      previousValueRef.current = value;
    }
  });

  return isEqual(value, previousValueRef.current) ? previousValueRef.current : value;
}
