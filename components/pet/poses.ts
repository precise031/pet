import type { PetProp, PetState, PetTrick } from './types';

/*
 * Animacja szkieletowa liczona w JS. Każdy ruch („klip”) to funkcja czasu zwracająca pozę,
 * a silnik płynnie miesza poprzednią pozę z nową – dzięki temu każde przejście jest gładkie.
 */

export interface Pose {
  /** całe ciało: przesunięcie, obrót wokół punktu `brc` nad stopami, skala */
  bx: number;
  by: number;
  br: number;
  brc: number;
  bsx: number;
  bsy: number;
  /** głowa (kaptur) */
  hx: number;
  hy: number;
  hr: number;
  /** ręce (0 = zwisają; lewa + na zewnątrz/w górę, prawa − na zewnątrz/w górę) */
  al: number;
  ar: number;
  /** nogi */
  llx: number;
  lly: number;
  llr: number;
  lrx: number;
  lry: number;
  lrr: number;
  /** uszy i ogon */
  el: number;
  er: number;
  tr: number;
  /** rekwizyt względem swojego punktu zaczepienia */
  px: number;
  py: number;
  pr: number;
  psx: number;
  psy: number;
  pa: number;
  /** oczy: przesunięcie, waga nadpisania spojrzenia, mrugnięcie */
  ex: number;
  ey: number;
  ew: number;
  eb: number;
  /** obrót 3D: wartość i waga nadpisania */
  yaw: number;
  yw: number;
}

export type PoseKey = keyof Pose;

export const REST: Pose = {
  bx: 0,
  by: 0,
  br: 0,
  brc: 0,
  bsx: 1,
  bsy: 1,
  hx: 0,
  hy: 0,
  hr: 0,
  al: 0,
  ar: 0,
  llx: 0,
  lly: 0,
  llr: 0,
  lrx: 0,
  lry: 0,
  lrr: 0,
  el: 0,
  er: 0,
  tr: 0,
  px: 0,
  py: 0,
  pr: 0,
  psx: 1,
  psy: 1,
  pa: 1,
  ex: 0,
  ey: 0,
  ew: 0,
  eb: 1,
  yaw: 0,
  yw: 0,
};

const KEYS = Object.keys(REST) as PoseKey[];

export interface ClipCtx {
  dir: 1 | -1;
  /** 0..1 – jak szybko maskotka faktycznie idzie (płynne ruszanie/hamowanie) */
  speed: number;
  /** kąt turlania w stopniach */
  roll: number;
  /** strona: dokąd wskazuje / na który bok się kładzie */
  side: 1 | -1;
}

export type Clip = (t: number, c: ClipCtx) => Partial<Pose>;

// ───────────────────────── pomocnicze ─────────────────────────

const TAU = Math.PI * 2;
const sin = (t: number, period: number, phase = 0) => Math.sin(TAU * (t / period + phase));
const pos = (x: number) => (x > 0 ? x : 0);
const clamp01 = (x: number) => (x < 0 ? 0 : x > 1 ? 1 : x);
const smooth = (x: number) => x * x * (3 - 2 * x);
const loop = (t: number, period: number) => (t % period) / period;

/** Klatki kluczowe [u, wartość] z gładkim przejściem między nimi. */
export function kf(u: number, keys: ReadonlyArray<readonly [number, number]>): number {
  if (u <= keys[0][0]) return keys[0][1];
  for (let i = 1; i < keys.length; i++) {
    const [u1, v1] = keys[i];
    if (u <= u1) {
      const [u0, v0] = keys[i - 1];
      const x = u1 === u0 ? 1 : (u - u0) / (u1 - u0);
      return v0 + (v1 - v0) * smooth(x);
    }
  }
  return keys[keys.length - 1][1];
}

const breathe = (t: number, amt = 0.025, period = 2.6) => {
  const b = 0.5 + 0.5 * sin(t, period);
  return { bsx: 1 + amt * b, bsy: 1 - amt * b };
};
const ears = (t: number, amp = 6, period = 3.4) => ({
  el: -(amp / 2) * (1 + sin(t, period)),
  er: (amp / 2) * (1 + sin(t, period, 0.38)),
});
const wag = (t: number, amp = 9, period = 1.6) => ({ tr: amp * sin(t, period) });

