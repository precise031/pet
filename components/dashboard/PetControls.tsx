'use client';

import { useState, type FormEvent } from 'react';
import { pet } from '@/components/pet';

export function PetControls({ onOpenWindow }: { onOpenWindow: () => void }) {
  const [message, setMessage] = useState('Cześć! Co dziś robimy?');
  const [size, setSize] = useState(72);
  const [visible, setVisible] = useState(true);
  const [typing, setTyping] = useState(true);

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
          ▢ Otwórz okno
        </button>
      </div>

      <label className="range">
        <span>Rozmiar</span>
        <input
          type="range"
          min={48}
          max={144}
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
      </div>

      <p className="hint">
        Złap maskotkę myszką i rzuć · kliknij ją · zostaw stronę na 45 s, a zaśnie · kliknij w pole tekstowe, a przybiegnie
        pisać.
      </p>
    </section>
  );
}
