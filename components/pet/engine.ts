import { PROP_LINES } from './props';
import {
  PET_EVENT,
  PET_PROPS,
  type PetActivity,
  type PetCommand,
  type PetExpression,
  type PetOptions,
  type PetProp,
  type PetReaction,
  type PetState,
  type PetTarget,
  type PetVisual,
} from './types';

const GRAVITY = 2400; // px/s²
const MAX_FALL = 2600;
const WALK_SPEED = 46; // px/s przy rozmiarze 72
const RUN_SPEED = 140;
const HARD_LANDING = 1500;
const VIEW_W = 160; // viewBox grafiki (PetSvg)
const VIEW_H = 190;
const FISH_MS = 8000; // musi się zgadzać z animacjami wędki w pet.css

interface Rect {
  left: number;
  top: number;
  right: number;
  bottom: number;
  width: number;
  height: number;
}

/** 'top' – chodzi tylko po górnej krawędzi; 'perimeter' – dookoła całego elementu. */
type SurfaceKind = 'perimeter' | 'top';

interface Surface {
  el: Element | null; // null = dół okna („podłoga”)
  kind: SurfaceKind;
  rect: Rect;
  cssRadius: number;
  radius: number;
  reachable: boolean; // górna krawędź jest widoczna (nic jej nie zasłania)
}

interface GroundMode {
  kind: 'ground';
  surface: Surface;
  s: number; // pozycja wzdłuż krawędzi
}

interface AirMode {
  kind: 'air';
  vx: number;
  vy: number;
  target: Surface | null;
  ignore: Surface | null;
  t: number;
  tLand: number;
  spin: number; // °/s – koziołkowanie po potknięciu
  hangUntil: number; // „kreskówkowe” zawiśnięcie w powietrzu przed upadkiem
}

interface DragMode {
  kind: 'drag';
  offX: number;
  offY: number;
  lastX: number;
  lastY: number;
  lastT: number;
  vx: number;
  vy: number;
  since: number;
}

type Mode = GroundMode | AirMode | DragMode;

type ActionName =
  | 'idle'
  | 'walk'
  | 'run'
  | 'sit'
  | 'look'
  | 'sleep'
  | 'wake'
  | 'typing'
  | 'watch'
  | 'coffee'
  | 'hack'
  | 'fish'
  | 'show'
  | 'cool'
  | 'turnback'
  | 'approach';

interface Action {
  name: ActionName;
  start: number;
  until: number;
  prop?: PetProp;
  said?: boolean;
  targetX?: number;
}

/** Nastrój 0..1 – od niego zależy, co maskotka sama wybiera. */
interface Mood {
  energy: number;
  fun: number;
  social: number;
  curiosity: number;
}

const BRAND_WORDS: Array<[RegExp, PetProp]> = [
  [/allegro\s*lokalnie/i, 'allegro-lokalnie'],
  [/allegro/i, 'allegro'],
  [/\bolx\b/i, 'olx'],
  [/vinted/i, 'vinted'],
  [/alebilet/i, 'alebilet'],
  [/ticketmaster/i, 'ticketmaster'],
  [/booking/i, 'booking'],
  [/airbnb/i, 'airbnb'],
  [/cloudflare/i, 'cloudflare'],
  [/\bblik/i, 'blik'],
  [/paczk|kurier|wysył/i, 'box'],
  [/baz[aęy] danych|backup|sql/i, 'database'],
  [/błęd|bug/i, 'bug'],
];

type Zone = 'ear-l' | 'ear-r' | 'head' | 'belly' | 'feet';

interface Point {
  x: number;
  y: number;
  nx: number;
  ny: number;
}

const LINES = {
  hello: ['Hej! Jestem tu 👋', 'Cześć! Popilnuję panelu 🐰', 'Siemka! 👋'],
  poke: ['Hej! 👋', 'Co tam?', 'Klik!', 'Jestem, jestem!', 'Potrzebujesz czegoś?'],
  hard: ['Auć! ⭐', 'Ała… 😵', 'Uff… twarde lądowanie'],
  thrown: ['Wiiiiii! 🚀', 'Aaaa!', 'Leeeecę!'],
  drag: ['Gdzie mnie niesiesz?', 'Hej, postaw mnie!', 'Wysoko! 😳'],
  attract: ['Ooo, coś nowego! 👀', 'Co to? 👀'],
  trip: ['Auć! 🤕', 'Kto tu położył ten piksel?!', 'Nic się nie stało… 😅'],
  tumble: ['Uaaaa! 😱', 'Łooo! 🙃', 'Nieeee!'],
  oops: ['O-oł… 😳', 'Oj…', 'Chyba nie ma podłogi…'],
  pet: ['Mrrr… 💚', 'Jeszcze, jeszcze! 🥰', 'Miło… 😌'],
  belly: ['Hihi! Łaskocze! 🤭', 'Nie brzuszek! 😆', 'Hahaha, przestań! 😂'],
  ear: ['Ej, to moje ucho! 😾', 'Ucho jest wrażliwe!', 'Nie ciągnij za ucho 🐰'],
  head: ['Auć! Moja głowa! 😵', 'Bonk! 🔨', 'Ała!'],
  feet: ['Stópki łaskoczą! 😂', 'Hi-hi, palce!'],
  coffee: ['Kawa = kod ☕', 'Przerwa na kawkę ☕', 'Bez kawy nie deployuję ☕'],
  tired: ['Potrzebuję kawy… ☕', 'Bateria 10%… 🔋'],
  bored: ['Nudzi mi się… 🥱', 'Co by tu zbroić… 😏'],
  lonely: ['Pobaw się ze mną 🥺', 'Halo? Jest tu ktoś? 👀'],
  back: ['Witaj z powrotem! 👋', 'O, wracasz! 😊'],
  spin: ['Wiii! 💫', 'Piruet! ✨'],
  turnback: ['Co tu mamy… 🤔', 'Sprawdzam stronę 👀', 'Hmm, ciekawe…'],
  approach: ['Co tam robisz? 👀', 'Hej! 👋', 'Pokaż! 👀'],
  dizzy: ['Kręci mi się w głowie 😵‍💫', 'Za szybko! 🌀'],
  copy: ['Skopiowane! 📋', 'Mam w schowku 📋'],
  paste: ['Wklejone! 📌'],
  hack: ['Wchodzę do systemu… 💻', 'Hakuję mainframe 😈', 'Kompiluję… 🧑‍💻'],
  fish: ['Idę na ryby 🎣', 'Może coś bierze… 🎣'],
  caught: ['Mam rybę! 🐟', 'Złowione! 🐟', 'Ale sztuka! 🐠'],
  cool: ['Wszystko pod kontrolą 😎', 'Deploy bez testów 😎'],
  noFish: ['Nie ma gdzie łowić 🎣'],
  success: ['Udało się! ✨', 'Sukces! 🎉', 'Gotowe! ✅'],
  error: ['Ups… coś poszło nie tak ⚠️', 'Błąd! 😵', 'Oj, to nie działa…'],
  confused: ['Hmm? 🤔', 'Że co?', 'Nie rozumiem…'],
  happy: ['Jej! 💚', 'Super! 😄'],
  sad: ['Smutno mi… 😢', 'Ehh…'],
} satisfies Record<string, string[]>;

const REACTIONS: Record<PetReaction, [PetState, PetExpression, number]> = {
  success: ['success', 'happy', 1900],
  error: ['error', 'angry', 2600],
  confused: ['confused', 'confused', 2400],
  happy: ['happy', 'happy', 1500],
  sad: ['sad', 'sad', 2600],
};

const ACTIVITIES: readonly PetActivity[] = ['coffee', 'hack', 'fish', 'cool', 'trip', 'show'];
const NON_TEXT_INPUTS = new Set(['checkbox', 'radio', 'range', 'button', 'submit', 'reset', 'color', 'file', 'image', 'hidden']);

const pick = <T>(list: readonly T[]): T => list[Math.floor(Math.random() * list.length)];
const now = () => performance.now();
const clamp = (v: number, a: number, b: number) => Math.max(a, Math.min(b, v));
const rand = (a: number, b: number) => a + Math.random() * (b - a);

function toRect(r: DOMRect): Rect {
  return { left: r.left, top: r.top, right: r.right, bottom: r.bottom, width: r.width, height: r.height };
}

function lerpAngle(a: number, b: number, t: number) {
  const d = ((((b - a) % 360) + 540) % 360) - 180;
  return a + d * t;
}

function isTypable(el: EventTarget | null): el is HTMLElement {
  if (el instanceof HTMLTextAreaElement) return !el.readOnly && !el.disabled;
  if (el instanceof HTMLInputElement) return !NON_TEXT_INPUTS.has(el.type) && !el.readOnly && !el.disabled;
  return el instanceof HTMLElement && el.isContentEditable;
}

function alpha(color: string) {
  if (color === 'transparent') return 0;
  const m = color.match(/rgba?\(([^)]+)\)/);
  if (!m) return 1;
  const parts = m[1].split(/[\s,/]+/).filter(Boolean);
  return parts.length > 3 ? parseFloat(parts[3]) : 1;
}

/** Czy element ma widoczną krawędź/tło – na „niewidzialnym” przycisku maskotka wisiałaby w powietrzu. */
function hasVisibleEdge(el: Element) {
  if (el.hasAttribute('data-pet-surface')) return true;
  const cs = getComputedStyle(el);
  return (
    (parseFloat(cs.borderTopWidth) > 0 && alpha(cs.borderTopColor) > 0.05) ||
    alpha(cs.backgroundColor) > 0.05 ||
    cs.backgroundImage !== 'none' ||
    cs.boxShadow !== 'none'
  );
}