/** Cykl chodu na dwóch nogach. `amp` skaluje wszystko – przy hamowaniu krok płynnie zanika. */
function stride(t: number, d: number, period: number, amp: number): Partial<Pose> {
  const w = TAU * (t / period);
  const sw = Math.sin(w);
  const liftL = pos(sw);
  const liftR = pos(-sw);
  return {
    llx: d * 3.5 * amp * sw,
    lly: -9 * amp * liftL,
    llr: -d * 11 * amp * liftL,
    lrx: -d * 3.5 * amp * sw,
    lry: -9 * amp * liftR,
    lrr: -d * 11 * amp * liftR,
    by: -3.5 * amp * Math.abs(sw),
    br: 2.5 * amp * sw,
    al: -17 * amp * sw,
    ar: -17 * amp * sw,
    hr: 1.5 * amp * sw,
    el: -3 - 9 * amp * (0.5 + 0.5 * Math.sin(2 * w - 0.8)),
    er: 3 + 9 * amp * (0.5 + 0.5 * Math.sin(2 * w - 0.4)),
    tr: 12 * amp * Math.sin(2 * w),
  };
}

const sitBase = (t: number): Partial<Pose> => {
  const b = 0.5 + 0.5 * sin(t, 2.8);
  return {
    by: 3,
    bsx: 1.05 + 0.014 * b,
    bsy: 0.91 - 0.014 * b,
    llx: -3,
    lly: -1,
    llr: -16,
    lrx: 3,
    lry: -1,
    lrr: 16,
    al: -16,
    ar: 16,
    ...ears(t, 5, 4),
    ...wag(t, 6, 2.2),
  };
};

const typingArms = (t: number): Partial<Pose> => ({
  al: -36 + 7 * sin(t, 0.2),
  ar: 36 - 7 * sin(t, 0.2, 0.5),
  hy: 3,
  hr: -3,
});

const lying = (t: number, side: number, slow = 1): Partial<Pose> => ({
  br: 88 * side,
  bx: -66 * side,
  by: -62 + 1.2 * sin(t, 3.4 * slow),
  bsy: 1 - 0.02 * (0.5 + 0.5 * sin(t, 3.4 * slow)),
  el: -18 - 4 * sin(t, 5),
  er: 18 + 4 * sin(t, 5, 0.3),
  al: -6,
  ar: 6,
  llr: 10,
  lrr: -10 - 8 * pos(sin(t, 4.6)),
  lry: -3 * pos(sin(t, 4.6)),
  yaw: 0,
  yw: 1,
  ...wag(t, 5, 2.6),
});

const dangle = (t: number, amp = 14): Partial<Pose> => ({
  llx: -2,
  lly: 8,
  llr: amp * sin(t, 1.3),
  lrx: 2,
  lry: 8,
  lrr: amp * sin(t, 1.3, 0.5),
});

const hop = (u: number) => kf(u, [
  [0, 0],
  [0.15, -0.15],
  [0.5, 1],
  [0.82, -0.1],
  [1, 0],
]);

// ───────────────────────── klipy stanów ─────────────────────────

const idle: Clip = (t) => ({
  ...breathe(t),
  ...ears(t),
  ...wag(t),
  al: -3 + 3 * sin(t, 2.6),
  ar: 3 - 3 * sin(t, 2.6),
  hr: 1.5 * sin(t, 4.2),
});

const stretch: Clip = (t) => {
  const up = kf(clamp01(t / 1.4), [
    [0, 0],
    [0.3, 1],
    [0.7, 1],
    [1, 0],
  ]);
  return {
    ...ears(t),
    bsy: 1 + 0.12 * up,
    bsx: 1 - 0.06 * up,
    by: -4 * up,
    al: 168 * up,
    ar: -168 * up,
    hr: -6 * up,
    hy: -2 * up,
    el: 10 * up,
    er: -10 * up,
  };
};

const sitTyping: Clip = (t) => ({ ...sitBase(t), ...typingArms(t) });

const sip = (t: number): Partial<Pose> => {
  const sc = kf(loop(t, 3.4), [
    [0, 0],
    [0.45, 0],
    [0.58, 1],
    [0.78, 1],
    [0.92, 0],
    [1, 0],
  ]);
  return { ...sitBase(t), py: -13 * sc, pr: -14 * sc, al: -58 - 60 * sc, ar: 58 + 60 * sc, hy: -1 * sc };
};

