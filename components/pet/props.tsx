import type { ReactNode } from 'react';
import { AIRBNB_BELO, ALLEGRO_WORDMARK, BOOKING_B, CLOUDFLARE_CLOUD, TICKETMASTER_WORDMARK, VINTED_V, type BrandMark } from './brands';
import type { PetProp, PetTrick } from './types';

/*
 * Rekwizyty rysowane w SVG, wycentrowane w (0,0), ok. 64×44 jednostek.
 * Znaki Allegro, Vinted, Booking, Ticketmaster, Cloudflare i Airbnb to aktualne ścieżki z brands.ts,
 * OLX, BLIK i Alebilet są odwzorowane kształtami (brak otwartych plików SVG tych marek).
 */

const FONT = "'Arial Black', 'Arial Rounded MT Bold', 'Helvetica Neue', Arial, sans-serif";
const MONO = 'ui-monospace, SFMono-Regular, Menlo, Consolas, monospace';
const OUT = '#050507';
const GREEN = '#B6FF38';
const CYAN = '#00E5FF';

const TICKET = 'M -32 -16 H 32 V -6 A 6 6 0 0 0 32 6 V 16 H -32 V 6 A 6 6 0 0 0 -32 -6 Z';
const HEART = 'M 0 6 C -10 -1 -7 -10 0 -5 C 7 -10 10 -1 0 6 Z';

/** Jakie triki maskotka umie zrobić z danym rekwizytem (pierwszy = ulubiony). */
export const PROP_TRICKS: Record<PetProp, PetTrick[]> = {
  allegro: ['toss', 'carry', 'sit-on', 'hide', 'hold'],
  box: ['toss', 'carry', 'sit-on', 'hide', 'hold'],
  'allegro-lokalnie': ['spin', 'wave', 'hold'],
  olx: ['spin', 'wave', 'hold'],
  vinted: ['wave', 'spin', 'hold'],
  alebilet: ['wave', 'read', 'hold'],
  ticketmaster: ['wave', 'read', 'hold'],
  booking: ['tap', 'call', 'selfie', 'hold'],
  airbnb: ['tap', 'call', 'selfie', 'hold'],
  blik: ['tap', 'call'],
  cloudflare: ['bounce', 'float', 'hold'],
  database: ['drum', 'sit-on', 'hold'],
  terminal: ['type', 'hold'],
  laptop: ['type'],
  globe: ['spin', 'kick', 'bounce', 'hold'],
  gear: ['rotate', 'hold'],
  bug: ['chase', 'hold'],
  heart: ['hug', 'toss', 'hold'],
  coffee: ['sip', 'blow'],
  ball: ['kick', 'toss', 'bounce'],
  plane: ['throw'],
  umbrella: ['twirl'],
  balloon: ['float'],
  skateboard: ['ride', 'kickflip'],
  headphones: ['dance'],
  book: ['read'],
  magnifier: ['inspect'],
  sign: ['wave', 'hold'],
};

/** Warstwa rekwizytu: za ciałem, między rękami, z przodu, na głowie albo „na ziemi” (nie rusza się z ciałem). */
export type PropLayer = 'back' | 'mid' | 'front' | 'head' | 'ground-back' | 'ground-front';

export interface PropPlace {
  x: number;
  y: number;
  s: number;
  layer: PropLayer;
  dx?: number;
  dy?: number;
}

