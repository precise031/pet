import { resolveLine } from './messages';
import { RELEASE_AT, REST, TRICK_MS, applyPose, bindJoints, blendMs, clipForVisual, fullPose, mixPose, type Clip, type Joints, type Pose } from './poses';
import { ENTITY_KIND, PROP_TRICKS, placeFor } from './props';
import { RuleRunner, labelOf } from './rules';
import {
  PET_EVENT,
  PET_PROPS,
  type PetActivity,
  type PetCommand,
  type PetEntity,
  type PetExpression,
  type PetLineContext,
  type PetMessageKey,
  type PetMood,
  type PetOptions,
  type PetPose,
  type PetProp,
  type PetReaction,
  type PetRule,
  type PetRuleContext,
  type PetState,
  type PetStep,
  type PetTarget,
  type PetTouchZone,
  type PetTrick,
  type PetVisual,
} from './types';

const GRAVITY = 2400; // px/s²
const MAX_FALL = 2600;
const WALK_SPEED = 46; // px/s przy rozmiarze 72
const RUN_SPEED = 140;
const HARD_LANDING = 1500;
const VIEW_W = 160; // viewBox grafiki (PetSvg)
const VIEW_H = 190;
const FISH_MS = 8000; // musi się zgadzać z animacją wędki w pet.css

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
  startY: number;
  float: boolean; // szybuje na parasolu
  floatChecked: boolean;
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
  | 'sitEdge'
  | 'look'
  | 'lie'
  | 'sleep'
  | 'roll'
  | 'wake'
  | 'stretch'
  | 'wave'
  | 'point'
  | 'typing'
  | 'watch'
  | 'hack'
  | 'fish'
  | 'play'
  | 'cool'
  | 'turnback'
  | 'approach'
  | 'chase';

interface Action {
  name: ActionName;
  start: number;
  until: number;
  prop?: PetProp;
  trick?: PetTrick;
  text?: string;
  said?: boolean;
  targetX?: number;
  entity?: number;
  released?: boolean;
  kicks?: number;
  /** pościg: stoi przy krawędzi i patrzy, aż piłka wyląduje */
  hold?: boolean;
}

interface EntityState {
  id: number;
  prop: PetProp;
  kind: 'ball' | 'plane';
  x: number;
  y: number;
  vx: number;
  vy: number;
  rot: number;
  r: number;
  born: number;
  on: Surface | null;
  dieAt: number;
  el?: HTMLElement | null;
}

type Zone = 'ear-l' | 'ear-r' | 'head' | 'belly' | 'feet';

interface Point {
  x: number;
  y: number;
  nx: number;
  ny: number;
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
];

const REACTIONS: Record<PetReaction, [PetState, PetExpression, number]> = {
  success: ['success', 'happy', 1900],
  error: ['error', 'angry', 2600],
  confused: ['confused', 'confused', 2400],
  happy: ['happy', 'happy', 1500],
  sad: ['sad', 'sad', 2600],
};

const TRICK_FACE: Partial<Record<PetTrick, PetExpression>> = {
  tap: 'curious',
  read: 'curious',
  inspect: 'curious',
  hide: 'curious',
  call: 'happy',
  selfie: 'wink',
  hug: 'love',
  sip: 'content',
  blow: 'content',
  'sit-on': 'content',
  float: 'content',
  type: 'focused',
  chase: 'excited',
  kick: 'excited',
  throw: 'excited',
  ride: 'excited',
  kickflip: 'excited',
  dance: 'happy',
};

const NON_TEXT_INPUTS = new Set(['checkbox', 'radio', 'range', 'button', 'submit', 'reset', 'color', 'file', 'image', 'hidden']);

const pick = <T>(list: readonly T[]): T => list[Math.floor(Math.random() * list.length)];
const clamp = (v: number, a: number, b: number) => Math.max(a, Math.min(b, v));
const rand = (a: number, b: number) => a + Math.random() * (b - a);
const smooth = (x: number) => x * x * (3 - 2 * x);
const wait = (ms: number) => new Promise<void>((r) => window.setTimeout(r, ms));

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

export interface PetCallbacks {
  onVisual: (v: PetVisual) => void;
  onEntities: (list: PetEntity[]) => void;
}

/**
 * Cały „mózg”, fizyka i animacja maskotki. Niezależne od Reacta: dostaje elementy DOM,
 * co klatkę liczy pozę i ustawia transformacje, a zmianę miny/rekwizytu zgłasza przez callback.
 */
export class PetController {
  private opts: PetOptions;
  private cx = 0; // środek maskotki (px, względem okna)
  private cy = 0;
  private angle = 0; // obrót w stopniach (0 = stoi prosto)
  private nx = 0; // normalna krawędzi, na której stoi
  private ny = -1;
  private dir: 1 | -1 = 1;
  private yaw = 0; // obrót wokół osi pionowej (°)
  private yawVel = 0;
  private spin: { start: number; from: number; sign: 1 | -1 } | null = null;
  private speedNow = 0; // wygładzona prędkość marszu
  private leanNow = 0;
  private rollDeg = 0;
  private lieSide: 1 | -1 = 1;
  private pointSide: 1 | -1 = 1;
  private mode: Mode;
  private action: Action = { name: 'idle', start: 0, until: 0 };
  private impact: { state: 'land' | 'splat' | 'recover'; until: number } | null = null;
  private override: { state: PetState; expression: PetExpression; until: number } | null = null;
  private emote: { expression: PetExpression; until: number } | null = null;
  private launch: { vx: number; vy: number; target: Surface; T: number; from: Surface | null; at: number } | null = null;
  private trip: { until: number; force: boolean } | null = null;
  private tripAtEdge = false;
  private pendingGoto: Surface | null = null;
  private pendingPlay: (() => void) | null = null;
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
  private lastActivityAt = 0;
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
  private visual: PetVisual = { state: 'fall', expression: 'surprised', prop: null, trick: null };
  private blink: { start: number; expression: PetExpression; swapped: boolean } | null = null;
  private anim = { key: '', start: 0, blendStart: -1e9, blendDur: 200, from: REST as Pose, last: REST as Pose };
  private joints: Joints = { tails: [], armL: [], armR: [], legL: [], legR: [], earL: [], earR: [] };
  private jointCache = new WeakMap<Element, string>();
  private domDirty = true;
  private eyeX = 0;
  private eyeY = 0;
  private mood: PetMood = { energy: 0.85, fun: 0.55, social: 0.5, curiosity: 0.5 };
  private attention: { x: number; y: number; until: number; entity?: number } | null = null;
  private recentProps: PetProp[] = [];
  private shakeFlips: number[] = [];
  private lastPointerDx = 0;
  private hiddenAt = 0;
  private entities: EntityState[] = [];
  private entityId = 0;
  private rules: RuleRunner;
  private seqToken = 0;
  private scripted = 0;
  private greeted = false;
  private shown = false;
  private reducedMotion = false;
  private styleKey = '';
  private disposers: Array<() => void> = [];

  constructor(
    private readonly els: PetElements,
    opts: PetOptions,
    private readonly cb: PetCallbacks,
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
    this.rules = new RuleRunner({
      run: (rule, ctx) => this.runRule(rule, ctx),
      isInsidePet: (el) => this.els.layer.contains(el),
      mood: () => this.mood,
      lastActivity: () => this.lastActivityAt,
    });
    this.rules.set('options', opts.rules);
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
    this.lastActivityAt = performance.now();
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
    window.addEventListener(PET_EVENT, this.onCommand);
    this.disposers.push(() => window.removeEventListener(PET_EVENT, this.onCommand));
    const onVis = () => this.onVisibility();
    document.addEventListener('visibilitychange', onVis);
    this.disposers.push(() => document.removeEventListener('visibilitychange', onVis));

    const p = this.els.pet;
    const petOn = <K extends keyof HTMLElementEventMap>(type: K, fn: (e: HTMLElementEventMap[K]) => void) => {
      p.addEventListener(type, fn);
      this.disposers.push(() => p.removeEventListener(type, fn));
    };
    petOn('pointerdown', this.onPetDown);
    petOn('pointermove', this.onPetMove);
    petOn('pointerup', this.onPetUp);
    petOn('pointercancel', this.onPetCancel);
    petOn('pointerover', (e) => {
      if (e.pointerType === 'mouse') this.hovered = true;
    });
    petOn('pointerout', () => {
      this.hovered = false;
    });
    petOn('dblclick', () => {
      const t = performance.now();
      this.startSpin(t);
      this.override = { state: 'happy', expression: 'excited', until: t + 900 };
      this.speakOnce('spin', 4000);
    });

    const observer = new MutationObserver((muts) => {
      for (const m of muts) {
        if (!this.els.layer.contains(m.target)) {
          this.dirty = true;
          this.rules.markDom();
          return;
        }
      }
    });
    observer.observe(document.body, { childList: true, subtree: true });
    this.disposers.push(() => observer.disconnect());

    this.rules.start();
    this.raf = requestAnimationFrame(this.tick);
  }