function surfaceKind(el: Element, r: DOMRect | Rect): SurfaceKind {
  const v = el.getAttribute('data-pet-surface');
  if (v === 'top') return 'top';
  if (v === 'perimeter') return 'perimeter';
  const explicit = v !== null || el.getAttribute('role') === 'dialog' || el.tagName === 'DIALOG';
  return explicit && r.height >= 56 && r.width >= 80 ? 'perimeter' : 'top';
}

function perimeterLength(rc: Rect, rad: number) {
  const w = Math.max(0, rc.width - 2 * rad);
  const h = Math.max(0, rc.height - 2 * rad);
  return 2 * w + 2 * h + 2 * Math.PI * rad;
}

/** Punkt na zaokrąglonym prostokącie, idąc zgodnie z ruchem wskazówek zegara od lewego-górnego rogu. */
function perimeterPoint(rc: Rect, rad: number, s: number): Point {
  const w = Math.max(0, rc.width - 2 * rad);
  const h = Math.max(0, rc.height - 2 * rad);
  const arc = (Math.PI * rad) / 2;
  const L = 2 * w + 2 * h + 4 * arc;
  let d = ((s % L) + L) % L;
  const onArc = (cx: number, cy: number, fromDeg: number, t: number): Point => {
    const a = ((fromDeg + 90 * clamp(t, 0, 1)) * Math.PI) / 180;
    const nx = Math.cos(a);
    const ny = Math.sin(a);
    return { x: cx + nx * rad, y: cy + ny * rad, nx, ny };
  };
  if (d < w) return { x: rc.left + rad + d, y: rc.top, nx: 0, ny: -1 };
  d -= w;
  if (d < arc) return onArc(rc.right - rad, rc.top + rad, -90, d / arc);
  d -= arc;
  if (d < h) return { x: rc.right, y: rc.top + rad + d, nx: 1, ny: 0 };
  d -= h;
  if (d < arc) return onArc(rc.right - rad, rc.bottom - rad, 0, d / arc);
  d -= arc;
  if (d < w) return { x: rc.right - rad - d, y: rc.bottom, nx: 0, ny: 1 };
  d -= w;
  if (d < arc) return onArc(rc.left + rad, rc.bottom - rad, 90, d / arc);
  d -= arc;
  if (d < h) return { x: rc.left, y: rc.bottom - rad - d, nx: -1, ny: 0 };
  d -= h;
  return onArc(rc.left + rad, rc.top + rad, 180, arc ? d / arc : 1);
}

export interface PetElements {
  layer: HTMLElement;
  pet: HTMLElement;
  bubble: HTMLElement;
}

/**
 * Cały „mózg” i fizyka maskotki. Niezależne od Reacta: dostaje elementy DOM,
 * co klatkę ustawia transform, a zmianę pozy/miny/rekwizytu zgłasza przez onVisual.
 */
export class PetController {
  private opts: PetOptions;
  private cx = 0; // środek maskotki (px, względem okna)
  private cy = 0;
  private angle = 0; // obrót w stopniach (0 = stoi prosto)
  private nx = 0; // normalna krawędzi, na której stoi
  private ny = -1;
  private dir: 1 | -1 = 1;
  private yaw = 0; // obrót wokół osi pionowej (°), 0 = przodem, ±180 = tyłem
  private yawVel = 0;
  private spin: { start: number; from: number; sign: 1 | -1 } | null = null;
  private speedNow = 0; // wygładzona prędkość marszu
  private mood: Mood = { energy: 0.85, fun: 0.55, social: 0.5, curiosity: 0.5 };
  private attention: { x: number; y: number; until: number } | null = null;
  private recentProps: PetProp[] = [];
  private shakeFlips: number[] = [];
  private lastPointerDx = 0;
  private hiddenAt = 0;
  private mode: Mode;
  private action: Action = { name: 'idle', start: 0, until: 0 };
  private impact: { state: 'land' | 'splat' | 'recover'; until: number } | null = null;
  private override: { state: PetState; expression: PetExpression; until: number } | null = null;
  private launch: { vx: number; vy: number; target: Surface; T: number; from: Surface | null; at: number } | null = null;
  private trip: { until: number; force: boolean } | null = null;
  private tripAtEdge = false; // biegnie do krawędzi, żeby się na niej wywalić
  private pendingGoto: Surface | null = null;
  private pendingAct: { activity: PetActivity; prop?: PetProp; text?: string; ms?: number } | null = null;
  private surfaces = new Map<Element, Surface>();
  private extra = new Set<Element>();
  private solid = new WeakMap<Element, boolean>();
  private floor: Surface;
  private raf = 0;
  private lastT = 0;
  private lastRefresh = -1e9;
  private dirty = true;
  private initialized = false;
  private pointer: { x: number; y: number } | null = null;
  private lastActivity = 0;
  private forcedSleep = false;
  private hovered = false;
  private pokes: number[] = [];
  private press: { id: number; x: number; y: number; dragging: boolean } | null = null;
  private touch: { zone: Zone | null; dist: number; x: number; y: number; leftAt: number } = { zone: null, dist: 0, x: 0, y: 0, leftAt: 0 };
  private saidAt = new Map<string, number>();
  private workEl: HTMLElement | null = null;
  private workRetryAt = 0;
  private lastTypeAt = -1e9;
  private bubbleOn = false;
  private bubbleUntil = 0;
  private bubbleSize = { w: 0, h: 0 };
  private visual: PetVisual = { state: 'fall', expression: 'surprised', prop: null };
  private greeted = false;
  private shown = false;
  private reducedMotion = false;
  private styleKey = '';
  private disposers: Array<() => void> = [];

  constructor(
    private readonly els: PetElements,
    opts: PetOptions,
    private readonly onVisual: (v: PetVisual) => void,
  ) {
    this.opts = opts;
    this.floor = {
      el: null,
      kind: 'top',
      rect: { left: 0, top: innerHeight, right: innerWidth, bottom: innerHeight, width: innerWidth, height: 0 },
      cssRadius: 0,
      radius: 0,
      reachable: true,
    };
    // Start: spada z góry ekranu.
    this.cx = innerWidth * rand(0.55, 0.85);
    this.cy = -opts.size;
    this.mode = this.air(0, 0);
  }

  private get H() {
    return this.opts.size;
  }
  private get W() {
    return (this.opts.size * VIEW_W) / VIEW_H;
  }
  private get k() {
    return this.opts.size / 72;
  }

  // ───────────────────────── cykl życia ─────────────────────────

  start() {
    this.lastActivity = performance.now();
    this.reducedMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;

    const win = <K extends keyof WindowEventMap>(type: K, fn: (e: WindowEventMap[K]) => void, o?: AddEventListenerOptions) => {
      window.addEventListener(type, fn, o);
      this.disposers.push(() => window.removeEventListener(type, fn, o));
    };
    win('pointermove', this.onWindowPointer, { passive: true });
    win('pointerdown', this.onWindowPointer, { passive: true });
    win('keydown', this.onKey, { capture: true });
    win('input', this.onInput, { capture: true });
    win('scroll', this.onScroll, { capture: true, passive: true });
    win('resize', this.onResize);
    win('focusin', this.onFocusIn);
    win('focusout', this.onFocusOut);
    win('click', this.onClick, { capture: true });
    win('error', this.onError);
    win('unhandledrejection', this.onRejection);
    win('mouseup', this.onMouseUp);
    win('copy', () => this.pageEvent('copy'));
    win('paste', () => this.pageEvent('paste'));
    const onVis = () => this.onVisibility();
    document.addEventListener('visibilitychange', onVis);
    this.disposers.push(() => document.removeEventListener('visibilitychange', onVis));
    window.addEventListener(PET_EVENT, this.onCommand);
    this.disposers.push(() => window.removeEventListener(PET_EVENT, this.onCommand));

    const p = this.els.pet;
    const petOn = <K extends keyof HTMLElementEventMap>(type: K, fn: (e: HTMLElementEventMap[K]) => void) => {
      p.addEventListener(type, fn);
      this.disposers.push(() => p.removeEventListener(type, fn));
    };
    petOn('pointerdown', this.onPetDown);
    petOn('pointermove', this.onPetMove);
    petOn('pointerup', this.onPetUp);
    petOn('pointercancel', this.onPetCancel);
    petOn('dblclick', () => {
      const t = performance.now();
      this.startSpin(t);
      this.override = { state: 'happy', expression: 'excited', until: t + 900 };
      this.sayOnce('spin', t, 4000);
    });
    petOn('pointerover', (e) => {
      if (e.pointerType === 'mouse') this.hovered = true;
    });
    petOn('pointerout', () => {
      this.hovered = false;
    });

    const observer = new MutationObserver((muts) => {
      for (const m of muts) {
        if (!this.els.layer.contains(m.target)) {
          this.dirty = true;
          return;
        }
      }
    });
    observer.observe(document.body, { childList: true, subtree: true });
    this.disposers.push(() => observer.disconnect());

    this.raf = requestAnimationFrame(this.tick);
  }

  destroy() {
    cancelAnimationFrame(this.raf);
    for (const d of this.disposers) d();
    this.disposers = [];
  }

