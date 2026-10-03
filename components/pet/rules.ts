import type { PetMood, PetRule, PetRuleContext, PetTrigger } from './types';

/** To, czego reguły potrzebują od silnika maskotki. */
export interface RuleHost {
  run(rule: PetRule, ctx: PetRuleContext): void;
  isInsidePet(el: Element): boolean;
  mood(): PetMood;
  lastActivity(): number;
}

type TriggerOf<K extends PetTrigger['on']> = Extract<PetTrigger, { on: K }>;

interface Entry {
  rule: PetRule;
  triggers: PetTrigger[];
  lastRun: number;
  done: boolean;
}

const asArray = <T>(v: T | T[]): T[] => (Array.isArray(v) ? v : [v]);

function matches(el: Element | null, selector?: string): Element | null {
  if (!el) return null;
  if (!selector) return el;
  try {
    return el.closest(selector);
  } catch {
    return null;
  }
}

/**
 * Wykonuje reguły „kiedy X, zrób Y”. Nasłuchuje zdarzeń strony, pilnuje odstępów (cooldown),
 * szansy (chance), jednorazowości (once) i warunków (if).
 */
export class RuleRunner {
  private groups = new Map<string, PetRule[]>();
  private entries: Entry[] = [];
  private disposers: Array<() => void> = [];
  private hoverTimers = new Map<Entry, number>();
  private present = new Map<string, Set<Element>>();
  private idleFired = new Set<Entry>();
  private everyAt = new Map<Entry, number>();
  private timeFired = new Map<Entry, string>();
  private moodState = new Map<Entry, boolean>();
  private route = '';
  private lastRouteCheck = 0;
  private lastTimeCheck = 0;
  private domDirty = false;
  private started = false;

  constructor(private readonly host: RuleHost) {}

  set(id: string, rules: PetRule[] | null) {
    if (rules && rules.length) this.groups.set(id, rules);
    else this.groups.delete(id);
    this.rebuild();
  }

  private rebuild() {
    const old = new Map(this.entries.map((e) => [e.rule, e]));
    this.entries = [];
    for (const rules of this.groups.values()) {
      for (const rule of rules) {
        const prev = old.get(rule);
        this.entries.push(prev ?? { rule, triggers: asArray(rule.when), lastRun: -1e12, done: false });
      }
    }
    // stan „co już jest na stronie” dla nowych selektorów appear/disappear
    for (const e of this.entries) {
      for (const t of e.triggers) {
        if ((t.on === 'appear' || t.on === 'disappear') && !this.present.has(t.selector)) this.present.set(t.selector, this.query(t.selector));
      }
    }
  }

  start() {
    this.started = true;
    this.route = location.pathname + location.search;
    const on = <K extends keyof DocumentEventMap>(type: K, fn: (e: DocumentEventMap[K]) => void, capture = true) => {
      document.addEventListener(type, fn, capture);
      this.disposers.push(() => document.removeEventListener(type, fn, capture));
    };
    on('click', (e) => this.fromEvent('click', e));
    on('focusin', (e) => this.fromEvent('focus', e));
    on('input', (e) => this.fromEvent('input', e));
    on('submit', (e) => this.fromEvent('submit', e));
    on('pointerover', (e) => this.onOver(e));
    on('pointerout', (e) => this.onOut(e));
    window.setTimeout(() => this.fire('start', {}), 600);
  }

  destroy() {
    for (const d of this.disposers) d();
    this.disposers = [];
    for (const t of this.hoverTimers.values()) window.clearTimeout(t);
    this.hoverTimers.clear();
  }

  /** Zdarzenie wewnętrzne (dotyk, lądowanie, błąd, własne pet.emit…). */
  fire<K extends PetTrigger['on']>(on: K, ctx: Omit<PetRuleContext, 'trigger'>, test?: (t: TriggerOf<K>) => boolean) {
    for (const e of this.entries) {
      for (const t of e.triggers) {
        if (t.on !== on) continue;
        if (test && !test(t as TriggerOf<K>)) continue;
        this.tryRun(e, { trigger: on, ...ctx });
        break;
      }
    }
  }

  markDom() {
    this.domDirty = true;
  }

