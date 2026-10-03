'use client';

import { PetSvg, type PetExpression, type PetState } from '@/components/pet';

const EXPRESSIONS: Array<[PetExpression, string]> = [
  ['neutral', 'Neutralna'],
  ['happy', 'Szczęśliwa'],
  ['sad', 'Smutna'],
  ['curious', 'Ciekawska'],
  ['confused', 'Zmieszana'],
  ['annoyed', 'Zirytowana'],
  ['surprised', 'Zaskoczona'],
  ['sleepy', 'Śpiąca'],
];

const STATES: Array<[PetState, PetExpression, string]> = [
  ['idle', 'neutral', 'Idle'],
  ['walk', 'neutral', 'Chód'],
  ['run', 'happy', 'Bieg'],
  ['crouch', 'happy', 'Skok (start)'],
  ['jump', 'happy', 'Skok'],
  ['fall', 'surprised', 'Spadanie'],
  ['splat', 'dizzy', 'Plask'],
  ['sit', 'neutral', 'Siedzi'],
  ['sleep', 'asleep', 'Śpi'],
  ['typing', 'focused', 'Pisze'],
  ['success', 'happy', 'Sukces'],
  ['error', 'angry', 'Błąd'],
  ['confused', 'confused', 'Hmm?'],
  ['drag', 'surprised', 'Trzymana'],
];

function Preview({ state, expression, label }: { state: PetState; expression: PetExpression; label: string }) {
  return (
    <figure className="preview">
      <div className="pet-preview" data-pet-state={state}>
        <PetSvg state={state} expression={expression} />
      </div>
      <figcaption>{label}</figcaption>
    </figure>
  );
}

export function Gallery() {
  return (
    <section className="card span-2" data-pet-surface="perimeter">
      <header className="card-head">
        <h2>Galeria: miny i stany</h2>
        <span className="muted">wszystko to SVG + CSS, zero bibliotek</span>
      </header>
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
    </section>
  );
}
