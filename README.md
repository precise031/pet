# Bunny Panel – maskotka, która żyje na stronie

Panel w **Next.js + React** z maskotką: czarny króliczek w **czarnej bluzie z kapturem**, świecącymi oczami, zielonym i fioletowym uchem przełożonym przez kaptur, neonowymi sznurkami, kieszenią kangurka i pikselowym ogonkiem.

## Co potrafi

- **Chodzi na dwóch nogach po krawędziach elementów.** Po górze przycisków i pól, a dookoła kart i okienek także po bokach i do góry nogami pod spodem. Skacze między elementami.
- **Obraca się w 3D.** Przód, 3/4, bok i tył (z nadrukiem na kapturze), płynnie, na sprężynie. Odwraca się w stronę marszu, kursora albo klikniętego elementu.
- **Sama decyduje, co robi.** Ma nastrój (energia, zabawa, potrzeba kontaktu, ciekawość):
  - zmęczona siada i pije kawę,
  - znudzona bawi się rekwizytami albo idzie na ryby,
  - stęskniona podchodzi do kursora,
  - ciekawska odwraca się i „ogląda stronę”.
- **Bawi się rekwizytami, a nie tylko je trzyma:**
  - podrzuca i łapie paczkę Allegro,
  - kręci logo OLX na palcu,
  - macha biletem Alebilet lub Ticketmaster,
  - wpisuje kod BLIK w telefonie (na koniec pojawia się zielony „ptaszek”), tak samo rezerwuje w Booking i Airbnb,
  - odbija chmurkę Cloudflare uszami,
  - bębni w bazę danych, łapie buga, przytula serce.
- **Wędkuje.** Zarzuca wędkę z krawędzi okna, ryba bierze, wyciąga ją.
- **Wywala się.** Potyka się i koziołkuje z krawędzi na okno poniżej; przy twardym lądowaniu robi „plask”. Czasem wchodzi w powietrze za krawędzią, patrzy w dół i dopiero wtedy spada.
- **Czuje dotyk.**
  - Głaskanie główki kursorem: mruczy, rumieni się, lecą serduszka.
  - Brzuszek i stópki: łaskotki.
  - Ucho: ucho drga, a ona się złości.
  - Kliknięcie w głowę: „bonk”.
  - Szybkie machanie kursorem przy niej: zawroty głowy.
  - Podwójne kliknięcie: piruet.
- **Reaguje na to, co robisz w panelu.**
  - Patrzy na kliknięte przyciski i je komentuje.
  - Zapamiętuje marki z klikniętych przycisków (np. „Wystaw na OLX”) i potem bawi się ich logo.
  - „Czyta” zaznaczony tekst, zauważa kopiowanie i wklejanie.
  - Wita, gdy wracasz do karty.
  - Przybiega „hakować” na laptopie, gdy piszesz w polu tekstowym.
  - Reaguje na błędy JS.
  - Wskakuje na nowe okna i powiadomienia, a gdy znikną, spada.
- **Hakerski tryb.** Kaptur nasunięty na oczy, zielone oczy, laptop i terminale w tle. Do tego okulary, kawa i dymki z tekstem.

**Za darmo, bez nowych narzędzi.** Grafika to SVG pisany w kodzie, animacje to CSS, a ruch, fizyka i „mózg” to TypeScript. Jedyne zależności to `next`, `react` i `react-dom`. Projekt nie korzysta z płatnego AI, Lottie, Rive, framer-motion ani żadnej usługi zewnętrznej.

## Uruchomienie

```bash
npm install
npm run dev      # http://localhost:3000
```

Produkcyjnie: `npm run build && npm start`.

## Struktura

```
components/pet/        ← cała maskotka (można skopiować do innego projektu)
  Pet.tsx              komponent <Pet />, wstawiany raz w layout
  PetSvg.tsx           postać w bluzie: twarz, miny, uszy, kaptur, obrót 3D, akcesoria, efekty
  props.tsx            rekwizyty i style zabawy (podrzucanie, telefon, machanie…)
  brands.ts            aktualne znaki marek (ścieżki SVG)
  engine.ts            fizyka, chodzenie po krawędziach, nastrój i decyzje, dotyk, reakcje na stronę
  pet.css              wszystkie animacje i choreografie
  api.ts               pet.say(), pet.show()… – sterowanie z dowolnego miejsca
  types.ts             typy i domyślne opcje
components/dashboard/  ← przykładowy panel (karty, przesuwane okna, formularz, galeria)
app/                   ← Next.js App Router
```

## Jak dodać maskotkę do własnego panelu

1. Skopiuj folder `components/pet`.
2. W `app/layout.tsx`:

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

Tyle wystarczy. Maskotka sama znajduje przyciski, pola tekstowe i okienka (`role="dialog"`).

