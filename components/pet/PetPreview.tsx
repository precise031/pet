'use client';

import { useEffect, useLayoutEffect, useRef } from 'react';
import { applyPose, bindJoints, blendMs, clipForVisual, fullPose, mixPose, RELEASE_AT, REST, TRICK_MS, type Joints, type Pose } from './poses';
import { PetSvg, yawVars } from './PetSvg';
import type { PetExpression, PetProp, PetState, PetTrick } from './types';

export interface PetPreviewProps {
  state?: PetState;
  expression?: PetExpression;
  prop?: PetProp | null;
  trick?: PetTrick | null;
  propText?: string;
  /** Obrót wokół osi pionowej (°). */
  yaw?: number;
  className?: string;
}

interface Entry {
  root: HTMLDivElement;
  cfg: { state: PetState; prop: PetProp | null; trick: PetTrick | null; yaw: number };
  joints: Joints;
  cache: WeakMap<Element, string>;
  key: string;
  start: number;
  blendStart: number;
  blendDur: number;
  from: Pose;
  last: Pose;
  styleKey: string;
  visible: boolean;
}

// Jedna pętla requestAnimationFrame dla wszystkich podglądów na stronie.
const entries = new Set<Entry>();
let raf = 0;
let observer: IntersectionObserver | null = null;

function frame(now: number) {
  for (const e of entries) if (e.visible) step(e, now);
  raf = entries.size ? requestAnimationFrame(frame) : 0;
}

function step(e: Entry, now: number) {
  const { state, prop, trick, yaw } = e.cfg;
  const key = state === 'show' ? `show:${prop}:${trick}` : state;
  if (key !== e.key) {
    e.from = e.last;
    e.key = key;
    e.start = now;
    e.blendStart = now;
    e.blendDur = blendMs(state);
  }
  let t = (now - e.start) / 1000;
  // kopnięcie i rzut są jednorazowe – w podglądzie powtarzamy je w pętli
  if (state === 'show' && trick && RELEASE_AT[trick] !== undefined) t %= (TRICK_MS[trick] ?? 900) / 1000 + 1.1;
  const raw = fullPose(clipForVisual(state, prop, trick)(t, { dir: 1, speed: 1, roll: (t * 300) % 360, side: 1 }));
  const w = Math.min(1, (now - e.blendStart) / e.blendDur);
  const pose = mixPose(e.from, raw, w * w * (3 - 2 * w));
  e.last = pose;
  applyPose(e.joints, pose, 0, 0, e.cache);

  const y = yaw + (pose.yaw - yaw) * pose.yw;
  const styleKey = y.toFixed(1);
  if (styleKey !== e.styleKey) {
    e.styleKey = styleKey;
    for (const [k, v] of Object.entries(yawVars(y))) e.root.style.setProperty(k, String(v));
  }
}

function getObserver(): IntersectionObserver | null {
  if (observer || typeof IntersectionObserver === 'undefined') return observer;
  observer = new IntersectionObserver((list) => {
    for (const it of list) {
      for (const e of entries) if (e.root === it.target) e.visible = it.isIntersecting;
    }
  });
  return observer;
}

/**
 * Maskotka w miejscu (bez chodzenia po stronie) – do galerii, ustawień, kart z przykładami.
 * Animuje się tymi samymi klipami co prawdziwa maskotka.
 */
export function PetPreview({ state = 'idle', expression = 'neutral', prop = null, trick = null, propText, yaw = 0, className }: PetPreviewProps) {
  const ref = useRef<HTMLDivElement>(null);
  const entryRef = useRef<Entry | null>(null);

  useEffect(() => {
    const root = ref.current;
    if (!root) return;
    const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
    const e: Entry = {
      root,
      cfg: { state, prop, trick, yaw },
      joints: bindJoints(root),
      cache: new WeakMap(),
      key: '',
      start: 0,
      blendStart: -1e9,
      blendDur: 200,
      from: REST,
      last: REST,
      styleKey: '',
      visible: !reduced,
    };
    entryRef.current = e;
    entries.add(e);
    const io = reduced ? null : getObserver();
    io?.observe(root);
    if (reduced) step(e, 0);
    if (!raf && !reduced) raf = requestAnimationFrame(frame);
    return () => {
      io?.unobserve(root);
      entries.delete(e);
      entryRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Nowe dane i (po renderze) nowe węzły SVG.
  useLayoutEffect(() => {
    const e = entryRef.current;
    if (!e) return;
    e.cfg = { state, prop, trick, yaw };
    e.joints = bindJoints(e.root);
    e.cache = new WeakMap();
  });

  return (
    <div ref={ref} className={className ? `pet-preview ${className}` : 'pet-preview'} data-pet-state={state} style={{ ['--dir' as string]: 1, ...yawVars(yaw) }}>
      <PetSvg state={state} expression={expression} prop={prop} trick={trick} propText={propText} />
    </div>
  );
}
