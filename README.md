# Bunny Panel – maskotka, która żyje na stronie

Maskotka do panelu w **Next.js + React**: czarny króliczek w **czarnej bluzie z kapturem**, ze świecącymi oczami, zielonym i fioletowym uchem przełożonym przez kaptur i pikselowym ogonkiem. Chodzi po krawędziach przycisków, kart i okienek. Sama się sobą zajmuje, a wszystko, co mówi i kiedy co robi, programujesz Ty.

Panel w tym repo to tylko demo. Maskotka jest osobnym folderem (`components/pet`), który wstawiasz do swojego panelu.

## Co potrafi

- **Chodzi na dwóch nogach po krawędziach elementów.** Po górze przycisków i pól, a dookoła kart i okienek także po bokach i do góry nogami. Skacze między elementami i spada z krawędzi. Przy długim upadku czasem otwiera parasol.
- **Obraca się w 3D.** Przód, 3/4, bok i tył, płynnie, na sprężynie. Lewa i prawa strona zamieniają się przy obrocie, a dalsza ręka, noga, ucho i oko chowają się za ciałem.
- **Rusza się płynnie.** Każda poza to animacja szkieletowa liczona w JS. Przy zmianie czynności poprzednia poza miesza się z nową, więc nie ma przeskoków. Mina zmienia się w trakcie mrugnięcia.
- **Ma dużo ruchów:** chodzenie, bieg, siadanie, siedzenie na krawędzi z machaniem nogami, leżenie, turlanie, przeciąganie się, taniec, machanie, wskazywanie, piruet, odwracanie się, sen.
- **Bawi się rekwizytami**, zamiast tylko je trzymać:
  - kopie piłkę i ją goni (piłka odbija się od elementów strony),
  - puszcza papierowy samolot,
  - jeździ na deskorolce i robi kickflipa,
  - podrzuca paczkę Allegro, siada na niej albo chowa się w pudle,
  - płaci BLIKIEM w telefonie, robi selfie, dzwoni,
  - tańczy w słuchawkach, czyta książkę, pisze na laptopie,
  - kręci parasolem, unosi się na baloniku,
  - ogląda dane na stronie (tabele, wykresy, obrazki) przez lupę,
  - wędkuje z krawędzi okna i pije kawę.
- **Sama się sobą zajmuje.** Ma nastrój (energia, zabawa, potrzeba kontaktu, ciekawość) i od niego zależy, co wybiera. Podchodzi do „ciekawych” elementów Twojego panelu (`interestSelector`), więc zajmuje się tym, co w nim jest.
- **Czuje dotyk.** Głaskanie główki, łaskotki brzuszka i stópek, drganie ucha, „bonk” w głowę, zawroty głowy od machania kursorem, piruet po dwukliku, łapanie i rzucanie myszką.
- **Reaguje na stronę.** Patrzy na kliknięcia, przybiega do pola, w którym piszesz, zauważa zaznaczanie, kopiowanie, wklejanie i błędy JS, wskakuje na nowe okienka.

**Za darmo, bez nowych narzędzi.** Grafika to SVG pisany w kodzie, a ruch, fizyka i „mózg” to TypeScript. Jedyne zależności to `next`, `react` i `react-dom`. Projekt nie używa płatnego AI, Lottie, Rive, framer-motion ani żadnej usługi zewnętrznej.

## Uruchomienie

```bash
npm install
npm run dev      # http://localhost:3000
```

Produkcyjnie: `npm run build && npm start`.

## Dodanie do własnego panelu

1. Skopiuj folder `components/pet`.
2. Wstaw maskotkę raz w `app/layout.tsx`:

```tsx
import { Pet } from '@/components/pet';

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pl">
      <body>
        {children}
        <Pet />
      </body>
    </html>
  );
}
```

Tyle wystarczy, żeby chodziła i sama się sobą zajmowała. **Domyślnie nic nie mówi.** Teksty i reguły dodajesz sam (niżej).

Teksty i reguły mogą zawierać funkcje, a funkcji nie da się przekazać z komponentu serwerowego (`layout.tsx`). Dlatego konfigurację trzymaj w małym komponencie klienckim. Gotowy przykład jest w `components/dashboard/DemoPet.tsx`:

```tsx
'use client';
import { Pet, PET_MESSAGES_PL, type PetRule } from '@/components/pet';

const RULES: PetRule[] = [/* … */];

export function MyPet() {
  return <Pet messages={PET_MESSAGES_PL} rules={RULES} />;
}
```

Trzymaj `messages` i `rules` w stałych poza komponentem. Nowa tablica przy każdym renderze oznacza ponowne wczytanie reguł.

## Co mówi: `messages`