  setOptions(opts: PetOptions) {
    this.opts = opts;
    this.dirty = true;
    this.styleKey = '';
    if (!opts.reactToTyping) this.workEl = null;
    if (!opts.speech) this.hideBubble();
  }

  // ───────────────────────── publiczne akcje ─────────────────────────

  say(text: string, ms?: number) {
    if (!this.opts.speech || !text) return;
    const b = this.els.bubble;
    b.textContent = text;
    b.classList.add('is-visible');
    this.bubbleOn = true;
    this.bubbleSize = { w: b.offsetWidth, h: b.offsetHeight };
    this.bubbleUntil = performance.now() + (ms ?? clamp(1800 + text.length * 55, 2200, 6000));
  }

  react(kind: PetReaction, text?: string) {
    const def = REACTIONS[kind];
    if (!def) return;
    const now = performance.now();
    this.wakeUp(now);
    this.override = { state: def[0], expression: def[1], until: now + def[2] };
    if (kind === 'success' || kind === 'happy') {
      this.startSpin(now);
      this.feelGood({ fun: 0.15, social: 0.1 });
    } else if (kind === 'error') this.feelGood({ curiosity: 0.2, fun: -0.1 });
    if (text !== '') this.say(text ?? pick(LINES[kind]));
  }

  goTo(target: PetTarget, text?: string) {
    const el = this.resolve(target);
    if (!el) return;
    const now = performance.now();
    this.wakeUp(now);
    const r = el.getBoundingClientRect();
    if (r.top < this.H * 0.6 || r.top > innerHeight - 4 || r.right < 0 || r.left > innerWidth) {
      this.say('Nie sięgam tam 🙈');
      return;
    }
    const s = this.ensureSurface(el);
    if (text) this.say(text);
    if (this.mode.kind === 'ground' && this.mode.surface === s) return;
    this.endActivity(now);
    this.jumpTo(s, now);
  }

  /** Czynność: kawa, hakowanie, wędka, okulary, potknięcie, pokazanie rekwizytu. */
  act(activity: PetActivity, prop?: PetProp, text?: string, ms?: number) {
    if (!ACTIVITIES.includes(activity)) return;
    const now = performance.now();
    if (this.action.name === 'sleep' || this.forcedSleep) this.wakeUp(now);
    this.override = null;
    const m = this.mode;
    if (m.kind !== 'ground' || !this.isUpright() || this.launch || this.trip) {
      this.pendingAct = { activity, prop, text, ms };
      if (m.kind === 'ground' && !this.isUpright()) this.drop();
      return;
    }
    if (activity === 'trip') {
      const sf = m.surface;
      if (!sf.el) {
        this.startTrip(now, false);
        return;
      }
      // biegnie do bliższej krawędzi i tam się potyka
      const [a, b] = sf.kind === 'top' ? this.topRange(sf) : [0, Math.max(0, sf.rect.width - 2 * sf.radius)];
      this.dir = b - m.s < m.s - a ? 1 : -1;
      this.tripAtEdge = true;
      this.setAction('run', now + 8000);
      return;
    }
    if (activity === 'fish' && !m.surface.el) {
      // z podłogi nie da się łowić – najpierw wskakujemy na jakiś element
      const t = this.pickTarget(true);
      if (!t) {
        this.say(pick(LINES.noFish));
        return;
      }
      this.pendingAct = { activity, prop, text, ms };
      this.jumpTo(t, now);
      return;
    }
    const durations: Record<Exclude<PetActivity, 'trip'>, number> = {
      coffee: rand(7000, 10000),
      hack: rand(6000, 9000),
      fish: FISH_MS + 600,
      cool: 2600,
      show: rand(4400, 5600),
    };
    const shown: PetProp | undefined = activity === 'show' ? (prop ?? this.pickProp()) : undefined;
    if (activity === 'coffee') this.feelGood({ energy: 0.3 });
    if (activity === 'show' || activity === 'fish') this.feelGood({ fun: 0.2 });
    this.action = { name: activity, start: now, until: now + (ms ?? durations[activity]), prop: shown };
    const line = text ?? (activity === 'show' ? (shown ? pick(PROP_LINES[shown]) : '') : pick(LINES[activity]));
    if (line) this.say(line);
  }

  // ───────────────────────── pętla ─────────────────────────

  private tick = (t: number) => {
    this.raf = requestAnimationFrame(this.tick);
    const dt = this.lastT ? Math.min(0.05, (t - this.lastT) / 1000) : 0.016;
    this.lastT = t;
    if (this.dirty || t - this.lastRefresh > 600) this.refreshSurfaces(t);

    const m = this.mode;
    if (m.kind === 'ground') this.stepGround(m, dt, t);
    else if (m.kind === 'air') this.stepAir(m, dt, t);
    else this.angle = lerpAngle(this.angle, 0, 1 - Math.exp(-dt * 14));

    this.updateMood(dt, t);
    this.think(t);
    this.render(t, dt);
  };

  private updateMood(dt: number, now: number) {
    const m = this.mood;
    const a = this.action.name;
    const moving = this.speedNow > 5;
    m.energy += dt * (a === 'sleep' ? 0.05 : a === 'sit' || a === 'coffee' ? 0.025 : moving ? (a === 'run' ? -0.012 : -0.004) : -0.0012);
    m.fun += dt * (a === 'show' || a === 'fish' || a === 'cool' || this.spin ? 0.035 : -0.005);
    m.social += dt * (now - this.lastActivity < 5000 ? 0.002 : -0.0035);
    m.curiosity += dt * -0.007;
    for (const k of ['energy', 'fun', 'social', 'curiosity'] as const) m[k] = clamp(m[k], 0, 1);
  }

  private feelGood(delta: Partial<Mood>) {
    for (const [k, v] of Object.entries(delta) as Array<[keyof Mood, number]>) this.mood[k] = clamp(this.mood[k] + v, 0, 1);
  }

  private startSpin(now: number, sign?: 1 | -1) {
    this.spin = { start: now, from: this.yaw, sign: sign ?? (Math.random() < 0.5 ? 1 : -1) };
  }

  private air(vx: number, vy: number, extra: Partial<AirMode> = {}): AirMode {
    return { kind: 'air', vx, vy, target: null, ignore: null, t: 0, tLand: 0, spin: 0, hangUntil: 0, ...extra };
  }

  private stepGround(m: GroundMode, dt: number, now: number) {
    const sf = m.surface;
    if (sf.el) {
      if (!sf.el.isConnected || !this.surfaces.has(sf.el)) return this.drop(true);
      const r = sf.el.getBoundingClientRect();
      if (r.width < 4 || r.height < 4) return this.drop(true);
      sf.rect = toRect(r);
      this.fitRadius(sf);
    }

    const wanted = this.moveSpeed(now);
    // płynne ruszanie i hamowanie
    this.speedNow += (wanted - this.speedNow) * Math.min(1, dt * (wanted > this.speedNow ? 5 : 9));
    if (this.speedNow < 0.5) this.speedNow = 0;
    const speed = this.speedNow;
    // podchodzi do kursora / celu
    const act = this.action;
    if (act.name === 'approach' && act.targetX !== undefined) {
      const px = sf.kind === 'top' ? sf.rect.left + m.s : this.cx;
      const dx = act.targetX - px;
      if (Math.abs(dx) < 14 * this.k) {
        this.setAction('look', now + rand(1200, 2200));
        if (Math.random() < 0.5) this.sayOnce('approach', now, 9000);
      } else this.dir = dx > 0 ? 1 : -1;
    }
    if (this.tripAtEdge && wanted && this.isUpright()) {
      const [ea, eb] = sf.kind === 'top' ? this.topRange(sf) : [0, Math.max(0, sf.rect.width - 2 * sf.radius)];
      if ((this.dir > 0 ? eb - m.s : m.s - ea) < 26 * this.k) {
        this.tripAtEdge = false;
        this.startTrip(now, true);
        return;
      }
    }
    // czasem się potyka (tylko gdy idzie prosto po górze)
    if (wanted && !this.reducedMotion && this.isUpright() && Math.random() < dt * (this.action.name === 'run' ? 0.05 : 0.014)) {
      this.startTrip(now);
      return;
    }
    if (sf.kind === 'top') {
      const [a, b] = this.topRange(sf);
      m.s += this.dir * speed * dt;
      if (m.s < a || m.s > b) {
        m.s = clamp(m.s, a, b);
        if (wanted) this.onEdge(m, now);
        else this.speedNow = 0;
        if (this.mode !== m) return;
      }
    } else {
      const L = perimeterLength(sf.rect, sf.radius);
      m.s = (((m.s + this.dir * speed * dt) % L) + L) % L;
    }

    const p = sf.kind === 'top' ? { x: sf.rect.left + m.s, y: sf.rect.top, nx: 0, ny: -1 } : perimeterPoint(sf.rect, sf.radius, m.s);
    this.nx = p.nx;
    this.ny = p.ny;
    this.cx = p.x + (p.nx * this.H) / 2;
    this.cy = p.y + (p.ny * this.H) / 2;
    this.angle = (Math.atan2(p.ny, p.nx) * 180) / Math.PI + 90;

    const pad = this.H * 0.4;
    if (this.cy < -pad || this.cy > innerHeight + pad || this.cx < -pad || this.cx > innerWidth + pad) this.offscreen(now);
  }

