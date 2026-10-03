'use client';

import { useId, type CSSProperties, type ReactNode } from 'react';
import { Fish, Mug, PhoneProp, PixelLogo, PROP_PLAY, PropArt, type PlayStyle } from './props';
import type { PetExpression, PetProp, PetState } from './types';

/** Paleta z arkusza postaci. */
export const PET_COLORS = {
  bg: '#121212',
  body: '#1E1E23',
  shadow: '#2A2A31',
  green: '#B6FF38',
  purple: '#9B5CFF',
  eye: '#F4F2E0',
  cyan: '#00E5FF',
  red: '#FF3B3B',
  yellow: '#FFD166',
  pink: '#FF7FA8',
  outline: '#050507',
  fabric: '#1b1b21',
} as const;

/** Rozmiar viewBoxa – stopy stoją na dole, pośrodku (80, 187). */
export const PET_VIEW = { w: 160, h: 190 } as const;

const C = PET_COLORS;
const OUTLINE = 6;

// ── kształty (współrzędne viewBoxa 160×190) ──
const HOOD = 'M 80 50 C 113 50 141 69 142 99 C 143 127 117 147 80 147 C 43 147 17 127 18 99 C 19 69 47 50 80 50 Z';
const OPENING = 'M 80 76 C 105 76 125 89 125 109 C 125 129 105 142 80 142 C 55 142 35 129 35 109 C 35 89 55 76 80 76 Z';
const TORSO = 'M 80 128 C 105 128 118 143 117 160 C 116 175 102 183 80 183 C 58 183 44 175 43 160 C 42 143 55 128 80 128 Z';
const HEM = 'M 45.5 170.5 Q 80 183 114.5 170.5 L 113.5 177.5 Q 80 190 46.5 177.5 Z';
const POCKET = 'M 57 151 Q 80 147 103 151 L 107 168 Q 80 172 53 168 Z';
// ucho: podstawa w (0,0), gruba „pałka” wygięta na zewnątrz
const EAR = 'M -10 8 C -13 -12 -15 -36 -9 -52 C -4 -66 12 -72 22 -64 C 31 -57 30 -44 22 -38 C 14 -32 11 -18 11 8 Z';
const FOOT_L = 'M -17 15 C -17 6 -9 4 -1 4 C 8 4 12 8 12 15 C 12 21 4 23 -3 23 C -11 23 -17 21 -17 15 Z';
const FOOT_R = 'M 17 15 C 17 6 9 4 1 4 C -8 4 -12 8 -12 15 C -12 21 -4 23 3 23 C 11 23 17 21 17 15 Z';
const SLEEVE_L = 'M -4 -6 C -13 -4 -16 6 -15 14 L -1.5 16.5 C 2 11 3.5 2 2.5 -2.5 C 1.5 -6 -0.5 -7 -4 -6 Z';
const SLEEVE_R = 'M 4 -6 C 13 -4 16 6 15 14 L 1.5 16.5 C -2 11 -3.5 2 -2.5 -2.5 C -1.5 -6 0.5 -7 4 -6 Z';
const CUFF_L = 'M -15.4 13 L -1.3 15.7 L -2.1 20.6 L -15.7 17.9 Z';
const CUFF_R = 'M 15.4 13 L 1.3 15.7 L 2.1 20.6 L 15.7 17.9 Z';
const PLUS = 'M -2 -6 H 2 V -2 H 6 V 2 H 2 V 6 H -2 V 2 H -6 V -2 H -2 Z';
const SPARK = 'M 0 -8 C 1 -2 2 -1 8 0 C 2 1 1 2 0 8 C -1 2 -2 1 -8 0 C -2 -1 -1 -2 0 -8 Z';
const HEART = 'M 0 6 C -10 -1 -7 -10 0 -5 C 7 -10 10 -1 0 6 Z';
const DROP = 'M 0 -5 C 2.5 -1.5 4 1 4 3 A 4 4 0 0 1 -4 3 C -4 1 -2.5 -1.5 0 -5 Z';
const STAR = starPath(6.5, 2.8);

const EYE = { l: { x: 61, y: 107 }, r: { x: 99, y: 107 } } as const;
const TILT = { l: -8, r: 8 } as const;

/** Gdzie i jak trzymany jest rekwizyt przy danym stylu zabawy. */
const PROP_POSE: Record<Exclude<PlayStyle, 'sip'>, { x: number; y: number; dx?: number; dy?: number; s: number; mid?: boolean }> = {
  toss: { x: 80, y: 150, s: 0.85 },
  spin: { x: 116, y: 116, dy: -22, s: 0.72 },
  wave: { x: 114, y: 120, dy: -24, s: 0.72 },
  phone: { x: 66, y: 146, s: 0.98, mid: true },
  bounce: { x: 80, y: 28, s: 0.9 },
  drum: { x: 80, y: 168, s: 0.82 },
  rotate: { x: 80, y: 152, s: 0.85 },
  squirm: { x: 80, y: 150, s: 0.9 },
  hug: { x: 80, y: 152, s: 0.9 },
  type: { x: 80, y: 158, s: 0.85 },
};

type Side = 'l' | 'r';
type Pt = [number, number];

interface Ids {
  skin: string;
  fabric: string;
  hood: string;
  rim: string;
  eye: string;
  glow: string;
  neon: string;
  soft: string;
  earClip: string;
  tip: string;
  ground: string;
  fish: string;
  screen: string;
  shade: string;
  uid: string;
}

function starPath(outer: number, inner: number) {
  const pts: string[] = [];
  for (let i = 0; i < 10; i++) {
    const r = i % 2 ? inner : outer;
    const a = -Math.PI / 2 + (i * Math.PI) / 5;
    pts.push(`${(Math.cos(a) * r).toFixed(2)} ${(Math.sin(a) * r).toFixed(2)}`);
  }
  return `M${pts.join('L')}Z`;
}