  destroy() {
    cancelAnimationFrame(this.raf);
    this.seqToken++;
    this.rules.destroy();
    for (const d of this.disposers) d();
    this.disposers = [];
  }

  setOptions(opts: PetOptions) {
    const rulesChanged = opts.rules !== this.opts.rules;
    this.opts = opts;
    this.dirty = true;
    this.styleKey = '';
    if (rulesChanged) this.rules.set('options', opts.rules);
    if (!opts.reactToTyping) this.workEl = null;
    if (!opts.speech) this.hideBubble();
  }

  /** React wyrenderował nowe SVG – trzeba na nowo znaleźć stawy. */
  markDom() {
    this.domDirty = true;
  }

  // ───────────────────────── teksty ─────────────────────────

  private lineCtx(extra: Partial<PetLineContext> = {}): PetLineContext {
    return { hour: new Date().getHours(), mood: { ...this.mood }, ...extra };
  }

  /** Mówi tekst z konfiguracji (opts.messages). Bez skonfigurowanego tekstu – milczy. */
  private speak(key: PetMessageKey, extra?: Partial<PetLineContext>) {
    const text = resolveLine(this.opts.messages[key], this.lineCtx(extra));
    if (text) this.say(text);
  }

  private speakOnce(key: PetMessageKey, gap = 5000, extra?: Partial<PetLineContext>) {
    const t = performance.now();
    if (t - (this.saidAt.get(key) ?? -1e9) < gap) return;
    this.saidAt.set(key, t);
    this.speak(key, extra);
  }

  private speakProp(prop: PetProp, trick?: PetTrick) {
    const text = resolveLine(this.opts.messages.props?.[prop], this.lineCtx({ prop, trick }));
    if (text) this.say(text);
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
    if (text) this.say(text);
    else if (text !== '') this.speak(kind);
  }

  goTo(target: PetTarget, text?: string) {
    const el = this.resolve(target);
    if (!el) return;
    const now = performance.now();
    this.wakeUp(now);
    const r = el.getBoundingClientRect();
    if (r.top < this.H * 0.6 || r.top > innerHeight - 4 || r.right < 0 || r.left > innerWidth) {
      this.speak('unreachable');
      return;
    }
    const s = this.ensureSurface(el);
    if (text) this.say(text);
    if (this.mode.kind === 'ground' && this.mode.surface === s) return;
    this.endActivity(now);
    this.jumpTo(s, now);
  }

  /** Zabawa rekwizytem. Bez `trick` – maskotka sama wybiera jeden z trików tego rekwizytu. */
  play(prop: PetProp, trick?: PetTrick, o: { text?: string; ms?: number; say?: string } = {}) {
    if (!PROP_TRICKS[prop]) return;
    const now = performance.now();
    if (this.action.name === 'sleep' || this.forcedSleep) this.wakeUp(now);
    this.override = null;
    const tricks = PROP_TRICKS[prop];
    const tr = trick && tricks.includes(trick) ? trick : this.pickTrick(prop);
    if (!this.readyToAct()) {
      this.pendingPlay = () => this.play(prop, tr, o);
      if (this.mode.kind === 'ground' && !this.isUpright()) this.drop();
      return;
    }
    const m = this.mode as GroundMode;
    if ((tr === 'ride' || tr === 'carry') && m.surface.kind === 'top') {
      const [a, b] = this.topRange(m.surface);
      this.dir = b - m.s > m.s - a ? 1 : -1;
    }
    // kopie / rzuca tam, gdzie jest więcej miejsca na ekranie
    if (tr === 'kick' || tr === 'throw') this.dir = innerWidth - this.cx > this.cx ? 1 : -1;
    const dur = o.ms ?? TRICK_MS[tr] ?? rand(4400, 5600);
    this.setAction('play', now + dur, { prop, trick: tr, text: o.text, kicks: 0 });
    this.recentProps = [prop, ...this.recentProps.filter((p) => p !== prop)].slice(0, 5);
    this.feelGood({ fun: 0.2 });
    if (o.say) this.say(o.say);
    else if (o.say !== '') this.speakProp(prop, tr);
  }

  /** Poza / ruch na zlecenie: pet.pose('roll'). */
  pose(name: PetPose, ms?: number) {
    const now = performance.now();
    if (name !== 'sleep') this.wakeUp(now);
    if (name === 'spin') {
      this.startSpin(now);
      this.speakOnce('spin', 4000);
      return;
    }
    if (!this.readyToAct()) {
      this.pendingPlay = () => this.pose(name, ms);
      if (this.mode.kind === 'ground' && !this.isUpright()) this.drop();
      return;
    }
    const d = (a: number, b: number) => now + (ms ?? rand(a, b));
    switch (name) {
      case 'idle':
        this.setAction('idle', d(2000, 3000));
        break;
      case 'walk':
        this.setAction('walk', d(3000, 5000));
        break;
      case 'run':
        this.setAction('run', d(1500, 2500));
        break;
      case 'sit':
        this.setAction('sit', d(4000, 7000));
        break;
      case 'sitEdge':
        this.setAction((this.mode as GroundMode).surface.el ? 'sitEdge' : 'sit', d(5000, 9000));
        break;
      case 'lie':
        this.lieSide = Math.random() < 0.5 ? 1 : -1;
        this.setAction('lie', d(5000, 9000));
        this.speakOnce('lie', 20000);
        break;
      case 'sleep':
        this.lieSide = Math.random() < 0.5 ? 1 : -1;
        this.setAction('sleep', ms ? now + ms : Infinity);
        break;
      case 'roll':
        this.setAction('roll', d(2200, 3600));
        this.speakOnce('roll', 15000);
        break;
      case 'stretch':
        this.setAction('stretch', now + (ms ?? 1500));
        this.speakOnce('stretch', 20000);
        break;
      case 'dance':
        this.play('headphones', 'dance', { ms });
        break;
      case 'wave':
        this.setAction('wave', d(1600, 2200));
        break;
      case 'point':
        this.setAction('point', d(1600, 2400));
        break;
      case 'turnBack':
        this.setAction('turnback', d(2200, 3600));
        break;
      case 'look':
        this.setAction('look', d(1600, 3000));
        break;
      case 'cool':
        this.setAction('cool', d(2400, 2800));
        break;
    }
  }

  /** Chwilowa mina (nie zmienia tego, co maskotka robi). */
  emoteFor(expression: PetExpression, ms = 1600) {
    this.emote = { expression, until: performance.now() + ms };
  }

  /** Popatrz na element / kursor. */
  lookAt(target: PetTarget | 'cursor', ms = 1600) {
    const now = performance.now();
    if (target === 'cursor') {
      if (this.pointer) this.attention = { ...this.pointer, until: now + ms };
      return;
    }
    const el = this.resolve(target);
    if (!el) return;
    const r = el.getBoundingClientRect();
    this.attention = { x: r.left + r.width / 2, y: r.top + r.height / 2, until: now + ms };
  }

