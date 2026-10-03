'use client';

import { useEffect, useId, useRef } from 'react';
import { pet } from './api';
import type { PetRule } from './types';

/**
 * Reguły aktywne tylko, gdy komponent jest zamontowany – np. na konkretnej podstronie panelu.
 *
 *   usePetRules([{ when: { on: 'appear', selector: '.order-row' }, do: { play: 'allegro', trick: 'toss' } }]);
 *
 * Reguły są wczytywane przy montowaniu i przy zmianie `deps`.
 */
export function usePetRules(rules: PetRule[], deps: unknown[] = []) {
  const id = useId();
  const ref = useRef(rules);
  useEffect(() => {
    ref.current = rules;
  });
  useEffect(() => {
    // Maskotka może startować w tym samym commicie – wysyłamy po klatce.
    const raf = requestAnimationFrame(() => pet.rules(id, ref.current));
    return () => {
      cancelAnimationFrame(raf);
      pet.rules(id, null);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id, ...deps]);
}