const TRICK_PLACE: Record<PetTrick, PropPlace> = {
  hold: { x: 80, y: 152, s: 0.85, layer: 'front' },
  toss: { x: 80, y: 150, s: 0.85, layer: 'front' },
  spin: { x: 116, y: 116, dy: -22, s: 0.72, layer: 'front' },
  wave: { x: 114, y: 120, dy: -24, s: 0.72, layer: 'front' },
  tap: { x: 66, y: 146, s: 0.98, layer: 'mid' },
  call: { x: 114, y: 104, s: 0.62, layer: 'front' },
  selfie: { x: 126, y: 84, s: 0.66, layer: 'front' },
  bounce: { x: 80, y: 26, s: 0.9, layer: 'front' },
  float: { x: 80, y: 196, s: 1.3, layer: 'back' },
  drum: { x: 80, y: 168, s: 0.82, layer: 'front' },
  rotate: { x: 80, y: 152, s: 0.85, layer: 'front' },
  chase: { x: 80, y: 150, s: 0.9, layer: 'front' },
  hug: { x: 80, y: 152, s: 0.9, layer: 'front' },
  type: { x: 80, y: 160, s: 0.85, layer: 'front' },
  sip: { x: 80, y: 154, s: 1.3, layer: 'front' },
  blow: { x: 80, y: 154, s: 1.3, layer: 'front' },
  read: { x: 80, y: 152, s: 0.9, layer: 'front' },
  inspect: { x: 120, y: 112, s: 0.8, layer: 'front' },
  kick: { x: 100, y: 178, s: 0.55, layer: 'front' },
  throw: { x: 114, y: 116, s: 0.7, layer: 'front' },
  twirl: { x: 104, y: 46, s: 1, layer: 'front' },
  ride: { x: 80, y: 190, s: 1, layer: 'ground-back' },
  kickflip: { x: 80, y: 190, s: 1, layer: 'ground-back' },
  dance: { x: 0, y: 0, s: 1, layer: 'head' },
  'sit-on': { x: 80, y: 168, s: 1.05, layer: 'ground-back' },
  hide: { x: 80, y: 160, s: 1.4, layer: 'ground-front' },
  carry: { x: 80, y: 34, s: 0.85, layer: 'front' },
};

/** Gdzie i jak trzymany jest rekwizyt przy danym triku. */
export function placeFor(prop: PetProp, trick: PetTrick): PropPlace {
  if (prop === 'balloon') return { x: 114, y: 40, s: 1, layer: 'front' };
  if (prop === 'umbrella') return { x: 106, y: 44, s: 1, layer: 'front' };
  if (prop === 'globe' && trick === 'kick') return { x: 100, y: 176, s: 0.6, layer: 'front' };
  return TRICK_PLACE[trick];
}

/** Obiekty, które po rzucie/kopnięciu lecą same po stronie. */
export const ENTITY_KIND: Partial<Record<PetProp, 'ball' | 'plane'>> = { ball: 'ball', globe: 'ball', plane: 'plane' };

export const PROP_LABELS: Record<PetProp, string> = {
  allegro: 'Allegro',
  'allegro-lokalnie': 'Allegro Lokalnie',
  olx: 'OLX',
  vinted: 'Vinted',
  alebilet: 'Alebilet',
  ticketmaster: 'Ticketmaster',
  booking: 'Booking',
  airbnb: 'Airbnb',
  cloudflare: 'Cloudflare',
  blik: 'BLIK',
  database: 'Baza danych',
  terminal: 'Terminal',
  globe: 'Internet',
  gear: 'Ustawienia',
  bug: 'Bug',
  box: 'Paczka',
  heart: 'Serce',
  coffee: 'Kawa',
  laptop: 'Laptop',
  ball: 'Piłka',
  plane: 'Samolocik',
  umbrella: 'Parasol',
  balloon: 'Balon',
  skateboard: 'Deskorolka',
  headphones: 'Słuchawki',
  book: 'Książka',
  magnifier: 'Lupa',
  sign: 'Tabliczka',
};

/** Znak marki wpisany w prostokąt (x, y, w, h). `fill` nadpisuje kolory ścieżek. */
function Mark({ mark, x, y, w, h, fill }: { mark: BrandMark; x: number; y: number; w: number; h: number; fill?: string }) {
  return (
    <svg x={x} y={y} width={w} height={h} viewBox={mark.viewBox} overflow="visible">
      {mark.paths.map((p, i) => (
        <path key={i} d={p.d} fill={fill ?? p.fill ?? 'currentColor'} />
      ))}
    </svg>
  );
}

function Pixels({ cells, size = 3, fill }: { cells: Array<[number, number]>; size?: number; fill: string }) {
  return (
    <>
      {cells.map(([x, y], i) => (
        <rect key={i} x={x * size} y={y * size} width={size} height={size} fill={fill} />
      ))}
    </>
  );
}

const LOGO_CELLS: Array<[number, number]> = [
  [0, -2],
  [-1, -1],
  [0, -1],
  [1, -1],
  [-2, 0],
  [0, 0],
  [2, 0],
  [-1, 1],
  [0, 1],
  [1, 1],
  [0, 2],
].map(([x, y]) => [x - 0.5, y - 0.5] as [number, number]);

/** Pikselowy znaczek (zielony plus jak na kubku, bluzie i laptopie z arkusza). */
export function PixelLogo({ neon, fill = GREEN }: { neon?: string; fill?: string }) {
  return (
    <g filter={neon}>
      <Pixels fill={fill} size={2.6} cells={LOGO_CELLS} />
    </g>
  );
}