Maskotka mówi tylko to, co jej podasz. Każdy wpis może być:

- jednym tekstem,
- listą (losuje jeden),
- funkcją, która dostaje kontekst i zwraca tekst albo `null` (wtedy nic nie mówi).

```tsx
<Pet
  messages={{
    hello: ({ hour }) => (hour < 12 ? 'Dzień dobry, szefie!' : 'Siema!'),
    poke: ['Hej!', 'Co tam?'],
    petted: 'Mrrr…',
    click: ({ label }) => (label === 'Usuń' ? 'Na pewno? 😬' : null),
    error: ({ text }) => `Coś się wysypało: ${text}`,
    props: { allegro: 'Paczka leci! 📦' },
  }}
/>
```

Gotowy polski zestaw to `PET_MESSAGES_PL`. Możesz go rozszerzyć: `{ ...PET_MESSAGES_PL, hello: 'Cześć!' }`.

Klucze (kiedy maskotka mówi sama):

| Klucz | Kiedy |
| --- | --- |
| `hello`, `back` | pierwsze lądowanie, powrót do karty |
| `poke`, `pokeSpam` | kliknięcie w maskotkę, klikanie za często |
| `petted`, `belly`, `ear`, `head`, `feet` | dotyk kursorem w danym miejscu |
| `drag`, `thrown`, `dragWhileAsleep`, `wokenUp` | łapanie i rzucanie myszką, budzenie |
| `hardLanding`, `trip`, `tumble`, `oops`, `dizzy` | upadki, potknięcia, zawroty głowy |
| `coffee`, `hack`, `fish`, `caught`, `noFish`, `cool` | czynności |
| `lie`, `roll`, `dance`, `stretch`, `spin`, `turnBack`, `approach`, `inspect`, `umbrella` | ruchy |
| `tired`, `bored`, `lonely` | nastrój |
| `click`, `read`, `copy`, `paste`, `attract`, `unreachable` | to, co dzieje się na stronie |
| `success`, `error`, `confused`, `happy`, `sad` | reakcje (`pet.react`, błędy JS) |
| `props.<rekwizyt>` | zabawa danym rekwizytem |

Kontekst funkcji: `{ hour, mood, text?, label?, prop?, trick?, element? }`.

## Kiedy co robi: `rules`

Reguła to „kiedy X, zrób Y”:

```ts
import type { PetRule } from '@/components/pet';

const RULES: PetRule[] = [
  // nowy wiersz zamówienia → podrzuca paczkę
  { when: { on: 'appear', selector: '.order-row' }, do: { play: 'allegro', trick: 'toss' }, cooldown: 5000 },
  // zapisany formularz → taniec
  { when: { on: 'submit', selector: '#settings' }, do: [{ pose: 'dance', ms: 2500 }, { react: 'success' }] },
  // dłuższe najechanie na wykres → idzie obejrzeć przez lupę
  { when: { on: 'hover', selector: '.chart', ms: 1500 }, do: [{ goTo: 'target' }, { play: 'magnifier', trick: 'inspect' }], chance: 0.5 },
  // zdarzenie z Twojego kodu: pet.emit('payment:ok')
  { when: { on: 'event', name: 'payment:ok' }, do: { play: 'blik', trick: 'tap', say: 'Zapłacone!' } },
  // po minucie bezczynności się kładzie
  { when: { on: 'idle', ms: 60000 }, do: { pose: 'lie', ms: 8000 } },
  // codziennie o 16:00
  { when: { on: 'time', at: '16:00' }, do: [{ play: 'coffee' }, { say: 'Fajrant? ☕' }], once: true },
];
```

**Wyzwalacze `when`** (może też być tablica kilku):

| Wyzwalacz | Kiedy |
| --- | --- |
| `{ on: 'start' }` | maskotka wystartowała |
| `{ on: 'click' \| 'focus' \| 'input' \| 'submit', selector? }` | zdarzenie na elemencie pasującym do selektora |
| `{ on: 'hover', selector, ms? }` | kursor dłużej nad elementem |
| `{ on: 'appear' \| 'disappear', selector }` | element pojawił się albo zniknął z DOM |
| `{ on: 'route', path? }` | zmiana adresu (tekst albo RegExp) |
| `{ on: 'idle', ms }` | brak aktywności użytkownika |
| `{ on: 'every', ms }` | co jakiś czas |
| `{ on: 'time', at: 'HH:MM' }` | o godzinie |
| `{ on: 'event', name }` | `pet.emit(name)` z Twojego kodu |
| `{ on: 'touch', zone? }`, `{ on: 'poke' }` | dotyk (`head`, `belly`, `ear`, `feet`), kliknięcie w maskotkę |
| `{ on: 'land', hard? }` | lądowanie |
| `{ on: 'mood', mood, below?, above? }` | nastrój przekroczył próg |
| `error`, `copy`, `paste`, `select`, `return`, `scroll` | zdarzenia strony |

