'use client';

import { useId, type ReactNode } from 'react';
import type { PetExpression, PetState } from './types';

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
} as const;

const C = PET_COLORS;

// Ucho w lokalnych współrzędnych: podstawa w (0,0), czubek u góry, lekko wygięty w prawo.
const EAR = 'M -8 4 C -13 -10 -15 -30 -6 -41 C 1 -50 18 -50 19 -38 C 20 -28 11 -14 9 4 Z';
const PLUS = 'M -1.6 -5 H 1.6 V -1.6 H 5 V 1.6 H 1.6 V 5 H -1.6 V 1.6 H -5 V -1.6 H -1.6 Z';
const HEART = 'M 0 4 C -7 -1 -5 -7 0 -3.5 C 5 -7 7 -1 0 4 Z';
const DROP = 'M 0 -4 C 2 -1 3 1 3 2.2 A 3 3 0 0 1 -3 2.2 C -3 1 -2 -1 0 -4 Z';
const STAR = starPath(5, 2.2);

const EYE_L = { x: 37.5, y: 64 };
const EYE_R = { x: 62.5, y: 64 };

type Pt = [number, number];

function starPath(outer: number, inner: number) {
  const pts: string[] = [];
  for (let i = 0; i < 10; i++) {
    const r = i % 2 ? inner : outer;
    const a = -Math.PI / 2 + (i * Math.PI) / 5;
    pts.push(`${(Math.cos(a) * r).toFixed(2)} ${(Math.sin(a) * r).toFixed(2)}`);
  }
  return `M${pts.join('L')}Z`;
}