/** Elipsa oka przycięta linią „powieki” od (lewa krawędź, yL) do (prawa krawędź, yR). */
function clipEye(cx: number, cy: number, rx: number, ry: number, yL: number, yR: number, keep: 'below' | 'above') {
  const pts: Pt[] = [];
  for (let i = 0; i < 48; i++) {
    const a = (i / 48) * Math.PI * 2;
    pts.push([cx + Math.cos(a) * rx, cy + Math.sin(a) * ry]);
  }
  const sign = keep === 'below' ? 1 : -1;
  const f = ([x, y]: Pt) => sign * (y - (yL + ((yR - yL) * (x - (cx - rx))) / (2 * rx)));
  const out: Pt[] = [];
  for (let i = 0; i < pts.length; i++) {
    const a = pts[(i + pts.length - 1) % pts.length];
    const b = pts[i];
    const fa = f(a);
    const fb = f(b);
    if (fa >= 0 !== fb >= 0) {
      const t = fa / (fa - fb);
      out.push([a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t]);
    }
    if (fb >= 0) out.push(b);
  }
  return out.length ? `M${out.map((p) => `${p[0].toFixed(2)} ${p[1].toFixed(2)}`).join('L')}Z` : '';
}

/** Kształt z grubym konturem pod spodem (jak naklejka). */
function Shape({ d, fill, rim, outline = OUTLINE }: { d: string; fill: string; rim?: string; outline?: number }) {
  return (
    <>
      <path d={d} fill={fill} stroke={C.outline} strokeWidth={outline} strokeLinejoin="round" paintOrder="stroke" />
      {rim && <path d={d} fill="none" stroke={rim} strokeWidth={2} />}
    </>
  );
}

// ───────────────────────── twarz ─────────────────────────

function Face({ expression, color, ids }: { expression: PetExpression; color: string; ids: Ids }) {
  const fill = color === C.eye ? `url(#${ids.eye})` : color;
  const glow = `url(#${ids.glow})`;
  const line = { fill: 'none', stroke: color, strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const };

  const tilt = (s: Side, node: ReactNode) => <g transform={`rotate(${TILT[s]} ${EYE[s].x} ${EYE[s].y})`}>{node}</g>;
  const blink = (s: Side, node: ReactNode) => (
    <g transform={`translate(${EYE[s].x} ${EYE[s].y})`}>
      <g className="pet-blink">
        <g transform={`translate(${-EYE[s].x} ${-EYE[s].y})`}>{node}</g>
      </g>
    </g>
  );
  const shine = (s: Side, dy = 0) => (
    <ellipse cx={EYE[s].x - 3} cy={EYE[s].y - 6 + dy} rx={2.4} ry={3.6} fill="#fff" opacity={0.85} transform={`rotate(${TILT[s]} ${EYE[s].x} ${EYE[s].y})`} />
  );
  const oval = (s: Side, rx = 10, ry = 15, dy = 0) =>
    blink(
      s,
      <>
        {tilt(s, <ellipse cx={EYE[s].x} cy={EYE[s].y + dy} rx={rx} ry={ry} fill={fill} filter={glow} />)}
        {color === C.eye && shine(s, dy)}
      </>,
    );
  const lid = (s: Side, yL: number, yR: number, keep: 'below' | 'above' = 'below', rx = 10, ry = 15) =>
    tilt(s, <path d={clipEye(EYE[s].x, EYE[s].y, rx, ry, EYE[s].y + yL, EYE[s].y + yR, keep)} fill={fill} filter={glow} />);
  const arc = (s: Side, down = false) => {
    const { x, y } = EYE[s];
    const d = down ? `M ${x - 9} ${y - 1} Q ${x} ${y + 9} ${x + 9} ${y - 1}` : `M ${x - 10} ${y + 5} Q ${x} ${y - 13} ${x + 10} ${y + 5}`;
    return tilt(s, <path d={d} {...line} strokeWidth={down ? 4.5 : 6} filter={glow} />);
  };
  const chevron = (s: Side) => {
    const { x, y } = EYE[s];
    const d = s === 'l' ? `M ${x - 7} ${y - 9} L ${x + 6} ${y} L ${x - 7} ${y + 9}` : `M ${x + 7} ${y - 9} L ${x - 6} ${y} L ${x + 7} ${y + 9}`;
    return <path d={d} {...line} strokeWidth={5.5} filter={glow} />;
  };
  const heart = (s: Side) => (
    <g transform={`translate(${EYE[s].x} ${EYE[s].y + 1}) scale(1.7)`}>
      <path d={HEART} fill={fill} filter={glow} />
    </g>
  );

  const dot = <ellipse cx={80} cy={123} rx={2.4} ry={1.8} fill={color} />;
  const o = (rx: number, ry: number) => <ellipse cx={80} cy={125} rx={rx} ry={ry} fill="#0b0b0e" stroke={color} strokeWidth={1.8} />;
  const open = (
    <g>
      <path d="M 73 120.5 Q 80 132 87 120.5 Z" fill="#0b0b0e" stroke={color} strokeWidth={1.8} strokeLinejoin="round" />
      <path d="M 76 126.2 Q 80 131 84 126.2 Q 80 123.6 76 126.2 Z" fill={C.pink} />
    </g>
  );
  const smirk = <path d="M 74 123 Q 80 127 86 122" {...line} strokeWidth={2.2} />;
  const squiggle = <path d="M 72 124 q 2 -2.6 4 0 t 4 0 t 4 0 t 4 0" {...line} strokeWidth={2} />;
  const frown = <path d="M 74.5 126 Q 80 121 85.5 126" {...line} strokeWidth={2.2} />;
  const flat = <path d="M 75 124 L 85 124" {...line} strokeWidth={2.2} />;

  switch (expression) {
    case 'happy':
      return <>{arc('l')}{arc('r')}{open}</>;
    case 'excited':
      return <>{chevron('l')}{chevron('r')}{open}</>;
    case 'dizzy':
      return <>{chevron('l')}{chevron('r')}{squiggle}</>;
    case 'wink':
      return <>{oval('l')}{arc('r')}{open}</>;
    case 'sad':
      return <>{lid('l', -3, -12)}{lid('r', -12, -3)}{frown}</>;
    case 'curious':
      return <>{oval('l', 9, 14)}{oval('r', 11.5, 17, -1)}{o(2.2, 2.6)}</>;
    case 'confused':
      return <>{oval('l')}{arc('r')}{squiggle}</>;
    case 'annoyed':
      return <>{lid('l', -5, -1)}{lid('r', -1, -5)}{flat}</>;
    case 'angry':
      return <>{lid('l', -14, -1)}{lid('r', -1, -14)}{frown}</>;
    case 'hacker':
      return <>{lid('l', -12, 0, 'below', 10, 13)}{lid('r', 0, -12, 'below', 10, 13)}{smirk}</>;
    case 'focused':
      return (
        <>
          {chevron('l')}
          <rect className="pet-caret" x={EYE.r.x - 9} y={EYE.r.y + 4} width={18} height={5.5} rx={2.6} fill={color} filter={glow} />
        </>
      );
    case 'surprised':
      return <>{oval('l', 11, 15, -1)}{oval('r', 11, 15, -1)}{o(3, 4)}</>;
    case 'shocked':
      return <>{oval('l', 12.5, 13.5)}{oval('r', 12.5, 13.5)}{open}</>;
    case 'sleepy':
      return <>{lid('l', 2, 2)}{lid('r', 2, 2)}{dot}</>;
    case 'asleep':
      return <>{arc('l', true)}{arc('r', true)}{dot}</>;
    case 'content':
      return <>{lid('l', 3, 3, 'above', 10, 10)}{lid('r', 3, 3, 'above', 10, 10)}{open}</>;
    case 'love':
      return <>{heart('l')}{heart('r')}{open}</>;
    case 'neutral':
    default:
      return <>{oval('l')}{oval('r')}{dot}</>;
  }
}

