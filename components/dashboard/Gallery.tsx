'use client';

import { PET_PROPS, PROP_LABELS, PROP_TRICKS, PetPreview, pet, type PetExpression, type PetPose, type PetProp, type PetState, type PetTrick } from '@/components/pet';

const EXPRESSIONS: Array<[PetExpression, string]> = [
  ['neutral', 'Neutralna'],
  ['happy', 'Szczęśliwa'],
  ['sad', 'Smutna'],
  ['curious', 'Ciekawska'],
  ['confused', 'Zmieszana'],
  ['annoyed', 'Zirytowana'],
  ['surprised', 'Zaskoczona'],
  ['sleepy', 'Śpiąca'],
  ['excited', 'Podekscytowana'],
  ['content', 'Zadowolona'],
  ['love', 'Zakochana'],
  ['wink', 'Oczko'],
  ['shocked', 'W szoku'],
  ['angry', 'Zła'],
  ['hacker', 'Haker'],
  ['dizzy', 'Oszołomiona'],
];

const STATES: Array<[PetState, PetExpression, string]> = [
  ['idle', 'neutral', 'Idle'],
  ['walk', 'neutral', 'Chód'],
  ['run', 'excited', 'Bieg'],
  ['crouch', 'happy', 'Skok (start)'],
  ['jump', 'happy', 'Skok'],
  ['fall', 'surprised', 'Spadanie'],
  ['oops', 'shocked', 'Nad przepaścią'],
  ['trip', 'shocked', 'Potknięcie'],
  ['splat', 'dizzy', 'Plask'],
  ['sit', 'neutral', 'Siedzi'],
  ['sleep', 'asleep', 'Śpi'],
  ['typing', 'focused', 'Pisze'],
  ['hack', 'hacker', 'Hakuje'],
  ['coffee', 'content', 'Kawa'],
  ['fish', 'curious', 'Wędkuje'],
  ['cool', 'happy', 'Spoko'],
  ['success', 'happy', 'Sukces'],
  ['error', 'angry', 'Błąd'],
  ['confused', 'confused', 'Hmm?'],
  ['sad', 'sad', 'Smutek'],
  ['petted', 'happy', 'Głaskana'],
  ['giggle', 'excited', 'Łaskotki'],
  ['twitch-r', 'annoyed', 'Ucho'],
  ['bonk', 'dizzy', 'Bonk'],
  ['drag', 'surprised', 'Trzymana'],
];

const MOVES: Array<[PetState, PetExpression, string]> = [
  ['lie', 'content', 'Leży'],
  ['roll', 'excited', 'Turla się'],
  ['sitEdge', 'content', 'Siedzi na krawędzi'],
  ['stretch', 'sleepy', 'Przeciąga się'],
  ['dance', 'excited', 'Tańczy'],
  ['wave', 'happy', 'Macha'],
  ['point', 'curious', 'Pokazuje'],
  ['float', 'happy', 'Parasol'],
];

const TRICKS: Array<[PetProp, PetTrick, string]> = [
  ['ball', 'kick', 'Kopie piłkę'],
  ['plane', 'throw', 'Puszcza samolot'],
  ['allegro', 'toss', 'Podrzuca paczkę'],
  ['box', 'hide', 'Chowa się w pudle'],
  ['allegro', 'sit-on', 'Siedzi na paczce'],
  ['skateboard', 'ride', 'Jeździ na desce'],
  ['skateboard', 'kickflip', 'Kickflip'],
  ['headphones', 'dance', 'Słucha muzyki'],
  ['book', 'read', 'Czyta'],
  ['magnifier', 'inspect', 'Ogląda przez lupę'],
  ['laptop', 'type', 'Pisze na laptopie'],
  ['blik', 'tap', 'Płaci BLIKIEM'],
  ['booking', 'selfie', 'Selfie'],
  ['airbnb', 'call', 'Dzwoni'],
  ['balloon', 'float', 'Balonik'],
  ['umbrella', 'twirl', 'Kręci parasolem'],
  ['heart', 'hug', 'Przytula'],
  ['database', 'drum', 'Bębni'],
  ['gear', 'rotate', 'Kręci zębatką'],
  ['bug', 'chase', 'Łapie buga'],
  ['coffee', 'sip', 'Kawa'],
  ['sign', 'wave', 'Tabliczka'],
  ['globe', 'spin', 'Kręci globusem'],
  ['box', 'carry', 'Nosi pudło'],
];