/** Oko-elipsa przycięta od góry „powieką”: linią od (lewa krawędź, yL) do (prawa krawędź, yR). */
function lidEye(cx: number, cy: number, rx: number, ry: number, yL: number, yR: number) {
  const pts: Pt[] = [];
  for (let i = 0; i < 40; i++) {
    const a = (i / 40) * Math.PI * 2;
    pts.push([cx + Math.cos(a) * rx, cy + Math.sin(a) * ry]);
  }
  const x0 = cx - rx;
  const f = ([x, y]: Pt) => y - (yL + ((yR - yL) * (x - x0)) / (2 * rx));
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

function Blink({ x, y, children }: { x: number; y: number; children: ReactNode }) {
  return (
    <g transform={`translate(${x} ${y})`}>
      <g className="pet-blink">
        <g transform={`translate(${-x} ${-y})`}>{children}</g>
      </g>
    </g>
  );
}

function Face({ expression, color, glow }: { expression: PetExpression; color: string; glow: string }) {
  const filter = `url(#${glow})`;
  const line = {
    fill: 'none',
    stroke: color,
    strokeWidth: 4,
    strokeLinecap: 'round' as const,
    strokeLinejoin: 'round' as const,
    filter,
  };
  const thin = { ...line, strokeWidth: 1.8, filter: undefined };
  const L = EYE_L;
  const R = EYE_R;
  const oval = (p: { x: number; y: number }, rx: number, ry: number, dy = 0) => (
    <Blink x={p.x} y={p.y + dy}>
      <ellipse cx={p.x} cy={p.y + dy} rx={rx} ry={ry} fill={color} filter={filter} />
    </Blink>
  );
  const lid = (p: { x: number; y: number }, yL: number, yR: number, rx = 7, ry = 10.5) => (
    <path d={lidEye(p.x, p.y, rx, ry, p.y + yL, p.y + yR)} fill={color} filter={filter} />
  );
  const arcUp = (p: { x: number; y: number }) => (
    <path d={`M ${p.x - 6.5} ${p.y + 3} Q ${p.x} ${p.y - 9} ${p.x + 6.5} ${p.y + 3}`} {...line} />
  );
  const nose = <ellipse cx={50} cy={74.5} rx={1.7} ry={1.3} fill={color} opacity={0.9} />;
  const squiggle = <path d="M 45 74.5 q 1.25 -2 2.5 0 t 2.5 0 t 2.5 0 t 2.5 0" {...thin} />;

  switch (expression) {
    case 'happy':
      return (
        <>
          {arcUp(L)}
          {arcUp(R)}
          <path d="M 46 72 Q 50 76.5 54 72" {...thin} />
        </>
      );
    case 'sad':
      return (
        <>
          {lid(L, -2, -9, 6, 9)}
          {lid(R, -9, -2, 6, 9)}
          <path d="M 46.5 75.5 Q 50 72 53.5 75.5" {...thin} />
        </>
      );
    case 'curious':
      return (
        <>
          {oval(L, 6, 9.5)}
          {oval(R, 7.5, 11.5, -1)}
          <ellipse cx={51} cy={74} rx={1.8} ry={2.2} fill={color} />
        </>
      );
    case 'confused':
      return (
        <>
          {oval(L, 6.5, 10)}
          <path d={`M ${R.x - 6} ${R.y + 2} Q ${R.x} ${R.y - 6} ${R.x + 6} ${R.y + 2}`} {...line} />
          {squiggle}
        </>
      );
    case 'annoyed':
      return (
        <>
          {lid(L, -3, 0)}
          {lid(R, 0, -3)}
          <path d="M 46.5 74 L 53.5 74" {...thin} />
        </>
      );
    case 'angry':
      return (
        <>
          {lid(L, -10, -1)}
          {lid(R, -1, -10)}
          <path d="M 46 75.5 Q 50 72.5 54 75.5" {...thin} />
        </>
      );
    case 'focused':
      return (
        <>
          {lid(L, -8, -3)}
          {lid(R, -3, -8)}
          {nose}
        </>
      );
    case 'surprised':
      return (
        <>
          {oval(L, 7.5, 10.5, -1)}
          {oval(R, 7.5, 10.5, -1)}
          <ellipse cx={50} cy={75.5} rx={2.6} ry={3.2} fill={color} />
        </>
      );
    case 'sleepy':
      return (
        <>
          {lid(L, 1, 1)}
          {lid(R, 1, 1)}
          {nose}
        </>
      );
    case 'asleep':
      return (
        <>
          <path d={`M ${L.x - 6} ${L.y} Q ${L.x} ${L.y + 6} ${L.x + 6} ${L.y}`} {...line} strokeWidth={3.2} />
          <path d={`M ${R.x - 6} ${R.y} Q ${R.x} ${R.y + 6} ${R.x + 6} ${R.y}`} {...line} strokeWidth={3.2} />
          {nose}
        </>
      );
    case 'dizzy':
      return (
        <>
          <path d={`M ${L.x - 5} ${L.y - 6} L ${L.x + 4} ${L.y} L ${L.x - 5} ${L.y + 6}`} {...line} strokeWidth={3.4} />
          <path d={`M ${R.x + 5} ${R.y - 6} L ${R.x - 4} ${R.y} L ${R.x + 5} ${R.y + 6}`} {...line} strokeWidth={3.4} />
          {squiggle}
        </>
      );
    case 'neutral':
    default:
      return (
        <>
          {oval(L, 7, 11)}
          {oval(R, 7, 11)}
          {nose}
        </>
      );
  }
}

function Ear({ side, fill, rim, accent, clip }: { side: 'l' | 'r'; fill: string; rim: string; accent: string; clip: string }) {
  const left = side === 'l';
  return (
    <g transform={left ? 'translate(35 45) rotate(-22)' : 'translate(65 45) rotate(22)'}>
      <g className={`pet-ear pet-ear--${side}`}>
        <g transform={left ? 'scale(-1 1)' : undefined}>
          <path d={EAR} fill={fill} />
          <g clipPath={`url(#${clip})`}>
            <ellipse cx={7} cy={-46} rx={19} ry={15} fill={accent} />
            <ellipse cx={2} cy={-42} rx={5} ry={2.8} fill="#fff" opacity={0.4} />
          </g>
          <path d={EAR} fill="none" stroke={rim} strokeOpacity={0.55} strokeWidth={1.1} />
        </g>
      </g>
    </g>
  );
}

function Limb({ cls, x, y, cx, cy, rx, ry, fill, rim }: { cls: string; x: number; y: number; cx: number; cy: number; rx: number; ry: number; fill: string; rim: string }) {
  return (
    <g transform={`translate(${x} ${y})`}>
      <g className={cls}>
        <ellipse cx={cx} cy={cy} rx={rx} ry={ry} fill={fill} stroke={rim} strokeOpacity={0.4} strokeWidth={1} />
      </g>
    </g>
  );
}

function Laptop() {
  return (
    <g className="pet-laptop">
      <rect x={7} y={92} width={32} height={21} rx={2} fill="#16161b" stroke="#4a4a55" strokeWidth={0.8} />
      <rect x={9.5} y={94.5} width={27} height={16} rx={1} fill="#071008" />
      <g className="pet-code">
        <rect x={11.5} y={97} width={12} height={1.6} fill={C.green} />
        <rect x={13.5} y={100.2} width={16} height={1.6} fill={C.green} opacity={0.8} />
        <rect x={13.5} y={103.4} width={9} height={1.6} fill={C.purple} />
        <rect x={11.5} y={106.6} width={14} height={1.6} fill={C.green} opacity={0.7} />
      </g>
      <path d="M 2 119 L 44 119 L 40 113 L 6 113 Z" fill="#2a2a31" stroke="#4a4a55" strokeWidth={0.8} />
    </g>
  );
}

const SPARKS: Array<[number, number, number, string, number]> = [
  [12, 34, 0.9, C.green, 0],
  [88, 26, 1.1, C.green, 0.25],
  [94, 66, 0.7, C.purple, 0.5],
  [6, 74, 0.7, C.green, 0.7],
  [80, 8, 0.6, C.purple, 0.4],
];

function Fx({ state }: { state: PetState }) {
  switch (state) {
    case 'sleep':
      return (
        <g className="pet-fx">
          {[0, 1, 2].map((i) => (
            <text
              key={i}
              x={68 + i * 8}
              y={58 - i * 11}
              className="pet-z"
              style={{ animationDelay: `${i * 0.8}s` }}
              fill={i % 2 ? C.green : C.purple}
              fontSize={10 + i * 3}
            >
              z
            </text>
          ))}
        </g>
      );
    case 'success':
      return (
        <g className="pet-fx">
          {SPARKS.map(([x, y, s, c, d], i) => (
            <g key={i} transform={`translate(${x} ${y}) scale(${s})`}>
              <path d={PLUS} fill={c} className="pet-twinkle" style={{ animationDelay: `${d}s` }} />
            </g>
          ))}
        </g>
      );
    case 'error':
      return (
        <g className="pet-fx">
          <g transform="translate(86 22)">
            <g className="pet-alert">
              <path d="M 0 -9 L 9.5 7 L -9.5 7 Z" fill="rgba(255,59,59,.12)" stroke={C.red} strokeWidth={2.2} strokeLinejoin="round" />
              <rect x={-1.1} y={-4} width={2.2} height={6.5} rx={1} fill={C.red} />
              <circle cx={0} cy={4.4} r={1.2} fill={C.red} />
            </g>
          </g>
        </g>
      );
    case 'confused':
      return (
        <g className="pet-fx">
          <text x={82} y={30} className="pet-bob" fill={C.green} fontSize={22}>
            ?
          </text>
        </g>
      );
    case 'wake':
      return (
        <g className="pet-fx">
          <text x={82} y={30} className="pet-bob" fill={C.purple} fontSize={18}>
            !
          </text>
        </g>
      );
    case 'happy':
      return (
        <g className="pet-fx">
          <g transform="translate(86 26) scale(1.3)">
            <path d={HEART} fill={C.purple} className="pet-float" />
          </g>
        </g>
      );
    case 'sad':
      return (
        <g className="pet-fx">
          <g transform="translate(31 76)">
            <path d={DROP} fill={C.cyan} className="pet-tear" />
          </g>
        </g>
      );
    case 'splat':
      return (
        <g className="pet-fx" transform="translate(50 74)">
          {[0, 1, 2].map((i) => (
            <g key={i} className="pet-orbit" style={{ animationDelay: `${-i * 0.53}s` }}>
              <path d={STAR} fill={C.yellow} />
            </g>
          ))}
        </g>
      );
    default:
      return null;
  }
}

export interface PetSvgProps {
  state?: PetState;
  expression?: PetExpression;
  className?: string;
}

/** Sama grafika maskotki (bez ruchu po stronie). Animacje biorą się z CSS i atrybutu data-pet-state rodzica. */
export function PetSvg({ state = 'idle', expression = 'neutral', className }: PetSvgProps) {
  const uid = useId().replace(/[^a-zA-Z0-9_-]/g, '');
  const id = (name: string) => `pet${uid}${name}`;
  const isError = state === 'error';
  const eye = isError || expression === 'angry' ? C.red : C.eye;
  const rim = isError ? C.red : C.purple;
  const body = `url(#${id('body')})`;

  return (
    <svg
      className={className ? `pet-svg ${className}` : 'pet-svg'}
      viewBox="0 0 100 120"
      overflow="visible"
      aria-hidden="true"
      focusable="false"
    >
      <defs>
        <radialGradient id={id('head')} cx="38%" cy="28%" r="78%">
          <stop offset="0" stopColor="#3a3a44" />
          <stop offset="0.45" stopColor={C.body} />
          <stop offset="1" stopColor="#0e0e11" />
        </radialGradient>
        <radialGradient id={id('body')} cx="40%" cy="25%" r="85%">
          <stop offset="0" stopColor="#34343d" />
          <stop offset="0.5" stopColor={C.body} />
          <stop offset="1" stopColor="#0e0e11" />
        </radialGradient>
        <clipPath id={id('ear')}>
          <path d={EAR} />
        </clipPath>
        <filter id={id('glow')} x="-60%" y="-60%" width="220%" height="220%">
          <feGaussianBlur stdDeviation="1.3" result="b" />
          <feMerge>
            <feMergeNode in="b" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>

      <ellipse className="pet-ground" cx={50} cy={119.5} rx={23} ry={2.6} fill={isError ? C.red : C.green} opacity={0.22} />

      <g className="pet-lean">
        <g className="pet-rig">
          <g className="pet-pixels" transform="translate(78 99)">
            <rect x={0} y={0} width={4.5} height={4.5} fill={C.green} />
            <rect x={4.5} y={-4.5} width={3.5} height={3.5} fill={C.purple} />
            <rect x={6} y={3} width={3} height={3} fill={C.green} opacity={0.7} />
            <rect x={-2.5} y={6.5} width={2.5} height={2.5} fill={C.purple} opacity={0.8} />
          </g>

          <Ear side="l" fill={body} rim={rim} accent={C.green} clip={id('ear')} />
          <Ear side="r" fill={body} rim={rim} accent={C.purple} clip={id('ear')} />

          <ellipse cx={50} cy={97} rx={21} ry={17} fill={body} stroke={rim} strokeOpacity={0.45} strokeWidth={1.1} />

          <Limb cls="pet-foot pet-foot--l" x={40} y={113} cx={0} cy={0} rx={9.5} ry={6} fill={body} rim={rim} />
          <Limb cls="pet-foot pet-foot--r" x={60} y={113} cx={0} cy={0} rx={9.5} ry={6} fill={body} rim={rim} />

          <g transform="translate(50 86)">
            <g className="pet-head">
              <g transform="translate(-50 -86)">
                <ellipse cx={50} cy={60} rx={35} ry={29} fill={`url(#${id('head')})`} stroke={rim} strokeOpacity={0.5} strokeWidth={1.2} />
                <path d="M 25 48 Q 30 37 43 34" fill="none" stroke="#fff" strokeOpacity={0.13} strokeWidth={3} strokeLinecap="round" />
                <g className="pet-eyes">
                  <Face expression={expression} color={eye} glow={id('glow')} />
                </g>
                <g transform="translate(20 71) scale(.55)">
                  <path d={PLUS} fill={C.green} opacity={0.9} />
                </g>
                <rect x={24} y={79} width={2.4} height={2.4} fill={C.green} opacity={0.6} />
              </g>
            </g>
          </g>

          <Limb cls="pet-arm pet-arm--l" x={31} y={88} cx={-2} cy={6} rx={6} ry={8.5} fill={body} rim={rim} />
          <Limb cls="pet-arm pet-arm--r" x={69} y={88} cx={2} cy={6} rx={6} ry={8.5} fill={body} rim={rim} />

          {state === 'typing' && <Laptop />}
        </g>
      </g>

      <Fx state={state} />
    </svg>
  );
}