**Kroki `do`** (jeden, lista albo funkcja `(ctx) => kroki`) wykonują się po kolei. Każdy czeka, aż poprzedni się skończy:

| Krok | Co robi |
| --- | --- |
| `{ say: 'Tekst' }` | dymek (tekst, lista albo funkcja) |
| `{ play: 'ball', trick?: 'kick', ms?, say?, text? }` | zabawa rekwizytem |
| `{ pose: 'lie', ms? }` | ruch / poza |
| `{ act: 'coffee' \| 'hack' \| 'fish' \| 'cool' \| 'trip' }` | czynność |
| `{ react: 'success' }` | reakcja |
| `{ emote: 'love', ms? }` | sama mina |
| `{ goTo: '#el' \| 'target' }` | skok na element (`'target'` = element z wyzwalacza) |
| `{ look: '#el' \| 'target' \| 'cursor', ms? }` | patrzy na coś |
| `{ wait: 1000 }` | pauza |
| `{ emit: 'nazwa' }` | uruchamia inne reguły |
| `{ run: (ctx) => … }` | dowolny kod (może być async) |

**Opcje reguły:** `chance` (0–1), `cooldown` (ms), `once`, `if: (ctx) => boolean`, `interrupt` (domyślnie `true`, czyli przerywa bieżącą czynność).

Reguły tylko dla jednej podstrony:

```tsx
import { usePetRules } from '@/components/pet';

usePetRules([{ when: { on: 'appear', selector: '.toast-error' }, do: { react: 'error' } }]);
```

## Sterowanie z kodu: `pet`

```ts
import { pet } from '@/components/pet';

pet.say('Cześć!');
pet.play('ball', 'kick');                      // rekwizyt + trik (bez triku wybiera sama)
pet.play('sign', 'wave', { text: 'LIVE ✓' });  // tabliczka z napisem
pet.pose('roll');                              // 'lie' | 'roll' | 'sitEdge' | 'dance' | 'wave' | 'stretch' | 'spin' | …
pet.emote('love', 2000);
pet.look('#cart');
pet.react('success');                          // 'error' | 'confused' | 'happy' | 'sad'
pet.goTo('#koszyk');
pet.sequence([{ goTo: '#raport' }, { play: 'book', trick: 'read', ms: 3000 }, { pose: 'stretch' }]);
pet.stop();                                    // przerywa scenkę
pet.emit('order:new');                         // uruchamia reguły { on: 'event', name: 'order:new' }
pet.coffee();  pet.hack();  pet.fish();  pet.cool();  pet.trip();
pet.jump();  pet.sleep();  pet.wake();
pet.configure({ size: 120, hobbies: false, props: ['ball', 'coffee', 'laptop'] });
```

`pet` działa przez zdarzenie na `window`, więc nie potrzebuje Providera. Można go wołać z komponentów, hooków, `fetch` i zwykłego JS:

```ts
const res = await fetch('/api/orders', { method: 'POST', body });
if (res.ok) pet.play('allegro', 'toss', { say: 'Zamówienie dodane! 📦' });
else pet.react('error', `Błąd ${res.status} 😵`);
```

## Rekwizyty i triki

| Rekwizyt | Triki |
| --- | --- |
| `ball` | `kick` (piłka leci, a maskotka ją goni), `toss`, `bounce` |
| `globe` | `spin`, `kick`, `bounce`, `hold` |
| `plane` | `throw` (samolot leci sam) |
| `allegro`, `box` | `toss`, `carry`, `sit-on`, `hide`, `hold` |
| `skateboard` | `ride`, `kickflip` |
| `booking`, `airbnb` | `tap`, `call`, `selfie`, `hold` |
| `blik` | `tap`, `call` |
| `olx`, `allegro-lokalnie`, `vinted` | `spin`, `wave`, `hold` |
| `alebilet`, `ticketmaster` | `wave`, `read`, `hold` |
| `cloudflare` | `bounce`, `float`, `hold` |
| `database` | `drum`, `sit-on`, `hold` |
| `terminal`, `laptop` | `type` (`terminal` także `hold`) |
| `gear` | `rotate`, `hold` |
| `bug` | `chase`, `hold` |
| `heart` | `hug`, `toss`, `hold` |
| `coffee` | `sip`, `blow` |
| `headphones` | `dance` |
| `book` | `read` |
| `magnifier` | `inspect` |
| `balloon` | `float` |
| `umbrella` | `twirl` |
| `sign` | `wave`, `hold` (napis z opcji `text`) |