function gearPath(teeth: number, outer: number, inner: number) {
  const pts: string[] = [];
  const step = (Math.PI * 2) / teeth;
  for (let i = 0; i < teeth; i++) {
    const a = i * step;
    const corners = [
      [inner, a - step * 0.5],
      [inner, a - step * 0.22],
      [outer, a - step * 0.14],
      [outer, a + step * 0.14],
      [inner, a + step * 0.22],
    ];
    for (const [r, ang] of corners) pts.push(`${(Math.cos(ang) * r).toFixed(2)} ${(Math.sin(ang) * r).toFixed(2)}`);
  }
  return `M${pts.join('L')}Z`;
}

const GEAR = gearPath(9, 19, 14.5);

/** Kubek kawy z parą. */
export function Mug({ neon }: { neon?: string }) {
  return (
    <g className="pet-mug">
      <g className="pet-steam" fill="none" strokeLinecap="round">
        <path d="M -5 -21 C -10 -27 0 -31 -5 -38" stroke="#e9e7da" strokeOpacity={0.55} strokeWidth={2} />
        <path d="M 4 -20 C -1 -26 9 -30 4 -37" stroke={GREEN} strokeOpacity={0.5} strokeWidth={1.6} />
      </g>
      <path d="M 12 -8 C 24 -9 24 8 11 7" fill="none" stroke={OUT} strokeWidth={8} strokeLinecap="round" />
      <path d="M 12 -8 C 24 -9 24 8 11 7" fill="none" stroke="#26262d" strokeWidth={4.4} strokeLinecap="round" />
      <path
        d="M -14 -14 L 14 -14 L 12 13 Q 11.5 17 7 17 L -7 17 Q -11.5 17 -12 13 Z"
        fill="#1d1d23"
        stroke={OUT}
        strokeWidth={3}
        strokeLinejoin="round"
        paintOrder="stroke"
      />
      <path d="M -10 -9 L -9 10" stroke="#fff" strokeOpacity={0.12} strokeWidth={2.5} strokeLinecap="round" />
      <ellipse cx={0} cy={-14} rx={14} ry={3.6} fill="#2e2e36" stroke={OUT} strokeWidth={1.5} />
      <ellipse cx={0} cy={-13.6} rx={11.5} ry={2.3} fill="#3b2215" />
      <g transform="translate(0 2)">
        <PixelLogo neon={neon} />
      </g>
    </g>
  );
}

/** Ryba na haczyku (głową do góry). */
export function Fish({ gradient }: { gradient: string }) {
  return (
    <g>
      <path d="M 0 22 L 8 32 L 0 29 L -8 32 Z" fill={CYAN} stroke={OUT} strokeWidth={1.6} strokeLinejoin="round" />
      <path d="M 0 0 C 8 4 9 16 0 25 C -9 16 -8 4 0 0 Z" fill={`url(#${gradient})`} stroke={OUT} strokeWidth={1.6} />
      <path d="M -6 13 C -10 14 -11 17 -9 19" fill="none" stroke={OUT} strokeWidth={1.4} />
      <path d="M 6 13 C 10 14 11 17 9 19" fill="none" stroke={OUT} strokeWidth={1.4} />
      <path d="M -4 15 L 4 15 M -3 18 L 3 18" stroke="#fff" strokeOpacity={0.3} strokeWidth={1} />
      <circle cx={2.6} cy={7} r={1.9} fill="#fff" />
      <circle cx={3} cy={7.2} r={0.9} fill={OUT} />
    </g>
  );
}

/** Telefon z aplikacją marki: pin się wpisuje, potem zielony „ptaszek”. */
function Phone({ children, pin }: { children: ReactNode; pin?: boolean }) {
  return (
    <g>
      <rect x={-17} y={-30} width={34} height={60} rx={7} fill="#0d0d10" stroke={OUT} strokeWidth={2.4} />
      <rect x={-14} y={-25.5} width={28} height={49} rx={4} fill={pin ? '#111' : '#f4f4f6'} />
      <rect x={-4.5} y={-28.2} width={9} height={1.8} rx={0.9} fill="#2b2b33" />
      <g transform="translate(0 -9)">{children}</g>
      {pin && (
        <g className="pet-pin">
          {[0, 1, 2, 3, 4, 5].map((i) => (
            <circle key={i} cx={-10 + i * 4} cy={11} r={1.4} fill="#fff" style={{ animationDelay: `${i * 0.18}s` }} />
          ))}
        </g>
      )}
      <g className="pet-phone-ok" transform="translate(0 12)">
        <circle r={6.5} fill="#21C063" />
        <path d="M -3 0 L -0.8 2.4 L 3.4 -2.4" fill="none" stroke="#fff" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" />
      </g>
      <path d="M -11 -22 L -6 -22" stroke="#fff" strokeOpacity={0.25} strokeWidth={1.5} strokeLinecap="round" />
      <circle className="pet-flash" cx={0} cy={-6} r={30} fill="#fff" />
    </g>
  );
}