const TURNAROUND: Array<[number, string]> = [
  [0, 'Przód'],
  [40, '3/4'],
  [90, 'Bok'],
  [140, '3/4 tył'],
  [180, 'Tył'],
  [-140, '3/4 tył'],
  [-90, 'Bok'],
  [-40, '3/4'],
];

function Preview({
  state,
  expression,
  prop,
  trick,
  label,
  yaw,
}: {
  state: PetState;
  expression: PetExpression;
  prop?: PetProp;
  trick?: PetTrick;
  label: string;
  yaw?: number;
}) {
  return (
    <figure className="preview">
      <PetPreview state={state} expression={expression} prop={prop ?? null} trick={trick ?? null} yaw={yaw} propText={prop === 'sign' ? 'Hej!' : undefined} />
      <figcaption>{label}</figcaption>
    </figure>
  );
}

export function Gallery() {
  return (
    <section className="card span-2" data-pet-surface="perimeter">
      <header className="card-head">
        <h2>Galeria: miny, stany i rekwizyty</h2>
        <span className="muted">SVG + animacja szkieletowa w JS, zero bibliotek · kliknij trik albo rekwizyt, a maskotka go zrobi</span>
      </header>
      <h3 className="sub">Obrót 3D</h3>
      <div className="preview-row">
        {TURNAROUND.map(([yaw, label], i) => (
          <Preview key={i} state="idle" expression="neutral" label={`${label} (${yaw}°)`} yaw={yaw} />
        ))}
      </div>
      <h3 className="sub">Miny</h3>
      <div className="preview-row">
        {EXPRESSIONS.map(([e, label]) => (
          <Preview key={e} state="idle" expression={e} label={label} />
        ))}
      </div>
      <h3 className="sub">Stany i akcje</h3>
      <div className="preview-row">
        {STATES.map(([s, e, label]) => (
          <Preview key={s} state={s} expression={e} label={label} />
        ))}
      </div>
      <h3 className="sub">Ruchy</h3>
      <div className="preview-row">
        {MOVES.map(([s, e, label]) => (
          <button key={s} type="button" className="preview preview-btn" onClick={() => (s === 'float' ? pet.play('umbrella', 'twirl') : pet.pose(s as PetPose))} data-pet-surface="off">
            <PetPreview state={s} expression={e} />
            <span className="preview-label">{label}</span>
          </button>
        ))}
      </div>
      <h3 className="sub">Zabawa rekwizytami</h3>
      <div className="preview-row">
        {TRICKS.map(([p, t, label]) => (
          <button key={`${p}-${t}`} type="button" className="preview preview-btn" onClick={() => pet.play(p, t)} data-pet-surface="off">
            <PetPreview state={p === 'coffee' ? 'coffee' : 'show'} expression={t === 'inspect' ? 'curious' : 'happy'} prop={p} trick={t} propText={p === 'sign' ? 'Hej!' : undefined} />
            <span className="preview-label">{label}</span>
          </button>
        ))}
      </div>
      <h3 className="sub">Rekwizyty</h3>
      <div className="preview-row">
        {PET_PROPS.filter((p) => p !== 'coffee').map((p) => (
          <button key={p} type="button" className="preview preview-btn" onClick={() => pet.play(p)} data-pet-surface="off">
            <PetPreview state="show" expression="happy" prop={p} trick={PROP_TRICKS[p][0]} propText={p === 'sign' ? 'Hej!' : undefined} />
            <span className="preview-label">{PROP_LABELS[p]}</span>
          </button>
        ))}
      </div>
    </section>
  );
}