  private stepAir(m: AirMode, dt: number, now: number) {
    if (now < m.hangUntil) return; // „kreskówkowe” zawiśnięcie nad przepaścią
    m.t += dt;
    const half = this.H / 2;
    const prevFeet = this.cy + half;
    m.vy = Math.min(MAX_FALL, m.vy + GRAVITY * dt);
    this.cx += m.vx * dt;
    this.cy += m.vy * dt;
    if (m.spin) this.angle += m.spin * dt;
    else this.angle = lerpAngle(this.angle, 0, 1 - Math.exp(-dt * 12));

    const wall = this.W * 0.4;
    if (this.cx < wall) {
      this.cx = wall;
      m.vx = Math.abs(m.vx) * 0.45;
    } else if (this.cx > innerWidth - wall) {
      this.cx = innerWidth - wall;
      m.vx = -Math.abs(m.vx) * 0.45;
    }
    if (m.vy <= 0) return;

    const feet = this.cy + half;
    const impact = m.spin ? HARD_LANDING + 1 : m.vy; // po koziołkowaniu zawsze plask
    const onlyTarget = m.target !== null && m.t < m.tLand * 1.3 + 0.05;
    const list = onlyTarget && m.target ? [m.target] : this.surfaces.values();
    for (const s of list) {
      // nie lądujemy na elementach tuż przy górze ekranu – maskotka byłaby prawie niewidoczna
      if (!s.el || s === m.ignore || (!onlyTarget && (!s.reachable || s.rect.top < this.H * 0.6))) continue;
      // koziołkując nie zatrzymuje się na małych przyciskach i polach – leci na okno/kartę albo na dół
      if (m.spin && s.kind === 'top') continue;
      const r = s === m.target ? toRect(s.el.getBoundingClientRect()) : s.rect;
      if (prevFeet <= r.top + 2 && feet >= r.top && this.cx >= r.left - 6 && this.cx <= r.right + 6) {
        this.land(s, r, impact, now);
        return;
      }
    }
    if (feet >= innerHeight) this.land(this.floor, this.floor.rect, impact, now);
  }

  private land(s: Surface, r: Rect, vy: number, now: number, silent = false) {
    s.rect = r;
    let sv: number;
    if (s.kind === 'top') {
      const [a, b] = this.topRange(s);
      sv = clamp(this.cx - r.left, a, b);
    } else {
      this.fitRadius(s);
      sv = clamp(this.cx - r.left - s.radius, 0, Math.max(0, r.width - 2 * s.radius));
    }
    const m: GroundMode = { kind: 'ground', surface: s, s: sv };
    this.mode = m;
    this.launch = null;
    this.setAction('idle', now + rand(500, 1400));
    if (!silent) {
      const hard = vy > HARD_LANDING;
      this.impact = hard ? { state: 'splat', until: now + 1300 } : { state: 'land', until: now + 260 };
      if (s.el) this.bump(s.el);
      if (hard) this.say(pick(LINES.hard));
      else if (!this.greeted) {
        this.greeted = true;
        const h = new Date().getHours();
        this.say(h < 5 ? 'Nie śpisz jeszcze? 🌙' : h < 11 ? 'Dzień dobry! ☀️' : h >= 19 ? 'Dobry wieczór! 🌙' : pick(LINES.hello));
      }
    }
    this.stepGround(m, 0, now);
  }

  /** Zejście z krawędzi w powietrze (spadanie). */
  private drop(surprised = false, vx = this.dir * 40, vy = 0, extra: Partial<AirMode> = {}) {
    const ignore = this.mode.kind === 'ground' ? this.mode.surface : null;
    this.tripAtEdge = false;
    this.mode = this.air(vx, vy, { ignore, ...extra });
    this.launch = null;
    if (surprised) this.override = null;
    if (this.isActivity()) this.setAction('idle', 0);
  }

  private offscreen(now: number) {
    const m = this.W / 2;
    this.cx = clamp(this.cx, m, innerWidth - m);
    if (this.cy < 0) {
      // element uciekł do góry (scroll) – maskotka spada z góry ekranu
      this.cy = -this.H * 0.4;
      this.angle = 0;
      this.mode = this.air(0, 0);
    } else {
      this.land(this.floor, this.floor.rect, 0, now, true);
    }
  }

  private onEdge(m: GroundMode, now: number) {
    const flip = () => {
      this.dir = this.dir === 1 ? -1 : 1;
    };
    if (!m.surface.el || this.workEl || this.reducedMotion) {
      flip();
      return;
    }
    const r = Math.random();
    if (r < 0.42) flip();
    else if (r < 0.56) this.walkOffEdge(now);
    else if (r < 0.8) this.drop(false, this.dir * 150 * this.k, -380); // zeskok
    else {
      const t = this.pickTarget();
      if (t) this.jumpTo(t, now);
      else this.drop(false, this.dir * 150 * this.k, -380);
    }
  }

  /** Wchodzi w powietrze za krawędzią, zawisa, patrzy w dół… i spada. */
  private walkOffEdge(now: number) {
    this.cx += this.dir * this.W * 0.42;
    this.drop(false, this.dir * 30, 0, { hangUntil: now + 750 });
    this.say(pick(LINES.oops));
  }

  /**
   * Potknięcie: przy krawędzi koziołkuje w dół (np. na inne okno), w środku – plask na buzię.
   * `force` (z API) – zawsze leci z krawędzi, tej bliższej.
   */
  private startTrip(now: number, force = false) {
    this.override = null;
    this.trip = { until: now + 380, force };
    this.setAction('idle', now + 2000);
  }

  private finishTrip(m: GroundMode, now: number) {
    const force = this.trip?.force ?? false;
    this.trip = null;
    const sf = m.surface;
    let toEdge = Infinity;
    if (sf.el && this.isUpright()) {
      let a = 0;
      let b = Math.max(0, sf.rect.width - 2 * sf.radius);
      if (sf.kind === 'top') [a, b] = this.topRange(sf);
      if (force) this.dir = b - m.s < m.s - a ? 1 : -1; // w stronę bliższej krawędzi
      toEdge = this.dir > 0 ? b - m.s : m.s - a;
    }
    if (toEdge < 70 * this.k || (force && toEdge < Infinity)) {
      const vx = Math.max(140 * this.k, (toEdge + this.W * 0.5) / 0.5);
      this.drop(false, this.dir * vx, -220, { spin: this.dir * 620 });
      this.say(pick(LINES.tumble));
    } else {
      this.impact = { state: 'splat', until: now + 1300 };
      this.say(pick(LINES.trip));
    }
  }

  private jumpTo(target: Surface, now: number) {
    if (this.mode.kind !== 'ground') {
      this.pendingGoto = target;
      return;
    }
    if (!this.isUpright()) {
      this.pendingGoto = target;
      this.drop();
      return;
    }
    const r = target.el ? toRect(target.el.getBoundingClientRect()) : target.rect;
    let lo: number;
    let hi: number;
    if (!target.el) {
      const [a, b] = this.topRange(target);
      lo = r.left + a;
      hi = r.left + b;
    } else if (target.kind === 'top') {
      lo = r.left + 10;
      hi = r.right - 10;
    } else {
      this.fitRadius(target);
      lo = r.left + target.radius + 8;
      hi = r.right - target.radius - 8;
    }
    if (hi < lo) lo = hi = (r.left + r.right) / 2;
    const x1 = clamp(this.cx + rand(-140, 140), lo, hi);
    const y0 = this.cy + this.H / 2;
    const y1 = r.top;
    const apex = Math.min(y0, y1) - rand(50, 90) * this.k;
    const vy = -Math.sqrt(2 * GRAVITY * (y0 - apex));
    const T = -vy / GRAVITY + Math.sqrt((2 * (y1 - apex)) / GRAVITY);
    const vx = (x1 - this.cx) / T;
    if (Math.abs(vx) > 1) this.dir = vx > 0 ? 1 : -1;
    if (this.isActivity()) this.setAction('idle', 0);
    this.launch = { vx, vy, target, T, from: this.mode.surface, at: now + 170 };
  }

  private pickTarget(elementsOnly = false): Surface | null {
    const cur = this.mode.kind === 'ground' ? this.mode.surface : null;
    const feetX = this.cx;
    const feetY = this.cy + this.H / 2;
    const cands: Array<[Surface, number]> = [];
    for (const s of this.surfaces.values()) {
      if (s === cur || !s.reachable || !s.el) continue;
      if (s.rect.top < this.H * 0.95 || s.rect.top > innerHeight - 10 || s.rect.width < 40) continue;
      const tx = clamp(feetX, s.rect.left, s.rect.right);
      const d = Math.hypot(tx - feetX, s.rect.top - feetY);
      cands.push([s, (1 / (1 + d / 320)) * (s.kind === 'perimeter' ? 1.4 : 1)]);
    }
    if (cur?.el && !elementsOnly) cands.push([this.floor, 0.35]);
    let sum = 0;
    for (const [, w] of cands) sum += w;
    let r = Math.random() * sum;
    for (const [s, w] of cands) {
      r -= w;
      if (r <= 0) return s;
    }
    return null;
  }

  // ───────────────────────── decyzje ─────────────────────────

