/** Stan (poza / animacja ciała) maskotki. */
export type PetState =
  | 'idle'
  | 'look'
  | 'walk'
  | 'run'
  | 'sit'
  | 'sleep'
  | 'wake'
  | 'crouch'
  | 'jump'
  | 'fall'
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

/** Rekwizyty, które maskotka może trzymać: pet.show('olx'). */
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
  | 'globe'
  | 'gear'
  | 'bug'
  | 'box'
  | 'heart'
  | 'coffee';

/** Czynności, które można zlecić: pet.act('fish'). */
export type PetActivity = 'coffee' | 'hack' | 'fish' | 'cool' | 'trip' | 'show';

/** Reakcje, które można wywołać z kodu: pet.react('success'). */
export type PetReaction = 'success' | 'error' | 'confused' | 'happy' | 'sad';

export interface PetOptions {
  /** Wysokość maskotki w px. */
  size: number;
  /** Selektor CSS elementów, po których maskotka może chodzić. */
  surfaceSelector: string;
  /** Przybiegaj do aktywnego pola tekstowego i „pisz” razem z użytkownikiem. */
  reactToTyping: boolean;
  /** Reaguj na błędy JS na stronie (window error / unhandledrejection). */
  reactToErrors: boolean;
  /** Reaguj na dotyk kursora (głaskanie, łaskotanie, uszy). */
  feelTouch: boolean;
  /** Sama z siebie pije kawę, łowi ryby, hakuje, pokazuje rekwizyty. */
  hobbies: boolean;
  /** Po ilu ms bez aktywności użytkownika maskotka zasypia. */
  sleepAfterMs: number;
  /** Pokazuj dymki z tekstem. */
  speech: boolean;
}

export interface PetVisual {
  state: PetState;
  expression: PetExpression;
  prop: PetProp | null;
}

export type PetTarget = Element | string;

export type PetCommand =
  | { type: 'say'; text: string; ms?: number }
  | { type: 'react'; reaction: PetReaction; text?: string }
  | { type: 'goTo'; target: PetTarget; text?: string }
  | { type: 'act'; activity: PetActivity; prop?: PetProp; text?: string; ms?: number }
  | { type: 'jump' }
  | { type: 'sleep' }
  | { type: 'wake' }
  | { type: 'work'; target: PetTarget | null }
  | { type: 'config'; options: Partial<PetOptions> & { visible?: boolean } };

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
  'globe',
  'gear',
  'bug',
  'box',
  'heart',
  'coffee',
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
  reactToTyping: true,
  reactToErrors: true,
  feelTouch: true,
  hobbies: true,
  sleepAfterMs: 45_000,
  speech: true,
};
