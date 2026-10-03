import type { PetLine, PetLineContext, PetMessageKey, PetMessages } from './types';

/**
 * Przykładowy zestaw polskich tekstów. Maskotka domyślnie milczy – żeby mówiła,
 * podaj własne teksty albo ten zestaw: <Pet messages={PET_MESSAGES_PL} />
 * Możesz też go rozszerzyć: { ...PET_MESSAGES_PL, hello: 'Siema!' }
 */
export const PET_MESSAGES_PL: PetMessages = {
  hello: ({ hour }) =>
    hour < 5 ? 'Nie śpisz jeszcze? 🌙' : hour < 11 ? 'Dzień dobry! ☀️' : hour >= 19 ? 'Dobry wieczór! 🌙' : ['Hej! Jestem tu 👋', 'Cześć! 👋'],
  poke: ['Hej! 👋', 'Co tam?', 'Klik!', 'Jestem, jestem!'],
  pokeSpam: 'Ej! Przestań mnie klikać 😤',
  hardLanding: ['Auć! ⭐', 'Ała… 😵', 'Uff… twarde lądowanie'],
  thrown: ['Wiiiiii! 🚀', 'Aaaa!', 'Leeeecę!'],
  drag: ['Gdzie mnie niesiesz?', 'Hej, postaw mnie!', 'Wysoko! 😳'],
  dragWhileAsleep: 'Hej! Tu się śpi! 😾',
  wokenUp: 'Mmm… jeszcze 5 minut 😴',
  attract: ['Ooo, coś nowego! 👀', 'Co to? 👀'],
  trip: ['Auć! 🤕', 'Kto tu położył ten piksel?!', 'Nic się nie stało… 😅'],
  tumble: ['Uaaaa! 😱', 'Łooo! 🙃'],
  oops: ['O-oł… 😳', 'Oj…'],
  petted: ['Mrrr… 💚', 'Jeszcze, jeszcze! 🥰', 'Miło… 😌'],
  belly: ['Hihi! Łaskocze! 🤭', 'Nie brzuszek! 😆'],
  ear: ['Ej, to moje ucho! 😾', 'Ucho jest wrażliwe!'],
  head: ['Auć! Moja głowa! 😵', 'Bonk! 🔨'],
  feet: ['Stópki łaskoczą! 😂'],
  coffee: ['Przerwa na kawkę ☕', 'Bez kawy nie deployuję ☕'],
  hack: ['Wchodzę do systemu… 💻', 'Kompiluję… 🧑‍💻'],
  fish: ['Idę na ryby 🎣', 'Może coś bierze… 🎣'],
  caught: ['Mam rybę! 🐟', 'Złowione! 🐟'],
  cool: ['Wszystko pod kontrolą 😎'],
  tired: ['Potrzebuję kawy… ☕', 'Bateria 10%… 🔋'],
  bored: ['Nudzi mi się… 🥱', 'Co by tu zbroić… 😏'],
  lonely: ['Pobaw się ze mną 🥺', 'Halo? Jest tu ktoś? 👀'],
  back: ['Witaj z powrotem! 👋', 'O, wracasz! 😊'],
  spin: ['Wiii! 💫'],
  turnBack: ['Co tu mamy… 🤔', 'Sprawdzam stronę 👀'],
  approach: ['Co tam robisz? 👀', 'Pokaż! 👀'],
  dizzy: ['Kręci mi się w głowie 😵‍💫', 'Za szybko! 🌀'],
  copy: ['Skopiowane! 📋'],
  paste: ['Wklejone! 📌'],
  read: ({ text }) => (text ? `Czytam: „${text.length > 42 ? `${text.slice(0, 42)}…` : text}” 🤓` : null),
  click: ({ label }) => (label ? [`Klik w „${label}” 👀`, `O, „${label}”!`] : null),
  unreachable: 'Nie sięgam tam 🙈',
  noFish: 'Nie ma gdzie łowić 🎣',
  lie: ['Chwila relaksu… 😌', 'Leżakowanie 🛋️'],
  roll: ['Turlu turlu! 🌀', 'Wiiii! 🌀'],
  dance: ['Muza! 🎧', 'Tańczymy! 🕺'],
  stretch: ['Ziew… 🥱'],
  inspect: ['Hmm, ciekawe dane… 🔍', 'Sprawdzam liczby 🔍'],
  umbrella: ['Spadochron… znaczy parasol! ☂️'],
  success: ['Udało się! ✨', 'Sukces! 🎉'],
  error: ({ text }) => (text ? `Ups! ${text}` : 'Ups… coś poszło nie tak ⚠️'),
  confused: ['Hmm? 🤔', 'Że co?'],
  happy: ['Jej! 💚', 'Super! 😄'],
  sad: ['Smutno mi… 😢'],
  props: {
    allegro: ['Paczka z Allegro! 📦', 'Hop! Łap paczkę! 📦'],
    'allegro-lokalnie': ['Okazja z Allegro Lokalnie! 🏷️'],
    olx: ['Sprzedane na OLX! 💸', '„Czy aktualne?” 🙄'],
    vinted: ['Ciuchy z Vinted 👕'],
    alebilet: ['Mam bilet! 🎟️'],
    ticketmaster: ['Bilety na koncert! 🎫'],
    booking: ['Rezerwuję hotel 🏨'],
    airbnb: ['Domek na weekend? 🏡'],
    cloudflare: ['Cloudflare: ochrona włączona ☁️'],
    blik: ['Płacę BLIKIEM 📲'],
    database: ['Backup bazy zrobiony 💾'],
    terminal: ['git push --force 😎'],
    laptop: ['Kodzimy! 💻'],
    globe: ['Ping do całego świata 🌍'],
    gear: ['Konfiguruję… ⚙️'],
    bug: ['Łapię buga! 🐛'],
    box: ['Paczka spakowana 📦'],
    heart: ['Dla Ciebie 💚'],
    coffee: ['Kawa = kod ☕'],
    ball: ['Gol! ⚽', 'Łap! ⚽'],
    plane: ['Samolocik! ✈️'],
    umbrella: ['Pada? ☂️'],
    balloon: ['Balonik! 🎈'],
    skateboard: ['Kickflip! 🛹'],
    headphones: ['Muza! 🎧'],
    book: ['Czytam dokumentację 📖'],
    magnifier: ['Co my tu mamy… 🔍'],
  },
};

/** Zamienia wpis tekstu na konkretny napis (losuje z listy, wywołuje funkcję). */
export function resolveLine(line: PetLine | null | undefined, ctx: PetLineContext): string | null {
  if (line == null) return null;
  const value = typeof line === 'function' ? line(ctx) : line;
  if (value == null) return null;
  if (typeof value === 'string') return value || null;
  if (!value.length) return null;
  return value[Math.floor(Math.random() * value.length)] || null;
}

export function messageFor(messages: PetMessages, key: PetMessageKey): PetLine | undefined {
  return messages[key];
}
