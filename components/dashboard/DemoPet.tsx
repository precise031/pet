'use client';

import { PET_MESSAGES_PL, Pet, type PetMessages, type PetRule } from '@/components/pet';

/*
 * Konfiguracja maskotki dla tego demo. W docelowym panelu podmień teksty i reguły na własne –
 * bez `messages` maskotka nic nie mówi sama z siebie, bez `rules` tylko żyje własnym życiem.
 */

const MESSAGES: PetMessages = {
  ...PET_MESSAGES_PL,
  props: { ...PET_MESSAGES_PL.props, sign: ({ text }) => (text ? null : 'Hej!') },
};

const RULES: PetRule[] = [
  // nowe powiadomienie → spojrzenie i zdziwiona mina
  { when: { on: 'appear', selector: '.toast' }, do: [{ look: 'target', ms: 1400 }, { emote: 'surprised', ms: 900 }], cooldown: 1500, interrupt: false },
  // zapisana notatka → taniec
  { when: { on: 'submit', selector: '#note-card' }, do: [{ wait: 400 }, { pose: 'dance', ms: 2600 }], cooldown: 4000 },
  // dłuższe najechanie na kafelek ze statystyką → idzie obejrzeć liczby przez lupę
  {
    when: { on: 'hover', selector: '.stat', ms: 1400 },
    do: [{ goTo: 'target' }, { play: 'magnifier', trick: 'inspect', ms: 3600 }],
    cooldown: 25000,
    chance: 0.6,
  },
  // własne zdarzenie z kodu aplikacji: pet.emit('order:new')
  {
    when: { on: 'event', name: 'order:new' },
    do: [{ play: 'allegro', trick: 'toss', say: 'Nowe zamówienie! 📦' }, { pose: 'wave', ms: 1400 }],
  },
  {
    when: { on: 'event', name: 'deploy' },
    do: [{ act: 'hack', ms: 3000, say: 'Deploy w toku… 🚀' }, { play: 'sign', trick: 'wave', text: 'LIVE ✓', ms: 2600 }, { react: 'success' }],
  },
  // po 25 s bezczynności czasem się kładzie
  { when: { on: 'idle', ms: 25000 }, do: { pose: 'lie', ms: 7000 }, chance: 0.5 },
  // łaskotanie brzuszka czasem kończy się turlaniem
  { when: { on: 'touch', zone: 'belly' }, do: { pose: 'roll', ms: 1600 }, cooldown: 9000, chance: 0.35 },
];

export function DemoPet() {
  return <Pet messages={MESSAGES} rules={RULES} />;
}