function BlikMark({ uid, scale = 1 }: { uid: string; scale?: number }) {
  const text = { fontFamily: FONT, fontWeight: 900 } as const;
  return (
    <g transform={`scale(${scale})`}>
      <defs>
        <radialGradient id={`${uid}blik`} cx="35%" cy="30%" r="70%">
          <stop offset="0" stopColor="#FF8FA6" />
          <stop offset="1" stopColor="#E3003A" />
        </radialGradient>
      </defs>
      <rect x={-31} y={-18} width={62} height={36} rx={9} fill="#000" stroke="#3a3a44" strokeWidth={2.2} />
      <text x={-1} y={9} fontSize={21} fill="#fff" {...text} textAnchor="end">
        bl
      </text>
      <rect x={1} y={-3} width={4.4} height={12} rx={1.3} fill="#fff" />
      <circle cx={3.2} cy={-9.5} r={4.4} fill={`url(#${uid}blik)`} />
      <text x={8} y={9} fontSize={21} fill="#fff" {...text} textAnchor="start">
        k
      </text>
    </g>
  );
}

function OlxMark({ size = 1 }: { size?: number }) {
  // geometria znaku OLX: koło „o”, pionowa „l”, „x” (siatka 48×48)
  return (
    <g transform={`scale(${size}) translate(-24 -24)`} fill="none" stroke="#fff" strokeWidth={4.6} strokeLinecap="round">
      <circle cx={13.3} cy={23.9} r={8.2} />
      <path d="M 27.3 13.4 V 34.6" />
      <path d="M 32.6 18.7 L 43 29.1 M 32.6 29.1 L 43 18.7" />
    </g>
  );
}