export const CLIPS: Record<string, Clip> = {
  idle,
  look: (t) => ({ ...idle(t, { dir: 1, speed: 0, roll: 0, side: 1 }), hr: 7 * sin(t, 2.8) }),
  walk: (t, c) => ({ ...breathe(t, 0.01), ...stride(t, c.dir, 0.62, Math.min(1, c.speed)) }),
  run: (t, c) => {
    const a = Math.min(1, c.speed) * 1.3;
    const st = stride(t, c.dir, 0.34, a);
    return { ...st, el: -c.dir * 26 + 5 * sin(t, 0.34), er: -c.dir * 26 + 5 * sin(t, 0.34, 0.5), al: (st.al ?? 0) * 1.4, ar: (st.ar ?? 0) * 1.4 };
  },
  chase: (t, c) => {
    const st = stride(t, c.dir, 0.36, 1.2 * Math.min(1, c.speed + 0.2));
    return { ...st, el: -c.dir * 22, er: -c.dir * 22, ew: 0 };
  },
  sit: sitBase,
  sitEdge: (t) => ({
    ...breathe(t, 0.015, 3),
    ...ears(t, 6, 3.6),
    ...wag(t, 6, 2),
    ...dangle(t),
    by: 9,
    bsy: 0.96,
    al: -30,
    ar: 30,
    hr: 3 * sin(t, 5),
  }),
  lie: (t, c) => lying(t, c.side),
  sleep: (t, c) => ({ ...lying(t, c.side, 1.4), el: -26, er: 26 }),
  roll: (t, c) => ({
    bsx: 0.82,
    bsy: 0.82,
    brc: 57,
    br: c.roll,
    al: -42,
    ar: 42,
    lly: -10,
    lry: -10,
    llr: 30,
    lrr: -30,
    el: -46,
    er: 46,
    hy: 4,
    yaw: 0,
    yw: 1,
  }),
  wake: stretch,
  stretch,
  dance: (t) => {
    const P = 0.5;
    return {
      by: -7 * pos(sin(t, P)),
      bsy: 1 - 0.05 * pos(-sin(t, P)),
      bsx: 1 + 0.04 * pos(-sin(t, P)),
      br: 7 * sin(t, 2 * P),
      al: 30 + 95 * pos(sin(t, 2 * P)),
      ar: -30 - 95 * pos(-sin(t, 2 * P)),
      hr: 9 * sin(t, 2 * P, 0.25),
      lly: -7 * pos(sin(t, 2 * P)),
      lry: -7 * pos(-sin(t, 2 * P)),
      llr: -8 * pos(sin(t, 2 * P)),
      lrr: 8 * pos(-sin(t, 2 * P)),
      el: -6 - 14 * pos(sin(t, P)),
      er: 6 + 14 * pos(sin(t, P, 0.5)),
      tr: 16 * sin(t, P),
      yaw: 28 * sin(t, 4 * P),
      yw: 0.7,
    };
  },
  wave: (t) => ({
    ...breathe(t),
    ...ears(t, 8, 1.6),
    ar: -150 + 22 * sin(t, 0.5),
    al: -8,
    hr: 5,
    by: -1.5 * pos(sin(t, 1)),
  }),
  point: (t, c) => ({
    ...breathe(t),
    ...ears(t),
    ar: c.side > 0 ? -96 + 3 * sin(t, 1.6) : 10,
    al: c.side > 0 ? -10 : 96 - 3 * sin(t, 1.6),
    hr: 6 * c.side,
    br: 3 * c.side,
    yaw: 30 * c.side,
    yw: 0.7,
  }),
  cool: (t) => ({ ...breathe(t, 0.02, 1.6), ...ears(t), ar: 128, al: -8, hr: -6 }),
  crouch: () => ({ bsx: 1.15, bsy: 0.82, el: -18, er: 18, al: -20, ar: 20 }),
  jump: () => ({ bsx: 0.9, bsy: 1.12, al: 110, ar: -110, el: -32, er: 32, llx: 2, lly: -4, llr: 14, lrx: -2, lry: -2, lrr: -10 }),
  fall: (t) => ({
    bsx: 0.95,
    bsy: 1.06,
    el: 18,
    er: -18,
    al: 142 + 22 * sin(t, 0.24),
    ar: -142 - 22 * sin(t, 0.24),
    lly: 3 * pos(sin(t, 0.3)),
    llr: 16 * sin(t, 0.3),
    lrr: 16 * sin(t, 0.3, 0.5),
  }),
  float: (t) => ({
    ...dangle(t, 10),
    by: -4 + 3 * sin(t, 1.8),
    br: 4 * sin(t, 2.4),
    ar: -168,
    al: 25 + 8 * sin(t, 1.8),
    el: 8,
    er: -8,
  }),
  land: (t) => {
    const a = Math.exp(-t * 12);
    return { bsx: 1 + 0.25 * a * Math.cos(t * 26), bsy: 1 - 0.28 * a * Math.cos(t * 26), el: -10 * a, er: 10 * a };
  },
  splat: () => ({ bsx: 1.45, bsy: 0.5, el: -80, er: 82, al: 80, ar: -80, llx: -6, llr: -30, lrx: 6, lrr: 30 }),
  recover: (t) => {
    const u = clamp01(t / 0.75);
    return {
      bsy: kf(u, [
        [0, 0.5],
        [0.35, 1.15],
        [0.6, 0.94],
        [1, 1],
      ]),
      bsx: kf(u, [
        [0, 1.45],
        [0.35, 0.88],
        [0.6, 1.06],
        [1, 1],
      ]),
      hr: kf(u, [
        [0, 0],
        [0.25, -9],
        [0.5, 8],
        [0.75, -4],
        [1, 0],
      ]),
      el: -80 * (1 - u),
      er: 82 * (1 - u),
    };
  },
  drag: (t) => ({
    brc: 128,
    br: 7 * sin(t, 1.3),
    el: 14,
    er: -14,
    al: 140 + 25 * sin(t, 0.5),
    ar: -140 - 25 * sin(t, 0.5),
    lly: 3 * pos(sin(t, 0.45)),
    llr: 16 * sin(t, 0.45),
    lrr: 16 * sin(t, 0.45, 0.5),
  }),
  trip: (t, c) => {
    const e = clamp01(t / 0.38) ** 2;
    return { br: c.dir * 78 * e, by: 6 * e, al: 150, ar: -150, el: 12, er: -12 };
  },
  oops: (t, c) => ({ ...stride(t, c.dir, 0.18, 1.3), al: 150 + 30 * sin(t, 0.24), ar: -150 - 30 * sin(t, 0.24), hy: 4, hr: 4, ey: 4, ew: 1 }),
  typing: sitTyping,
  hack: sitTyping,
  coffee: sip,
  fish: (t) => ({ ...sitBase(t), ar: -24, al: -50, by: t > 4.96 && t < 5.6 ? 0 : 3 }),
  ride: (t, c) => ({
    bsy: 0.94,
    by: -9 + 1.2 * sin(t, 0.4),
    llx: -7,
    lrx: 7,
    llr: -8,
    lrr: 8,
    al: 72 + 8 * sin(t, 1.1),
    ar: -72 + 8 * sin(t, 1.1, 0.3),
    br: c.dir * 4,
    el: -c.dir * 18 - 6,
    er: -c.dir * 18 + 6,
    pr: 2 * sin(t, 0.4),
    yaw: c.dir * 55,
    yw: 0.8,
  }),
  carry: (t, c) => ({
    ...stride(t, c.dir, 0.62, Math.min(1, c.speed)),
    al: 165,
    ar: -165,
    py: -3 * Math.abs(sin(t, 0.62)),
  }),
  success: (t) => {
    const h = hop(loop(t, 0.6));
    return {
      by: -16 * pos(h),
      bsx: 1 + 0.1 * pos(-h) * 6,
      bsy: 1 - 0.12 * pos(-h) * 6,
      al: 140,
      ar: -140,
      el: -3 - 9 * pos(sin(t, 0.3)),
      er: 3 + 9 * pos(sin(t, 0.3, 0.5)),
      ...wag(t, 14, 0.4),
    };
  },
  happy: (t) => {
    const h = hop(loop(t, 0.5));
    return { by: -10 * pos(h), al: 140, ar: -140, el: -3 - 9 * pos(sin(t, 0.3)), er: 3 + 9 * pos(sin(t, 0.3, 0.5)), ...wag(t, 14, 0.4) };
  },
  error: (t) => ({ bx: 2 * sin(t, 0.12), al: 120, ar: -120, el: 10, er: -10 }),
  confused: (t) => ({ ...breathe(t), hr: -10, al: 150 + 8 * sin(t, 0.5), el: 10, er: 46 }),
  sad: (t) => ({ ...breathe(t, 0.015, 3.2), bsy: 0.95, hy: 2, hr: 4, el: -50, er: 52, al: -20, ar: 20 }),
  petted: (t) => ({
    br: 3 * sin(t, 1.1),
    hr: 5 * sin(t, 1.1),
    bsy: 0.98,
    al: -30,
    ar: 30,
    el: -4 - 8 * pos(sin(t, 0.6)),
    er: 4 + 8 * pos(sin(t, 0.6, 0.5)),
    ...wag(t, 14, 0.5),
  }),
  giggle: (t) => ({ by: -2.5 * Math.abs(sin(t, 0.32)), al: -58, ar: 58, hr: 3 * sin(t, 0.16), ...wag(t, 12, 0.3) }),
  'twitch-l': (t) => ({ ...breathe(t), el: -28 * Math.exp(-6 * t) * Math.cos(18 * t), hr: -6 }),
  'twitch-r': (t) => ({ ...breathe(t), er: 28 * Math.exp(-6 * t) * Math.cos(18 * t), hr: 6 }),
  bonk: (t) => {
    const a = Math.exp(-t * 8);
    return { bsx: 1 + 0.18 * a, bsy: 1 - 0.22 * a, al: 160, ar: -160, hy: 2 * a };
  },
  flinch: (t) => {
    const u = clamp01(t / 0.45);
    const k = kf(u, [
      [0, 0],
      [0.3, 1],
      [0.7, 0],
      [1, 0],
    ]);
    return { by: -10 * k, bsy: 1 + 0.08 * k, bsx: 1 - 0.06 * k, el: 14, er: -14, al: 60, ar: -60 };
  },
};

