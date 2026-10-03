/** Stan (poza / animacja ciała) maskotki. */
export type PetState =
  | 'idle'
  | 'look'
  | 'walk'
  | 'run'
  | 'sit'
  | 'sitEdge'
  | 'lie'
  | 'sleep'
  | 'roll'
  | 'wake'
  | 'stretch'
  | 'dance'
  | 'wave'
  | 'point'
  | 'crouch'
  | 'jump'
  | 'fall'
  | 'float'
  | 'land'
  | 'splat'
  | 'recover'
  | 'drag'
  | 'trip'
  | 'oops'
  | 'typing'
  | 'hack'
  | 'coffee'
  | 'fish'
  | 'show'
  | 'ride'
  | 'carry'
  | 'chase'
  | 'cool'
  | 'success'
  | 'error'
  | 'confused'
  | 'happy'
  | 'sad'
  | 'petted'
  | 'giggle'
  | 'twitch-l'
  | 'twitch-r'
  | 'bonk'
  | 'flinch';

/** Mina (oczy + buzia). */
export type PetExpression =
  | 'neutral'
  | 'happy'
  | 'sad'
  | 'curious'
  | 'confused'
  | 'annoyed'
  | 'surprised'
  | 'shocked'
  | 'sleepy'
  | 'asleep'
  | 'dizzy'
  | 'angry'
  | 'hacker'
  | 'focused'
  | 'excited'
  | 'content'
  | 'love'
  | 'wink';

/** Rekwizyty: pet.play('olx'). */
export type PetProp =
  | 'allegro'
  | 'allegro-lokalnie'
  | 'olx'
  | 'vinted'
  | 'alebilet'
  | 'ticketmaster'
  | 'booking'
  | 'airbnb'
  | 'cloudflare'
  | 'blik'
  | 'database'
  | 'terminal'
  | 'laptop'
  | 'globe'
  | 'gear'
  | 'bug'
  | 'box'
  | 'heart'
  | 'coffee'
  | 'ball'
  | 'plane'
  | 'umbrella'
  | 'balloon'
  | 'skateboard'
  | 'headphones'
  | 'book'
  | 'magnifier'
  | 'sign';

/** Co maskotka robi z rekwizytem. Każdy rekwizyt ma swoją listę trików (PROP_TRICKS). */
export type PetTrick =
  | 'hold'
  | 'toss'
  | 'spin'
  | 'wave'
  | 'tap'
  | 'call'
  | 'selfie'
  | 'bounce'
  | 'drum'
  | 'rotate'
  | 'chase'
  | 'hug'
  | 'type'
  | 'sip'
  | 'blow'
  | 'read'
  | 'inspect'
  | 'kick'
  | 'throw'
  | 'float'
  | 'twirl'
  | 'ride'
  | 'kickflip'
  | 'dance'
  | 'sit-on'
  | 'hide'
  | 'carry';

/** Pozy / ruchy, które można zlecić: pet.pose('roll'). */
export type PetPose =
  | 'idle'
  | 'sit'
  | 'sitEdge'
  | 'lie'
  | 'sleep'
  | 'roll'
  | 'stretch'
  | 'dance'
  | 'wave'
  | 'point'
  | 'spin'
  | 'turnBack'
  | 'look'
  | 'cool'
  | 'walk'
  | 'run';

/** Starsze skróty czynności (pet.act). */
export type PetActivity = 'coffee' | 'hack' | 'fish' | 'cool' | 'trip' | 'show';

/** Reakcje: pet.react('success'). */
export type PetReaction = 'success' | 'error' | 'confused' | 'happy' | 'sad';

/** Nastrój 0..1 – od niego zależy, co maskotka sama wybiera. */
export interface PetMood {
  energy: number;
  fun: number;
  social: number;
  curiosity: number;
}

// ───────────────────────── teksty ─────────────────────────

export interface PetLineContext {
  /** Tekst związany ze zdarzeniem (zaznaczony tekst, komunikat błędu…). */
  text?: string;
  /** Etykieta klikniętego elementu. */
  label?: string;
  prop?: PetProp;
  trick?: PetTrick;
  element?: Element | null;
  hour: number;
  mood: PetMood;
}

/** Tekst dymka: jeden, losowy z listy albo funkcja (może zwrócić null = nic nie mów). */
export type PetLine = string | readonly string[] | ((ctx: PetLineContext) => string | readonly string[] | null | undefined);