export function PropArt({ name, uid, neon, text }: { name: PetProp; uid: string; neon?: string; text?: string }): ReactNode {
  const stroke = { stroke: OUT, strokeWidth: 2.2, strokeLinejoin: 'round' as const };
  const txt = { fontFamily: FONT, fontWeight: 900, textAnchor: 'middle' as const, lengthAdjust: 'spacingAndGlyphs' as const };

  switch (name) {
    case 'allegro':
      return (
        <g>
          <path d="M -30 -12 L -20 -22 L 30 -22 L 20 -12 Z" fill="#FF8B42" {...stroke} />
          <path d="M 20 -12 L 30 -22 L 30 14 L 20 24 Z" fill="#C24100" {...stroke} />
          <rect x={-30} y={-12} width={50} height={36} fill="#FF5A00" {...stroke} />
          <path d="M -9 -12 L 1 -22 L 8 -22 L -2 -12 Z" fill="#FFD2B0" opacity={0.75} />
          <rect x={-9} y={-12} width={7} height={11} fill="#FFD2B0" opacity={0.75} />
          <Mark mark={ALLEGRO_WORDMARK} x={-27} y={0} w={44} h={14} fill="#fff" />
          <path d="M -26 19 L -18 19" stroke="#fff" strokeOpacity={0.5} strokeWidth={1.5} />
        </g>
      );
    case 'allegro-lokalnie':
      return (
        <g transform="rotate(-4)">
          <rect x={-33} y={-21} width={66} height={42} rx={9} fill="#fff" {...stroke} />
          <Mark mark={ALLEGRO_WORDMARK} x={-26} y={-15} w={52} h={16} />
          <text x={0} y={13} fontSize={10} textLength={46} fill="#1F2D3D" {...txt} fontWeight={800}>
            lokalnie
          </text>
        </g>
      );
    case 'olx':
      return (
        <g transform="rotate(-6)">
          <rect x={-26} y={-20} width={52} height={40} rx={10} fill="#002F34" stroke="#23E5DB" strokeWidth={2} />
          <OlxMark size={1} />
        </g>
      );
    case 'vinted':
      return (
        <g transform="rotate(-5)">
          <rect x={-21} y={-21} width={42} height={42} rx={11} fill="#007782" {...stroke} />
          <Mark mark={VINTED_V} x={-13} y={-14} w={26} h={28} fill="#fff" />
        </g>
      );
    case 'alebilet':
      return (
        <g transform="rotate(6)">
          <path d={TICKET} fill="#8E2DE2" {...stroke} />
          <path d="M 17 -16 V 16" stroke="#fff" strokeOpacity={0.55} strokeDasharray="3 3" />
          <text x={-7} y={4} fontSize={11} textLength={40} fill="#fff" {...txt}>
            alebilet
          </text>
          <path d="M 24 -5 L 25.6 -1.4 L 29.5 -1 L 26.5 1.6 L 27.4 5.4 L 24 3.4 L 20.6 5.4 L 21.5 1.6 L 18.5 -1 L 22.4 -1.4 Z" fill="#FFD166" />
        </g>
      );
    case 'ticketmaster':
      return (
        <g transform="rotate(-6)">
          <path d={TICKET} fill="#026CDF" {...stroke} />
          <Mark mark={TICKETMASTER_WORDMARK} x={-27} y={-10} w={54} h={20} fill="#fff" />
        </g>
      );
    case 'booking':
      return (
        <g>
          <defs>
            <clipPath id={`${uid}bk`}>
              <rect x={-20} y={-20} width={40} height={40} rx={9} />
            </clipPath>
          </defs>
          <rect x={-20} y={-20} width={40} height={40} rx={9} fill="#fff" {...stroke} />
          <g clipPath={`url(#${uid}bk)`}>
            <Mark mark={BOOKING_B} x={-20} y={-20} w={40} h={40} />
          </g>
        </g>
      );
    case 'airbnb':
      return (
        <g transform="rotate(-4)">
          <rect x={-21} y={-21} width={42} height={42} rx={11} fill="#fff" {...stroke} />
          <Mark mark={AIRBNB_BELO} x={-14} y={-15} w={28} h={30} />
        </g>
      );
    case 'cloudflare':
      return (
        <g>
          <Mark mark={CLOUDFLARE_CLOUD} x={-34} y={-18} w={68} h={32} />
          <path d="M -24 -4 C -22 -10 -14 -12 -10 -8" fill="none" stroke="#fff" strokeOpacity={0.45} strokeWidth={2} strokeLinecap="round" />
        </g>
      );
    case 'blik':
      return <BlikMark uid={uid} />;
    case 'database':
      return (
        <g>
          {[10, -2, -14].map((y) => (
            <g key={y} className="pet-db-disk">
              <path d={`M -18 ${y} v 10 a 18 6 0 0 0 36 0 v -10`} fill="#2B59D9" stroke={OUT} strokeWidth={2} />
              <ellipse cx={0} cy={y} rx={18} ry={6} fill="#6E95FF" stroke={OUT} strokeWidth={2} />
              <circle cx={12} cy={y + 8} r={1.7} fill={GREEN} filter={neon} />
              <path d={`M -12 ${y + 9} h 10`} stroke="#fff" strokeOpacity={0.3} strokeWidth={1.4} />
            </g>
          ))}
        </g>
      );
    case 'terminal':
      return (
        <g transform="rotate(-3)">
          <rect x={-31} y={-21} width={62} height={42} rx={5} fill="#050a06" stroke={GREEN} strokeWidth={1.8} filter={neon} />
          <rect x={-31} y={-21} width={62} height={9} rx={5} fill="#0e1a10" />
          <circle cx={-25} cy={-16.5} r={1.6} fill="#FF3B3B" />
          <circle cx={-20} cy={-16.5} r={1.6} fill="#FFD166" />
          <circle cx={-15} cy={-16.5} r={1.6} fill={GREEN} />
          <text x={-26} y={-1} fontFamily={MONO} fontWeight={700} fontSize={8} fill={GREEN}>
            $ sudo hack
          </text>
          <text x={-26} y={10} fontFamily={MONO} fontWeight={700} fontSize={8} fill={GREEN}>
            {'>'} _
          </text>
          <rect className="pet-cursor" x={-15} y={4} width={5} height={7} fill={GREEN} />
        </g>
      );
    case 'globe':
      return (
        <g fill="none" stroke={CYAN} strokeWidth={2} filter={neon}>
          <circle r={19} fill="rgba(0,229,255,.08)" />
          <ellipse className="pet-globe-meridian" rx={8} ry={19} />
          <path d="M -19 0 H 19 M -16 -10 H 16 M -16 10 H 16" strokeWidth={1.4} />
        </g>
      );
    case 'gear':
      return (
        <g>
          <path d={GEAR} fill="#2F7BFF" stroke={OUT} strokeWidth={2.2} strokeLinejoin="round" />
          <circle r={7} fill="#0d0d10" stroke={OUT} strokeWidth={2} />
          <circle r={11} fill="none" stroke="#fff" strokeOpacity={0.2} strokeWidth={1.5} />
        </g>
      );
    case 'bug':
      return (
        <g filter={neon}>
          <Pixels
            fill={GREEN}
            size={4}
            cells={[
              [-3, -4],
              [2, -4],
              [-2, -3],
              [1, -3],
              [-2, -2],
              [-1, -2],
              [0, -2],
              [1, -2],
              [-3, -1],
              [-2, -1],
              [-1, -1],
              [0, -1],
              [1, -1],
              [2, -1],
              [-4, 0],
              [-2, 0],
              [-1, 0],
              [0, 0],
              [1, 0],
              [3, 0],
              [-3, 1],
              [-2, 1],
              [-1, 1],
              [0, 1],
              [1, 1],
              [2, 1],
              [-4, 2],
              [-2, 2],
              [1, 2],
              [3, 2],
            ]}
          />
          <rect x={-8} y={-4} width={4} height={4} fill={OUT} />
          <rect x={4} y={-4} width={4} height={4} fill={OUT} />
        </g>
      );
    case 'box':
      return (
        <g>
          <path d="M -28 -10 L -18 -20 L 28 -20 L 18 -10 Z" fill="#E0A96B" {...stroke} />
          <path d="M 18 -10 L 28 -20 L 28 14 L 18 24 Z" fill="#A86F35" {...stroke} />
          <rect x={-28} y={-10} width={46} height={34} fill="#C8915A" {...stroke} />
          <path d="M -8 -10 L 2 -20 L 8 -20 L -2 -10 Z" fill="#7C5A35" opacity={0.6} />
          <rect x={-8} y={-10} width={6} height={34} fill="#7C5A35" opacity={0.45} />
          <g transform="translate(10 8) scale(.7)">
            <PixelLogo neon={neon} />
          </g>
          <path d="M -24 4 h 10 M -24 8 h 7" stroke="#5a3d1d" strokeWidth={1.4} />
        </g>
      );
    case 'heart':
      return (
        <g transform="scale(2.6)">
          <path d={HEART} fill={GREEN} stroke={OUT} strokeWidth={0.9} filter={neon} />
          <path d="M -5 -3 C -5 -6 -2 -6 -1.5 -4" fill="none" stroke="#fff" strokeOpacity={0.7} strokeWidth={0.8} strokeLinecap="round" />
        </g>
      );
    case 'coffee':
      return <Mug neon={neon} />;
    case 'laptop':
      return (
        <g>
          <path d="M -26 8 L 26 8 L 32 16 L -32 16 Z" fill="#26262c" {...stroke} />
          <rect x={-24} y={-24} width={48} height={32} rx={3} fill="#17171c" {...stroke} />
          <rect x={-21} y={-21} width={42} height={26} rx={1.5} fill="#061008" />
          <g className="pet-codelines">
            {[18, 26, 12, 22, 16].map((w, i) => (
              <rect key={i} x={-18 + (i % 2) * 4} y={-18 + i * 4.6} width={w} height={2} rx={1} fill={i === 2 ? '#9B5CFF' : GREEN} />
            ))}
          </g>
        </g>
      );
    case 'ball':
      return (
        <g className="pet-ball">
          <circle r={15} fill="#131317" stroke={OUT} strokeWidth={2.4} />
          <path d="M 0 -6 L 5.7 -1.9 L 3.5 4.9 L -3.5 4.9 L -5.7 -1.9 Z" fill={GREEN} filter={neon} />
          <path d="M 0 -15 L 0 -6 M 5.7 -1.9 L 14 -4.6 M 3.5 4.9 L 8.7 12 M -3.5 4.9 L -8.7 12 M -5.7 -1.9 L -14 -4.6" stroke="#3a3a44" strokeWidth={1.4} />
          <path d="M -10 -11 L -4 -14 L -1 -10 Z M 10 -11 L 4 -14 L 1 -10 Z M 13 6 L 9 12 L 14 2 Z" fill="#9B5CFF" />
          <path d="M -9 -8 C -6 -12 -2 -13 1 -13" fill="none" stroke="#fff" strokeOpacity={0.35} strokeWidth={2} strokeLinecap="round" />
        </g>
      );
    case 'plane':
      return (
        <g>
          <path d="M -24 4 L 26 -6 L -8 14 Z" fill="#f2f2f0" {...stroke} strokeWidth={1.6} />
          <path d="M -24 4 L 26 -6 L -4 4 Z" fill="#dcdcd6" {...stroke} strokeWidth={1.6} />
          <path d="M -4 4 L -8 14" stroke="#a8a8a0" strokeWidth={1.2} />
          <path d="M -18 3.4 L 18 -4" stroke={GREEN} strokeWidth={1.4} filter={neon} />
        </g>
      );
    case 'umbrella':
      return (
        <g>
          <path d="M 0 -2 L 0 70 Q 0 78 -7 78 Q -12 78 -12 72" fill="none" stroke="#2c2c34" strokeWidth={3.6} strokeLinecap="round" />
          <g className="pet-canopy">
            <path d="M -40 0 Q -40 -34 0 -38 Q 40 -34 40 0 Q 33 -6 26.7 0 Q 20 -6 13.3 0 Q 6.7 -6 0 0 Q -6.7 -6 -13.3 0 Q -20 -6 -26.7 0 Q -33 -6 -40 0 Z" fill="#17171c" {...stroke} />
            <path d="M -26.7 0 Q -24 -26 0 -38 Q -12 -22 -13.3 0 Z" fill={GREEN} opacity={0.85} filter={neon} />
            <path d="M 26.7 0 Q 24 -26 0 -38 Q 12 -22 13.3 0 Z" fill="#9B5CFF" opacity={0.85} filter={neon} />
            <path d="M -30 -14 Q -22 -30 -6 -34" fill="none" stroke="#fff" strokeOpacity={0.25} strokeWidth={2} strokeLinecap="round" />
          </g>
          <circle cx={0} cy={-38} r={2.6} fill={GREEN} filter={neon} />
        </g>
      );
    case 'balloon':
      return (
        <g className="pet-balloon">
          <path d="M 0 22 C -4 40 6 52 -2 80" fill="none" stroke="#bdbdc6" strokeWidth={1.2} />
          <path d="M 0 -26 C 18 -26 22 -6 16 6 C 11 16 4 21 0 22 C -4 21 -11 16 -16 6 C -22 -6 -18 -26 0 -26 Z" fill="#9B5CFF" stroke={OUT} strokeWidth={2.2} />
          <path d="M -3 22 L 3 22 L 1 26 L -1 26 Z" fill="#7a3ff0" stroke={OUT} strokeWidth={1} />
          <path d="M -9 -15 C -6 -20 -1 -21 3 -20" fill="none" stroke="#fff" strokeOpacity={0.6} strokeWidth={3} strokeLinecap="round" />
          <g transform="translate(2 2) scale(.9)">
            <PixelLogo neon={neon} />
          </g>
        </g>
      );
    case 'skateboard':
      return (
        <g>
          <path d="M -40 -4 Q -44 -10 -38 -10 L 38 -10 Q 44 -10 40 -4 Q 38 0 32 0 L -32 0 Q -38 0 -40 -4 Z" fill="#17171c" {...stroke} />
          <path d="M -34 -7.5 L 34 -7.5" stroke={GREEN} strokeWidth={1.6} filter={neon} />
          <rect x={-30} y={0} width={8} height={3} fill="#3a3a44" />
          <rect x={22} y={0} width={8} height={3} fill="#3a3a44" />
          <g className="pet-wheel" transform="translate(-26 7)">
            <circle r={5} fill="#9B5CFF" stroke={OUT} strokeWidth={1.8} />
            <path d="M -3 0 L 3 0" stroke="#fff" strokeOpacity={0.6} strokeWidth={1.2} />
          </g>
          <g className="pet-wheel" transform="translate(26 7)">
            <circle r={5} fill="#9B5CFF" stroke={OUT} strokeWidth={1.8} />
            <path d="M -3 0 L 3 0" stroke="#fff" strokeOpacity={0.6} strokeWidth={1.2} />
          </g>
        </g>
      );
    case 'headphones':
      return (
        <g>
          <path d="M 26 96 C 22 50 46 40 80 40 C 114 40 138 50 134 96" fill="none" stroke={OUT} strokeWidth={9} strokeLinecap="round" />
          <path d="M 26 96 C 22 50 46 40 80 40 C 114 40 138 50 134 96" fill="none" stroke="#2a2a32" strokeWidth={5} strokeLinecap="round" />
          <path d="M 40 52 C 56 43 104 43 120 52" fill="none" stroke={GREEN} strokeWidth={1.6} filter={neon} />
          <rect x={12} y={84} width={20} height={34} rx={9} fill="#17171c" stroke={OUT} strokeWidth={2.6} />
          <rect x={128} y={84} width={20} height={34} rx={9} fill="#17171c" stroke={OUT} strokeWidth={2.6} />
          <rect x={16} y={90} width={6} height={22} rx={3} fill={GREEN} filter={neon} className="pet-eq" />
          <rect x={138} y={90} width={6} height={22} rx={3} fill="#9B5CFF" filter={neon} className="pet-eq" />
        </g>
      );
    case 'book':
      return (
        <g>
          <path d="M 0 -18 L -30 -22 L -30 18 L 0 22 L 30 18 L 30 -22 Z" fill="#6d36d6" {...stroke} />
          <path d="M 0 -16 L -27 -19.5 L -27 15.5 L 0 19 Z" fill="#f4f2e8" />
          <path d="M 0 -16 L 27 -19.5 L 27 15.5 L 0 19 Z" fill="#ecebe0" />
          {[0, 1, 2, 3, 4].map((i) => (
            <path key={i} d={`M -23 ${-13 + i * 6} L -5 ${-11 + i * 6} M 5 ${-11 + i * 6} L 23 ${-13 + i * 6}`} stroke="#9a9a94" strokeWidth={1.2} />
          ))}
          <path className="pet-page" d="M 0 -16 L 27 -19.5 L 27 15.5 L 0 19 Z" fill="#fafaf4" stroke="#c9c9c0" strokeWidth={0.8} />
          <path d="M 0 -18 L 0 22" stroke={OUT} strokeWidth={1.4} />
        </g>
      );
    case 'magnifier':
      return (
        <g>
          <path d="M 12 12 L 30 30" stroke={OUT} strokeWidth={9} strokeLinecap="round" />
          <path d="M 12 12 L 30 30" stroke="#6d36d6" strokeWidth={5.5} strokeLinecap="round" />
          <circle r={17} fill="rgba(170,230,255,.18)" stroke={OUT} strokeWidth={5} />
          <circle r={17} fill="none" stroke="#c8c8d2" strokeWidth={2.4} />
          <path d="M -9 -8 C -5 -12 0 -13 4 -12" fill="none" stroke="#fff" strokeOpacity={0.7} strokeWidth={2.4} strokeLinecap="round" />
          <ellipse cx={1} cy={2} rx={6} ry={9} fill="#F4F2E0" opacity={0.9} />
        </g>
      );
    case 'sign': {
      const label = (text ?? '…').slice(0, 40);
      const long = label.length > 12;
      return (
        <g>
          <rect x={-2.5} y={8} width={5} height={56} rx={2} fill="#2c2c34" stroke={OUT} strokeWidth={1.6} />
          <rect x={-38} y={-24} width={76} height={34} rx={7} fill="#141418" stroke={OUT} strokeWidth={2.6} />
          <rect x={-35} y={-21} width={70} height={28} rx={5} fill="none" stroke={GREEN} strokeWidth={1.6} filter={neon} />
          <text
            x={0}
            y={long ? -4 : -2}
            fontSize={long ? 8.5 : 12}
            fill="#F4F2E0"
            textAnchor="middle"
            dominantBaseline="middle"
            fontFamily={FONT}
            fontWeight={800}
            textLength={Math.min(62, label.length * (long ? 4.6 : 7.4))}
            lengthAdjust="spacingAndGlyphs"
          >
            {label}
          </text>
        </g>
      );
    }
    default:
      return null;
  }
}

/** Rekwizyt w wersji „aplikacja w telefonie” (BLIK, Booking, Airbnb). */
export function PhoneProp({ name, uid, neon }: { name: PetProp; uid: string; neon?: string }) {
  if (name === 'blik')
    return (
      <Phone pin>
        <BlikMark uid={uid} scale={0.36} />
      </Phone>
    );
  return (
    <Phone>
      <g transform="scale(.5)">
        <PropArt name={name} uid={uid} neon={neon} />
      </g>
    </Phone>
  );
}
