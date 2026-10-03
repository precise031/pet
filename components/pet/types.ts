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
  | 'typing'
  | 'success'
  | 'error'
  | 'confused'
  | 'happy'
  | 'sad';

/** Mina (oczy + buzia). */
export type PetExpression =
  | 'neutral'
  | 'happy'
  | 'sad'
  | 'curious'
  | 'confused'
  | 'annoyed'
  | 'surprised'
  | 'sleepy'
  | 'asleep'
  | 'dizzy'
  | 'angry'
  | 'focused';

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
  /** Po ilu ms bez aktywności użytkownika maskotka zasypia. */
  sleepAfterMs: number;
  /** Pokazuj dymki z tekstem. */
  speech: boolean;
}

export interface PetVisual {
  state: PetState;
  expression: PetExpression;
}

export type PetTarget = Element | string;

export type PetCommand =
  | { type: 'say'; text: string; ms?: number }
  | { type: 'react'; reaction: PetReaction; text?: string }
  | { type: 'goTo'; target: PetTarget; text?: string }
  | { type: 'jump' }
  | { type: 'sleep' }
  | { type: 'wake' }
  | { type: 'work'; target: PetTarget | null }
  | { type: 'config'; options: Partial<PetOptions> & { visible?: boolean } };

/** Nazwa zdarzenia na window, przez które cała strona rozmawia z maskotką. */
export const PET_EVENT = 'pet:command';

export const DEFAULT_PET_OPTIONS: PetOptions = {
  size: 72,
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
  sleepAfterMs: 45_000,
  speech: true,
};