Lista jest w `PROP_TRICKS` (`props.tsx`). Trik, który nie pasuje do rekwizytu, zostaje zastąpiony pasującym.

## Atrybuty w HTML

| Atrybut | Co robi |
| --- | --- |
| `data-pet-surface` | element jest powierzchnią do chodzenia (`perimeter` = dookoła, `top` = tylko góra, `off` = nigdy) |
| `data-pet-ignore` | ignoruje element i wszystko w środku |
| `data-pet-interest` | „ciekawy” element – podejdzie obejrzeć go przez lupę |
| `data-pet-attract="Tekst"` | gdy element się pojawi, maskotka do niego skacze |
| `data-pet-prop="olx"` + `data-pet-trick`, `data-pet-text` | po kliknięciu bawi się rekwizytem |
| `data-pet-pose="dance"` | po kliknięciu ruch |
| `data-pet-act="fish"` | po kliknięciu czynność |
| `data-pet-react="success"` | po kliknięciu reakcja |
| `data-pet-say="Tekst"` | po kliknięciu dymek |

## Opcje `<Pet />`

| Prop | Domyślnie | Opis |
| --- | --- | --- |
| `messages` | `{}` | teksty (pusto = milczy) |
| `rules` | `[]` | reguły |
| `props` | wszystkie | rekwizyty, którymi bawi się sama |
| `interestSelector` | `table, canvas, svg, img, [data-pet-interest]` | co ogląda przez lupę |
| `hobbies` | `true` | sama się bawi, łowi, turla, tańczy |
| `size` | `104` | wysokość w px |
| `surfaceSelector` | przyciski, pola, dialogi, `[data-pet-surface]` | po czym może chodzić |
| `reactToTyping` | `true` | przybiega do pola, w którym piszesz |
| `reactToErrors` | `true` | reaguje na błędy JS |
| `feelTouch` | `true` | głaskanie, łaskotki, uszy |
| `sleepAfterMs` | `45000` | po ilu ms bez ruchu zasypia (0 = nigdy) |
| `speech` | `true` | dymki z tekstem |
| `visible` | `true` | czy jest widoczna |

## Podgląd w miejscu

`<PetPreview state="dance" />` albo `<PetPreview state="show" prop="ball" trick="kick" yaw={40} />` pokazuje animowaną maskotkę bez chodzenia po stronie, np. w ustawieniach albo na karcie powitalnej.

## Struktura

```
components/pet/
  Pet.tsx          komponent <Pet />
  PetPreview.tsx   animowany podgląd w miejscu
  PetSvg.tsx       postać: kaptur, twarz, miny, uszy, obrót 3D, efekty
  poses.ts         animacja szkieletowa: klip dla każdego ruchu i triku + płynne mieszanie
  props.tsx        rekwizyty, triki i ich ułożenie
  brands.ts        znaki marek (ścieżki SVG)
  engine.ts        fizyka, krawędzie, nastrój i decyzje, dotyk, piłka i samolot, scenki
  rules.ts         reguły „kiedy X, zrób Y”
  messages.ts      gotowy zestaw tekstów PET_MESSAGES_PL
  api.ts, hooks.ts pet.* i usePetRules
  pet.css          punkty obrotu, obrót 3D, efekty
  types.ts         typy i domyślne opcje
components/dashboard/  przykładowy panel (DemoPet.tsx = przykładowa konfiguracja)
```

## Zmiana wyglądu i ruchu

- **Kolory:** `PET_COLORS` w `PetSvg.tsx`.
- **Ruchy i triki:** `CLIPS` i `TRICK_CLIPS` w `poses.ts`. Każdy ruch to funkcja czasu zwracająca pozę (przesunięcie i obrót ciała, głowy, rąk, nóg, uszu, rekwizytu). Silnik sam miesza ją z poprzednią.
- **Obrót 3D:** `pet.css` liczy go ze zmiennych `--yc` i `--ys` (cos i sin kąta). Każda część ma swoją „głębokość” i położenie względem osi.

## Logotypy

Znaki Allegro, Vinted, Booking.com i Ticketmaster pochodzą z [simple-icons](https://simpleicons.org) 16.33, a Cloudflare i Airbnb z [svg-logos](https://github.com/gilbarbara/logos). Oba zbiory są na licencji CC0, a ścieżki są wklejone do `brands.ts`.

OLX, BLIK, Alebilet i dopisek „lokalnie” są odwzorowane kształtami, bo w otwartych zbiorach nie ma ich plików SVG. Żeby podmienić je na oficjalne, wystarczy wkleić ścieżki do `brands.ts` i użyć ich w `props.tsx`.

Znaki towarowe należą do ich właścicieli.
