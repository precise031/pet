'use client';

import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { PetController } from './engine';
import { ENTITY_KIND, PropArt } from './props';
import { PET_VIEW, PetSvg } from './PetSvg';
import { DEFAULT_PET_OPTIONS, PET_EVENT, type PetCommand, type PetEntity, type PetOptions, type PetVisual } from './types';
import './pet.css';

export type PetProps = Partial<PetOptions> & {
  /** Czy maskotka jest widoczna (można to też zmienić przez pet.configure({ visible })). */
  visible?: boolean;
};

type Overrides = Partial<PetOptions> & { visible?: boolean };

function defined<T extends object>(o: T): Partial<T> {
  return Object.fromEntries(Object.entries(o).filter(([, v]) => v !== undefined)) as Partial<T>;
}

/**
 * Maskotka chodząca po krawędziach elementów strony.
 * Wstaw raz, najlepiej w app/layout.tsx: <Pet />
 *
 * Teksty (`messages`) i reguły (`rules`) najlepiej trzymać w stałej poza komponentem –
 * nowa tablica przy każdym renderze oznacza ponowne wczytanie reguł.
 */
export function Pet({ visible: visibleProp = true, ...props }: PetProps) {
  const [overrides, setOverrides] = useState<Overrides>({});

  useEffect(() => {
    const onCommand = (e: Event) => {
      const cmd = (e as CustomEvent<PetCommand>).detail;
      if (cmd?.type === 'config') setOverrides((o) => ({ ...o, ...cmd.options }));
    };
    window.addEventListener(PET_EVENT, onCommand);
    return () => window.removeEventListener(PET_EVENT, onCommand);
  }, []);

  const { visible = visibleProp, ...optionOverrides } = overrides;
  if (!visible) return null;
  const options: PetOptions = { ...DEFAULT_PET_OPTIONS, ...defined(props), ...defined(optionOverrides) };
  return <PetRuntime options={options} />;
}

const ENTITY_R = { ball: 16, plane: 24 } as const;

function PetRuntime({ options }: { options: PetOptions }) {
  const layerRef = useRef<HTMLDivElement>(null);
  const petRef = useRef<HTMLDivElement>(null);
  const bubbleRef = useRef<HTMLDivElement>(null);
  const controllerRef = useRef<PetController | null>(null);
  const initialOptions = useRef(options);
  const [visual, setVisual] = useState<PetVisual>({ state: 'fall', expression: 'surprised', prop: null, trick: null });
  const [entities, setEntities] = useState<PetEntity[]>([]);

  useEffect(() => {
    const layer = layerRef.current;
    const pet = petRef.current;
    const bubble = bubbleRef.current;
    if (!layer || !pet || !bubble) return;
    const controller = new PetController({ layer, pet, bubble }, initialOptions.current, { onVisual: setVisual, onEntities: setEntities });
    controllerRef.current = controller;
    controller.start();
    return () => {
      controller.destroy();
      controllerRef.current = null;
    };
  }, []);

  // Po każdym renderze SVG stawy mogą być nowymi węzłami – silnik musi je odszukać.
  useLayoutEffect(() => {
    controllerRef.current?.markDom();
  });

  // messages i rules zawierają funkcje, więc nie przechodzą przez JSON – porównujemy je po referencji.
  const { messages, rules, ...plain } = options;
  const optionsKey = JSON.stringify(plain);
  useEffect(() => {
    controllerRef.current?.setOptions({ ...(JSON.parse(optionsKey) as Omit<PetOptions, 'messages' | 'rules'>), messages, rules });
  }, [optionsKey, messages, rules]);

  const height = options.size;
  const width = (options.size * PET_VIEW.w) / PET_VIEW.h;

  return (
    <div ref={layerRef} className="pet-layer" aria-hidden="true">
      {entities.map((e) => {
        const R = ENTITY_R[ENTITY_KIND[e.prop] ?? 'ball'];
        return (
          <div key={e.id} className="pet-entity" data-eid={e.id}>
            <svg viewBox={`${-R} ${-R} ${R * 2} ${R * 2}`} width="100%" height="100%" overflow="visible">
              <PropArt name={e.prop} uid={`ent${e.id}`} />
            </svg>
          </div>
        );
      })}
      <div ref={petRef} className="pet" data-pet-state={visual.state} data-pet-trick={visual.trick ?? undefined} style={{ width, height }}>
        <PetSvg state={visual.state} expression={visual.expression} prop={visual.prop} trick={visual.trick} propText={visual.propText} />
      </div>
      <div ref={bubbleRef} className="pet-bubble" />
    </div>
  );
}
