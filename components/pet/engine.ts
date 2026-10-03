import {
  PET_EVENT,
  type PetCommand,
  type PetExpression,
  type PetOptions,
  type PetReaction,
  type PetState,
  type PetTarget,
  type PetVisual,
} from './types';

const GRAVITY = 2400; // px/s²
const MAX_FALL = 2600;
const WALK_SPEED = 52; // px/s przy rozmiarze 72
const RUN_SPEED = 150;
const HARD_LANDING = 1500;

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

type ActionName = 'idle' | 'walk' | 'run' | 'sit' | 'look' | 'sleep' | 'wake' | 'typing' | 'watch';

interface Point {
  x: number;
  y: number;
  nx: number;
  ny: number;
}

const LINES = {
  hello: ['Hej! Jestem tu 👋', 'Cześć! Popilnuję panelu 🐰', 'Siemka! 👋'],
  poke: ['Hej! 👋', 'Co tam?', 'Hihi, łaskocze!', 'Klik!', 'Jestem, jestem!', 'Potrzebujesz czegoś?'],
  hard: ['Auć! ⭐', 'Ała… 😵', 'Uff… twarde lądowanie'],
  thrown: ['Wiiiiii! 🚀', 'Aaaa!', 'Leeeecę!'],
  drag: ['Gdzie mnie niesiesz?', 'Hej, postaw mnie!', 'Wysoko! 😳'],
  attract: ['Ooo, coś nowego! 👀', 'Co to? 👀'],
  success: ['Udało się! ✨', 'Sukces! 🎉', 'Gotowe! ✅'],
  error: ['Ups… coś poszło nie tak ⚠️', 'Błąd! 😵', 'Oj, to nie działa…'],
  confused: ['Hmm? 🤔', 'Że co?', 'Nie rozumiem…'],
  happy: ['Jej! 💜', 'Super! 😄'],
  sad: ['Smutno mi… 😢', 'Ehh…'],
} satisfies Record<string, string[]>;

const REACTIONS: Record<PetReaction, [PetState, PetExpression, number]> = {
  success: ['success', 'happy', 1900],
  error: ['error', 'angry', 2600],
  confused: ['confused', 'confused', 2400],
  happy: ['happy', 'happy', 1500],
  sad: ['sad', 'sad', 2600],
};

const NON_TEXT_INPUTS = new Set(['checkbox', 'radio', 'range', 'button', 'submit', 'reset', 'color', 'file', 'image', 'hidden']);

const pick = <T>(list: readonly T[]): T => list[Math.floor(Math.random() * list.length)];
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
 * co klatkę ustawia transform, a zmianę pozy/miny zgłasza przez onVisual.
 */