export type PetMessageKey =
  | 'hello'
  | 'poke'
  | 'pokeSpam'
  | 'hardLanding'
  | 'thrown'
  | 'drag'
  | 'dragWhileAsleep'
  | 'wokenUp'
  | 'attract'
  | 'trip'
  | 'tumble'
  | 'oops'
  | 'petted'
  | 'belly'
  | 'ear'
  | 'head'
  | 'feet'
  | 'coffee'
  | 'hack'
  | 'fish'
  | 'caught'
  | 'cool'
  | 'tired'
  | 'bored'
  | 'lonely'
  | 'back'
  | 'spin'
  | 'turnBack'
  | 'approach'
  | 'dizzy'
  | 'copy'
  | 'paste'
  | 'read'
  | 'click'
  | 'unreachable'
  | 'noFish'
  | 'lie'
  | 'roll'
  | 'dance'
  | 'stretch'
  | 'inspect'
  | 'umbrella'
  | 'success'
  | 'error'
  | 'confused'
  | 'happy'
  | 'sad';

/**
 * Wszystko, co maskotka mówi sama z siebie. Domyślnie puste – maskotka milczy,
 * dopóki nie podasz własnych tekstów (albo gotowego zestawu, np. PET_MESSAGES_PL).
 */
export type PetMessages = Partial<Record<PetMessageKey, PetLine>> & {
  /** Teksty przy zabawie rekwizytami. */
  props?: Partial<Record<PetProp, PetLine>>;
};

// ───────────────────────── reguły ─────────────────────────

export type PetTouchZone = 'head' | 'belly' | 'ear' | 'feet';

/** Kiedy reguła ma zadziałać. */
export type PetTrigger =
  | { on: 'start' }
  | { on: 'click'; selector?: string }
  | { on: 'hover'; selector: string; ms?: number }
  | { on: 'appear'; selector: string }
  | { on: 'disappear'; selector: string }
  | { on: 'focus'; selector?: string }
  | { on: 'input'; selector?: string }
  | { on: 'submit'; selector?: string }
  | { on: 'route'; path?: string | RegExp }
  | { on: 'idle'; ms: number }
  | { on: 'every'; ms: number }
  | { on: 'time'; at: string }
  | { on: 'event'; name: string }
  | { on: 'error' }
  | { on: 'copy' }
  | { on: 'paste' }
  | { on: 'select' }
  | { on: 'return' }
  | { on: 'scroll' }
  | { on: 'poke' }
  | { on: 'touch'; zone?: PetTouchZone }
  | { on: 'land'; hard?: boolean }
  | { on: 'mood'; mood: keyof PetMood; below?: number; above?: number };

export interface PetRuleContext {
  trigger: PetTrigger['on'];
  /** Element, który wywołał regułę (kliknięty, nowy w DOM…). */
  target?: Element | null;
  text?: string;
  detail?: unknown;
  event?: Event;
}

export type PetTarget = Element | string;

/** Jeden krok sekwencji. Kroki wykonują się po kolei; każdy czeka, aż poprzedni się skończy. */
export type PetStep =
  | { say: PetLine; ms?: number }
  | { react: PetReaction; say?: string }
  | { play: PetProp; trick?: PetTrick; ms?: number; say?: string; text?: string }
  | { act: PetActivity; ms?: number; say?: string }
  | { pose: PetPose; ms?: number; say?: string }
  | { emote: PetExpression; ms?: number }
  | { goTo: PetTarget | 'target'; say?: string }
  | { look: PetTarget | 'target' | 'cursor'; ms?: number }
  | { wait: number }
  | { emit: string; detail?: unknown }
  | { run: (ctx: PetRuleContext) => void | Promise<void> };

export interface PetRule {
  id?: string;
  when: PetTrigger | PetTrigger[];
  do: PetStep | PetStep[] | ((ctx: PetRuleContext) => PetStep[] | void | Promise<void>);
  /** Szansa 0..1 (domyślnie 1). */
  chance?: number;
  /** Minimalny odstęp między uruchomieniami (ms). */
  cooldown?: number;
  once?: boolean;
  /** Dodatkowy warunek. */
  if?: (ctx: PetRuleContext) => boolean;
  /** Przerwij to, co maskotka właśnie robi (domyślnie true). */
  interrupt?: boolean;
}