// ───────────────────────── triki z rekwizytami ─────────────────────────

/** Moment (s), w którym rekwizyt opuszcza łapki (kopnięcie, rzut) – wtedy silnik tworzy osobny obiekt. */
export const RELEASE_AT: Partial<Record<PetTrick, number>> = { kick: 0.42, throw: 0.4 };

export const TRICK_CLIPS: Record<PetTrick, Clip> = {
  hold: (t) => ({ ...breathe(t), ...ears(t), py: -2 * sin(t, 1.2), pr: 3 * sin(t, 2.4), al: -38, ar: 38 }),
  toss: (t) => {
    const u = loop(t, 2.2);
    const look = kf(u, [
      [0, 0],
      [0.2, 0],
      [0.3, 1],
      [0.6, 1],
      [0.8, 0],
      [1, 0],
    ]);
    const al = kf(u, [
      [0, -42],
      [0.12, -28],
      [0.22, 150],
      [0.44, 118],
      [0.62, 118],
      [0.76, -46],
      [0.84, -38],
      [1, -42],
    ]);
    return {
      ...ears(t, 8, 1.1),
      py: kf(u, [
        [0, 0],
        [0.12, 5],
        [0.22, -30],
        [0.44, -96],
        [0.66, -34],
        [0.76, 3],
        [0.84, 0],
        [1, 0],
      ]),
      pr: -360 * kf(u, [
        [0, 0],
        [0.12, 0],
        [0.76, 1],
        [1, 1],
      ]),
      al,
      ar: -al,
      by: kf(u, [
        [0, 0],
        [0.12, 3],
        [0.22, -4],
        [0.44, 0],
        [0.76, 3],
        [0.86, 0],
        [1, 0],
      ]),
      ey: -5 * look,
      ew: look,
    };
  },
  spin: (t) => {
    const u = loop(t, 1.6);
    return {
      ...breathe(t, 0.02, 0.9),
      ...ears(t),
      psx: kf(u, [
        [0, 1],
        [0.4, 1],
        [0.48, 0.06],
        [0.54, 1],
        [0.6, 0.06],
        [0.66, 1],
        [1, 1],
      ]),
      py: kf(u, [
        [0, 0],
        [0.4, 0],
        [0.54, -14],
        [0.66, -6],
        [0.74, 0],
        [1, 0],
      ]),
      ar: -168 + 4 * sin(t, 0.45),
      al: -36,
      ex: 2,
      ey: -4,
      ew: 0.8,
    };
  },
  wave: (t) => ({
    pr: 17 * sin(t, 0.9),
    ar: -168 + 10 * sin(t, 0.9),
    al: 135 + 15 * sin(t, 0.45),
    by: -6 * pos(sin(t, 0.9)),
    ...ears(t, 10, 0.9),
    ...wag(t, 14, 0.45),
  }),
  tap: (t) => ({
    ...breathe(t),
    ...ears(t),
    al: -56,
    ar: 86 + 8 * sin(t, 0.3),
    hx: -2,
    hy: 3,
    hr: -5,
    pr: -6 + 2.5 * sin(t, 2.4),
    ex: -2,
    ey: 3,
    ew: 1,
  }),
  call: (t) => ({
    ...breathe(t),
    ...ears(t, 6, 2),
    ar: -150,
    al: -10,
    hr: 8 + 3 * sin(t, 2),
    by: -1.2 * pos(sin(t, 1)),
    yaw: -15,
    yw: 0.5,
  }),
  selfie: (t) => ({
    ...breathe(t),
    ar: -165,
    al: 125 + 8 * sin(t, 0.8),
    hr: -6,
    br: -3,
    py: 2 * sin(t, 2.4),
    yaw: 12,
    yw: 0.5,
    el: -8,
    er: 4,
  }),
  bounce: (t) => {
    const u = loop(t, 0.9);
    const up = kf(u, [
      [0, 0],
      [0.5, 1],
      [1, 0],
    ]);
    const contact = 1 - Math.min(1, up * 4);
    return {
      py: -24 * up,
      psx: 1 + 0.06 * contact,
      psy: 1 - 0.1 * contact,
      el: 10 * contact - 4,
      er: -10 * contact + 4,
      al: 120 + 30 * sin(t, 0.9),
      ar: -120 - 30 * sin(t, 0.9),
      by: -5 * pos(sin(t, 0.9, 0.25)),
      ey: -5,
      ew: 0.9,
    };
  },
  float: (t) => ({ ...sitBase(t), ...dangle(t, 10), by: -26 + 5 * sin(t, 2.2), br: 3 * sin(t, 3) }),
  drum: (t) => ({
    al: -38 - 34 * pos(sin(t, 0.4)),
    ar: 38 + 34 * pos(sin(t, 0.4, 0.5)),
    br: 1.5 * sin(t, 0.4),
    by: -2 * pos(sin(t, 0.4)),
    psy: 1 - 0.06 * pos(sin(t, 0.2)),
    hr: 3 * sin(t, 0.8),
    ...ears(t, 10, 0.4),
  }),
  rotate: (t) => ({ ...breathe(t), ...ears(t), pr: t * 225, al: -50, ar: 50 }),
  chase: (t) => {
    const u = loop(t, 2);
    const px = kf(u, [
      [0, 0],
      [0.2, -22],
      [0.4, 14],
      [0.6, 28],
      [0.8, -8],
      [1, 0],
    ]);
    const py = kf(u, [
      [0, 0],
      [0.2, -26],
      [0.4, -46],
      [0.6, -10],
      [0.8, 6],
      [1, 0],
    ]);
    return {
      px,
      py,
      pr: kf(u, [
        [0, 0],
        [0.2, -18],
        [0.4, 14],
        [0.6, 24],
        [0.8, -6],
        [1, 0],
      ]),
      al: kf(u, [
        [0, -44],
        [0.2, 100],
        [0.4, 150],
        [0.6, 40],
        [0.8, -30],
        [1, -44],
      ]),
      ar: kf(u, [
        [0, 44],
        [0.2, -30],
        [0.4, -150],
        [0.6, -120],
        [0.8, 20],
        [1, 44],
      ]),
      ex: px / 7,
      ey: py / 10,
      ew: 1,
    };
  },
  hug: (t) => {
    const u = loop(t, 1.1);
    const beat = kf(u, [
      [0, 0],
      [0.12, 1],
      [0.24, 0.3],
      [0.34, 0.8],
      [0.45, 0],
      [1, 0],
    ]);
    return { psx: 1 + 0.14 * beat, psy: 1 + 0.14 * beat, al: -70, ar: 70, br: 3 * sin(t, 1.6), hr: 4 * sin(t, 1.6), ...ears(t, 6, 1.6) };
  },
  type: sitTyping,
  sip,
  blow: (t) => ({ ...sitBase(t), py: -11, pr: -8, al: -110, ar: 110, hy: -1 + sin(t, 0.6) }),
  read: (t) => ({ ...sitBase(t), al: -48, ar: 48, hr: 4 * sin(t, 3), pr: 2 * sin(t, 3), ex: 3 * sin(t, 1.5), ey: 3, ew: 1 }),
  inspect: (t) => ({ ...breathe(t), ...ears(t), ar: -100 + 6 * sin(t, 1.8), al: -20, br: 4, hr: 5, hy: 1, pr: 8 * sin(t, 1.8) }),
  kick: (t) => {
    const u = clamp01(t / 0.9);
    return {
      lrx: kf(u, [
        [0, 0],
        [0.3, -8],
        [0.45, 10],
        [0.7, 4],
        [1, 0],
      ]),
      lry: kf(u, [
        [0, 0],
        [0.3, -4],
        [0.45, -12],
        [0.7, -4],
        [1, 0],
      ]),
      lrr: kf(u, [
        [0, 0],
        [0.3, 20],
        [0.45, -35],
        [0.7, -10],
        [1, 0],
      ]),
      br: kf(u, [
        [0, 0],
        [0.3, -4],
        [0.45, 5],
        [1, 0],
      ]),
      al: 30,
      ar: -30,
      pa: t < RELEASE_AT.kick! ? 1 : 0,
    };
  },
  throw: (t) => {
    const u = clamp01(t / 0.8);
    return {
      ar: kf(u, [
        [0, -60],
        [0.35, -150],
        [0.5, -40],
        [1, -20],
      ]),
      al: 40,
      br: kf(u, [
        [0, 0],
        [0.35, -6],
        [0.5, 8],
        [1, 0],
      ]),
      pa: t < RELEASE_AT.throw! ? 1 : 0,
    };
  },
  twirl: (t) => ({ ...ears(t), ar: -168, al: 30, pr: 10 * sin(t, 2), br: 3 * sin(t, 2), by: -2 * pos(sin(t, 1)) }),
  ride: (t, c) => CLIPS.ride(t, c),
  kickflip: (t) => {
    const u = loop(t, 1.6);
    const air = kf(u, [
      [0, 0],
      [0.15, 0],
      [0.3, 1],
      [0.5, 1],
      [0.65, 0],
      [1, 0],
    ]);
    return {
      by: -9 - 22 * air,
      bsy: 0.94,
      llx: -7,
      lrx: 7,
      lly: -6 * air,
      lry: -6 * air,
      al: 80,
      ar: -80,
      py: -18 * air,
      pr: 360 * kf(u, [
        [0, 0],
        [0.25, 0],
        [0.5, 1],
        [1, 1],
      ]),
      el: -12 * air,
      er: 12 * air,
    };
  },
  dance: (t, c) => CLIPS.dance(t, c),
  'sit-on': (t) => ({ ...breathe(t), ...ears(t), ...wag(t), ...dangle(t), by: -32, al: -24, ar: 24 }),
  hide: (t) => {
    const u = loop(t, 4);
    return {
      by: kf(u, [
        [0, 70],
        [0.35, 70],
        [0.45, 16],
        [0.78, 16],
        [0.86, 70],
        [1, 70],
      ]),
      al: -10,
      ar: 10,
      yaw: 35 * sin(t, 4),
      yw: kf(u, [
        [0, 0],
        [0.45, 0],
        [0.5, 1],
        [0.75, 1],
        [0.8, 0],
        [1, 0],
      ]),
      ...ears(t, 10, 1.2),
    };
  },
  carry: (t, c) => CLIPS.carry(t, c),
};