// ───────────────────────── części ciała ─────────────────────────

function Ear({ side, ids, rim }: { side: Side; ids: Ids; rim: string }) {
  const left = side === 'l';
  const accent = left ? C.green : C.purple;
  return (
    <g className={`pet-earpos pet-earpos--${side}`}>
      <g className={`pet-ear pet-ear--${side}`}>
        <g transform={left ? 'scale(-0.92 0.92)' : 'scale(0.92)'}>
          <path d={EAR} fill={`url(#${ids.skin})`} stroke={C.outline} strokeWidth={OUTLINE / 0.92} strokeLinejoin="round" paintOrder="stroke" />
          <g clipPath={`url(#${ids.earClip})`}>
            <path d="M 0 -30 C -4 -18 -4 -6 -2 6" fill="none" stroke="#000" strokeOpacity={0.35} strokeWidth={5} strokeLinecap="round" />
            <ellipse cx={8} cy={-60} rx={29} ry={21} fill={accent} />
            <ellipse cx={8} cy={-60} rx={29} ry={21} fill={`url(#${ids.tip})`} />
            <path d="M -1 -38.5 C 6 -42 16 -41 26 -37" fill="none" stroke="#000" strokeOpacity={0.35} strokeWidth={2} />
            <path d="M -4 -55 C -2 -63 6 -67 14 -65" fill="none" stroke="#fff" strokeOpacity={0.65} strokeWidth={3} strokeLinecap="round" />
            <path d="M 18 -60 C 20 -56 20 -50 18 -46" fill="none" stroke="#fff" strokeOpacity={0.3} strokeWidth={1.6} strokeLinecap="round" />
            <path d="M -3 -32 C -7 -18 -7 -6 -5 4" fill="none" stroke="#fff" strokeOpacity={0.08} strokeWidth={4} strokeLinecap="round" />
            <path d="M 8 -30 C 9 -18 9 -6 8 4" fill="none" stroke={rim} strokeOpacity={0.3} strokeWidth={2} />
          </g>
          <path d={EAR} fill="none" stroke={rim} strokeOpacity={0.55} strokeWidth={1.4} />
          {/* mankiet kaptura – ucho wychodzi przez obszyty otwór w bluzie */}
          <path
            d="M -16.5 -24 C -6 -27.5 6 -27.5 15.5 -24 L 14.5 -13.5 C 5.5 -16.5 -5.5 -16.5 -15.5 -13.5 Z"
            fill={`url(#${ids.fabric})`}
            stroke={C.outline}
            strokeWidth={3.4}
            strokeLinejoin="round"
            paintOrder="stroke"
          />
          <path d="M -14 -21 C -5 -23.6 5 -23.6 13 -21" fill="none" stroke="#3a3a44" strokeWidth={0.9} strokeDasharray="1.6 1.6" />
          <path d="M -14.5 -16 C -5 -18.6 5 -18.6 13.5 -16" fill="none" stroke="#000" strokeOpacity={0.5} strokeWidth={1.2} />
        </g>
      </g>
    </g>
  );
}

function Leg({ side, ids }: { side: Side; ids: Ids }) {
  const left = side === 'l';
  return (
    <g className={`pet-legpos pet-legpos--${side}`}>
      <g className={`pet-leg pet-leg--${side}`}>
        <Shape d={left ? FOOT_L : FOOT_R} fill={`url(#${ids.skin})`} />
        <path
          d={left ? 'M -14 19.5 C -9 22.8 4 22.8 9 19.5' : 'M 14 19.5 C 9 22.8 -4 22.8 -9 19.5'}
          fill="none"
          stroke={C.purple}
          strokeOpacity={0.95}
          strokeWidth={2.2}
          strokeLinecap="round"
          filter={`url(#${ids.neon})`}
        />
        <path d={left ? 'M -5 9 C -6 11 -6 13 -5 15' : 'M 5 9 C 6 11 6 13 5 15'} fill="none" stroke="#000" strokeOpacity={0.6} strokeWidth={1.3} />
        <path d={left ? 'M 1 10 C 0 12 0 14 1 16' : 'M -1 10 C 0 12 0 14 -1 16'} fill="none" stroke="#000" strokeOpacity={0.45} strokeWidth={1.1} />
        <path d={left ? 'M -12 10 C -9 7 -4 6 0 6.5' : 'M 12 10 C 9 7 4 6 0 6.5'} fill="none" stroke="#fff" strokeOpacity={0.14} strokeWidth={2} strokeLinecap="round" />
      </g>
    </g>
  );
}