### Atrybuty w HTML

| Atrybut | Co robi |
| --- | --- |
| `data-pet-surface` | element jest powierzchnią do chodzenia; duże elementy obchodzi dookoła |
| `data-pet-surface="perimeter"` | chodzi dookoła elementu (góra → bok → spód → bok) |
| `data-pet-surface="top"` | chodzi tylko po górnej krawędzi |
| `data-pet-surface="off"` | nigdy nie wchodzi na ten element |
| `data-pet-ignore` | ignoruje element i wszystko w środku |
| `data-pet-attract="Tekst"` | gdy element się pojawi, maskotka do niego skacze i mówi tekst |
| `data-pet-say="Tekst"` | po kliknięciu maskotka mówi tekst |
| `data-pet-react="success"` | po kliknięciu reakcja: `success`, `error`, `confused`, `happy` albo `sad` |
| `data-pet-prop="olx"` | po kliknięciu bawi się rekwizytem (lista niżej) |
| `data-pet-act="fish"` | po kliknięciu czynność: `coffee`, `hack`, `fish`, `cool`, `trip` |

```tsx
<div className="card" data-pet-surface="perimeter">…</div>
<button data-pet-prop="blik" data-pet-say="Zapłacone BLIKIEM 📲">Zapłać</button>
<div role="dialog" data-pet-attract="Ooo, nowe okienko! 👀">…</div>
```

Dostępne rekwizyty: `allegro`, `allegro-lokalnie`, `olx`, `vinted`, `alebilet`, `ticketmaster`, `booking`, `airbnb`, `cloudflare`, `blik`, `database`, `terminal`, `globe`, `gear`, `bug`, `box`, `heart`, `coffee`.

### Sterowanie z kodu

```ts
import { pet } from '@/components/pet';

pet.say('Cześć!');
pet.react('success');                        // 'error' | 'confused' | 'happy' | 'sad'
pet.show('olx', 'Sprzedane! 💸');            // zabawa rekwizytem
pet.coffee();  pet.hack();  pet.fish();  pet.cool();
pet.trip();                                  // biegnie do krawędzi i się wywala
pet.goTo('#koszyk', 'Idę zobaczyć!');        // skok na element (selektor albo element)
pet.jump();  pet.sleep();  pet.wake();
pet.configure({ size: 120, hobbies: false, feelTouch: true, visible: true });
```

Przykład z `fetch`:

```ts
const res = await fetch('/api/orders', { method: 'POST', body });
if (res.ok) pet.show('allegro', 'Zamówienie dodane! 📦');
else pet.react('error', `Błąd ${res.status} 😵`);
```

`pet` działa przez zdarzenie na `window`, więc nie potrzebuje Providera. Można go wołać z komponentów, hooków i zwykłego JS.

### Opcje `<Pet />`

| Prop | Domyślnie | Opis |
| --- | --- | --- |
| `size` | `104` | wysokość w px |
| `surfaceSelector` | przyciski, pola, dialogi, `[data-pet-surface]` | po czym może chodzić |
| `reactToTyping` | `true` | przybiega do pola, w którym piszesz |
| `reactToErrors` | `true` | reaguje na błędy JS na stronie |
| `feelTouch` | `true` | głaskanie, łaskotki, uszy |
| `hobbies` | `true` | sama pije kawę, łowi, hakuje, bawi się rekwizytami |
| `sleepAfterMs` | `45000` | po ilu ms bez ruchu zasypia |
| `speech` | `true` | dymki z tekstem |
| `visible` | `true` | czy maskotka jest widoczna |

## Logotypy

Znaki Allegro, Vinted, Booking.com i Ticketmaster pochodzą z [simple-icons](https://simpleicons.org) 16.33, a Cloudflare i Airbnb (pełny kolor) z [svg-logos](https://github.com/gilbarbara/logos). Oba zbiory są na licencji CC0, a ścieżki są wklejone do `brands.ts`.

OLX, BLIK, Alebilet i dopisek „lokalnie” są odwzorowane kształtami, bo w otwartych zbiorach nie ma ich plików SVG. Żeby podmienić je na oficjalne, wystarczy wkleić ścieżki do `brands.ts` i użyć ich w `props.tsx`.

Znaki towarowe należą do ich właścicieli.

## Zmiana wyglądu

- **Kolory:** `PET_COLORS` w `PetSvg.tsx`.
- **Pozy i animacje:** `pet.css`. Każdy stan to selektor `[data-pet-state='…']`, każda zabawa rekwizytem to `[data-pet-play='…']`.
- **Obrót 3D:** liczy się ze zmiennych CSS `--yc` i `--ys` (cos i sin kąta). Każda część ciała ma w CSS swoją „głębokość”.
