import { PET_EVENT, type PetCommand, type PetOptions, type PetReaction, type PetTarget } from './types';

function send(cmd: PetCommand) {
  if (typeof window === 'undefined') return;
  window.dispatchEvent(new CustomEvent<PetCommand>(PET_EVENT, { detail: cmd }));
}

/**
 * Sterowanie maskotką z dowolnego miejsca w kodzie (komponent, hook, fetch, zwykły JS).
 * Działa przez zdarzenie na window, więc nie potrzeba żadnego Providera.
 */
export const pet = {
  /** Dymek z tekstem. */
  say: (text: string, ms?: number) => send({ type: 'say', text, ms }),
  /** Reakcja: 'success' | 'error' | 'confused' | 'happy' | 'sad'. Pusty tekst ('') = bez dymka. */
  react: (reaction: PetReaction, text?: string) => send({ type: 'react', reaction, text }),
  /** Skocz na element (Element albo selektor CSS). */
  goTo: (target: PetTarget, text?: string) => send({ type: 'goTo', target, text }),
  /** Skocz na losowy widoczny element. */
  jump: () => send({ type: 'jump' }),
  sleep: () => send({ type: 'sleep' }),
  wake: () => send({ type: 'wake' }),
  /** Usiądź przy polu i „pisz” (null = przestań). */
  work: (target: PetTarget | null) => send({ type: 'work', target }),
  /** Zmień opcje w locie, np. { size: 96 } albo { visible: false }. */
  configure: (options: Partial<PetOptions> & { visible?: boolean }) => send({ type: 'config', options }),
};

export type PetApi = typeof pet;

export function usePet(): PetApi {
  return pet;
}