function Arm({ side, ids }: { side: Side; ids: Ids }) {
  const left = side === 'l';
  const k = left ? 1 : -1;
  return (
    <g className={`pet-armpos pet-armpos--${side}`}>
      <g className={`pet-arm pet-arm--${side}`}>
        <Shape d={left ? SLEEVE_L : SLEEVE_R} fill={`url(#${ids.fabric})`} outline={4.6} />
        <path d={`M ${-10 * k} 0 C ${-12 * k} 5 ${-12 * k} 9 ${-11 * k} 12`} fill="none" stroke="#fff" strokeOpacity={0.12} strokeWidth={2} strokeLinecap="round" />
        <path d={`M ${-5 * k} 3 C ${-6 * k} 7 ${-6 * k} 10 ${-5.5 * k} 13`} fill="none" stroke="#000" strokeOpacity={0.4} strokeWidth={1.1} />
        <ellipse cx={-8.6 * k} cy={22.6} rx={6.4} ry={5.2} fill={`url(#${ids.skin})`} stroke={C.outline} strokeWidth={4} paintOrder="stroke" />
        <Shape d={left ? CUFF_L : CUFF_R} fill="#121216" outline={3.4} />
        {[0, 1, 2, 3].map((i) => (
          <path key={i} d={`M ${(-13.5 + i * 3.4) * k} ${14 + i * 0.6} l ${-0.3 * k} 4.4`} stroke="#2e2e37" strokeWidth={0.9} />
        ))}
        <path
          d={left ? 'M -13.8 25 C -11 28.6 -6 28.6 -3.4 25' : 'M 13.8 25 C 11 28.6 6 28.6 3.4 25'}
          fill="none"
          stroke={left ? C.green : C.purple}
          strokeWidth={2}
          strokeLinecap="round"
          filter={`url(#${ids.neon})`}
        />
        {!left && (
          <g className="pet-thumb">
            <Shape d="M 6 19 C 3 15 3.5 10 6.5 9.5 C 9.5 9 10.5 13 10 18 Z" fill={`url(#${ids.skin})`} outline={3.6} />
          </g>
        )}
      </g>
    </g>
  );
}

function Tail({ ids, cls }: { ids: Ids; cls: string }) {
  return (
    <g className={`pet-tail ${cls}`}>
      <g filter={`url(#${ids.neon})`}>
        <rect x={-6} y={-6} width={10} height={10} rx={1.2} fill={C.green} />
        <rect x={3} y={-13} width={7} height={7} rx={0.8} fill={C.purple} />
        <rect x={4} y={-2} width={5} height={5} fill={C.green} opacity={0.75} />
        <rect x={10} y={-6} width={3} height={3} fill={C.green} opacity={0.6} />
        <rect x={-3} y={6} width={3.4} height={3.4} fill={C.purple} opacity={0.85} />
      </g>
    </g>
  );
}

function Torso({ ids, rim }: { ids: Ids; rim: string }) {
  return (
    <g className="pet-torso">
      <Shape d={TORSO} fill={`url(#${ids.fabric})`} rim={rim} />
      <path d="M 52 140 C 48 150 48 160 51 168" fill="none" stroke="#fff" strokeOpacity={0.08} strokeWidth={4} strokeLinecap="round" />
      <path d={HEM} fill="#111115" stroke={C.outline} strokeWidth={2} strokeLinejoin="round" />
      {Array.from({ length: 13 }, (_, i) => {
        const x = 50 + i * 5;
        const bow = 1 - ((x - 80) / 34) ** 2;
        return <path key={i} d={`M ${x} ${172 + bow * 5.2} l 0 5.6`} stroke="#2a2a33" strokeWidth={0.9} />;
      })}
      <path d="M 46 171 Q 80 183.4 114 171" fill="none" stroke={C.green} strokeOpacity={0.55} strokeWidth={1.2} filter={`url(#${ids.neon})`} />
      <g className="pet-front">
        <path d={POCKET} fill="#16161b" stroke="#08080a" strokeWidth={1.6} strokeLinejoin="round" />
        <path d="M 59.5 153.3 Q 80 149.6 100.5 153.3 L 104 166 Q 80 169.6 56 166 Z" fill="none" stroke="#34343e" strokeWidth={0.9} strokeDasharray="2 1.6" />
        <path d="M 57 151 L 53 168 M 103 151 L 107 168" stroke="#000" strokeOpacity={0.6} strokeWidth={2} />
        <g transform="translate(80 159) scale(.85)">
          <PixelLogo neon={`url(#${ids.neon})`} />
        </g>
        <path d="M 69.5 144 C 68.5 150 67.5 155 66.5 160" fill="none" stroke="#2c2c35" strokeWidth={2.4} strokeLinecap="round" />
        <path d="M 90.5 144 C 91.5 150 92.5 155 93.5 160" fill="none" stroke="#2c2c35" strokeWidth={2.4} strokeLinecap="round" />
        <rect x={64.4} y={159} width={4.2} height={6.4} rx={1.2} fill={C.green} filter={`url(#${ids.neon})`} />
        <rect x={91.4} y={159} width={4.2} height={6.4} rx={1.2} fill={C.purple} filter={`url(#${ids.neon})`} />
      </g>
    </g>
  );
}

