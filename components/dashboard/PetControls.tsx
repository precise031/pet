'use client';

import { useState, type FormEvent } from 'react';
import { PET_PROPS, PROP_LABELS, PROP_TRICKS, pet, type PetPose, type PetProp, type PetTrick } from '@/components/pet';

const POSES: Array<[PetPose, string]> = [
  ['lie', '🛋 Połóż się'],
  ['roll', '🌀 Turlaj się'],
  ['sitEdge', '🪑 Usiądź na krawędzi'],
  ['stretch', '🙆 Przeciągnij się'],
  ['dance', '🕺 Tańcz'],
  ['wave', '👋 Pomachaj'],
  ['point', '👉 Pokaż palcem'],
  ['spin', '💫 Obrót'],
  ['turnBack', '↩ Odwróć się'],
  ['look', '👀 Rozejrzyj się'],
];

const TRICK_LABELS: Record<PetTrick, string> = {
  hold: 'trzymaj',
  toss: 'podrzucaj',
  spin: 'kręć',
  wave: 'machaj',
  tap: 'stukaj',
  call: 'dzwoń',
  selfie: 'selfie',
  bounce: 'odbijaj',
  drum: 'bębnij',
  rotate: 'obracaj',
  chase: 'goń',
  hug: 'przytul',
  type: 'pisz',
  sip: 'pij',
  blow: 'dmuchaj',
  read: 'czytaj',
  inspect: 'oglądaj',
  kick: 'kopnij',
  throw: 'rzuć',
  float: 'lewituj',
  twirl: 'kręć',
  ride: 'jedź',
  kickflip: 'kickflip',
  dance: 'tańcz',
  'sit-on': 'usiądź',
  hide: 'schowaj się',
  carry: 'noś',
};

interface Props {
  onOpenWindow: () => void;
  onTwoWindows: () => void;
}

export function PetControls({ onOpenWindow, onTwoWindows }: Props) {
  const [message, setMessage] = useState('Cześć! Co dziś robimy?');
  const [size, setSize] = useState(104);
  const [visible, setVisible] = useState(true);
  const [typing, setTyping] = useState(true);
  const [hobbies, setHobbies] = useState(true);
  const [touch, setTouch] = useState(true);
  const [prop, setProp] = useState<PetProp>('ball');

  const onSay = (e: FormEvent) => {
    e.preventDefault();
    if (message.trim()) pet.say(message.trim());
  };

  return (
    <section className="card" data-pet-surface="perimeter">
      <header className="card-head">
        <h2>Sterowanie maskotką</h2>
        <code className="pill">pet.*</code>
      </header>

      <form className="say-row" onSubmit={onSay}>
        <input
          className="field"
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          placeholder="Co ma powiedzieć?"
          aria-label="Tekst dymka"
        />
        <button className="btn btn-primary" type="submit">
          Powiedz
        </button>
      </form>

      <h3 className="sub">Reakcje</h3>
      <div className="btn-grid">
        <button className="btn" type="button" onClick={() => pet.react('success')}>
          ✓ Sukces
        </button>
        <button className="btn" type="button" onClick={() => pet.react('error')}>
          ⚠ Błąd
        </button>
        <button className="btn" type="button" onClick={() => pet.react('confused')}>
          ? Hmm
        </button>
        <button className="btn" type="button" onClick={() => pet.react('happy')}>
          ♥ Radość
        </button>
        <button className="btn" type="button" onClick={() => pet.react('sad')}>
          ☁ Smutek
        </button>
        <button className="btn" type="button" onClick={() => pet.jump()}>
          ↗ Skocz gdzieś
        </button>
      </div>

      <h3 className="sub">Czynności</h3>
      <div className="btn-grid">
        <button className="btn" type="button" onClick={() => pet.coffee()}>
          ☕ Kawa
        </button>
        <button className="btn" type="button" onClick={() => pet.hack()}>
          💻 Hakuj
        </button>
        <button className="btn" type="button" onClick={() => pet.fish()}>
          🎣 Na ryby
        </button>
        <button className="btn" type="button" onClick={() => pet.cool()}>
          😎 Spoko
        </button>
        <button className="btn" type="button" onClick={() => pet.trip()}>
          🤕 Wywal się
        </button>
        <button className="btn" type="button" onClick={() => pet.sleep()}>
          z Śpij
        </button>
        <button className="btn" type="button" onClick={() => pet.wake()}>
          ☀ Obudź
        </button>
        <button className="btn" type="button" onClick={() => pet.goTo('#note-card', 'Idę do notatek! 📝')}>
          → Do notatek
        </button>
        <button className="btn" type="button" onClick={onOpenWindow}>
          ▢ Nowe okno
        </button>
        <button className="btn" type="button" onClick={onTwoWindows}>
          ⧉ Spadnij na 2. okno
        </button>
      </div>

      <h3 className="sub">Ruchy</h3>
      <div className="btn-grid">
        {POSES.map(([p, label]) => (
          <button key={p} className="btn" type="button" onClick={() => pet.pose(p)}>
            {label}
          </button>
        ))}
      </div>

      <h3 className="sub">Rekwizyty i triki</h3>
      <div className="chip-row">
        {PET_PROPS.map((p) => (
          <button key={p} type="button" className={`chip${p === prop ? ' is-active' : ''}`} onClick={() => setProp(p)} aria-pressed={p === prop}>
            {PROP_LABELS[p]}
          </button>
        ))}
      </div>
      <div className="chip-row trick-row">
        {PROP_TRICKS[prop].map((t) => (
          <button key={t} type="button" className="chip chip-trick" onClick={() => pet.play(prop, t)}>
            ▶ {TRICK_LABELS[t]}
          </button>
        ))}
        <button type="button" className="chip chip-trick" onClick={() => pet.play(prop)}>
          🎲 sama wybierz
        </button>
      </div>

      <label className="range">
        <span>Rozmiar</span>
        <input
          type="range"
          min={64}
          max={180}
          step={4}
          value={size}
          onChange={(e) => {
            const v = Number(e.target.value);
            setSize(v);
            pet.configure({ size: v });
          }}
        />
        <output>{size}px</output>
      </label>

      <div className="toggles">
        <label className="switch">
          <input
            type="checkbox"
            checked={visible}
            onChange={(e) => {
              setVisible(e.target.checked);
              pet.configure({ visible: e.target.checked });
            }}
          />
          <span>Pokaż maskotkę</span>
        </label>
        <label className="switch">
          <input
            type="checkbox"
            checked={typing}
            onChange={(e) => {
              setTyping(e.target.checked);
              pet.configure({ reactToTyping: e.target.checked });
            }}
          />
          <span>Reaguj na pisanie</span>
        </label>
        <label className="switch">
          <input
            type="checkbox"
            checked={hobbies}
            onChange={(e) => {
              setHobbies(e.target.checked);
              pet.configure({ hobbies: e.target.checked });
            }}
          />
          <span>Sama coś robi</span>
        </label>
        <label className="switch">
          <input
            type="checkbox"
            checked={touch}
            onChange={(e) => {
              setTouch(e.target.checked);
              pet.configure({ feelTouch: e.target.checked });
            }}
          />
          <span>Czuje dotyk</span>
        </label>
      </div>

      <p className="hint">
        Pogłaszcz główkę kursorem · połaskocz brzuszek · dotknij ucha · kliknij w głowę · złap i rzuć · dwuklik = obrót · zostaw stronę na 45 s,
        a zaśnie · kliknij w pole tekstowe, a przybiegnie pisać.
      </p>
    </section>
  );
}