  /** Wywoływane co klatkę przez silnik. */
  tick(now: number) {
    if (!this.started || !this.entries.length) return;
    const idleFor = now - this.host.lastActivity();
    for (const e of this.entries) {
      for (const t of e.triggers) {
        if (t.on === 'idle') {
          if (idleFor >= t.ms) {
            if (!this.idleFired.has(e)) {
              this.idleFired.add(e);
              this.tryRun(e, { trigger: 'idle' });
            }
          } else this.idleFired.delete(e);
        } else if (t.on === 'every') {
          const next = this.everyAt.get(e) ?? now + t.ms;
          if (now >= next) {
            this.everyAt.set(e, now + t.ms);
            this.tryRun(e, { trigger: 'every' });
          } else if (!this.everyAt.has(e)) this.everyAt.set(e, next);
        } else if (t.on === 'mood') {
          const v = this.host.mood()[t.mood];
          const hit = (t.below === undefined || v < t.below) && (t.above === undefined || v > t.above);
          const was = this.moodState.get(e) ?? false;
          if (hit && !was) this.tryRun(e, { trigger: 'mood', detail: v });
          this.moodState.set(e, hit);
        }
      }
    }
    if (now - this.lastRouteCheck > 400) {
      this.lastRouteCheck = now;
      const r = location.pathname + location.search;
      if (r !== this.route) {
        this.route = r;
        this.fire('route', { text: location.pathname }, (t) => {
          if (!t.path) return true;
          return typeof t.path === 'string' ? location.pathname === t.path || location.pathname.startsWith(`${t.path}/`) : t.path.test(location.pathname);
        });
      }
    }
    if (now - this.lastTimeCheck > 1000) {
      this.lastTimeCheck = now;
      const d = new Date();
      const hm = `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
      const day = d.toDateString();
      for (const e of this.entries) {
        for (const t of e.triggers) {
          if (t.on === 'time' && t.at === hm && this.timeFired.get(e) !== day) {
            this.timeFired.set(e, day);
            this.tryRun(e, { trigger: 'time', text: hm });
          }
        }
      }
    }
    if (this.domDirty) {
      this.domDirty = false;
      this.checkPresence();
    }
  }

  private checkPresence() {
    for (const [selector, before] of this.present) {
      const now = this.query(selector);
      for (const el of now) {
        if (!before.has(el)) this.fire('appear', { target: el }, (t) => t.selector === selector);
      }
      for (const el of before) {
        if (!now.has(el)) this.fire('disappear', { target: el }, (t) => t.selector === selector);
      }
      this.present.set(selector, now);
    }
  }

  private query(selector: string): Set<Element> {
    try {
      return new Set(Array.from(document.querySelectorAll(selector)).filter((el) => !this.host.isInsidePet(el)));
    } catch {
      return new Set();
    }
  }

  private fromEvent(on: 'click' | 'focus' | 'input' | 'submit', e: Event) {
    const el = e.target instanceof Element ? e.target : null;
    if (!el || this.host.isInsidePet(el)) return;
    for (const entry of this.entries) {
      for (const t of entry.triggers) {
        if (t.on !== on) continue;
        const hit = matches(el, (t as { selector?: string }).selector);
        if (!hit) continue;
        this.tryRun(entry, { trigger: on, target: hit, event: e, text: labelOf(hit) });
        break;
      }
    }
  }

  private onOver(e: PointerEvent) {
    const el = e.target instanceof Element ? e.target : null;
    if (!el || this.host.isInsidePet(el)) return;
    for (const entry of this.entries) {
      for (const t of entry.triggers) {
        if (t.on !== 'hover' || this.hoverTimers.has(entry)) continue;
        const hit = matches(el, t.selector);
        if (!hit) continue;
        const timer = window.setTimeout(() => {
          this.hoverTimers.delete(entry);
          if (hit.matches(':hover')) this.tryRun(entry, { trigger: 'hover', target: hit, text: labelOf(hit) });
        }, t.ms ?? 800);
        this.hoverTimers.set(entry, timer);
      }
    }
  }

  private onOut(e: PointerEvent) {
    const el = e.target instanceof Element ? e.target : null;
    if (!el) return;
    for (const [entry, timer] of this.hoverTimers) {
      const sel = entry.triggers.find((t): t is TriggerOf<'hover'> => t.on === 'hover')?.selector;
      const related = e.relatedTarget instanceof Element ? e.relatedTarget : null;
      if (sel && matches(el, sel) && !(related && matches(related, sel))) {
        window.clearTimeout(timer);
        this.hoverTimers.delete(entry);
      }
    }
  }

  private tryRun(e: Entry, ctx: PetRuleContext) {
    const r = e.rule;
    const now = performance.now();
    if (e.done) return;
    if (r.cooldown && now - e.lastRun < r.cooldown) return;
    if (r.chance !== undefined && Math.random() > r.chance) return;
    if (r.if && !r.if(ctx)) return;
    e.lastRun = now;
    if (r.once) e.done = true;
    this.host.run(r, ctx);
  }
}

export function labelOf(el: Element | null | undefined): string | undefined {
  if (!el) return undefined;
  const t = (el.getAttribute('aria-label') || el.getAttribute('title') || el.textContent || '').replace(/\s+/g, ' ').trim();
  return t ? t.slice(0, 60) : undefined;
}