/** Kaptur z twarzą w środku. Twarz i otwór przesuwają się przy obrocie, z tyłu widać nadruk. */
function Hood({ ids, rim, children, hack }: { ids: Ids; rim: string; children: ReactNode; hack: boolean }) {
  return (
    <g className="pet-hood">
      <Shape d={HOOD} fill={`url(#${ids.hood})`} rim={rim} />
      <ellipse cx={58} cy={72} rx={22} ry={10} transform="rotate(-22 58 72)" fill="#fff" opacity={0.05} />
      <path d="M 38 84 C 44 68 58 56 76 53" fill="none" stroke="#fff" strokeOpacity={0.16} strokeWidth={3.4} strokeLinecap="round" />
      <path d="M 44 62 C 33 80 30 99 33 119 M 116 62 C 127 80 130 99 127 119" fill="none" stroke="#000" strokeOpacity={0.35} strokeWidth={1.6} />
      <g className="pet-backprint">
        <path d="M 80 52 L 80 140" stroke="#000" strokeOpacity={0.45} strokeWidth={1.4} />
        <path d="M 82.5 54 L 82.5 138" stroke="#3a3a44" strokeWidth={0.8} strokeDasharray="1.8 1.8" />
        <g transform="translate(80 100) scale(1.9)">
          <PixelLogo neon={`url(#${ids.neon})`} />
        </g>
        <rect x={98} y={112} width={4} height={4} fill={C.purple} filter={`url(#${ids.neon})`} />
        <rect x={56} y={86} width={3} height={3} fill={C.green} opacity={0.7} />
      </g>
      <g className="pet-face">
        <path d={OPENING} fill="none" stroke="#000" strokeOpacity={0.55} strokeWidth={8} />
        <path d="M 80 52 L 80 76" stroke="#000" strokeOpacity={0.4} strokeWidth={1.4} />
        <path d="M 82.5 53 L 82.5 75" stroke="#3a3a44" strokeWidth={0.8} strokeDasharray="1.8 1.8" />
        <path d={OPENING} fill={`url(#${ids.skin})`} />
        <path d="M 37 104 C 42 86 58 78 80 78 C 102 78 118 86 123 104 C 112 92 98 87 80 87 C 62 87 48 92 37 104 Z" fill="#000" opacity={0.5} />
        <path d="M 46 98 C 51 89 60 85 70 84" fill="none" stroke="#fff" strokeOpacity={0.2} strokeWidth={2.6} strokeLinecap="round" />
        {children}
        {hack && <path d={OPENING} fill={`url(#${ids.shade})`} />}
        <path d={OPENING} fill="none" stroke={`url(#${ids.rim})`} strokeWidth={1.8} filter={`url(#${ids.neon})`} />
      </g>
    </g>
  );
}

function Shades({ ids }: { ids: Ids }) {
  const lens = { fill: '#06080a', stroke: C.green, strokeWidth: 2.4, strokeLinejoin: 'round' as const, filter: `url(#${ids.neon})` };
  return (
    <g className="pet-shades">
      <path d="M 39 97 L 77 97 Q 77 119 65 121 L 51 121 Q 39 119 39 97 Z" {...lens} />
      <path d="M 83 97 L 121 97 Q 121 119 109 121 L 95 121 Q 83 119 83 97 Z" {...lens} />
      <path d="M 77 100 Q 80 96.5 83 100" fill="none" stroke={C.green} strokeWidth={2.4} strokeLinecap="round" />
      <path d="M 45 102 L 54 113 M 50 101 L 56 108 M 89 102 L 98 113" stroke="#fff" strokeOpacity={0.35} strokeWidth={2.2} strokeLinecap="round" />
    </g>
  );
}

function Laptop({ ids }: { ids: Ids }) {
  return (
    <g className="pet-laptop">
      <ellipse className="pet-screenglow" cx={84} cy={118} rx={46} ry={22} fill={`url(#${ids.screen})`} />
      <path d="M 52 174 L 126 168 L 122 128 L 48 134 Z" fill="#17171c" stroke={C.outline} strokeWidth={4} strokeLinejoin="round" paintOrder="stroke" />
      <path d="M 52 174 L 126 168 L 122 128 L 48 134 Z" fill="none" stroke="#3b3b45" strokeWidth={1.2} />
      <path d="M 54 136 L 120 130.5" stroke={C.green} strokeOpacity={0.55} strokeWidth={1.4} filter={`url(#${ids.neon})`} />
      <g transform="translate(87 151) rotate(-4.6) scale(1.25)">
        <PixelLogo neon={`url(#${ids.neon})`} />
      </g>
      <path d="M 44 178 L 132 171 L 138 177 L 48 185 Z" fill="#26262c" stroke={C.outline} strokeWidth={3} strokeLinejoin="round" paintOrder="stroke" />
      <path d="M 52 179.5 L 128 173.5" stroke="#3e3e48" strokeWidth={1.2} />
    </g>
  );
}

function Terminals({ ids }: { ids: Ids }) {
  const win = (x: number, y: number, w: number, h: number, cls: string, lines: number[]) => (
    <g transform={`translate(${x} ${y})`}>
      <g className={`pet-term ${cls}`}>
        <rect width={w} height={h} rx={4} fill="#050b06" stroke={C.green} strokeOpacity={0.7} strokeWidth={1.2} filter={`url(#${ids.neon})`} />
        <rect width={w} height={8} rx={4} fill="#0f1c11" />
        <circle cx={6} cy={4} r={1.4} fill={C.red} />
        <circle cx={10.5} cy={4} r={1.4} fill={C.yellow} />
        <circle cx={15} cy={4} r={1.4} fill={C.green} />
        <g className="pet-codelines">
          {lines.map((len, i) => (
            <rect key={i} x={5 + (i % 3 === 1 ? 5 : 0)} y={13 + i * 5} width={len} height={2.2} rx={1} fill={i % 4 === 2 ? C.purple : C.green} opacity={0.85} />
          ))}
        </g>
      </g>
    </g>
  );
  return (
    <g className="pet-terminals">
      {win(-22, 30, 56, 46, 'pet-term--a', [30, 22, 38, 16, 28, 34])}
      {win(124, 8, 60, 52, 'pet-term--b', [26, 40, 18, 34, 24, 30, 14])}
    </g>
  );
}

