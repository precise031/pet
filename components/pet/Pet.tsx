'use client';

import { useEffect, useRef, useState } from 'react';
import { PetController } from './engine';
import { PET_VIEW, PetSvg } from './PetSvg';
import { DEFAULT_PET_OPTIONS, PET_EVENT, type PetCommand, type PetOptions, type PetVisual } from './types';
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

function PetRuntime({ options }: { options: PetOptions }) {
  const layerRef = useRef<HTMLDivElement>(null);
  const petRef = useRef<HTMLDivElement>(null);
  const bubbleRef = useRef<HTMLDivElement>(null);
  const controllerRef = useRef<PetController | null>(null);
  const initialOptions = useRef(options);
  const [visual, setVisual] = useState<PetVisual>({ state: 'fall', expression: 'surprised', prop: null });

  useEffect(() => {
    const layer = layerRef.current;
    const pet = petRef.current;
    const bubble = bubbleRef.current;
    if (!layer || !pet || !bubble) return;
    const controller = new PetController({ layer, pet, bubble }, initialOptions.current, setVisual);
    controllerRef.current = controller;
    controller.start();
    return () => {
      controller.destroy();
      controllerRef.current = null;
    };
  }, []);

  const optionsKey = JSON.stringify(options);
  useEffect(() => {
    controllerRef.current?.setOptions(JSON.parse(optionsKey) as PetOptions);
  }, [optionsKey]);

  const height = options.size;
  const width = (options.size * PET_VIEW.w) / PET_VIEW.h;

  return (
    <div ref={layerRef} className="pet-layer" aria-hidden="true">
      <div ref={petRef} className="pet" data-pet-state={visual.state} style={{ width, height }}>
        <PetSvg state={visual.state} expression={visual.expression} prop={visual.prop} />
      </div>
      <div ref={bubbleRef} className="pet-bubble" />
    </div>
  );
}