  private think(now: number) {
    const m = this.mode;
    if (m.kind !== 'ground') return;

    if (this.launch) {
      if (now >= this.launch.at) {
        const l = this.launch;
        this.launch = null;
        this.mode = this.air(l.vx, l.vy, { target: l.target, ignore: l.from, tLand: l.T });
      }
      return;
    }
    if (this.trip) {
      if (now >= this.trip.until) this.finishTrip(m, now);
      return;
    }
    if (this.impact) {
      if (now < this.impact.until) return;
      if (this.impact.state === 'splat') {
        this.impact = { state: 'recover', until: now + 750 };
        return;
      }
      this.impact = null;
    }
    if (this.pendingGoto) {
      const t = this.pendingGoto;
      this.pendingGoto = null;
      if (t !== m.surface && (!t.el || t.el.isConnected)) {
        this.jumpTo(t, now);
        return;
      }
    }
    if (this.override) {
      if (now < this.override.until) return;
      this.override = null;
    }
    if (this.pendingAct && this.isUpright()) {
      const p = this.pendingAct;
      this.pendingAct = null;
      this.act(p.activity, p.prop, p.text, p.ms);
      return;
    }
    const a = this.action;
    if (a.name === 'sleep') return;
    if (a.name === 'fish' && !a.said && now - a.start > FISH_MS * 0.74) {
      a.said = true;
      this.say(pick(LINES.caught));
    }
    if (this.workEl) return this.doWork(m, now);
    if (!this.isActivity() && a.name !== 'wake' && this.isUpright() && now - this.lastActivity > this.opts.sleepAfterMs) {
      this.setAction('sleep', Infinity);
      return;
    }
    if (now < a.until) return;
    this.decide(m, now);
  }

  /**
   * „Mózg”: wybiera kolejną czynność z wagami zależnymi od nastroju i tego, co dzieje się na stronie.
   * Zmęczona – siada i pije kawę, znudzona – bawi się rekwizytami i łowi ryby, stęskniona – podchodzi do kursora.
   */
  private decide(m: GroundMode, now: number) {
    if (!this.isUpright()) {
      // wisi na boku albo pod spodem elementu
      const r = Math.random();
      if (r < 0.72) this.setAction('walk', now + rand(2500, 6000));
      else if (r < 0.88) this.setAction('idle', now + rand(1200, 2600));
      else this.drop(true);
      return;
    }
    const md = this.mood;
    const onElement = !!m.surface.el;
    const roomy = !onElement || m.surface.kind === 'perimeter';
    const hobbies = this.opts.hobbies && !this.reducedMotion;
    const canFish = onElement && m.surface.rect.bottom < innerHeight - 40 && m.surface.rect.top > this.H;
    const pointerX = this.pointerOnLevel();

    if (md.energy < 0.2) this.sayOnce('tired', now, 40000);
    else if (md.fun < 0.15) this.sayOnce('bored', now, 40000);
    else if (md.social < 0.12) this.sayOnce('lonely', now, 50000);

    const choices: Array<[number, () => void]> = [
      [
        0.2 + 0.9 * md.energy,
        () => {
          if (Math.random() < 0.35) this.dir = this.dir === 1 ? -1 : 1;
          this.setAction('walk', now + rand(2000, 6000));
        },
      ],
      [roomy && !this.reducedMotion ? 0.5 * md.energy * (0.4 + md.fun) : 0, () => this.setAction('run', now + rand(1200, 2600))],
      [0.4, () => this.setAction('idle', now + rand(1800, 3800))],
      [0.2 + 0.5 * md.curiosity, () => this.setAction('look', now + rand(1600, 3000))],
      [0.2 + 0.8 * (1 - md.energy), () => this.setAction('sit', now + rand(3500, 8000))],
      [0.12 + 0.5 * md.curiosity, () => this.turnBack(now)],
      [hobbies ? 0.12 + 1.3 * (1 - md.energy) : 0, () => this.act('coffee')],
      [hobbies ? 0.12 + 0.6 * md.curiosity : 0, () => this.act('hack')],
      [hobbies ? 0.25 + 1.2 * (1 - md.fun) : 0, () => this.act('show', this.pickProp())],
      [hobbies && canFish ? 0.15 + 0.9 * (1 - md.fun) : 0, () => this.act('fish')],
      [hobbies ? 0.08 + 0.3 * md.social : 0, () => this.act('cool')],
      [hobbies ? 0.08 + 0.3 * md.fun : 0, () => {
        this.startSpin(now);
        this.sayOnce('spin', now, 15000);
        this.setAction('idle', now + 1400);
      }],
      [pointerX !== null ? 0.15 + 1.2 * md.social : 0, () => this.setAction('approach', now + 7000, pointerX ?? undefined)],
      [!this.reducedMotion ? 0.3 + 0.6 * md.energy : 0, () => {
        const t = this.pickTarget();
        if (t) this.jumpTo(t, now);
        else this.setAction('walk', now + rand(2000, 4000));
      }],
    ];
    let sum = 0;
    for (const [w] of choices) sum += w;
    let r = Math.random() * sum;
    for (const [w, run] of choices) {
      r -= w;
      if (r <= 0) {
        run();
        return;
      }
    }
  }

  /** Odwraca się tyłem i „ogląda stronę” (widać nadruk na kapturze). */
  private turnBack(now: number) {
    this.setAction('turnback', now + rand(2200, 3800));
    if (Math.random() < 0.4) this.sayOnce('turnback', now, 20000);
  }

  /** Rekwizyt do zabawy – częściej te, których użytkownik ostatnio używał. */
  private pickProp(): PetProp {
    if (this.recentProps.length && Math.random() < 0.55) return pick(this.recentProps);
    return pick(PET_PROPS.filter((p) => p !== 'coffee'));
  }

  /** Pozycja X kursora, jeśli jest mniej więcej na wysokości maskotki (żeby mogła do niego podejść). */
  private pointerOnLevel(): number | null {
    const m = this.mode;
    if (!this.pointer || m.kind !== 'ground' || now() - this.lastActivity > 15000) return null;
    const feet = this.cy + this.H / 2;
    const { x, y } = this.pointer;
    if (y > feet + 30 || y < feet - this.H * 2.2) return null;
    const r = m.surface.rect;
    if (x < r.left || x > r.right) return null;
    if (Math.abs(x - this.cx) < this.W) return null;
    return clamp(x, r.left + 10, r.right - 10);
  }

  private doWork(m: GroundMode, now: number) {
    const el = this.workEl;
    if (!el || !el.isConnected) {
      this.workEl = null;
      return;
    }
    const s = this.ensureSurface(el);
    if (m.surface !== s) {
      if (now < this.workRetryAt) return;
      const r = el.getBoundingClientRect();
      if (r.top < this.H * 0.6 || r.top > innerHeight - 4) {
        // pole jest poza zasięgiem – tylko się przyglądamy
        this.setAction('look', now + 1500);
        this.workRetryAt = now + 1500;
        return;
      }
      this.workRetryAt = now + 1200;
      this.jumpTo(s, now);
      return;
    }
    this.setAction(now - this.lastTypeAt < 1400 ? 'typing' : 'watch', now + 250);
  }

  private setAction(name: ActionName, until: number, targetX?: number) {
    this.action = { name, start: performance.now(), until, targetX };
  }

  private isActivity() {
    const n = this.action.name;
    return n === 'coffee' || n === 'hack' || n === 'fish' || n === 'show' || n === 'cool';
  }

  private endActivity(now: number) {
    if (this.isActivity()) this.setAction('idle', now + 400);
  }

  private wakeUp(now: number) {
    this.forcedSleep = false;
    this.lastActivity = now;
    if (this.action.name === 'sleep') this.setAction('wake', now + 1100);
  }

  private moveSpeed(now: number) {
    if (this.launch || this.trip || (this.impact && now < this.impact.until) || (this.override && now < this.override.until)) return 0;
    const n = this.action.name;
    if (n === 'walk' || n === 'approach') return WALK_SPEED * this.k * (0.85 + this.mood.energy * 0.3);
    if (n === 'run') return RUN_SPEED * this.k;
    return 0;
  }

  private isUpright() {
    return this.mode.kind === 'ground' && this.ny < -0.98;
  }

  private topRange(s: Surface): [number, number] {
    const m = s.el ? Math.min(6, s.rect.width / 2) : this.W * 0.42;
    return [m, Math.max(m, s.rect.width - m)];
  }

  private fitRadius(s: Surface) {
    s.radius = Math.max(0, Math.min(Math.max(s.cssRadius, 10), s.rect.width / 2, s.rect.height / 2));
  }

  // ───────────────────────── powierzchnie ─────────────────────────

  private refreshSurfaces(now: number) {
    this.dirty = false;
    this.lastRefresh = now;
    const W = innerWidth;
    const H = innerHeight;
    this.floor.rect = { left: 0, top: H, right: W, bottom: H, width: W, height: 0 };

    const found = new Set<Element>();
    try {
      document.querySelectorAll(this.opts.surfaceSelector).forEach((el) => found.add(el));
    } catch {
      // nieprawidłowy selektor – zostają tylko elementy dodane ręcznie
    }
    for (const el of this.extra) {
      if (el.isConnected) found.add(el);
      else this.extra.delete(el);
    }

    const seen = new Set<Element>();
    for (const el of found) {
      if (this.els.layer.contains(el) || el.closest('[data-pet-ignore]') || el.getAttribute('data-pet-surface') === 'off') continue;
      const r = el.getBoundingClientRect();
      if (r.width < 36 || r.height < 12) continue;
      let solid = this.solid.get(el);
      if (solid === undefined) {
        solid = hasVisibleEdge(el);
        this.solid.set(el, solid);
      }
      if (!solid && !this.extra.has(el)) continue;
      let s = this.surfaces.get(el);
      const isNew = !s;
      if (!s) {
        s = this.makeSurface(el, r);
        this.surfaces.set(el, s);
      }
      s.rect = toRect(r);
      s.kind = surfaceKind(el, r);
      this.fitRadius(s);
      s.reachable = this.topVisible(el, s.rect);
      seen.add(el);
      if (isNew && this.initialized && el.hasAttribute('data-pet-attract')) {
        const msg = el.getAttribute('data-pet-attract') || pick(LINES.attract);
        window.setTimeout(() => {
          if (el.isConnected) this.goTo(el, msg);
        }, 380);
      }
    }
    for (const el of this.surfaces.keys()) if (!seen.has(el)) this.surfaces.delete(el);
    this.initialized = true;
  }