  /** Starsze skróty: kawa, hakowanie, wędka, okulary, potknięcie, pokazanie rekwizytu. */
  act(activity: PetActivity, prop?: PetProp, text?: string, ms?: number) {
    const now = performance.now();
    if (this.action.name === 'sleep' || this.forcedSleep) this.wakeUp(now);
    this.override = null;
    if (activity === 'show') {
      this.play(prop ?? this.pickProp(), undefined, { say: text, ms });
      return;
    }
    if (activity === 'coffee') {
      this.play('coffee', undefined, { say: text, ms });
      return;
    }
    if (!this.readyToAct()) {
      this.pendingPlay = () => this.act(activity, prop, text, ms);
      if (this.mode.kind === 'ground' && !this.isUpright()) this.drop();
      return;
    }
    const m = this.mode as GroundMode;
    if (activity === 'trip') {
      const sf = m.surface;
      if (!sf.el) {
        this.startTrip(now, false);
        return;
      }
      const [a, b] = sf.kind === 'top' ? this.topRange(sf) : [0, Math.max(0, sf.rect.width - 2 * sf.radius)];
      this.dir = b - m.s < m.s - a ? 1 : -1;
      this.tripAtEdge = true;
      this.setAction('run', now + 8000);
      return;
    }
    if (activity === 'fish' && !m.surface.el) {
      const t = this.pickTarget(true);
      if (!t) {
        this.speak('noFish');
        return;
      }
      this.pendingPlay = () => this.act('fish', prop, text, ms);
      this.jumpTo(t, now);
      return;
    }
    const durations: Record<'hack' | 'fish' | 'cool', number> = { hack: rand(6000, 9000), fish: FISH_MS + 600, cool: 2600 };
    const name = activity as 'hack' | 'fish' | 'cool';
    this.setAction(name, now + (ms ?? durations[name]));
    if (activity === 'fish') this.feelGood({ fun: 0.2 });
    if (text) this.say(text);
    else if (text !== '') this.speak(name);
  }

  stopAll() {
    this.seqToken++;
    this.scripted = 0;
    this.emote = null;
    this.override = null;
    this.endActivity(performance.now());
  }

  // ───────────────────────── sekwencje i reguły ─────────────────────────

  private runRule(rule: PetRule, ctx: PetRuleContext) {
    const interrupt = rule.interrupt !== false;
    if (!interrupt && this.scripted) return;
    if (typeof rule.do === 'function') {
      try {
        const out = rule.do(ctx);
        if (Array.isArray(out)) void this.runSteps(out, ctx, interrupt);
      } catch (err) {
        console.error('[pet] reguła rzuciła wyjątek', err);
      }
      return;
    }
    void this.runSteps(Array.isArray(rule.do) ? rule.do : [rule.do], ctx, interrupt);
  }

  /** Wykonuje kroki po kolei. Nowa sekwencja (albo złapanie maskotki) przerywa poprzednią. */
  async runSteps(steps: PetStep[], ctx: PetRuleContext = { trigger: 'event' }, interrupt = true) {
    if (!interrupt && this.scripted) return;
    const token = ++this.seqToken;
    this.scripted = token;
    try {
      for (const step of steps) {
        if (this.seqToken !== token) return;
        await this.runStep(step, ctx, token);
      }
    } catch (err) {
      console.error('[pet] krok sekwencji się nie udał', err);
    } finally {
      if (this.scripted === token) this.scripted = 0;
    }
  }

  private async waitFor(test: () => boolean, timeout: number, token: number) {
    const end = performance.now() + timeout;
    while (performance.now() < end && this.seqToken === token && !test()) await wait(80);
  }

  private async waitAction(token: number) {
    await wait(50);
    const a = this.action;
    await this.waitFor(() => this.action !== a && !this.launch && this.mode.kind === 'ground', 30000, token);
  }

  private targetOf(t: PetTarget | 'target' | 'cursor', ctx: PetRuleContext): Element | null {
    if (t === 'target') return ctx.target ?? null;
    if (t === 'cursor') return null;
    return this.resolve(t);
  }

  private async runStep(step: PetStep, ctx: PetRuleContext, token: number) {
    const lctx = this.lineCtx({ text: ctx.text, label: labelOf(ctx.target), element: ctx.target });
    if ('say' in step && !('play' in step) && !('react' in step) && !('act' in step) && !('pose' in step) && !('goTo' in step)) {
      const text = resolveLine(step.say, lctx);
      if (text) this.say(text, step.ms);
      if (step.ms) await wait(step.ms);
      return;
    }
    if ('react' in step) {
      this.react(step.react, step.say);
      await wait(REACTIONS[step.react][2]);
      return;
    }
    if ('play' in step) {
      this.play(step.play, step.trick, { text: step.text, ms: step.ms, say: step.say });
      await this.waitAction(token);
      return;
    }
    if ('act' in step) {
      this.act(step.act, undefined, step.say, step.ms);
      await this.waitAction(token);
      return;
    }
    if ('pose' in step) {
      if (step.say) this.say(step.say);
      this.pose(step.pose, step.ms);
      if (step.pose === 'spin') await wait(950);
      else await this.waitAction(token);
      return;
    }
    if ('emote' in step) {
      this.emoteFor(step.emote, step.ms ?? 1600);
      await wait(step.ms ?? 1600);
      return;
    }
    if ('goTo' in step) {
      const el = this.targetOf(step.goTo, ctx);
      if (!el) return;
      this.goTo(el, step.say);
      await wait(100);
      await this.waitFor(() => this.mode.kind === 'ground' && !this.launch && (this.mode.surface.el === el || !this.pendingGoto), 6000, token);
      return;
    }
    if ('look' in step) {
      if (step.look === 'cursor') this.lookAt('cursor', step.ms ?? 1600);
      else {
        const el = this.targetOf(step.look, ctx);
        if (el) this.lookAt(el, step.ms ?? 1600);
      }
      await wait(step.ms ?? 1600);
      return;
    }
    if ('wait' in step) {
      await wait(step.wait);
      return;
    }
    if ('emit' in step) {
      this.emit(step.emit, step.detail);
      return;
    }
    if ('run' in step) {
      await step.run(ctx);
    }
  }

  private emit(name: string, detail?: unknown) {
    this.rules.fire('event', { text: name, detail }, (t) => t.name === name);
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
    this.stepEntities(dt, t);
    this.rules.tick(t);
    this.render(t, dt);
  };

  private updateMood(dt: number, now: number) {
    const md = this.mood;
    const a = this.action.name;
    const moving = this.speedNow > 5;
    const resting = a === 'sit' || a === 'sitEdge' || a === 'lie' || (a === 'play' && this.action.prop === 'coffee');
    md.energy += dt * (a === 'sleep' ? 0.05 : resting ? 0.025 : moving ? (a === 'run' || a === 'chase' ? -0.012 : -0.004) : -0.0012);
    md.fun += dt * (a === 'play' || a === 'fish' || a === 'cool' || a === 'roll' || this.spin ? 0.035 : -0.005);
    md.social += dt * (now - this.lastActivityAt < 5000 ? 0.002 : -0.0035);
    md.curiosity += dt * -0.007;
    for (const k of ['energy', 'fun', 'social', 'curiosity'] as const) md[k] = clamp(md[k], 0, 1);
  }

  private feelGood(delta: Partial<PetMood>) {
    for (const [k, v] of Object.entries(delta) as Array<[keyof PetMood, number]>) this.mood[k] = clamp(this.mood[k] + v, 0, 1);
  }

  private startSpin(now: number, sign?: 1 | -1) {
    this.spin = { start: now, from: this.yaw, sign: sign ?? (Math.random() < 0.5 ? 1 : -1) };
  }