export class PetController {
  private opts: PetOptions;
  private cx = 0; // środek maskotki (px, względem okna)
  private cy = 0;
  private angle = 0; // obrót w stopniach (0 = stoi prosto)
  private nx = 0; // normalna krawędzi, na której stoi
  private ny = -1;
  private dir: 1 | -1 = 1;
  private mode: Mode;
  private action: { name: ActionName; until: number } = { name: 'idle', until: 0 };
  private impact: { state: 'land' | 'splat' | 'recover'; until: number } | null = null;
  private override: { state: PetState; expression: PetExpression; until: number } | null = null;
  private launch: { vx: number; vy: number; target: Surface; T: number; from: Surface | null; at: number } | null = null;
  private pendingGoto: Surface | null = null;
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
  private workEl: HTMLElement | null = null;
  private workRetryAt = 0;
  private lastTypeAt = -1e9;
  private bubbleOn = false;
  private bubbleUntil = 0;
  private bubbleSize = { w: 0, h: 0 };
  private visual: PetVisual = { state: 'fall', expression: 'surprised' };
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
    this.mode = { kind: 'air', vx: 0, vy: 0, target: null, ignore: null, t: 0, tLand: 0 };
  }

  private get H() {
    return this.opts.size;
  }
  private get W() {
    return (this.opts.size * 100) / 120;
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
    this.jumpTo(s, now);
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

    this.think(t);
    this.render(t);
  };

  private stepGround(m: GroundMode, dt: number, now: number) {
    const sf = m.surface;
    if (sf.el) {
      if (!sf.el.isConnected || !this.surfaces.has(sf.el)) return this.drop(true);
      const r = sf.el.getBoundingClientRect();
      if (r.width < 4 || r.height < 4) return this.drop(true);
      sf.rect = toRect(r);
      this.fitRadius(sf);
    }

    const speed = this.moveSpeed(now);
    if (sf.kind === 'top') {
      const [a, b] = this.topRange(sf);
      m.s += this.dir * speed * dt;
      if (m.s < a || m.s > b) {
        m.s = clamp(m.s, a, b);
        if (speed) this.onEdge(m, now);
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
    m.t += dt;
    const half = this.H / 2;
    const prevFeet = this.cy + half;
    m.vy = Math.min(MAX_FALL, m.vy + GRAVITY * dt);
    this.cx += m.vx * dt;
    this.cy += m.vy * dt;
    this.angle = lerpAngle(this.angle, 0, 1 - Math.exp(-dt * 12));

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
    const onlyTarget = m.target !== null && m.t < m.tLand * 1.3 + 0.05;
    const list = onlyTarget && m.target ? [m.target] : this.surfaces.values();
    for (const s of list) {
      // nie lądujemy na elementach tuż przy górze ekranu – maskotka byłaby prawie niewidoczna
      if (!s.el || s === m.ignore || (!onlyTarget && (!s.reachable || s.rect.top < this.H * 0.6))) continue;
      const r = s === m.target ? toRect(s.el.getBoundingClientRect()) : s.rect;
      if (prevFeet <= r.top + 2 && feet >= r.top && this.cx >= r.left - 6 && this.cx <= r.right + 6) {
        this.land(s, r, m.vy, now);
        return;
      }
    }
    if (feet >= innerHeight) this.land(this.floor, this.floor.rect, m.vy, now);
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
        this.say(pick(LINES.hello));
      }
    }
    this.stepGround(m, 0, now);
  }

  /** Zejście z krawędzi w powietrze (spadanie). */
  private drop(surprised = false, vx = this.dir * 40, vy = 0) {
    const ignore = this.mode.kind === 'ground' ? this.mode.surface : null;
    this.mode = { kind: 'air', vx, vy, target: null, ignore, t: 0, tLand: 0 };
    this.launch = null;
    if (surprised) this.override = null;
  }

  private offscreen(now: number) {
    const m = this.W / 2;
    this.cx = clamp(this.cx, m, innerWidth - m);
    if (this.cy < 0) {
      // element uciekł do góry (scroll) – maskotka spada z góry ekranu
      this.cy = -this.H * 0.4;
      this.angle = 0;
      this.mode = { kind: 'air', vx: 0, vy: 0, target: null, ignore: null, t: 0, tLand: 0 };
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
    if (r < 0.5) flip();
    else if (r < 0.8) this.drop(false, this.dir * 150 * this.k, -380); // zeskok
    else {
      const t = this.pickTarget();
      if (t) this.jumpTo(t, now);
      else this.drop(false, this.dir * 150 * this.k, -380);
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
    this.launch = { vx, vy, target, T, from: this.mode.surface, at: now + 170 };
  }

  private pickTarget(): Surface | null {
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
    if (cur?.el) cands.push([this.floor, 0.35]);
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
        this.mode = { kind: 'air', vx: l.vx, vy: l.vy, target: l.target, ignore: l.from, t: 0, tLand: l.T };
      }
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
    if (this.action.name === 'sleep') return;
    if (this.workEl) return this.doWork(m, now);
    if (this.action.name !== 'wake' && this.isUpright() && now - this.lastActivity > this.opts.sleepAfterMs) {
      this.setAction('sleep', Infinity);
      return;
    }
    if (now < this.action.until) return;
    this.decide(m, now);
  }

  private decide(m: GroundMode, now: number) {
    const r = Math.random();
    if (!this.isUpright()) {
      // wisi na boku albo pod spodem elementu
      if (r < 0.72) this.setAction('walk', now + rand(2500, 6000));
      else if (r < 0.88) this.setAction('idle', now + rand(1200, 2600));
      else this.drop(true);
      return;
    }
    const roomy = !m.surface.el || m.surface.kind === 'perimeter';
    if (r < 0.36) {
      if (Math.random() < 0.35) this.dir = this.dir === 1 ? -1 : 1;
      this.setAction('walk', now + rand(2000, 6000));
    } else if (r < 0.46 && roomy && !this.reducedMotion) this.setAction('run', now + rand(1200, 2600));
    else if (r < 0.6) this.setAction('idle', now + rand(1800, 3800));
    else if (r < 0.7) this.setAction('look', now + rand(1600, 3000));
    else if (r < 0.8) this.setAction('sit', now + rand(3500, 8000));
    else {
      const t = this.reducedMotion ? null : this.pickTarget();
      if (t) this.jumpTo(t, now);
      else this.setAction('walk', now + rand(2000, 4000));
    }
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

  private setAction(name: ActionName, until: number) {
    this.action = { name, until };
  }

  private wakeUp(now: number) {
    this.forcedSleep = false;
    this.lastActivity = now;
    if (this.action.name === 'sleep') this.setAction('wake', now + 1100);
  }

  private moveSpeed(now: number) {
    if (this.launch || (this.impact && now < this.impact.until) || (this.override && now < this.override.until)) return 0;
    if (this.action.name === 'walk') return WALK_SPEED * this.k;
    if (this.action.name === 'run') return RUN_SPEED * this.k;
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

  private render(now: number) {
    const el = this.els.pet;
    el.style.transform = `translate3d(${(this.cx - this.W / 2).toFixed(1)}px, ${(this.cy - this.H / 2).toFixed(1)}px, 0) rotate(${this.angle.toFixed(2)}deg)`;
    if (!this.shown) {
      el.style.opacity = '1';
      this.shown = true;
    }

    // oczy: patrzą na kursor, w kierunku marszu albo rozglądają się
    const grounded = this.mode.kind === 'ground';
    const moving = grounded && this.moveSpeed(now) > 0;
    let lx = moving ? this.dir * 2.6 : 0;
    let ly = 0;
    const act = this.action.name;
    if (grounded && act === 'look') {
      lx = Math.sin(now / 700) * 3.2;
      ly = Math.cos(now / 1100) * 1.2 - 0.5;
    } else if (grounded && (act === 'typing' || act === 'watch')) {
      lx = -1.5;
      ly = 2;
    } else if (this.pointer && this.mode.kind !== 'drag') {
      const dx = this.pointer.x - this.cx;
      const dy = this.pointer.y - this.cy;
      const d = Math.hypot(dx, dy);
      if (d > 1 && d < 360) {
        const a = (this.angle * Math.PI) / 180;
        const ldx = dx * Math.cos(a) + dy * Math.sin(a);
        const ldy = -dx * Math.sin(a) + dy * Math.cos(a);
        const f = Math.min(1, d / 80);
        lx = (ldx / d) * 3.4 * f;
        ly = (ldy / d) * 2.6 * f;
      }
    }
    const lean = moving ? (act === 'run' ? 9 : 3) * this.dir : 0;
    const key = `${lx.toFixed(1)}|${ly.toFixed(1)}|${this.dir}|${lean}`;
    if (key !== this.styleKey) {
      this.styleKey = key;
      el.style.setProperty('--lx', lx.toFixed(1));
      el.style.setProperty('--ly', ly.toFixed(1));
      el.style.setProperty('--dir', String(this.dir));
      el.style.setProperty('--lean', String(lean));
    }

    const v = this.computeVisual(now);
    if (v.state !== this.visual.state || v.expression !== this.visual.expression) {
      this.visual = v;
      this.onVisual(v);
    }
    this.renderBubble(now);
  }

  private computeVisual(now: number): PetVisual {
    const ov = this.override && now < this.override.until ? this.override : null;
    const m = this.mode;
    if (m.kind === 'drag') return { state: 'drag', expression: ov?.expression ?? (now - m.since > 2500 ? 'annoyed' : 'surprised') };
    if (m.kind === 'air') {
      return {
        state: m.vy < -60 ? 'jump' : 'fall',
        expression: ov?.expression ?? (m.target ? 'happy' : m.vy > 900 ? 'surprised' : 'curious'),
      };
    }
    if (this.launch) return { state: 'crouch', expression: ov?.expression ?? 'happy' };
    if (this.impact && now < this.impact.until) {
      const st = this.impact.state;
      return { state: st, expression: st === 'splat' ? 'dizzy' : st === 'recover' ? 'annoyed' : (ov?.expression ?? 'neutral') };
    }
    if (ov) return { state: ov.state, expression: ov.expression };
    const hov = this.hovered;
    switch (this.action.name) {
      case 'walk':
        return { state: 'walk', expression: hov ? 'happy' : 'neutral' };
      case 'run':
        return { state: 'run', expression: 'happy' };
      case 'sit':
        return {
          state: 'sit',
          expression: hov ? 'happy' : now - this.lastActivity > this.opts.sleepAfterMs * 0.6 ? 'sleepy' : 'neutral',
        };
      case 'look':
        return { state: 'look', expression: 'curious' };
      case 'sleep':
        return { state: 'sleep', expression: 'asleep' };
      case 'wake':
        return { state: 'wake', expression: 'sleepy' };
      case 'typing':
        return { state: 'typing', expression: 'focused' };
      case 'watch':
        return { state: 'sit', expression: 'curious' };
      default:
        return { state: 'idle', expression: hov ? 'happy' : 'neutral' };
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

  // ───────────────────────── zdarzenia ─────────────────────────

  private activity() {
    if (this.forcedSleep) return;
    const now = performance.now();
    this.lastActivity = now;
    if (this.action.name === 'sleep') this.setAction('wake', now + 1100);
  }

  private onWindowPointer = (e: PointerEvent) => {
    this.pointer = { x: e.clientX, y: e.clientY };
    this.activity();
  };

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
    this.wakeUp(performance.now());
  };

  private onFocusOut = (e: FocusEvent) => {
    if (e.target !== this.workEl) return;
    this.workEl = null;
    if (this.action.name === 'typing' || this.action.name === 'watch') this.setAction('idle', performance.now() + 900);
  };

  private onClick = (e: MouseEvent) => {
    if (!(e.target instanceof Element) || this.els.layer.contains(e.target)) return;
    const t = e.target.closest<HTMLElement>('[data-pet-say], [data-pet-react]');
    if (!t) return;
    const reaction = t.dataset.petReact as PetReaction | undefined;
    const text = t.dataset.petSay;
    if (reaction && reaction in REACTIONS) this.react(reaction, text);
    else if (text) this.say(text);
  };

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
    this.pendingGoto = null;
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
      if (!cancelled) this.poke(now);
      return;
    }
    const m = this.mode;
    if (m.kind !== 'drag') return;
    const stale = cancelled || now - m.lastT > 90;
    const vx = stale ? 0 : clamp(m.vx, -2400, 2400);
    const vy = stale ? 0 : clamp(m.vy, -2400, 2400);
    this.mode = { kind: 'air', vx, vy, target: null, ignore: null, t: 0, tLand: 0 };
    if (Math.hypot(vx, vy) > 1300) this.say(pick(LINES.thrown));
  }

  private onPetUp = (e: PointerEvent) => this.endPress(e, false);
  private onPetCancel = (e: PointerEvent) => this.endPress(e, true);

  private poke(now: number) {
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
    if (m.kind !== 'ground' || this.launch) return;
    if (this.isUpright()) {
      const vy = -560 * Math.sqrt(this.k);
      this.override = null;
      this.impact = null;
      this.mode = { kind: 'air', vx: 0, vy, target: m.surface, ignore: null, t: 0, tLand: (-2 * vy) / GRAVITY };
      this.say(pick(LINES.poke));
    } else {
      this.drop(true);
      this.say('Aaa! 😱');
    }
  }
}