  private makeSurface(el: Element, r: DOMRect): Surface {
    const s: Surface = {
      el,
      kind: surfaceKind(el, r),
      rect: toRect(r),
      cssRadius: parseFloat(getComputedStyle(el).borderTopLeftRadius) || 0,
      radius: 0,
      reachable: false,
    };
    this.fitRadius(s);
    return s;
  }

  private ensureSurface(el: Element): Surface {
    let s = this.surfaces.get(el);
    if (!s) {
      s = this.makeSurface(el, el.getBoundingClientRect());
      s.reachable = this.topVisible(el, s.rect);
      this.surfaces.set(el, s);
    }
    this.extra.add(el);
    return s;
  }

  /** Czy górna krawędź elementu jest widoczna (nie zasłania jej np. modal albo sticky header). */
  private topVisible(el: Element, r: Rect) {
    if (r.top < 0 || r.top > innerHeight - 2) return false;
    let ok = 0;
    let n = 0;
    for (const f of [0.25, 0.5, 0.75]) {
      const x = r.left + r.width * f;
      if (x < 0 || x > innerWidth) continue;
      n++;
      const hit = document.elementFromPoint(x, r.top + 3);
      if (hit && (hit === el || el.contains(hit) || this.els.layer.contains(hit))) ok++;
    }
    return n > 0 && ok * 2 >= n;
  }

  private resolve(target: PetTarget | null): Element | null {
    if (!target) return null;
    if (typeof target !== 'string') return target;
    try {
      return document.querySelector(target);
    } catch {
      return null;
    }
  }

  private bump(el: Element) {
    el.classList.remove('pet-bump');
    void (el as HTMLElement).offsetWidth;
    el.classList.add('pet-bump');
    window.setTimeout(() => el.classList.remove('pet-bump'), 400);
  }

  // ───────────────────────── rysowanie ─────────────────────────

  private render(now: number, dt: number) {
    const el = this.els.pet;
    el.style.transform = `translate3d(${(this.cx - this.W / 2).toFixed(1)}px, ${(this.cy - this.H / 2).toFixed(1)}px, 0) rotate(${this.angle.toFixed(2)}deg)`;
    if (!this.shown) {
      el.style.opacity = '1';
      this.shown = true;
    }

    // oczy i obrót 3D: patrzą na to, co ciekawe – kursor, kliknięty element, kierunek marszu
    const grounded = this.mode.kind === 'ground';
    const moving = grounded && this.speedNow > 5;
    const act = this.action.name;
    let lx = moving ? this.dir * 2.6 : 0;
    let ly = 0;
    let yawTarget = moving ? this.dir * (act === 'run' ? 78 : 62) : 0;
    const focus = this.attention && now < this.attention.until ? this.attention : this.pointer;
    if (this.mode.kind === 'drag') {
      yawTarget = Math.sin(now / 320) * 25;
    } else if (this.mode.kind === 'air') {
      const m = this.mode;
      yawTarget = m.spin ? this.yaw : Math.abs(m.vx) > 60 ? Math.sign(m.vx) * 40 : 0;
    } else if (act === 'turnback') {
      yawTarget = this.yaw >= 0 ? 180 : -180;
    } else if (act === 'look') {
      lx = Math.sin(now / 700) * 3.2;
      ly = Math.cos(now / 1100) * 1.2 - 0.5;
      yawTarget = Math.sin(now / 900) * 45;
    } else if (act === 'typing' || act === 'watch' || act === 'hack') {
      ly = 2.5;
    } else if (act === 'fish') {
      lx = 3;
      ly = 3;
      yawTarget = 28;
    } else if (act === 'coffee') {
      yawTarget = 14;
    } else if (act === 'cool') {
      yawTarget = -22;
    } else if (focus && !moving) {
      const dx = focus.x - this.cx;
      const dy = focus.y - this.cy;
      const d = Math.hypot(dx, dy);
      if (d > 1 && d < 460) {
        const a = (this.angle * Math.PI) / 180;
        const ldx = dx * Math.cos(a) + dy * Math.sin(a);
        const ldy = -dx * Math.sin(a) + dy * Math.cos(a);
        const f = Math.min(1, d / 80);
        lx = (ldx / d) * 3.4 * f;
        ly = (ldy / d) * 2.6 * f;
        yawTarget = clamp(ldx / 5, -42, 42);
      }
    }

    // sprężyna – obrót zawsze płynny; piruet nadpisuje sprężynę
    if (this.spin) {
      const p = (now - this.spin.start) / 900;
      if (p >= 1) {
        this.yaw = this.spin.from;
        this.spin = null;
      } else {
        const e = p < 0.5 ? 2 * p * p : 1 - (-2 * p + 2) ** 2 / 2;
        this.yaw = this.spin.from + this.spin.sign * 360 * e;
      }
      this.yawVel = 0;
    } else {
      const k = 62;
      this.yawVel += ((yawTarget - this.yaw) * k - this.yawVel * 2 * Math.sqrt(k) * 0.92) * dt;
      this.yaw += this.yawVel * dt;
      if (this.yaw > 200) this.yaw -= 360;
      else if (this.yaw < -200) this.yaw += 360;
    }
    const yr = (this.yaw * Math.PI) / 180;
    const yc = Math.cos(yr);
    const ys = Math.sin(yr);

    const lean = moving ? (act === 'run' ? 9 : 3) * this.dir * Math.min(1, this.speedNow / (WALK_SPEED * this.k)) : 0;
    const key = `${lx.toFixed(1)}|${ly.toFixed(1)}|${this.dir}|${lean.toFixed(1)}|${yc.toFixed(3)}|${ys.toFixed(3)}`;
    if (key !== this.styleKey) {
      this.styleKey = key;
      const st = el.style;
      st.setProperty('--lx', lx.toFixed(1));
      st.setProperty('--ly', ly.toFixed(1));
      st.setProperty('--dir', String(this.dir));
      st.setProperty('--lean', lean.toFixed(1));
      st.setProperty('--yc', yc.toFixed(3));
      st.setProperty('--ys', ys.toFixed(3));
      st.setProperty('--yac', Math.abs(yc).toFixed(3));
      st.setProperty('--yas', Math.abs(ys).toFixed(3));
      st.setProperty('--ysg', yc < 0 ? '-1' : '1');
    }

    const v = this.computeVisual(now);
    if (v.state !== this.visual.state || v.expression !== this.visual.expression || v.prop !== this.visual.prop) {
      this.visual = v;
      this.onVisual(v);
    }
    this.renderBubble(now);
  }

  private computeVisual(now: number): PetVisual {
    const ov = this.override && now < this.override.until ? this.override : null;
    const m = this.mode;
    const v = (state: PetState, expression: PetExpression, prop: PetProp | null = null): PetVisual => ({ state, expression, prop });
    if (m.kind === 'drag') return v('drag', ov?.expression ?? (now - m.since > 2500 ? 'annoyed' : 'surprised'));
    if (m.kind === 'air') {
      if (now < m.hangUntil) return v('oops', now > m.hangUntil - 400 ? 'shocked' : 'surprised');
      if (m.spin) return v('fall', 'dizzy');
      return v(m.vy < -60 ? 'jump' : 'fall', ov?.expression ?? (m.target ? 'happy' : m.vy > 900 ? 'surprised' : 'curious'));
    }
    if (this.trip) return v('trip', 'shocked');
    if (this.launch) return v('crouch', ov?.expression ?? 'happy');
    if (this.impact && now < this.impact.until) {
      const st = this.impact.state;
      return v(st, st === 'splat' ? 'dizzy' : st === 'recover' ? 'annoyed' : (ov?.expression ?? 'neutral'));
    }
    if (ov) return v(ov.state, ov.expression);
    const hov = this.hovered;
    const a = this.action;
    switch (a.name) {
      case 'walk':
      case 'approach':
        return v(this.speedNow > 5 ? 'walk' : 'idle', hov ? 'happy' : a.name === 'approach' ? 'curious' : 'neutral');
      case 'turnback':
        return v('look', 'curious');
      case 'run':
        return v(this.speedNow > 5 ? 'run' : 'idle', 'excited');
      case 'sit':
        return v('sit', hov ? 'happy' : now - this.lastActivity > this.opts.sleepAfterMs * 0.6 ? 'sleepy' : 'neutral');
      case 'look':
        return v('look', 'curious');
      case 'sleep':
        return v('sleep', 'asleep');
      case 'wake':
        return v('wake', 'sleepy');
      case 'typing':
        return v('typing', 'focused');
      case 'watch':
        return v('sit', 'curious');
      case 'coffee':
        return v('coffee', 'content', 'coffee');
      case 'hack':
        return v('hack', 'hacker');
      case 'cool':
        return v('cool', 'happy');
      case 'show':
        return v('show', 'happy', a.prop ?? null);
      case 'fish': {
        const t = (now - a.start) / FISH_MS;
        return v('fish', t < 0.6 ? 'curious' : t < 0.72 ? 'shocked' : 'excited');
      }
      default:
        return v('idle', hov ? 'happy' : 'neutral');
    }
  }