/** Ile trwa jedno „przedstawienie” danego triku, zanim maskotka zajmie się czymś innym. */
export const TRICK_MS: Partial<Record<PetTrick, number>> = {
  kick: 900,
  throw: 900,
  toss: 4400,
  spin: 4800,
  hide: 8000,
  ride: 7000,
  carry: 6000,
  read: 7000,
  dance: 7000,
};

/** Klucz klipu dla stanu (i ewentualnie triku). */
export function clipFor(state: PetState, trick: PetTrick | null): Clip {
  if (state === 'show' && trick) return TRICK_CLIPS[trick] ?? CLIPS.idle;
  return CLIPS[state] ?? CLIPS.idle;
}

/** Klip dla tego, co widać (balon i parasol unoszą maskotkę niezależnie od triku). */
export function clipForVisual(state: PetState, prop: PetProp | null, trick: PetTrick | null): Clip {
  if (state === 'show' && (prop === 'balloon' || prop === 'umbrella')) return CLIPS.float;
  return clipFor(state, trick);
}

/** Jak długo ma trwać płynne przejście do danego stanu. */
export function blendMs(state: PetState): number {
  switch (state) {
    case 'land':
      return 60;
    case 'splat':
      return 80;
    case 'crouch':
    case 'jump':
    case 'trip':
      return 120;
    case 'drag':
    case 'fall':
      return 160;
    case 'roll':
      return 260;
    case 'sit':
    case 'sitEdge':
      return 320;
    case 'lie':
    case 'sleep':
      return 480;
    default:
      return 230;
  }
}