function Rod({ ids }: { ids: Ids }) {
  return (
    <g transform="translate(118 162)">
      <g className="pet-rod">
        <path d="M -4 6 L 64 -92" stroke={C.outline} strokeWidth={5.5} strokeLinecap="round" />
        <path d="M -4 6 L 64 -92" stroke="#3d3d48" strokeWidth={2.8} strokeLinecap="round" />
        <path d="M -4 6 L 9 -13" stroke="#121216" strokeWidth={4.4} strokeLinecap="round" />
        <circle cx={11} cy={-9} r={5.5} fill="#1d1d22" stroke={C.outline} strokeWidth={2} />
        <circle cx={11} cy={-9} r={2.2} fill={C.green} filter={`url(#${ids.neon})`} />
        <circle cx={34} cy={-49} r={1.6} fill="none" stroke="#8a8a96" strokeWidth={1} />
        <g transform="translate(64 -92)">
          <g className="pet-line">
            <rect className="pet-cord" x={-0.6} y={0} width={1.2} height={190} fill="#d6dacb" opacity={0.8} />
            <g transform="translate(0 190)">
              <g className="pet-ripples" fill="none" stroke={C.cyan} strokeWidth={1.2}>
                <ellipse className="pet-ripple" rx={8} ry={2} />
                <ellipse className="pet-ripple pet-ripple--2" rx={8} ry={2} />
              </g>
              <g className="pet-hook">
                <g transform="translate(0 7)">
                  <g className="pet-fish">
                    <g className="pet-fish-flap">
                      <Fish gradient={ids.fish} />
                    </g>
                  </g>
                </g>
                <g className="pet-bobber">
                  <path d="M -4.5 0 A 4.5 4.5 0 0 1 4.5 0 Z" fill={C.red} stroke={C.outline} strokeWidth={1.4} />
                  <path d="M -4.5 0 A 4.5 4.5 0 0 0 4.5 0 Z" fill="#f2f2f2" stroke={C.outline} strokeWidth={1.4} />
                </g>
              </g>
            </g>
          </g>
        </g>
      </g>
    </g>
  );
}

// ───────────────────────── efekty ─────────────────────────

function Fx({ state, ids }: { state: PetState; ids: Ids }) {
  const neon = `url(#${ids.neon})`;
  const sparkles = (pts: Array<[number, number, number, string]>) =>
    pts.map(([x, y, s, c], i) => (
      <g key={i} transform={`translate(${x} ${y}) scale(${s})`}>
        <path d={i % 3 === 2 ? PLUS : SPARK} fill={c} filter={neon} className="pet-twinkle" style={{ animationDelay: `${i * 0.17}s` }} />
      </g>
    ));
  const bang = (x: number, y: number, color: string = C.green) => (
    <g transform={`translate(${x} ${y})`} className="pet-pop" fill="none" stroke={color} strokeWidth={3.2} strokeLinecap="round" filter={neon}>
      <path d="M 0 0 L 5 -11" />
      <path d="M 9 3 L 19 -4" />
      <path d="M 11 12 L 22 12" />
    </g>
  );
  const stars = (cx: number, cy: number) => (
    <g transform={`translate(${cx} ${cy})`}>
      {[0, 1, 2].map((i) => (
        <g key={i} className="pet-orbit" style={{ animationDelay: `${-i * 0.53}s` }}>
          <path d={STAR} fill={C.yellow} stroke={C.outline} strokeWidth={1.2} />
        </g>
      ))}
    </g>
  );

  switch (state) {
    case 'sleep':
      return (
        <g className="pet-fx">
          {[0, 1, 2].map((i) => (
            <text key={i} x={108 + i * 11} y={100 - i * 17} className="pet-z" style={{ animationDelay: `${i * 0.8}s` }} fill={C.green} filter={neon} fontSize={14 + i * 5}>
              z
            </text>
          ))}
        </g>
      );
    case 'success':
    case 'cool':
    case 'show':
      return (
        <g className="pet-fx">
          {sparkles([
            [16, 46, 1.1, C.green],
            [146, 34, 1.3, C.green],
            [152, 104, 0.8, C.green],
            [8, 112, 0.8, C.purple],
            [128, 6, 0.7, C.green],
          ])}
        </g>
      );
    case 'happy':
    case 'petted':
      return (
        <g className="pet-fx">
          <g transform="translate(140 52) scale(1.5)">
            <path d={HEART} fill="none" stroke={C.green} strokeWidth={1.4} filter={neon} className="pet-float" />
          </g>
          <g transform="translate(22 60) scale(1.1)">
            <path d={HEART} fill={C.purple} filter={neon} className="pet-float" style={{ animationDelay: '0.5s' }} />
          </g>
          <g transform="translate(128 18) scale(0.9)">
            <path d={HEART} fill={C.green} filter={neon} className="pet-float" style={{ animationDelay: '0.9s' }} />
          </g>
        </g>
      );
    case 'giggle':
      return (
        <g className="pet-fx">
          {sparkles([
            [18, 96, 0.8, C.green],
            [144, 92, 0.8, C.green],
            [136, 50, 0.6, C.purple],
          ])}
        </g>
      );
    case 'error':
      return (
        <g className="pet-fx">
          <g transform="translate(140 38)" className="pet-alert">
            <path d="M 0 -12 L 13 10 L -13 10 Z" fill="rgba(255,59,59,.15)" stroke={C.red} strokeWidth={2.8} strokeLinejoin="round" filter={neon} />
            <rect x={-1.5} y={-5} width={3} height={8.5} rx={1.4} fill={C.red} />
            <circle cx={0} cy={6.4} r={1.6} fill={C.red} />
          </g>
          <g className="pet-glitchbars">
            <rect x={6} y={78} width={26} height={3} fill={C.red} />
            <rect x={-6} y={102} width={18} height={2.5} fill={C.cyan} />
            <rect x={134} y={120} width={24} height={3} fill={C.red} />
            <rect x={140} y={86} width={14} height={2} fill={C.cyan} />
            <rect x={2} y={140} width={20} height={2.5} fill={C.red} />
          </g>
        </g>
      );
    case 'confused':
      return (
        <g className="pet-fx">
          <text x={132} y={60} className="pet-bob" fill={C.green} filter={neon} fontSize={38}>
            ?
          </text>
        </g>
      );
    case 'wake':
    case 'flinch':
    case 'oops':
      return (
        <g className="pet-fx">
          {bang(128, 50)}
          {state === 'oops' && (
            <g transform="translate(34 74)">
              <path d={DROP} fill={C.cyan} filter={neon} className="pet-tear" />
            </g>
          )}
        </g>
      );
    case 'drag':
      return (
        <g className="pet-fx">
          <g transform="translate(130 70)">
            <path d={DROP} fill={C.cyan} filter={neon} className="pet-tear" />
          </g>
        </g>
      );
    case 'sad':
      return (
        <g className="pet-fx">
          <g transform="translate(54 130)">
            <path d={DROP} fill={C.cyan} filter={neon} className="pet-tear" />
          </g>
        </g>
      );
    case 'splat':
      return (
        <g className="pet-fx">
          <g transform="translate(80 120)" className="pet-swirl">
            <path d="M 0 0 C 4 0 4 -5 0 -5 C -7 -5 -7 4 0 4 C 10 4 10 -10 0 -10 C -13 -10 -13 9 0 9" fill="none" stroke="#9a9aa8" strokeWidth={2} strokeLinecap="round" />
          </g>
          {stars(80, 132)}
        </g>
      );
    case 'bonk':
      return <g className="pet-fx">{stars(80, 50)}</g>;
    case 'fish':
      return (
        <g className="pet-fx">
          <g className="pet-fish-alert">{bang(36, 46)}</g>
        </g>
      );
    case 'twitch-l':
    case 'twitch-r':
      return (
        <g className="pet-fx">
          <g transform={state === 'twitch-l' ? 'translate(4 22) scale(-1 1)' : 'translate(156 22)'} className="pet-pop" fill="none" stroke={C.green} strokeWidth={2.4} strokeLinecap="round" filter={neon}>
            <path d="M 0 0 C 5 4 5 10 0 14" />
            <path d="M 5 -3 C 12 3 12 13 5 19" />
          </g>
        </g>
      );
    default:
      return null;
  }
}

