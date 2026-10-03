import {
  PET_EVENT,
  type PetActivity,
  type PetCommand,
  type PetExpression,
  type PetOptions,
  type PetPose,
  type PetProp,
  type PetReaction,
  type PetRule,
  type PetStep,
  type PetTarget,
  type PetTrick,
} from './types';

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
  /** Reakcja: 'success' | 'error' | 'confused' | 'happy' | 'sad'. Tekst opcjonalny. */
  react: (reaction: PetReaction, text?: string) => send({ type: 'react', reaction, text }),
  /** Skocz na element (Element albo selektor CSS). */
  goTo: (target: PetTarget, text?: string) => send({ type: 'goTo', target, text }),
  /**
   * Zabawa rekwizytem, np. pet.play('ball', 'kick'), pet.play('allegro', 'toss'),
   * pet.play('sign', 'wave', { text: 'Nowe zamówienie!' }). Bez triku – wybiera sama.
   */
  play: (prop: PetProp, trick?: PetTrick, o: { text?: string; ms?: number; say?: string } = {}) => send({ type: 'play', prop, trick, ...o }),
  /** Pokaż rekwizyt (skrót do play). */
  show: (prop: PetProp, text?: string, ms?: number) => send({ type: 'act', activity: 'show', prop, text, ms }),
  /** Ułóż się / rusz się: 'lie' | 'roll' | 'sitEdge' | 'dance' | 'wave' | 'stretch' | 'sleep' | 'spin'… */
  pose: (pose: PetPose, ms?: number) => send({ type: 'pose', pose, ms }),
  /** Zmień minę na chwilę. */
  emote: (expression: PetExpression, ms?: number) => send({ type: 'emote', expression, ms }),
  /** Popatrz na element / kursor. */
  look: (target: PetTarget | 'cursor', ms?: number) => send({ type: 'look', target, ms }),
  /** Czynność: 'coffee' | 'hack' | 'fish' | 'cool' | 'trip' | 'show'. */
  act: (activity: PetActivity, text?: string) => send({ type: 'act', activity, text }),
  coffee: (text?: string) => send({ type: 'act', activity: 'coffee', text }),
  hack: (text?: string) => send({ type: 'act', activity: 'hack', text }),
  fish: (text?: string) => send({ type: 'act', activity: 'fish', text }),
  cool: (text?: string) => send({ type: 'act', activity: 'cool', text }),
  /** Potknij się (przy krawędzi – spadnij koziołkując). */
  trip: () => send({ type: 'act', activity: 'trip' }),
  /** Skocz na losowy widoczny element. */
  jump: () => send({ type: 'jump' }),
  sleep: () => send({ type: 'sleep' }),
  wake: () => send({ type: 'wake' }),
  /** Usiądź przy polu i „pisz” (null = przestań). */
  work: (target: PetTarget | null) => send({ type: 'work', target }),
  /**
   * Scenka krok po kroku, np.
   * pet.sequence([{ goTo: '#cart' }, { play: 'allegro', trick: 'toss' }, { pose: 'dance', ms: 2000 }])
   */
  sequence: (steps: PetStep[]) => send({ type: 'sequence', steps }),
  /** Przerwij bieżącą scenkę/czynność. */
  stop: () => send({ type: 'stop' }),
  /** Własne zdarzenie – uruchamia reguły { when: { on: 'event', name } }. */
  emit: (name: string, detail?: unknown) => send({ type: 'emit', name, detail }),
  /** Dodaj / podmień grupę reguł (null = usuń grupę). */
  rules: (id: string, rules: PetRule[] | null) => send({ type: 'rules', id, rules }),
  /** Zmień opcje w locie, np. { size: 96 } albo { visible: false }. */
  configure: (options: Partial<Omit<PetOptions, 'rules' | 'messages'>> & { visible?: boolean }) => send({ type: 'config', options }),
};

export type PetApi = typeof pet;

export function usePet(): PetApi {
  return pet;
}