export function mixPose(a: Pose, b: Pose, w: number): Pose {
  if (w >= 1) return b;
  const out = { ...b };
  for (const k of KEYS) out[k] = a[k] + (b[k] - a[k]) * w;
  return out;
}

export function fullPose(partial: Partial<Pose>): Pose {
  return { ...REST, ...partial };
}

// ───────────────────────── stosowanie pozy do SVG ─────────────────────────

export interface Joints {
  rig?: SVGElement;
  head?: SVGElement;
  /** ręce i nogi mają kopie (przed tułowiem i za nim) – obrót 3D pokazuje właściwą */
  armL: SVGElement[];
  armR: SVGElement[];
  legL: SVGElement[];
  legR: SVGElement[];
  earL: SVGElement[];
  earR: SVGElement[];
  tails: SVGElement[];
  prop?: SVGElement;
  eyes?: SVGElement;
}

export function bindJoints(root: ParentNode): Joints {
  const q = (n: string) => root.querySelector<SVGElement>(`[data-j="${n}"]`) ?? undefined;
  const all = (n: string) => Array.from(root.querySelectorAll<SVGElement>(`[data-j="${n}"]`));
  return {
    rig: q('rig'),
    head: q('head'),
    armL: all('arm-l'),
    armR: all('arm-r'),
    legL: all('leg-l'),
    legR: all('leg-r'),
    earL: all('ear-l'),
    earR: all('ear-r'),
    tails: all('tail'),
    prop: q('prop'),
    eyes: q('eyes'),
  };
}

