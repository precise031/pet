'use client';

import { PET_PROPS, PROP_LABELS, PetSvg, pet, type PetExpression, type PetProp, type PetState } from '@/components/pet';

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

const TURNAROUND: Array<[number, string]> = [
  [0, 'Przód'],
  [35, '3/4'],
  [75, 'Bok'],
  [125, '3/4 tył'],
  [180, 'Tył'],
  [-125, '3/4 tył'],
  [-75, 'Bok'],
  [-35, '3/4'],
];

function Preview({ state, expression, prop, label, yaw }: { state: PetState; expression: PetExpression; prop?: PetProp; label: string; yaw?: number }) {
  return (
    <figure className="preview">
      <div className="pet-preview" data-pet-state={state} style={{ ['--dir' as string]: 1 }}>
        <PetSvg state={state} expression={expression} prop={prop ?? (state === 'coffee' ? 'coffee' : null)} yaw={yaw} />
      </div>
      <figcaption>{label}</figcaption>
    </figure>
  );
}

export function Gallery() {
  return (
    <section className="card span-2" data-pet-surface="perimeter">
      <header className="card-head">
        <h2>Galeria: miny, stany i rekwizyty</h2>
        <span className="muted">wszystko to SVG + CSS, zero bibliotek · kliknij rekwizyt, a maskotka go pokaże</span>
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
      <h3 className="sub">Rekwizyty</h3>
      <div className="preview-row">
        {PET_PROPS.filter((p) => p !== 'coffee').map((p) => (
          <button key={p} type="button" className="preview preview-btn" onClick={() => pet.show(p)} data-pet-surface="off">
            <div className="pet-preview pet-preview--play" data-pet-state="show">
              <PetSvg state="show" expression="happy" prop={p} />
            </div>
            <span className="preview-label">{PROP_LABELS[p]}</span>
          </button>
        ))}
      </div>
    </section>
  );
}