// ───────────────────────── opcje ─────────────────────────

export interface PetOptions {
  /** Wysokość maskotki w px. */
  size: number;
  /** Selektor CSS elementów, po których maskotka może chodzić. */
  surfaceSelector: string;
  /** Elementy „ciekawe” – maskotka podchodzi do nich z lupą (tabele, wykresy…). */
  interestSelector: string;
  /** Przybiegaj do aktywnego pola tekstowego i „pisz” razem z użytkownikiem. */
  reactToTyping: boolean;
  /** Reaguj na błędy JS na stronie (window error / unhandledrejection). */
  reactToErrors: boolean;
  /** Reaguj na dotyk kursora (głaskanie, łaskotanie, uszy). */
  feelTouch: boolean;
  /** Sama się sobą zajmuje: bawi się rekwizytami, łowi, tańczy, turla… */
  hobbies: boolean;
  /** Rekwizyty, którymi bawi się sama (domyślnie wszystkie). */
  props: PetProp[];
  /** Po ilu ms bez aktywności użytkownika maskotka zasypia (0 = nigdy). */
  sleepAfterMs: number;
  /** Pokazuj dymki z tekstem. */
  speech: boolean;
  /** Teksty – domyślnie puste (maskotka milczy). */
  messages: PetMessages;
  /** Reguły „kiedy X, zrób Y”. */
  rules: PetRule[];
}

export interface PetVisual {
  state: PetState;
  expression: PetExpression;
  prop: PetProp | null;
  trick: PetTrick | null;
  /** Tekst na tabliczce (rekwizyt 'sign'). */
  propText?: string;
}

/** Obiekty, które oderwały się od maskotki (kopnięta piłka, papierowy samolot). */
export interface PetEntity {
  id: number;
  prop: PetProp;
}

export type PetCommand =
  | { type: 'say'; text: string; ms?: number }
  | { type: 'react'; reaction: PetReaction; text?: string }
  | { type: 'goTo'; target: PetTarget; text?: string }
  | { type: 'act'; activity: PetActivity; prop?: PetProp; text?: string; ms?: number }
  | { type: 'play'; prop: PetProp; trick?: PetTrick; text?: string; ms?: number; say?: string }
  | { type: 'pose'; pose: PetPose; ms?: number }
  | { type: 'emote'; expression: PetExpression; ms?: number }
  | { type: 'look'; target: PetTarget | 'cursor'; ms?: number }
  | { type: 'sequence'; steps: PetStep[] }
  | { type: 'stop' }
  | { type: 'emit'; name: string; detail?: unknown }
  | { type: 'rules'; id: string; rules: PetRule[] | null }
  | { type: 'jump' }
  | { type: 'sleep' }
  | { type: 'wake' }
  | { type: 'work'; target: PetTarget | null }
  | { type: 'config'; options: Partial<Omit<PetOptions, 'rules' | 'messages'>> & { visible?: boolean } };

/** Nazwa zdarzenia na window, przez które cała strona rozmawia z maskotką. */
export const PET_EVENT = 'pet:command';

export const PET_PROPS: readonly PetProp[] = [
  'allegro',
  'allegro-lokalnie',
  'olx',
  'vinted',
  'alebilet',
  'ticketmaster',
  'booking',
  'airbnb',
  'cloudflare',
  'blik',
  'database',
  'terminal',
  'laptop',
  'globe',
  'gear',
  'bug',
  'box',
  'heart',
  'coffee',
  'ball',
  'plane',
  'umbrella',
  'balloon',
  'skateboard',
  'headphones',
  'book',
  'magnifier',
  'sign',
];

export const DEFAULT_PET_OPTIONS: PetOptions = {
  size: 104,
  surfaceSelector: [
    '[data-pet-surface]',
    'button',
    '[role="dialog"]',
    'dialog[open]',
    'textarea',
    'select',
    'input:not([type="checkbox"]):not([type="radio"]):not([type="range"]):not([type="hidden"])',
  ].join(', '),
  interestSelector: 'table, canvas, svg:not(.pet-svg), img, [data-pet-interest]',
  reactToTyping: true,
  reactToErrors: true,
  feelTouch: true,
  hobbies: true,
  props: [...PET_PROPS],
  sleepAfterMs: 45_000,
  speech: true,
  messages: {},
  rules: [],
};