// ───────────────────────── całość ─────────────────────────

export interface PetSvgProps {
  state?: PetState;
  expression?: PetExpression;
  prop?: PetProp | null;
  /** Obrót wokół osi pionowej w stopniach (0 = przodem, 90 = bokiem, 180 = tyłem) – do podglądów. */
  yaw?: number;
  className?: string;
}

/** CSS-owe zmienne obrotu 3D (silnik ustawia je sam co klatkę na elemencie .pet). */
export function yawVars(yaw: number): CSSProperties {
  const r = (yaw * Math.PI) / 180;
  const c = Math.cos(r);
  const s = Math.sin(r);
  return {
    ['--yc' as string]: c.toFixed(3),
    ['--ys' as string]: s.toFixed(3),
    ['--yac' as string]: Math.abs(c).toFixed(3),
    ['--yas' as string]: Math.abs(s).toFixed(3),
    ['--ysg' as string]: c < 0 ? -1 : 1,
  };
}

/**
 * Grafika maskotki w czarnej bluzie z kapturem. Poza i animacje biorą się z CSS (pet.css)
 * i atrybutu data-pet-state rodzica, a mina, akcesoria i rekwizyty z propsów.
 */
export function PetSvg({ state = 'idle', expression = 'neutral', prop = null, yaw, className }: PetSvgProps) {
  const uid = `pet${useId().replace(/[^a-zA-Z0-9_-]/g, '')}`;
  const ids: Ids = {
    skin: `${uid}skin`,
    fabric: `${uid}fabric`,
    hood: `${uid}hood`,
    rim: `${uid}rim`,
    eye: `${uid}eye`,
    glow: `${uid}glow`,
    neon: `${uid}neon`,
    soft: `${uid}soft`,
    earClip: `${uid}ear`,
    tip: `${uid}tip`,
    ground: `${uid}ground`,
    fish: `${uid}fish`,
    screen: `${uid}screen`,
    shade: `${uid}shade`,
    uid,
  };

  const hack = state === 'hack';
  const laptop = state === 'hack' || state === 'typing';
  const shades = state === 'cool';
  const isError = state === 'error';
  const eyeColor = isError || expression === 'angry' ? C.red : laptop || expression === 'hacker' ? C.green : C.eye;
  const blush = expression === 'happy' || expression === 'love' || expression === 'excited' || expression === 'content' || state === 'petted';
  const rimL = isError ? C.red : C.green;
  const rimR = isError ? C.red : C.purple;
  const play = state === 'show' && prop ? PROP_PLAY[prop] : null;
  const pose = play && play !== 'sip' ? PROP_POSE[play] : null;
  const rim = `url(#${ids.rim})`;

  const propNode =
    pose && prop ? (
      <g transform={`translate(${pose.x} ${pose.y})`}>
        <g className="pet-prop">
          <g transform={`translate(${pose.dx ?? 0} ${pose.dy ?? 0}) scale(${pose.s})`}>
            {play === 'phone' ? <PhoneProp name={prop} uid={uid} neon={`url(#${ids.neon})`} /> : <PropArt name={prop} uid={uid} neon={`url(#${ids.neon})`} />}
          </g>
        </g>
      </g>
    ) : null;

  return (
    <svg
      className={className ? `pet-svg ${className}` : 'pet-svg'}
      viewBox={`0 0 ${PET_VIEW.w} ${PET_VIEW.h}`}
      overflow="visible"
      aria-hidden="true"
      focusable="false"
      data-pet-play={play ?? undefined}
      style={yaw === undefined ? undefined : yawVars(yaw)}
    >
      <defs>
        <radialGradient id={ids.skin} cx="38%" cy="28%" r="80%">
          <stop offset="0" stopColor="#3d3d48" />
          <stop offset="0.45" stopColor={C.body} />
          <stop offset="1" stopColor="#09090b" />
        </radialGradient>
        <radialGradient id={ids.fabric} cx="40%" cy="22%" r="90%">
          <stop offset="0" stopColor="#34343d" />
          <stop offset="0.5" stopColor="#1b1b21" />
          <stop offset="1" stopColor="#0b0b0e" />
        </radialGradient>
        <radialGradient id={ids.hood} cx="38%" cy="20%" r="85%">
          <stop offset="0" stopColor="#383842" />
          <stop offset="0.45" stopColor="#1c1c22" />
          <stop offset="1" stopColor="#0a0a0c" />
        </radialGradient>
        <linearGradient id={ids.rim} x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" stopColor={rimL} stopOpacity="0.95" />
          <stop offset="0.3" stopColor={rimL} stopOpacity="0" />
          <stop offset="0.7" stopColor={rimR} stopOpacity="0" />
          <stop offset="1" stopColor={rimR} stopOpacity="0.95" />
        </linearGradient>
        <linearGradient id={ids.shade} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#000" stopOpacity="0.95" />
          <stop offset="0.45" stopColor="#000" stopOpacity="0.55" />
          <stop offset="1" stopColor="#000" stopOpacity="0.1" />
        </linearGradient>
        <radialGradient id={ids.eye} cx="45%" cy="38%" r="65%">
          <stop offset="0" stopColor="#FFFFFB" />
          <stop offset="0.55" stopColor="#F7F4E4" />
          <stop offset="1" stopColor="#D9D3B5" />
        </radialGradient>
        <radialGradient id={ids.tip} cx="30%" cy="22%" r="90%">
          <stop offset="0" stopColor="#fff" stopOpacity="0.5" />
          <stop offset="0.45" stopColor="#fff" stopOpacity="0" />
          <stop offset="1" stopColor="#000" stopOpacity="0.35" />
        </radialGradient>
        <radialGradient id={ids.ground} cx="50%" cy="50%" r="50%">
          <stop offset="0" stopColor={rimL} stopOpacity="0.5" />
          <stop offset="1" stopColor={rimL} stopOpacity="0" />
        </radialGradient>
        <radialGradient id={ids.screen} cx="50%" cy="70%" r="60%">
          <stop offset="0" stopColor={C.green} stopOpacity="0.35" />
          <stop offset="1" stopColor={C.green} stopOpacity="0" />
        </radialGradient>
        <linearGradient id={ids.fish} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor={C.green} />
          <stop offset="1" stopColor={C.cyan} />
        </linearGradient>
        <clipPath id={ids.earClip}>
          <path d={EAR} />
        </clipPath>
        <filter id={ids.glow} x="-80%" y="-80%" width="260%" height="260%">
          <feGaussianBlur in="SourceGraphic" stdDeviation="2.8" result="wide" />
          <feGaussianBlur in="SourceGraphic" stdDeviation="0.9" result="tight" />
          <feMerge>
            <feMergeNode in="wide" />
            <feMergeNode in="tight" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
        <filter id={ids.neon} x="-60%" y="-60%" width="220%" height="220%">
          <feGaussianBlur in="SourceGraphic" stdDeviation="1.8" result="b" />
          <feMerge>
            <feMergeNode in="b" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
        <filter id={ids.soft} x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur stdDeviation="2.4" />
        </filter>
      </defs>

      <ellipse className="pet-ground" cx={80} cy={186} rx={50} ry={7} fill={`url(#${ids.ground})`} />
      {hack && <Terminals ids={ids} />}

      <g className="pet-lean">
        <g className="pet-rig">
          <Tail ids={ids} cls="pet-tail--back" />
          <g className="pet-ears">
            <Ear side="l" ids={ids} rim={rimL} />
            <Ear side="r" ids={ids} rim={rimR} />
          </g>

          <Torso ids={ids} rim={rim} />
          <Leg side="l" ids={ids} />
          <Leg side="r" ids={ids} />
          <Tail ids={ids} cls="pet-tail--front" />

          <g transform="translate(80 142)">
            <g className="pet-head">
              <g transform="translate(-80 -142)">
                <Hood ids={ids} rim={rim} hack={hack}>
                  <g className="pet-eyes">
                    <Face expression={expression} color={eyeColor} ids={ids} />
                  </g>
                  <g className="pet-cheeks">
                    <g transform="translate(43 124) scale(0.85)">
                      <path d={PLUS} fill={C.green} filter={`url(#${ids.neon})`} />
                    </g>
                    <rect x={49} y={132} width={3.2} height={3.2} fill={C.green} opacity={0.7} />
                    <rect x={112} y={118} width={3.6} height={3.6} fill={C.green} opacity={0.75} filter={`url(#${ids.neon})`} />
                    <rect x={117} y={113} width={2.4} height={2.4} fill={C.green} opacity={0.55} />
                  </g>
                  {blush && (
                    <g className="pet-blush" filter={`url(#${ids.soft})`}>
                      <ellipse cx={46} cy={124} rx={8} ry={4.2} fill={C.pink} opacity={0.5} />
                      <ellipse cx={114} cy={124} rx={8} ry={4.2} fill={C.pink} opacity={0.5} />
                    </g>
                  )}
                  {shades && <Shades ids={ids} />}
                </Hood>
              </g>
            </g>
          </g>

          {state === 'fish' && <Rod ids={ids} />}
          <Arm side="l" ids={ids} />
          {pose?.mid && propNode}
          <Arm side="r" ids={ids} />
          {pose && !pose.mid && propNode}
          {state === 'coffee' && (
            <g transform="translate(80 154) scale(1.3)">
              <g className="pet-mughold">
                <Mug neon={`url(#${ids.neon})`} />
              </g>
            </g>
          )}
          {laptop && <Laptop ids={ids} />}
        </g>
      </g>

      <Fx state={state} ids={ids} />
    </svg>
  );
}