const f = (n: number) => (Math.abs(n) < 0.005 ? '0' : n.toFixed(2));

/** Ustawia transformacje stawów. `cache` pozwala nie dotykać DOM, gdy nic się nie zmieniło. */
export function applyPose(j: Joints, p: Pose, eyeX: number, eyeY: number, cache: WeakMap<Element, string>) {
  const set = (el: SVGElement | undefined, v: string) => {
    if (!el || cache.get(el) === v) return;
    cache.set(el, v);
    el.style.transform = v;
  };
  set(
    j.rig,
    `translate(${f(p.bx)}px,${f(p.by)}px) translate(0px,${f(-p.brc)}px) rotate(${f(p.br)}deg) translate(0px,${f(p.brc)}px) scale(${f(p.bsx)},${f(p.bsy)})`,
  );
  set(j.head, `translate(${f(p.hx)}px,${f(p.hy)}px) rotate(${f(p.hr)}deg)`);
  for (const a of j.armL) set(a, `rotate(${f(p.al)}deg)`);
  for (const a of j.armR) set(a, `rotate(${f(p.ar)}deg)`);
  for (const l of j.legL) set(l, `translate(${f(p.llx)}px,${f(p.lly)}px) rotate(${f(p.llr)}deg)`);
  for (const l of j.legR) set(l, `translate(${f(p.lrx)}px,${f(p.lry)}px) rotate(${f(p.lrr)}deg)`);
  for (const e of j.earL) set(e, `rotate(${f(p.el)}deg)`);
  for (const e of j.earR) set(e, `rotate(${f(p.er)}deg)`);
  for (const t of j.tails) set(t, `rotate(${f(p.tr)}deg)`);
  set(j.prop, `translate(${f(p.px)}px,${f(p.py)}px) rotate(${f(p.pr)}deg) scale(${f(p.psx)},${f(p.psy)})`);
  if (j.prop) {
    const o = f(p.pa);
    if (cache.get(j.prop.parentElement ?? j.prop) !== o && j.prop.parentElement) {
      cache.set(j.prop.parentElement, o);
      (j.prop.parentElement as unknown as SVGElement).style.opacity = o;
    }
  }
  const ex = eyeX + (p.ex - eyeX) * p.ew;
  const ey = eyeY + (p.ey - eyeY) * p.ew;
  set(j.eyes, `translate(${f(ex)}px,${f(ey)}px) scale(1,${f(p.eb)})`);
}