  private air(vx: number, vy: number, extra: Partial<AirMode> = {}): AirMode {
    return {
      kind: 'air',
      vx,
      vy,
      target: null,
      ignore: null,
      t: 0,
      tLand: 0,
      spin: 0,
      hangUntil: 0,
      startY: this.cy,
      float: false,
      floatChecked: false,
      ...extra,
    };
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
    const act = this.action;

    if (act.name === 'approach' && act.targetX !== undefined) {
      const px = sf.kind === 'top' ? sf.rect.left + m.s : this.cx;
      const dx = act.targetX - px;
      if (Math.abs(dx) < 14 * this.k) {
        this.setAction(Math.random() < 0.5 ? 'wave' : 'look', now + rand(1400, 2200));
        if (Math.random() < 0.5) this.speakOnce('approach', 9000);
      } else this.dir = dx > 0 ? 1 : -1;
    }
    if (act.name === 'chase') this.steerChase(m, act, now);
    if (act.name === 'roll') this.rollDeg += (this.dir * speed * dt * 57.3) / Math.max(8, (57 / VIEW_H) * this.H);

    if (this.tripAtEdge && wanted && this.isUpright()) {
      const [ea, eb] = sf.kind === 'top' ? this.topRange(sf) : [0, Math.max(0, sf.rect.width - 2 * sf.radius)];
      if ((this.dir > 0 ? eb - m.s : m.s - ea) < 26 * this.k) {
        this.tripAtEdge = false;
        this.startTrip(now, true);
        return;
      }
    }
    // czasem się potyka (tylko gdy idzie prosto po górze)
    if (
      wanted &&
      !this.reducedMotion &&
      !this.scripted &&
      (act.name === 'walk' || act.name === 'run') &&
      this.isUpright() &&
      Math.random() < dt * (act.name === 'run' ? 0.04 : 0.01)
    ) {
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
      const prev = m.s;
      m.s = (((m.s + this.dir * speed * dt) % L) + L) % L;
      // nie wychodzimy poza ekran po boku elementu – zawracamy
      const p = perimeterPoint(sf.rect, sf.radius, m.s);
      if (p.ny > -0.98) {
        const c = { x: p.x + (p.nx * this.H) / 2, y: p.y + (p.ny * this.H) / 2 };
        if (c.x - this.H * 0.45 < 0 || c.x + this.H * 0.45 > innerWidth || c.y + this.H * 0.45 > innerHeight) {
          m.s = prev;
          this.dir = this.dir === 1 ? -1 : 1;
        }
      }
      // turla się, jeździ na desce i nosi paczkę tylko po górze
      if ((act.name === 'roll' || (act.name === 'play' && (act.trick === 'ride' || act.trick === 'carry'))) && p.ny > -0.98) {
        m.s = prev;
        this.dir = this.dir === 1 ? -1 : 1;
      }
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

    // długi upadek → otwiera parasol i szybuje
    if (!m.floatChecked && !m.float && !m.spin && !m.target && m.vy > 250 && this.cy - m.startY > this.H * 2.4) {
      m.floatChecked = true;
      if (this.opts.hobbies && this.opts.props.includes('umbrella') && !this.reducedMotion && Math.random() < 0.65) {
        m.float = true;
        this.speakOnce('umbrella', 20000);
      }
    }
    if (m.float) {
      m.vy += (150 * this.k - m.vy) * Math.min(1, dt * 4);
      m.vx *= 1 - dt * 1.5;
      m.vx += Math.sin(now / 500) * 30 * dt;
    } else m.vy = Math.min(MAX_FALL, m.vy + GRAVITY * dt);

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
    // celowy skok kończy się miękko, nawet z wysoka – „plask” tylko przy upadku
    const impact = m.spin ? HARD_LANDING + 1 : m.target ? Math.min(m.vy, HARD_LANDING * 0.9) : m.vy;
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
    this.tripAtEdge = false;
    if (this.action.name !== 'chase') this.setAction('idle', now + rand(500, 1400));
    if (!silent) {
      const hard = vy > HARD_LANDING;
      this.impact = hard ? { state: 'splat', until: now + 1300 } : { state: 'land', until: now + 260 };
      if (s.el) this.bump(s.el);
      if (hard) this.speak('hardLanding');
      else if (!this.greeted) {
        this.greeted = true;
        this.speak('hello');
      }
      this.rules.fire('land', { target: s.el, detail: { hard } }, (t) => t.hard === undefined || t.hard === hard);
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
    if (this.isBusyAction()) this.setAction('idle', 0);
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
    const a = this.action;
    if (!m.surface.el || this.workEl || this.reducedMotion || a.name === 'chase' || a.name === 'approach' || this.scripted) {
      flip();
      return;
    }
    if (a.name === 'play') {
      // jazda na desce / noszenie paczki – zawraca; deskorolka czasem robi kickflipa
      flip();
      if (a.trick === 'ride' && Math.random() < 0.3) this.play('skateboard', 'kickflip', { ms: 1700, say: '' });
      return;
    }
    if (a.name === 'roll') {
      if (Math.random() < 0.5) flip();
      else this.drop(false, this.dir * 120 * this.k, -150);
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
    this.speak('oops');
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
      if (force) this.dir = b - m.s < m.s - a ? 1 : -1;
      toEdge = this.dir > 0 ? b - m.s : m.s - a;
    }
    if (toEdge < 70 * this.k || (force && toEdge < Infinity)) {
      const vx = Math.max(140 * this.k, (toEdge + this.W * 0.5) / 0.5);
      this.drop(false, this.dir * vx, -220, { spin: this.dir * 620 });
      this.speak('tumble');
    } else {
      this.impact = { state: 'splat', until: now + 1300 };
      this.speak('trip');
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
    if (this.isBusyAction() && this.action.name !== 'chase') this.setAction('idle', 0);
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
    return this.weighted(cands);
  }

  private weighted<T>(cands: Array<[T, number]>): T | null {
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

  private readyToAct() {
    return this.mode.kind === 'ground' && this.isUpright() && !this.launch && !this.trip;
  }

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
    if (this.pendingPlay && this.isUpright()) {
      const p = this.pendingPlay;
      this.pendingPlay = null;
      p();
      return;
    }
    const a = this.action;
    if (a.name === 'sleep') return;
    if (a.name === 'fish' && !a.said && now - a.start > FISH_MS * 0.74) {
      a.said = true;
      this.speak('caught');
    }
    if (a.name === 'play' && a.trick && !a.released && RELEASE_AT[a.trick] !== undefined && (now - a.start) / 1000 >= RELEASE_AT[a.trick]!) {
      a.released = true;
      this.release(a, now);
    }
    if (this.workEl && !this.scripted) return this.doWork(m, now);
    if (
      this.opts.sleepAfterMs > 0 &&
      !this.isBusyAction() &&
      !this.scripted &&
      a.name !== 'wake' &&
      this.isUpright() &&
      now - this.lastActivityAt > this.opts.sleepAfterMs
    ) {
      this.lieSide = Math.random() < 0.5 ? 1 : -1;
      this.setAction('sleep', Infinity);
      return;
    }
    if (now < a.until) return;
    if (this.scripted) {
      // w trakcie sekwencji czekamy spokojnie na kolejny krok
      if (a.name !== 'idle') this.setAction('idle', now + 300);
      return;
    }
    this.decide(m, now);
  }

  /**
   * „Mózg”: wybiera kolejną czynność z wagami zależnymi od nastroju i tego, co dzieje się na stronie.
   * Zmęczona – siada, kładzie się, pije kawę; znudzona – bawi się rekwizytami, turla, łowi;
   * stęskniona – podchodzi do kursora i macha; ciekawska – ogląda tabele i wykresy przez lupę.
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
    const roomy = !onElement || m.surface.kind === 'perimeter' || m.surface.rect.width > this.W * 3;
    const hobbies = this.opts.hobbies && !this.reducedMotion;
    const has = (p: PetProp) => this.opts.props.includes(p);
    const canFish = onElement && m.surface.rect.bottom < innerHeight - 40 && m.surface.rect.top > this.H;
    const pointerX = this.pointerOnLevel();
    const interest = hobbies && has('magnifier') ? this.pickInterest() : null;

    if (md.energy < 0.2) this.speakOnce('tired', 40000);
    else if (md.fun < 0.15) this.speakOnce('bored', 40000);
    else if (md.social < 0.12) this.speakOnce('lonely', 50000);

    const choices: Array<[() => void, number]> = [
      [
        () => {
          if (Math.random() < 0.35) this.dir = this.dir === 1 ? -1 : 1;
          this.setAction('walk', now + rand(2000, 6000));
        },
        0.2 + 0.9 * md.energy,
      ],
      [() => this.setAction('run', now + rand(1200, 2600)), roomy && !this.reducedMotion ? 0.45 * md.energy * (0.4 + md.fun) : 0],
      [() => this.setAction('idle', now + rand(1800, 3800)), 0.35],
      [() => this.setAction('look', now + rand(1600, 3000)), 0.2 + 0.5 * md.curiosity],
      [() => this.setAction('sit', now + rand(3500, 8000)), 0.15 + 0.6 * (1 - md.energy)],
      [() => this.pose('sitEdge'), onElement ? 0.15 + 0.5 * (1 - md.energy) : 0],
      [() => this.pose('lie'), 0.08 + 0.6 * (1 - md.energy)],
      [() => this.pose('roll'), hobbies && roomy ? 0.08 + 0.4 * md.fun : 0],
      [() => this.pose('stretch'), 0.05 + 0.25 * (1 - md.energy)],
      [() => this.pose('turnBack'), 0.06 + 0.35 * md.curiosity],
      [() => this.play(this.pickProp()), hobbies ? 0.4 + 1.4 * (1 - md.fun) : 0],
      [() => this.play('coffee'), hobbies && has('coffee') ? 0.1 + 1.1 * (1 - md.energy) : 0],
      [() => this.act('hack'), hobbies && has('laptop') ? 0.08 + 0.45 * md.curiosity : 0],
      [() => this.act('fish'), hobbies && canFish ? 0.12 + 0.7 * (1 - md.fun) : 0],
      [() => interest && this.inspect(interest), interest ? 0.15 + 0.9 * md.curiosity : 0],
      [() => this.act('cool'), hobbies ? 0.05 + 0.25 * md.social : 0],
      [
        () => {
          this.startSpin(now);
          this.speakOnce('spin', 15000);
          this.setAction('idle', now + 1400);
        },
        hobbies ? 0.05 + 0.25 * md.fun : 0,
      ],
      [() => this.setAction('approach', now + 7000, { targetX: pointerX ?? undefined }), pointerX !== null ? 0.15 + 1.1 * md.social : 0],
      [
        () => {
          const t = this.pickTarget();
          if (t) this.jumpTo(t, now);
          else this.setAction('walk', now + rand(2000, 4000));
        },
        !this.reducedMotion ? 0.3 + 0.6 * md.energy : 0,
      ],
    ];
    const choice = this.weighted(choices);
    if (choice) choice();
    else this.setAction('idle', now + 2000);
  }

  /** Rekwizyt do zabawy – częściej te, których użytkownik ostatnio używał. */
  private pickProp(): PetProp {
    const allowed = this.opts.props.filter((p) => p !== 'coffee' && p !== 'headphones' && p !== 'magnifier' && p !== 'sign' && p !== 'laptop');
    const pool = allowed.length ? allowed : (['box'] as PetProp[]);
    const recent = this.recentProps.filter((p) => pool.includes(p));
    if (recent.length && Math.random() < 0.5) return pick(recent);
    if (this.opts.props.includes('headphones') && Math.random() < 0.08) return 'headphones';
    return pick(pool);
  }

  private pickTrick(prop: PetProp): PetTrick {
    const tricks = PROP_TRICKS[prop];
    const m = this.mode;
    const roomy = m.kind === 'ground' && (!m.surface.el || m.surface.rect.width > this.W * 3);
    const ok = tricks.filter((t) => (t !== 'ride' && t !== 'carry') || roomy);
    return this.weighted((ok.length ? ok : tricks).map((t, i) => [t, i === 0 ? 2 : 1] as [PetTrick, number])) ?? tricks[0];
  }

  /** Ciekawy element (tabela, wykres, obrazek) – do obejrzenia przez lupę. */
  private pickInterest(): Element | null {
    let nodes: Element[] = [];
    try {
      nodes = Array.from(document.querySelectorAll(this.opts.interestSelector));
    } catch {
      return null;
    }
    const cands = nodes.filter((el) => {
      if (this.els.layer.contains(el) || el.closest('[data-pet-ignore]')) return false;
      const r = el.getBoundingClientRect();
      return r.width > 60 && r.height > 40 && r.top > this.H && r.top < innerHeight - 40 && r.left > -20 && r.right < innerWidth + 20;
    });
    return cands.length ? pick(cands) : null;
  }

  private inspect(el: Element) {
    const r = el.getBoundingClientRect();
    this.attention = { x: r.left + r.width / 2, y: r.top + r.height / 2, until: performance.now() + 9000 };
    this.goTo(el);
    this.pendingPlay = () => {
      this.lookAt(el, 6000);
      this.play('magnifier', 'inspect', { ms: rand(4500, 6500), say: '' });
      this.speakOnce('inspect', 20000, { element: el });
    };
  }

  /** Pozycja X kursora, jeśli jest mniej więcej na wysokości maskotki (żeby mogła do niego podejść). */
  private pointerOnLevel(): number | null {
    const m = this.mode;
    if (!this.pointer || m.kind !== 'ground' || performance.now() - this.lastActivityAt > 15000) return null;
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

  private setAction(name: ActionName, until: number, extra: Partial<Action> = {}) {
    this.action = { name, start: performance.now(), until, ...extra };
  }

  /** Czynność, której nie warto przerywać decyzjami „mózgu” (zabawa, wędka…). */
  private isBusyAction() {
    const n = this.action.name;
    return n === 'play' || n === 'hack' || n === 'fish' || n === 'cool' || n === 'chase' || n === 'roll' || n === 'lie' || n === 'sitEdge';
  }

  private endActivity(now: number) {
    if (this.isBusyAction() || this.action.name === 'sleep') this.setAction('idle', now + 400);
  }

  private wakeUp(now: number) {
    this.forcedSleep = false;
    this.lastActivityAt = now;
    if (this.action.name === 'sleep') this.setAction('wake', now + 1300);
  }

  private moveSpeed(now: number) {
    if (this.launch || this.trip || (this.impact && now < this.impact.until) || (this.override && now < this.override.until)) return 0;
    const a = this.action;
    const k = this.k;
    switch (a.name) {
      case 'walk':
      case 'approach':
        return WALK_SPEED * k * (0.85 + this.mood.energy * 0.3);
      case 'run':
        return RUN_SPEED * k;
      case 'chase':
        return a.hold ? 0 : RUN_SPEED * k * 0.9;
      case 'roll':
        return RUN_SPEED * k * 0.7;
      case 'play':
        if (a.trick === 'ride') return 120 * k;
        if (a.trick === 'carry') return WALK_SPEED * k * 0.8;
        return 0;
      default:
        return 0;
    }
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

  // ───────────────────────── obiekty: piłka, samolocik ─────────────────────────

  /** Kopnięcie / rzut – rekwizyt odrywa się od maskotki i leci sam. */
  private release(a: Action, now: number) {
    const prop = a.prop;
    const kind = prop ? ENTITY_KIND[prop] : undefined;
    if (!prop || !kind || !a.trick) return;
    const place = placeFor(prop, a.trick);
    const sx = this.W / VIEW_W;
    const sy = this.H / VIEW_H;
    const x = this.cx - this.W / 2 + place.x * sx;
    const y = this.cy - this.H / 2 + place.y * sy;
    const k = Math.sqrt(this.k);
    const e: EntityState = {
      id: ++this.entityId,
      prop,
      kind,
      x,
      y,
      vx: this.dir * (kind === 'plane' ? 340 : rand(380, 520)) * k,
      vy: kind === 'plane' ? -170 : -rand(360, 520) * k,
      rot: 0,
      r: (kind === 'ball' ? 15 : 22) * 0.55 * sx * 1.6,
      born: now,
      on: null,
      dieAt: now + (kind === 'plane' ? 4500 : 6500),
    };
    this.entities.push(e);
    this.emitEntities();
    if (kind === 'ball') {
      this.setAction('chase', now + 5000, { entity: e.id, prop, kicks: (a.kicks ?? 0) + 1 });
    } else {
      this.attention = { x: e.x, y: e.y, until: now + 3000, entity: e.id };
      this.setAction('look', now + 2400);
    }
  }

  private emitEntities() {
    this.cb.onEntities(this.entities.map((e) => ({ id: e.id, prop: e.prop })));
  }

  private stepEntities(dt: number, now: number) {
    if (!this.entities.length) return;
    let changed = false;
    for (const e of this.entities) {
      if (!e.el || !e.el.isConnected) e.el = this.els.layer.querySelector<HTMLElement>(`[data-eid="${e.id}"]`);
      if (e.kind === 'ball') this.stepBall(e, dt);
      else {
        e.vy += 60 * dt + Math.sin((now - e.born) / 260) * 40 * dt;
        e.x += e.vx * dt;
        e.y += e.vy * dt;
        e.rot = (Math.atan2(e.vy, e.vx) * 180) / Math.PI;
      }
      if (this.attention?.entity === e.id) {
        this.attention.x = e.x;
        this.attention.y = e.y;
      }
      const off = e.x < -80 || e.x > innerWidth + 80 || e.y > innerHeight + 80 || e.y < -200;
      if (off) e.dieAt = Math.min(e.dieAt, now);
      if (e.el) {
        const size = e.r * 2;
        const fade = clamp((e.dieAt - now) / 400, 0, 1);
        e.el.style.width = `${size}px`;
        e.el.style.height = `${size}px`;
        e.el.style.transform = `translate3d(${(e.x - e.r).toFixed(1)}px, ${(e.y - e.r).toFixed(1)}px, 0) rotate(${e.rot.toFixed(1)}deg)`;
        e.el.style.opacity = fade.toFixed(2);
      }
      if (now > e.dieAt) changed = true;
    }
    if (changed) {
      this.entities = this.entities.filter((e) => now <= e.dieAt);
      this.emitEntities();
    }
  }

  private stepBall(e: EntityState, dt: number) {
    if (e.on) {
      const s = e.on;
      if (s.el) {
        if (!s.el.isConnected) e.on = null;
        else s.rect = toRect(s.el.getBoundingClientRect());
      } else s.rect = this.floor.rect;
      if (e.on) {
        e.vx *= 1 - Math.min(1, dt * 1.1);
        e.x += e.vx * dt;
        e.y = s.rect.top - e.r;
        if (e.x < s.rect.left - e.r * 0.3 || e.x > s.rect.right + e.r * 0.3) {
          e.on = null;
          e.vy = 0;
        }
      }
    } else {
      const prev = e.y + e.r;
      e.vy = Math.min(MAX_FALL, e.vy + GRAVITY * 0.85 * dt);
      e.x += e.vx * dt;
      e.y += e.vy * dt;
      const bottom = e.y + e.r;
      if (e.vy > 0) {
        let hit: Surface | null = null;
        for (const s of this.surfaces.values()) {
          if (!s.el || !s.reachable) continue;
          if (prev <= s.rect.top + 2 && bottom >= s.rect.top && e.x >= s.rect.left && e.x <= s.rect.right) {
            hit = s;
            break;
          }
        }
        if (!hit && bottom >= innerHeight) hit = this.floor;
        if (hit) {
          e.y = hit.rect.top - e.r;
          e.vy = -e.vy * 0.55;
          e.vx *= 0.85;
          if (hit.el) this.bump(hit.el);
          if (Math.abs(e.vy) < 120) {
            e.vy = 0;
            e.on = hit;
          }
        }
      }
    }
    if (e.x < e.r) {
      e.x = e.r;
      e.vx = Math.abs(e.vx) * 0.6;
    } else if (e.x > innerWidth - e.r) {
      e.x = innerWidth - e.r;
      e.vx = -Math.abs(e.vx) * 0.6;
    }
    e.rot += ((e.vx * dt) / Math.max(4, e.r)) * 57.3;
  }

  /** Goni kopniętą piłkę: biegnie do niej, przeskakuje na element, na którym leży, łapie i kopie znowu. */
  private steerChase(m: GroundMode, a: Action, now: number) {
    const e = this.entities.find((x) => x.id === a.entity);
    if (!e) {
      this.setAction('idle', now + 800);
      return;
    }
    const feetX = this.cx;
    const dx = e.x - feetX;
    if (e.on && e.on !== m.surface && now - a.start > 700) {
      this.jumpTo(e.on, now);
      a.start = now;
      return;
    }
    // łapie dopiero, gdy piłka już poleciała i spada albo się toczy
    const settling = e.on !== null || (e.vy > 0 && now - e.born > 650);
    if (settling && Math.abs(dx) < 16 * this.k && Math.abs(e.y + e.r - (this.cy + this.H / 2)) < this.H * 0.6) {
      // złapana!
      e.dieAt = now;
      const kicks = a.kicks ?? 1;
      if (kicks < 3 && Math.random() < 0.7) {
        this.play(e.prop, 'kick', { say: '' });
        if (this.action.name === 'play') this.action.kicks = kicks;
      } else {
        this.override = { state: 'happy', expression: 'happy', until: now + 1200 };
        this.setAction('idle', now + 1400);
      }
      return;
    }
    this.dir = dx > 0 ? 1 : -1;
    // goni tylko po górnej krawędzi – przy rogu staje i patrzy, aż piłka gdzieś wyląduje
    a.hold = Math.abs(dx) < 6 * this.k || this.atTopEnd(m, this.dir);
    if (a.hold) this.attention = { x: e.x, y: e.y, until: now + 400, entity: e.id };
  }

  /** Czy krok w stronę `dir` zszedłby z górnej krawędzi powierzchni. */
  private atTopEnd(m: GroundMode, dir: 1 | -1) {
    const sf = m.surface;
    if (sf.kind === 'top') {
      const [lo, hi] = this.topRange(sf);
      return dir > 0 ? m.s >= hi - 1 : m.s <= lo + 1;
    }
    const L = perimeterLength(sf.rect, sf.radius);
    const p = perimeterPoint(sf.rect, sf.radius, (((m.s + dir * 6 * this.k) % L) + L) % L);
    return p.ny > -0.98;
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
        const msg = el.getAttribute('data-pet-attract') || undefined;
        window.setTimeout(() => {
          if (!el.isConnected) return;
          this.goTo(el, msg);
          if (!msg) this.speak('attract', { element: el });
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

    // ── co pokazać (stan, mina, rekwizyt) – zmiana miny zawsze przez mrugnięcie ──
    const target = this.computeVisual(now);
    this.syncVisual(target, now);

    // ── poza: klip bieżącego stanu, płynnie zmieszany z poprzednią pozą ──
    if (this.domDirty) {
      this.joints = bindJoints(this.els.pet);
      this.domDirty = false;
    }
    const key = target.state === 'show' ? `show:${target.prop}:${target.trick}` : target.state;
    const a = this.anim;
    if (key !== a.key) {
      a.from = a.last;
      a.key = key;
      a.start = now;
      a.blendStart = now;
      a.blendDur = blendMs(target.state);
    }
    const clip: Clip = clipForVisual(target.state, target.prop, target.trick);
    const moving = this.mode.kind === 'ground' && this.speedNow > 5;
    const walkRef = WALK_SPEED * this.k;
    const raw = fullPose(
      clip((now - a.start) / 1000, {
        dir: this.dir,
        speed: this.mode.kind === 'ground' ? this.speedNow / walkRef : 1,
        roll: this.rollDeg,
        side: target.state === 'point' ? this.pointSide : this.lieSide,
      }),
    );
    const w = smooth(clamp((now - a.blendStart) / a.blendDur, 0, 1));
    const pose = mixPose(a.from, raw, w);
    a.last = pose;

    // pochylenie w biegu
    const act = this.action.name;
    const leanTarget = moving && (act === 'walk' || act === 'run' || act === 'approach' || act === 'chase') ? (act === 'run' || act === 'chase' ? 8 : 3) * this.dir * Math.min(1, this.speedNow / walkRef) : 0;
    this.leanNow += (leanTarget - this.leanNow) * Math.min(1, dt * 6);

    // ── spojrzenie i obrót 3D ──
    let lx = moving ? this.dir * 2.6 : 0;
    let ly = 0;
    let yawTarget = moving ? this.dir * (act === 'run' || act === 'chase' ? 60 : 45) : 0;
    const focus = this.attention && now < this.attention.until ? this.attention : this.pointer;
    if (this.mode.kind === 'drag') {
      yawTarget = Math.sin(now / 320) * 25;
    } else if (this.mode.kind === 'air') {
      const m = this.mode;
      yawTarget = m.spin ? this.yaw : Math.abs(m.vx) > 60 ? Math.sign(m.vx) * 35 : 0;
    } else if (act === 'turnback') {
      yawTarget = this.yaw >= 0 ? 180 : -180;
    } else if (act === 'look') {
      lx = Math.sin(now / 700) * 3.2;
      ly = Math.cos(now / 1100) * 1.2 - 0.5;
      yawTarget = Math.sin(now / 900) * 40;
    } else if (act === 'typing' || act === 'watch' || act === 'hack') {
      ly = 2.5;
    } else if (act === 'fish') {
      lx = 3;
      ly = 3;
      yawTarget = 25;
    } else if (act === 'cool') {
      yawTarget = -20;
    }
    if (focus && !moving && act !== 'turnback' && act !== 'fish' && this.mode.kind !== 'drag') {
      const dx = focus.x - this.cx;
      const dy = focus.y - this.cy;
      const d = Math.hypot(dx, dy);
      if (d > 1 && d < 520) {
        const ang = (this.angle * Math.PI) / 180;
        const ldx = dx * Math.cos(ang) + dy * Math.sin(ang);
        const ldy = -dx * Math.sin(ang) + dy * Math.cos(ang);
        const f = Math.min(1, d / 80);
        lx = (ldx / d) * 3.4 * f;
        ly = (ldy / d) * 2.6 * f;
        if (act !== 'look') yawTarget = clamp(ldx / 6, -35, 35);
        if (act === 'point') this.pointSide = ldx >= 0 ? 1 : -1;
      }
    }
    yawTarget += (pose.yaw - yawTarget) * pose.yw;

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
      const kk = 58;
      this.yawVel += ((yawTarget - this.yaw) * kk - this.yawVel * 2 * Math.sqrt(kk) * 0.95) * dt;
      this.yaw += this.yawVel * dt;
      if (this.yaw > 200) this.yaw -= 360;
      else if (this.yaw < -200) this.yaw += 360;
    }

    const ek = Math.min(1, dt * 12);
    this.eyeX += (lx - this.eyeX) * ek;
    this.eyeY += (ly - this.eyeY) * ek;

    // mrugnięcie przy zmianie miny
    let eb = pose.eb;
    if (this.blink) {
      const bt = now - this.blink.start;
      eb *= bt < 70 ? 1 - 0.88 * (bt / 70) : bt < 160 ? 0.12 + 0.88 * ((bt - 70) / 90) : 1;
    }
    const finalPose: Pose = { ...pose, br: pose.br + this.leanNow, eb };
    applyPose(this.joints, finalPose, this.eyeX, this.eyeY, this.jointCache);

    const yr = (this.yaw * Math.PI) / 180;
    const yc = Math.cos(yr);
    const ys = Math.sin(yr);
    const key2 = `${this.dir}|${yc.toFixed(3)}|${ys.toFixed(3)}`;
    if (key2 !== this.styleKey) {
      this.styleKey = key2;
      const st = el.style;
      st.setProperty('--dir', String(this.dir));
      st.setProperty('--yc', yc.toFixed(3));
      st.setProperty('--ys', ys.toFixed(3));
      st.setProperty('--yac', Math.abs(yc).toFixed(3));
      st.setProperty('--yas', Math.abs(ys).toFixed(3));
      st.setProperty('--ysg', yc < 0 ? '-1' : '1');
    }
    this.renderBubble(now);
  }

  /** Wysyła do Reacta zmiany wyglądu. Nowa mina pojawia się w połowie mrugnięcia, więc nie ma przeskoku. */
  private syncVisual(target: PetVisual, now: number) {
    const cur = this.visual;
    const same = (a: PetVisual, b: PetVisual) =>
      a.state === b.state && a.expression === b.expression && a.prop === b.prop && a.trick === b.trick && a.propText === b.propText;
    if (this.blink) {
      if (!this.blink.swapped) this.blink.expression = target.expression;
      if (!this.blink.swapped && now - this.blink.start >= 70) {
        this.blink.swapped = true;
        const next = { ...target, expression: this.blink.expression };
        if (!same(next, cur)) {
          this.visual = next;
          this.cb.onVisual(next);
        }
      }
      if (now - this.blink.start >= 160) this.blink = null;
      const body = { ...target, expression: this.visual.expression };
      if (!same(body, this.visual)) {
        this.visual = body;
        this.cb.onVisual(body);
      }
      return;
    }
    if (target.expression !== cur.expression) {
      this.blink = { start: now, expression: target.expression, swapped: false };
      const body = { ...target, expression: cur.expression };
      if (!same(body, cur)) {
        this.visual = body;
        this.cb.onVisual(body);
      }
      return;
    }
    if (!same(target, cur)) {
      this.visual = target;
      this.cb.onVisual(target);
    }
  }

  private computeVisual(now: number): PetVisual {
    const ov = this.override && now < this.override.until ? this.override : null;
    const emo = this.emote && now < this.emote.until ? this.emote.expression : null;
    const m = this.mode;
    const v = (state: PetState, expression: PetExpression, prop: PetProp | null = null, trick: PetTrick | null = null, propText?: string): PetVisual => ({
      state,
      expression: emo ?? expression,
      prop,
      trick,
      propText,
    });
    if (m.kind === 'drag') return v('drag', ov?.expression ?? (now - m.since > 2500 ? 'annoyed' : 'surprised'));
    if (m.kind === 'air') {
      if (now < m.hangUntil) return v('oops', now > m.hangUntil - 400 ? 'shocked' : 'surprised');
      if (m.spin) return v('fall', 'dizzy');
      if (m.float) return v('float', 'content');
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
    const moving = this.speedNow > 5;
    switch (a.name) {
      case 'walk':
      case 'approach':
        return v(moving ? 'walk' : 'idle', hov ? 'happy' : a.name === 'approach' ? 'curious' : 'neutral');
      case 'run':
        return v(moving ? 'run' : 'idle', 'excited');
      case 'chase':
        return v(moving ? 'chase' : 'idle', 'excited');
      case 'sit':
        return v('sit', hov ? 'happy' : now - this.lastActivityAt > this.opts.sleepAfterMs * 0.6 ? 'sleepy' : 'neutral');
      case 'sitEdge':
        return v('sitEdge', hov ? 'happy' : 'content');
      case 'lie':
        return v('lie', hov ? 'happy' : 'content');
      case 'sleep':
        return v('sleep', 'asleep');
      case 'roll':
        return v('roll', 'excited');
      case 'wake':
      case 'stretch':
        return v('stretch', 'sleepy');
      case 'wave':
        return v('wave', 'happy');
      case 'point':
        return v('point', 'curious');
      case 'look':
      case 'turnback':
        return v('look', 'curious');
      case 'typing':
        return v('typing', 'focused');
      case 'watch':
        return v('sit', 'curious');
      case 'hack':
        return v('hack', 'hacker');
      case 'cool':
        return v('cool', 'happy');
      case 'play':
        return v('show', (a.trick && TRICK_FACE[a.trick]) ?? (hov ? 'excited' : 'happy'), a.prop ?? null, a.trick ?? null, a.text);
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

  // ───────────────────────── dotyk ─────────────────────────

  /** Która część ciała jest pod kursorem (w układzie grafiki 160×190). */
  private zoneAt(px: number, py: number): Zone | null {
    const a = (this.angle * Math.PI) / 180;
    const dx = px - this.cx;
    const dy = py - this.cy;
    const ux = VIEW_W / 2 + ((dx * Math.cos(a) + dy * Math.sin(a)) * VIEW_W) / this.W;
    const uy = VIEW_H / 2 + ((-dx * Math.sin(a) + dy * Math.cos(a)) * VIEW_H) / this.H;
    if (ux < 0 || ux > VIEW_W || uy < 0 || uy > VIEW_H) return null;
    const hx = (ux - 80) / 62;
    const hy = (uy - 99) / 48;
    if (hx * hx + hy * hy <= 1) return 'head';
    if (uy < 70) {
      if (ux > 8 && ux < 72) return 'ear-l';
      if (ux > 88 && ux < 152) return 'ear-r';
      return null;
    }
    if (uy >= 166 && Math.abs(ux - 80) < 36) return 'feet';
    if (uy >= 128 && Math.abs(ux - 80) < 38) return 'belly';
    return null;
  }

  private static zoneName(z: Zone): PetTouchZone {
    return z === 'ear-l' || z === 'ear-r' ? 'ear' : z;
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
      this.mode.kind !== 'ground' || !!this.launch || !!this.trip || !!this.impact || this.action.name === 'fish' || this.action.name === 'sleep' || this.action.name === 'roll';
    const moved = t.zone ? Math.hypot(px - t.x, py - t.y) : 0;
    t.x = px;
    t.y = py;
    const fire = (zone: Zone) => this.rules.fire('touch', { detail: PetController.zoneName(zone) }, (tr) => !tr.zone || tr.zone === PetController.zoneName(zone));
    if (z !== t.zone) {
      const fresh = !t.zone && now - t.leftAt > 1500;
      t.zone = z;
      t.dist = 0;
      if (busy) return;
      if (z === 'ear-l' || z === 'ear-r') {
        this.touchReact(z === 'ear-l' ? 'twitch-l' : 'twitch-r', 'annoyed', 650, now);
        this.speakOnce('ear', 6000);
        fire(z);
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
      this.speakOnce('petted', 7000);
      fire(z);
    } else if (z === 'belly' && t.dist > 130) {
      t.dist = 0;
      this.touchReact('giggle', 'excited', 1300, now);
      this.feelGood({ social: 0.08, fun: 0.08 });
      this.speakOnce('belly', 6000);
      fire(z);
    } else if (z === 'feet' && t.dist > 110) {
      t.dist = 0;
      this.touchReact('giggle', 'excited', 1000, now);
      this.speakOnce('feet', 6000);
      fire(z);
    }
  }

  private touchReact(state: PetState, expression: PetExpression, ms: number, now: number) {
    if (this.override && now < this.override.until && this.override.state === state) {
      this.override.until = now + ms;
      return;
    }
    if (this.action.name !== 'lie' && this.action.name !== 'sitEdge') this.endActivity(now);
    this.override = { state, expression, until: now + ms };
  }

  // ───────────────────────── zdarzenia ─────────────────────────

  private activity() {
    if (this.forcedSleep) return;
    const now = performance.now();
    this.lastActivityAt = now;
    if (this.action.name === 'sleep') this.setAction('wake', now + 1300);
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
    if (Math.sign(dx) !== Math.sign(this.lastPointerDx)) this.shakeFlips.push(t);
    this.lastPointerDx = dx;
    this.shakeFlips = this.shakeFlips.filter((f) => t - f < 1100);
    if (this.shakeFlips.length >= 7 && this.mode.kind === 'ground' && !this.launch && !this.trip) {
      this.shakeFlips = [];
      this.endActivity(t);
      this.override = { state: 'confused', expression: 'dizzy', until: t + 1600 };
      this.speakOnce('dizzy', 6000);
    }
  }

  /** Zaznaczenie tekstu: maskotka „czyta” (jeśli skonfigurowano tekst 'read'). */
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
      this.speakOnce('read', 8000, { text });
      this.rules.fire('select', { text });
    }, 0);
  };

  private pageEvent(kind: 'copy' | 'paste') {
    this.feelGood({ curiosity: 0.1 });
    this.speakOnce(kind, 5000);
    this.rules.fire(kind, {});
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
      this.speak('back');
      this.rules.fire('return', {});
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

  private lastScrollFire = 0;
  private onScroll = () => {
    this.dirty = true;
    this.activity();
    const t = performance.now();
    if (t - this.lastScrollFire > 800) {
      this.lastScrollFire = t;
      this.rules.fire('scroll', {});
    }
  };

  private onResize = () => {
    this.dirty = true;
  };

  private onFocusIn = (e: FocusEvent) => {
    if (!this.opts.reactToTyping || this.scripted) return;
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
    const t = e.target.closest<HTMLElement>('[data-pet-say], [data-pet-react], [data-pet-prop], [data-pet-act], [data-pet-pose]');
    if (!t) {
      this.noticeClick(e);
      return;
    }
    const reaction = t.dataset.petReact as PetReaction | undefined;
    const text = t.dataset.petSay;
    const prop = t.dataset.petProp as PetProp | undefined;
    const trick = t.dataset.petTrick as PetTrick | undefined;
    const activity = t.dataset.petAct as PetActivity | undefined;
    const pose = t.dataset.petPose as PetPose | undefined;
    if (prop && PET_PROPS.includes(prop)) this.play(prop, trick, { say: text, text: t.dataset.petText });
    else if (activity) this.act(activity, undefined, text);
    else if (pose) {
      this.pose(pose);
      if (text) this.say(text);
    } else if (reaction && reaction in REACTIONS) this.react(reaction, text);
    else if (text) this.say(text);
  };

  /** Zwykłe kliknięcie w panelu: maskotka patrzy, (opcjonalnie) komentuje i zapamiętuje marki. */
  private noticeClick(e: MouseEvent) {
    const target = e.target instanceof Element ? e.target.closest<HTMLElement>('button, a, [role="button"], summary, label') : null;
    const t = performance.now();
    this.attention = { x: e.clientX, y: e.clientY, until: t + 1600 };
    this.feelGood({ curiosity: 0.12, social: 0.03 });
    if (!target) return;
    const label = labelOf(target);
    const brand = label ? BRAND_WORDS.find(([re]) => re.test(label))?.[1] : undefined;
    if (brand && this.opts.props.includes(brand)) {
      this.recentProps = [brand, ...this.recentProps.filter((p) => p !== brand)].slice(0, 5);
      if (this.opts.hobbies && Math.random() < 0.45 && this.mode.kind === 'ground' && !this.isBusyAction() && !this.scripted) {
        window.setTimeout(() => this.play(brand), 500);
        return;
      }
    }
    if (label && label.length <= 28 && Math.random() < 0.2) this.speakOnce('click', 9000, { label, element: target });
  }

  private onError = (e: ErrorEvent) => {
    const msg = e.message || '';
    if (msg.includes('ResizeObserver')) return;
    this.rules.fire('error', { text: msg });
    if (!this.opts.reactToErrors) return;
    this.react('error', '');
    this.speak('error', { text: msg.slice(0, 70) });
  };

  private onRejection = (e: PromiseRejectionEvent) => {
    const reason = e.reason instanceof Error ? e.reason.message : String(e.reason ?? '');
    this.rules.fire('error', { text: reason });
    if (!this.opts.reactToErrors) return;
    this.react('error', '');
    this.speak('error', { text: reason.slice(0, 70) });
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
      case 'play':
        this.play(cmd.prop, cmd.trick, { text: cmd.text, ms: cmd.ms, say: cmd.say });
        break;
      case 'pose':
        this.pose(cmd.pose, cmd.ms);
        break;
      case 'emote':
        this.emoteFor(cmd.expression, cmd.ms);
        break;
      case 'look':
        this.lookAt(cmd.target, cmd.ms);
        break;
      case 'sequence':
        void this.runSteps(cmd.steps, { trigger: 'event' });
        break;
      case 'stop':
        this.stopAll();
        break;
      case 'emit':
        this.emit(cmd.name, cmd.detail);
        break;
      case 'rules':
        this.rules.set(`ext:${cmd.id}`, cmd.rules);
        break;
      case 'jump': {
        this.wakeUp(now);
        const t = this.pickTarget();
        if (t) this.jumpTo(t, now);
        break;
      }
      case 'sleep':
        this.forcedSleep = true;
        this.lastActivityAt = -1e9;
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
    if (this.action.name === 'sleep') this.speak('dragWhileAsleep');
    else if (Math.random() < 0.4) this.speak('drag');
    this.seqToken++;
    this.scripted = 0;
    this.forcedSleep = false;
    this.lastActivityAt = now;
    this.launch = null;
    this.impact = null;
    this.trip = null;
    this.tripAtEdge = false;
    this.pendingGoto = null;
    this.pendingPlay = null;
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
    if (Math.hypot(vx, vy) > 1300) this.speak('thrown');
  }

  private onPetUp = (e: PointerEvent) => this.endPress(e, false);
  private onPetCancel = (e: PointerEvent) => this.endPress(e, true);

  /** Kliknięcie w maskotkę – reakcja zależy od miejsca. */
  private poke(now: number, px: number, py: number) {
    this.lastActivityAt = now;
    this.pokes = this.pokes.filter((t) => now - t < 2500);
    this.pokes.push(now);
    this.rules.fire('poke', {});
    if (this.action.name === 'sleep') {
      this.wakeUp(now);
      this.speak('wokenUp');
      return;
    }
    this.forcedSleep = false;
    if (this.pokes.length >= 4) {
      this.pokes = [];
      this.override = { state: 'idle', expression: 'annoyed', until: now + 2000 };
      this.speak('pokeSpam');
      return;
    }
    const m = this.mode;
    if (m.kind !== 'ground' || this.launch || this.trip) return;
    if (!this.isUpright()) {
      this.drop(true);
      this.speak('oops');
      return;
    }
    this.endActivity(now);
    const zone = this.zoneAt(px, py);
    if (zone === 'head') {
      this.override = { state: 'bonk', expression: 'dizzy', until: now + 900 };
      this.speak('head');
    } else if (zone === 'ear-l' || zone === 'ear-r') {
      this.override = { state: zone === 'ear-l' ? 'twitch-l' : 'twitch-r', expression: 'annoyed', until: now + 700 };
      this.speak('ear');
    } else if (zone === 'belly') {
      this.override = { state: 'giggle', expression: 'excited', until: now + 1300 };
      this.speak('belly');
    } else {
      const vy = -560 * Math.sqrt(this.k);
      this.override = null;
      this.impact = null;
      this.mode = this.air(0, vy, { target: m.surface, tLand: (-2 * vy) / GRAVITY });
      this.speak(zone === 'feet' ? 'feet' : 'poke');
    }
  }
}