  private renderBubble(now: number) {
    if (!this.bubbleOn) return;
    if (now > this.bubbleUntil) return this.hideBubble();
    const b = this.els.bubble;
    const { w, h } = this.bubbleSize;
    const R = this.H * 0.5;
    const bx = clamp(this.cx, w / 2 + 8, innerWidth - w / 2 - 8);
    let top = this.cy - R - 8 - h;
    let below = false;
    if (top < 6) {
      top = this.cy + R + 8;
      below = true;
    }
    b.style.transform = `translate3d(${(bx - w / 2).toFixed(1)}px, ${top.toFixed(1)}px, 0)`;
    b.classList.toggle('is-below', below);
    b.style.setProperty('--tail-x', `${clamp(this.cx - bx, -w / 2 + 14, w / 2 - 14).toFixed(1)}px`);
  }

  private hideBubble() {
    this.bubbleOn = false;
    this.els.bubble.classList.remove('is-visible');
  }

  /** Mówi, ale nie częściej niż raz na `gap` ms dla danej kategorii. */
  private sayOnce(key: keyof typeof LINES, now: number, gap = 5000) {
    if (now - (this.saidAt.get(key) ?? -1e9) < gap) return;
    this.saidAt.set(key, now);
    this.say(pick(LINES[key]));
  }

  // ───────────────────────── dotyk ─────────────────────────

  /** Która część ciała jest pod kursorem (w układzie grafiki 160×190). */
  private zoneAt(px: number, py: number): Zone | null {
    const a = (this.angle * Math.PI) / 180;
    const dx = px - this.cx;
    const dy = py - this.cy;
    const ux = VIEW_W / 2 + ((dx * Math.cos(a) + dy * Math.sin(a)) * VIEW_W) / this.W;
    const uy = VIEW_H / 2 + ((-dx * Math.sin(a) + dy * Math.cos(a)) * VIEW_H) / this.H;
    if (ux < 0 || ux > VIEW_W || uy < 0 || uy > VIEW_H) return null;
    const hx = (ux - 80) / 58;
    const hy = (uy - 100) / 43;
    if (hx * hx + hy * hy <= 1) return 'head';
    if (uy < 82) {
      if (ux > 8 && ux < 70) return 'ear-l';
      if (ux > 90 && ux < 152) return 'ear-r';
      return null;
    }
    if (uy >= 166 && Math.abs(ux - 80) < 36) return 'feet';
    if (uy >= 124 && Math.abs(ux - 80) < 36) return 'belly';
    return null;
  }

  /** Ruch kursora po maskotce: głaskanie główki, łaskotanie brzuszka i stóp, dotykanie uszu. */
  private feel(px: number, py: number, now: number) {
    if (!this.opts.feelTouch || this.mode.kind === 'drag' || this.press) return;
    const t = this.touch;
    const z = this.zoneAt(px, py);
    if (!z) {
      if (t.zone) t.leftAt = now;
      t.zone = null;
      t.dist = 0;
      return;
    }
    const busy =
      this.mode.kind !== 'ground' || !!this.launch || !!this.trip || !!this.impact || this.action.name === 'fish' || this.action.name === 'sleep';
    const moved = t.zone ? Math.hypot(px - t.x, py - t.y) : 0;
    t.x = px;
    t.y = py;
    if (z !== t.zone) {
      const fresh = !t.zone && now - t.leftAt > 1500;
      t.zone = z;
      t.dist = 0;
      if (busy) return;
      if (z === 'ear-l' || z === 'ear-r') {
        this.touchReact(z === 'ear-l' ? 'twitch-l' : 'twitch-r', 'annoyed', 650, now);
        this.sayOnce('ear', now, 6000);
      } else if (fresh) {
        this.touchReact('flinch', 'surprised', 450, now);
      }
      return;
    }
    t.dist += moved;
    if (busy) return;
    if (z === 'head' && t.dist > 200) {
      t.dist = 0;
      this.touchReact('petted', 'happy', 1600, now);
      this.feelGood({ social: 0.12, fun: 0.04 });
      this.sayOnce('pet', now, 7000);
    } else if (z === 'belly' && t.dist > 130) {
      t.dist = 0;
      this.touchReact('giggle', 'excited', 1300, now);
      this.feelGood({ social: 0.08, fun: 0.08 });
      this.sayOnce('belly', now, 6000);
    } else if (z === 'feet' && t.dist > 110) {
      t.dist = 0;
      this.touchReact('giggle', 'excited', 1000, now);
      this.sayOnce('feet', now, 6000);
    }
  }

  private touchReact(state: PetState, expression: PetExpression, ms: number, now: number) {
    if (this.override && now < this.override.until && this.override.state === state) {
      this.override.until = now + ms;
      return;
    }
    this.endActivity(now);
    this.override = { state, expression, until: now + ms };
  }

  // ───────────────────────── zdarzenia ─────────────────────────

  private activity() {
    if (this.forcedSleep) return;
    const now = performance.now();
    this.lastActivity = now;
    if (this.action.name === 'sleep') this.setAction('wake', now + 1100);
  }

  private onWindowPointer = (e: PointerEvent) => {
    const t = performance.now();
    if (e.type === 'pointermove' && this.pointer) this.detectShake(e.clientX - this.pointer.x, e.clientX, e.clientY, t);
    this.pointer = { x: e.clientX, y: e.clientY };
    this.activity();
    if (e.type === 'pointermove' && e.pointerType === 'mouse') this.feel(e.clientX, e.clientY, t);
  };

  /** Szybkie machanie kursorem tuż przy maskotce = zawroty głowy. */
  private detectShake(dx: number, x: number, y: number, t: number) {
    // machanie tuż obok – nie po ciele (to są łaskotki / głaskanie)
    if (Math.abs(dx) < 6 || Math.hypot(x - this.cx, y - this.cy) > this.H * 1.4 || this.zoneAt(x, y)) return;
    const dirX = Math.sign(dx);
    if (dirX !== Math.sign(this.lastPointerDx)) this.shakeFlips.push(t);
    this.lastPointerDx = dx;
    this.shakeFlips = this.shakeFlips.filter((f) => t - f < 1100);
    if (this.shakeFlips.length >= 7 && this.mode.kind === 'ground' && !this.launch && !this.trip) {
      this.shakeFlips = [];
      this.endActivity(t);
      this.override = { state: 'confused', expression: 'dizzy', until: t + 1600 };
      this.sayOnce('dizzy', t, 6000);
    }
  }

  /** Zaznaczenie tekstu: maskotka „czyta” na głos. */
  private onMouseUp = (e: MouseEvent) => {
    if (e.target instanceof Node && this.els.layer.contains(e.target)) return;
    window.setTimeout(() => {
      const sel = window.getSelection();
      const text = sel?.toString().replace(/\s+/g, ' ').trim() ?? '';
      if (text.length < 4 || text.length > 400 || !sel || sel.rangeCount === 0) return;
      const r = sel.getRangeAt(0).getBoundingClientRect();
      const t = performance.now();
      this.attention = { x: r.left + r.width / 2, y: r.top + r.height / 2, until: t + 2500 };
      this.feelGood({ curiosity: 0.2 });
      if (t - (this.saidAt.get('read') ?? -1e9) > 8000) {
        this.saidAt.set('read', t);
        this.say(`Czytam: „${text.length > 42 ? `${text.slice(0, 42)}…` : text}” 🤓`);
      }
    }, 0);
  };

  private pageEvent(kind: 'copy' | 'paste') {
    const t = performance.now();
    this.feelGood({ curiosity: 0.1 });
    this.sayOnce(kind, t, 5000);
  }

  private onVisibility() {
    const t = performance.now();
    if (document.hidden) {
      this.hiddenAt = Date.now();
      return;
    }
    if (this.hiddenAt && Date.now() - this.hiddenAt > 15000) {
      this.wakeUp(t);
      this.startSpin(t);
      this.override = { state: 'happy', expression: 'happy', until: t + 1500 };
      this.feelGood({ social: 0.2 });
      this.say(pick(LINES.back));
    }
    this.hiddenAt = 0;
  }

  private onKey = (e: KeyboardEvent) => {
    this.activity();
    if (this.workEl && e.target instanceof Node && this.workEl.contains(e.target)) this.lastTypeAt = performance.now();
  };

  private onInput = (e: Event) => {
    if (this.workEl && e.target instanceof Node && this.workEl.contains(e.target)) this.lastTypeAt = performance.now();
  };

  private onScroll = () => {
    this.dirty = true;
    this.activity();
  };

  private onResize = () => {
    this.dirty = true;
  };

  private onFocusIn = (e: FocusEvent) => {
    if (!this.opts.reactToTyping) return;
    const t = e.target;
    if (!isTypable(t) || this.els.layer.contains(t) || t.closest('[data-pet-ignore]')) return;
    this.workEl = t;
    this.workRetryAt = 0;
    this.ensureSurface(t);
    const now = performance.now();
    this.wakeUp(now);
    this.endActivity(now);
  };

