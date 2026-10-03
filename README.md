# Bunny Panel – maskotka chodząca po stronie

Panel w **Next.js + React** z maskotką (czarny króliczek z zielonym i fioletowym uchem), która żyje na stronie:

- **chodzi po krawędziach elementów**: po górze przycisków i pól, a dookoła kart i okienek także po bokach i do góry nogami pod spodem,
- **skacze** między elementami, **spada**, gdy element zniknie (zamknięte okienko, powiadomienie) albo gdy go przewiniesz,
- **przybiega do pola tekstowego**, w którym piszesz, i „pisze” razem z Tobą na laptopie,
- **reaguje**: sukces, błąd, „hmm?”, radość, smutek oraz błędy JS na stronie,
- **mówi w dymkach**, **zasypia** po 45 s bez ruchu i budzi się, gdy wrócisz,
- można ją **złapać myszką i rzucić** (przy mocnym rzucie robi „plask” i widzi gwiazdki),
- oczy **śledzą kursor**.

**Za darmo, bez dodatkowych narzędzi.** Grafika to ręcznie napisany SVG, animacje to czysty CSS, a ruch i fizyka to kilkaset linijek TypeScriptu. Projekt nie ma zależności poza `next`, `react` i `react-dom`. Nie używa Lottie, Rive, framer-motion ani żadnych płatnych usług.

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
  PetSvg.tsx           grafika SVG: miny, uszy, efekty (zzz, plusy, gwiazdki)
  engine.ts            fizyka, chodzenie po krawędziach, decyzje, przeciąganie
  pet.css              animacje i dymek
  api.ts               pet.say(), pet.react()… – sterowanie z dowolnego miejsca
  types.ts             typy i domyślne opcje
components/dashboard/  ← przykładowy panel (karty, okno, formularz, galeria stanów)
app/                   ← Next.js App Router
```

## Jak dodać maskotkę do własnego panelu

1. Skopiuj folder `components/pet` do swojego projektu.
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

```tsx
<div className="card" data-pet-surface="perimeter">…</div>
<button data-pet-react="success" data-pet-say="Zapisane! ✨">Zapisz</button>
<div role="dialog" data-pet-attract="Ooo, nowe okienko! 👀">…</div>
```

### Sterowanie z kodu

```ts
import { pet } from '@/components/pet';

pet.say('Cześć!');
pet.react('success');                     // albo 'error' | 'confused' | 'happy' | 'sad'
pet.react('error', 'API zwróciło 500 😵');
pet.goTo('#koszyk', 'Idę zobaczyć!');     // selektor albo element
pet.jump();                               // skok na losowy element
pet.sleep();
pet.wake();
pet.configure({ size: 96 });              // zmiana opcji w locie
pet.configure({ visible: false });
```

Przykład z `fetch`:

```ts
const res = await fetch('/api/orders', { method: 'POST', body });
if (res.ok) pet.react('success', 'Zamówienie dodane! 📦');
else pet.react('error', `Błąd ${res.status} 😵`);
```

`pet` działa przez zdarzenie na `window`, więc nie potrzebuje Providera. Można go wołać z komponentów, hooków i zwykłego JS. Bez Reacta: `window.dispatchEvent(new CustomEvent('pet:command', { detail: { type: 'say', text: 'Hej' } }))`.

### Opcje `<Pet />`

| Prop | Domyślnie | Opis |
| --- | --- | --- |
| `size` | `72` | wysokość w px |
| `surfaceSelector` | przyciski, pola, dialogi, `[data-pet-surface]` | po czym może chodzić |
| `reactToTyping` | `true` | przybiega do pola, w którym piszesz |
| `reactToErrors` | `true` | reaguje na błędy JS na stronie |
| `sleepAfterMs` | `45000` | po ilu ms bez ruchu zasypia |
| `speech` | `true` | dymki z tekstem |
| `visible` | `true` | czy maskotka jest widoczna |

## Zmiana wyglądu

Kolory są w `PET_COLORS` w `components/pet/PetSvg.tsx` (paleta z arkusza: `#B6FF38`, `#9B5CFF`, `#F4F2E0`…). Miny są w komponencie `Face`, a pozy i animacje w `pet.css`, gdzie każdy stan to selektor `[data-pet-state='…']`. Nową pozę dodaje się jedną regułą CSS, bez dotykania silnika.