  private onFocusOut = (e: FocusEvent) => {
    if (e.target !== this.workEl) return;
    this.workEl = null;
    if (this.action.name === 'typing' || this.action.name === 'watch') this.setAction('idle', performance.now() + 900);
  };

  private onClick = (e: MouseEvent) => {
    if (!(e.target instanceof Element) || this.els.layer.contains(e.target)) return;
    const t = e.target.closest<HTMLElement>('[data-pet-say], [data-pet-react], [data-pet-prop], [data-pet-act]');
    if (!t) {
      this.noticeClick(e);
      return;
    }
    const reaction = t.dataset.petReact as PetReaction | undefined;
    const text = t.dataset.petSay;
    const prop = t.dataset.petProp as PetProp | undefined;
    const activity = t.dataset.petAct as PetActivity | undefined;
    if (prop && PET_PROPS.includes(prop)) {
      this.recentProps = [prop, ...this.recentProps.filter((p) => p !== prop)].slice(0, 4);
      this.act('show', prop, text);
    }
    else if (activity && ACTIVITIES.includes(activity)) this.act(activity, undefined, text);
    else if (reaction && reaction in REACTIONS) this.react(reaction, text);
    else if (text) this.say(text);
  };

  /** Zwykłe kliknięcie w panelu: maskotka patrzy, komentuje i zapamiętuje marki, o których była mowa. */
  private noticeClick(e: MouseEvent) {
    const target = e.target instanceof Element ? e.target.closest<HTMLElement>('button, a, [role="button"], summary, label') : null;
    const t = performance.now();
    this.attention = { x: e.clientX, y: e.clientY, until: t + 1600 };
    this.feelGood({ curiosity: 0.12, social: 0.03 });
    if (!target) return;
    const label = (target.getAttribute('aria-label') || target.textContent || '').replace(/\s+/g, ' ').trim();
    const brand = BRAND_WORDS.find(([re]) => re.test(label))?.[1];
    if (brand) {
      this.recentProps = [brand, ...this.recentProps.filter((p) => p !== brand)].slice(0, 4);
      if (Math.random() < 0.45 && this.mode.kind === 'ground' && !this.isActivity()) {
        window.setTimeout(() => this.act('show', brand), 500);
        return;
      }
    }
    if (label && label.length <= 28 && Math.random() < 0.2 && t - (this.saidAt.get('click') ?? -1e9) > 9000) {
      this.saidAt.set('click', t);
      this.say(pick([`Klik w „${label}” 👀`, `O, „${label}”!`, `Co robi „${label}”? 🤔`]));
    }
  }

  private onError = (e: ErrorEvent) => {
    if (!this.opts.reactToErrors) return;
    const msg = e.message || '';
    if (msg.includes('ResizeObserver')) return;
    this.react('error', `Ups! Błąd na stronie:\n${msg.slice(0, 70)}`);
  };

  private onRejection = (e: PromiseRejectionEvent) => {
    if (!this.opts.reactToErrors) return;
    const reason = e.reason instanceof Error ? e.reason.message : String(e.reason ?? '');
    this.react('error', `Ups! Coś nie wyszło:\n${reason.slice(0, 70)}`);
  };

  private onCommand = (e: Event) => {
    const cmd = (e as CustomEvent<PetCommand>).detail;
    if (!cmd || typeof cmd !== 'object') return;
    const now = performance.now();
    switch (cmd.type) {
      case 'say':
        this.say(cmd.text, cmd.ms);
        break;
      case 'react':
        this.react(cmd.reaction, cmd.text);
        break;
      case 'goTo':
        this.goTo(cmd.target, cmd.text);
        break;
      case 'act':
        this.act(cmd.activity, cmd.prop, cmd.text, cmd.ms);
        break;
      case 'jump': {
        this.wakeUp(now);
        const t = this.pickTarget();
        if (t) this.jumpTo(t, now);
        break;
      }
      case 'sleep':
        this.forcedSleep = true;
        this.lastActivity = -1e9;
        this.override = null;
        this.endActivity(now);
        if (this.mode.kind === 'ground' && !this.isUpright()) this.drop();
        break;
      case 'wake':
        this.wakeUp(now);
        break;
      case 'work': {
        const el = this.resolve(cmd.target);
        this.workEl = el instanceof HTMLElement ? el : null;
        this.workRetryAt = 0;
        this.lastTypeAt = now;
        break;
      }
    }
  };

  // ───────────────────────── łapanie myszką ─────────────────────────

  private onPetDown = (e: PointerEvent) => {
    if (e.pointerType === 'mouse' && e.button !== 0) return;
    e.preventDefault();
    try {
      this.els.pet.setPointerCapture(e.pointerId);
    } catch {
      // np. syntetyczne zdarzenie bez aktywnego wskaźnika
    }
    this.press = { id: e.pointerId, x: e.clientX, y: e.clientY, dragging: false };
  };

  private onPetMove = (e: PointerEvent) => {
    const p = this.press;
    if (!p || p.id !== e.pointerId) return;
    const now = performance.now();
    if (!p.dragging) {
      if (Math.hypot(e.clientX - p.x, e.clientY - p.y) < 6) return;
      p.dragging = true;
      this.startDrag(e, now);
    }
    const m = this.mode;
    if (m.kind !== 'drag') return;
    const dt = Math.max(0.001, (now - m.lastT) / 1000);
    m.vx = m.vx * 0.6 + ((e.clientX - m.lastX) / dt) * 0.4;
    m.vy = m.vy * 0.6 + ((e.clientY - m.lastY) / dt) * 0.4;
    m.lastX = e.clientX;
    m.lastY = e.clientY;
    m.lastT = now;
    this.cx = e.clientX + m.offX;
    this.cy = e.clientY + m.offY;
  };

  private startDrag(e: PointerEvent, now: number) {
    if (this.action.name === 'sleep') this.say('Hej! Tu się śpi! 😾');
    else if (Math.random() < 0.4) this.say(pick(LINES.drag));
    this.forcedSleep = false;
    this.lastActivity = now;
    this.launch = null;
    this.impact = null;
    this.trip = null;
    this.tripAtEdge = false;
    this.pendingGoto = null;
    this.override = null;
    this.setAction('idle', now + 1000);
    this.mode = {
      kind: 'drag',
      offX: this.cx - e.clientX,
      offY: this.cy - e.clientY,
      lastX: e.clientX,
      lastY: e.clientY,
      lastT: now,
      vx: 0,
      vy: 0,
      since: now,
    };
  }

  private endPress(e: PointerEvent, cancelled: boolean) {
    const p = this.press;
    if (!p || p.id !== e.pointerId) return;
    this.press = null;
    try {
      this.els.pet.releasePointerCapture(e.pointerId);
    } catch {
      // wskaźnik już zwolniony
    }
    const now = performance.now();
    if (!p.dragging) {
      if (!cancelled) this.poke(now, e.clientX, e.clientY);
      return;
    }
    const m = this.mode;
    if (m.kind !== 'drag') return;
    const stale = cancelled || now - m.lastT > 90;
    const vx = stale ? 0 : clamp(m.vx, -2400, 2400);
    const vy = stale ? 0 : clamp(m.vy, -2400, 2400);
    this.mode = this.air(vx, vy);
    if (Math.hypot(vx, vy) > 1300) this.say(pick(LINES.thrown));
  }

  private onPetUp = (e: PointerEvent) => this.endPress(e, false);
  private onPetCancel = (e: PointerEvent) => this.endPress(e, true);

  /** Kliknięcie w maskotkę – reakcja zależy od miejsca. */
  private poke(now: number, px: number, py: number) {
    this.lastActivity = now;
    this.pokes = this.pokes.filter((t) => now - t < 2500);
    this.pokes.push(now);
    if (this.action.name === 'sleep') {
      this.wakeUp(now);
      this.say('Mmm… jeszcze 5 minut 😴');
      return;
    }
    this.forcedSleep = false;
    if (this.pokes.length >= 4) {
      this.pokes = [];
      this.override = { state: 'idle', expression: 'annoyed', until: now + 2000 };
      this.say('Ej! Przestań mnie klikać 😤');
      return;
    }
    const m = this.mode;
    if (m.kind !== 'ground' || this.launch || this.trip) return;
    if (!this.isUpright()) {
      this.drop(true);
      this.say('Aaa! 😱');
      return;
    }
    this.endActivity(now);
    const zone = this.zoneAt(px, py);
    if (zone === 'head') {
      this.override = { state: 'bonk', expression: 'dizzy', until: now + 900 };
      this.say(pick(LINES.head));
    } else if (zone === 'ear-l' || zone === 'ear-r') {
      this.override = { state: zone === 'ear-l' ? 'twitch-l' : 'twitch-r', expression: 'annoyed', until: now + 700 };
      this.say(pick(LINES.ear));
    } else if (zone === 'belly') {
      this.override = { state: 'giggle', expression: 'excited', until: now + 1300 };
      this.say(pick(LINES.belly));
    } else {
      const vy = -560 * Math.sqrt(this.k);
      this.override = null;
      this.impact = null;
      this.mode = this.air(0, vy, { target: m.surface, tLand: (-2 * vy) / GRAVITY });
      this.say(zone === 'feet' ? pick(LINES.feet) : pick(LINES.poke));
    }
  }
}
