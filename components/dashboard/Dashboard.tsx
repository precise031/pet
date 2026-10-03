'use client';

import { useEffect, useRef, useState, type FormEvent } from 'react';
import { PetPreview, pet } from '@/components/pet';
import { FloatingWindow, type WindowState } from './FloatingWindow';
import { Gallery } from './Gallery';
import { Icon, type IconName } from './Icon';
import { PetControls } from './PetControls';

const NAV: Array<[IconName, string]> = [
  ['home', 'Pulpit'],
  ['box', 'Zamówienia'],
  ['tag', 'Produkty'],
  ['users', 'Klienci'],
  ['chart', 'Raporty'],
  ['sliders', 'Ustawienia'],
];

const STATS = [
  { label: 'Przychód (30 dni)', value: '48 210 zł', delta: '+12,4%', good: true, spark: [8, 10, 9, 13, 12, 15, 14, 18, 17, 21] },
  { label: 'Zamówienia', value: '1 284', delta: '+8,1%', good: true, spark: [5, 7, 6, 8, 11, 9, 12, 12, 14, 15] },
  { label: 'Nowi klienci', value: '312', delta: '+3,7%', good: true, spark: [9, 8, 10, 9, 11, 10, 12, 11, 12, 13] },
  { label: 'Błędy API', value: '3', delta: '+2', good: false, spark: [1, 0, 2, 1, 0, 1, 3, 1, 2, 3] },
];

const ORDERS = [
  ['#10428', 'Anna K.', 'Allegro', '249,00 zł', 'Wysłane'],
  ['#10427', 'Marek W.', 'OLX', '89,99 zł', 'Nowe'],
  ['#10426', 'Kasia P.', 'Sklep', '1 199,00 zł', 'Opłacone'],
  ['#10425', 'Tomek Z.', 'Allegro', '45,50 zł', 'Wysłane'],
  ['#10424', 'Ola M.', 'Sklep', '320,00 zł', 'Zwrot'],
  ['#10423', 'Piotr N.', 'OLX', '150,00 zł', 'Opłacone'],
  ['#10422', 'Ewa S.', 'Allegro', '78,20 zł', 'Wysłane'],
  ['#10421', 'Jan D.', 'Sklep', '560,00 zł', 'Nowe'],
  ['#10420', 'Magda R.', 'Allegro', '210,00 zł', 'Wysłane'],
  ['#10419', 'Bartek L.', 'OLX', '35,00 zł', 'Opłacone'],
];

const STATUS_CLASS: Record<string, string> = {
  Wysłane: 'ok',
  Opłacone: 'info',
  Nowe: 'new',
  Zwrot: 'bad',
};

interface Toast {
  id: number;
  text: string;
}

function Sparkline({ data, good }: { data: number[]; good: boolean }) {
  const max = Math.max(...data);
  const min = Math.min(...data);
  const pts = data.map((v, i) => `${(i / (data.length - 1)) * 100},${28 - ((v - min) / (max - min || 1)) * 24}`).join(' ');
  return (
    <svg className="spark" viewBox="0 0 100 30" preserveAspectRatio="none" aria-hidden="true">
      <polyline points={pts} fill="none" stroke={good ? 'var(--green)' : 'var(--red)'} strokeWidth="2" vectorEffect="non-scaling-stroke" />
    </svg>
  );
}

export function Dashboard() {
  const [windows, setWindows] = useState<WindowState[]>([]);
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const toastId = useRef(0);
  const winId = useRef(0);

  useEffect(() => {
    if (!windows.length) return;
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setWindows((w) => w.slice(0, -1));
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [windows.length]);

  const openWindow = () => {
    const id = ++winId.current;
    const n = windows.length;
    const w = Math.min(420, window.innerWidth - 32);
    const x = Math.max(16, Math.min(window.innerWidth - w - 16, window.innerWidth * 0.3 + n * 70));
    const y = Math.min(window.innerHeight - 260, 170 + n * 90);
    setWindows((ws) => [...ws, { id, title: `Okno #${id}`, x, y, w, attract: 'Ooo, nowe okienko! 👀' }]);
  };

  /** Dwa okna jedno nad drugim: maskotka wskakuje na górne, potyka się i leci na dolne. */
  const openTwoWindows = () => {
    const a = ++winId.current;
    const b = ++winId.current;
    const w = Math.min(380, window.innerWidth - 32);
    const x = Math.max(16, window.innerWidth * 0.5 - w / 2);
    const y = Math.max(150, Math.min(window.innerHeight - 520, window.innerHeight * 0.36));
    setWindows([
      { id: a, title: 'Górne okno', x, y, w, attract: 'Wchodzę na górne okno! 🧗' },
      { id: b, title: 'Dolne okno', x: Math.max(8, x - 150), y: Math.min(window.innerHeight - 230, y + 250), w: Math.min(w + 300, window.innerWidth - 16) },
    ]);
    window.setTimeout(() => pet.trip(), 2400);
  };

  const moveWindow = (id: number, x: number, y: number) => setWindows((ws) => ws.map((w) => (w.id === id ? { ...w, x, y } : w)));
  const focusWindow = (id: number) =>
    setWindows((ws) => {
      const i = ws.findIndex((w) => w.id === id);
      return i < 0 || i === ws.length - 1 ? ws : [...ws.slice(0, i), ...ws.slice(i + 1), ws[i]];
    });
  const closeWindow = (id: number) => setWindows((ws) => ws.filter((w) => w.id !== id));

  const pushToast = () => {
    const id = ++toastId.current;
    const shop = ['Allegro', 'OLX', 'sklepu'][id % 3];
    setToasts((t) => [...t, { id, text: `Nowe zamówienie z ${shop}! 📦` }]);
    window.setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 6000);
  };

  const saveNote = (e: FormEvent) => {
    e.preventDefault();
    if (!title.trim() && !body.trim()) {
      pet.react('confused', 'Pusta notatka? 🤔');
      return;
    }
    pet.react('success', 'Notatka zapisana! ✨');
    setTitle('');
    setBody('');
  };

  return (
    <div className="app">
      <aside className="sidebar">
        <div className="brand">
          <PetPreview className="brand-pet" state="idle" />
          <div>
            <strong>Bunny Panel</strong>
            <small>z maskotką</small>
          </div>
        </div>
        <nav className="nav">
          {NAV.map(([icon, label], i) => (
            <button key={label} type="button" className={`nav-item${i === 0 ? ' is-active' : ''}`}>
              <Icon name={icon} />
              {label}
            </button>
          ))}
        </nav>
        <div className="sidebar-foot">
          <span className="dot" /> Maskotka czuwa
        </div>
      </aside>

      <main className="main">
        <header className="topbar">
          <h1>Pulpit</h1>
          <label className="search">
            <Icon name="search" />
            <input type="search" placeholder="Szukaj…" aria-label="Szukaj" />
          </label>
          <button type="button" className="btn" onClick={pushToast}>
            <Icon name="bell" /> Powiadomienie
          </button>
          <button type="button" className="btn btn-primary" onClick={openWindow}>
            <Icon name="window" /> Nowe okno
          </button>
        </header>

        <section className="stats">
          {STATS.map((s) => (
            <article key={s.label} className="card stat" data-pet-surface="perimeter">
              <span className="muted">{s.label}</span>
              <strong className="stat-value">{s.value}</strong>
              <span className={`delta ${s.good ? 'up' : 'down'}`}>{s.delta}</span>
              <Sparkline data={s.spark} good={s.good} />
            </article>
          ))}
        </section>

        <div className="grid">
          <PetControls onOpenWindow={openWindow} onTwoWindows={openTwoWindows} />

          <form id="note-card" className="card" data-pet-surface="perimeter" onSubmit={saveNote}>
            <header className="card-head">
              <h2>Szybka notatka</h2>
              <span className="muted">kliknij w pole – maskotka przyjdzie pisać</span>
            </header>
            <label className="label">
              Tytuł
              <input className="field" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="np. Zamówić kartony 📦" />
            </label>
            <label className="label">
              Treść
              <textarea
                className="field"
                rows={4}
                value={body}
                onChange={(e) => setBody(e.target.value)}
                placeholder="Zacznij pisać…"
              />
            </label>
            <div className="row-end">
              <button
                type="button"
                className="btn"
                data-pet-react="confused"
                data-pet-say="Wszystko zniknęło?!"
                onClick={() => {
                  setTitle('');
                  setBody('');
                }}
              >
                Wyczyść
              </button>
              <button type="submit" className="btn btn-primary">
                Zapisz
              </button>
            </div>
          </form>

          <Gallery />

          <section className="card" data-pet-surface="perimeter">
            <header className="card-head">
              <h2>Ostatnie zamówienia</h2>
              <span className="muted">10 z 1 284</span>
            </header>
            <div className="table-wrap">
              <table className="table">
                <thead>
                  <tr>
                    <th>Nr</th>
                    <th>Klient</th>
                    <th>Kanał</th>
                    <th>Kwota</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {ORDERS.map(([id, client, channel, amount, status]) => (
                    <tr key={id}>
                      <td className="mono">{id}</td>
                      <td>{client}</td>
                      <td>{channel}</td>
                      <td className="mono">{amount}</td>
                      <td>
                        <span className={`badge ${STATUS_CLASS[status]}`}>{status}</span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          <section className="card" data-pet-surface="perimeter">
            <header className="card-head">
              <h2>Akcje na stronie</h2>
            </header>
            <p className="muted">Przyciski z atrybutami <code>data-pet-*</code> albo wywołaniami <code>pet.*</code> – maskotka reaguje sama.</p>
            <div className="stack">
              <button type="button" className="btn" onClick={() => pet.react('error', 'API zwróciło 500 😵')}>
                Symuluj błąd API
              </button>
              <button type="button" className="btn" data-pet-prop="allegro" data-pet-say="Paczka z Allegro nadana! 📦">
                Nadaj paczkę Allegro
              </button>
              <button type="button" className="btn" data-pet-prop="blik" data-pet-say="Zapłacone BLIKIEM 📲">
                Zapłać BLIKIEM
              </button>
              <button type="button" className="btn" data-pet-prop="olx">
                Wystaw na OLX
              </button>
              <button type="button" className="btn" data-pet-act="fish">
                Idź na ryby 🎣
              </button>
              <button type="button" className="btn" onClick={pushToast}>
                Pokaż powiadomienie
              </button>
              <button type="button" className="btn" onClick={() => pet.goTo('.stats .stat:last-child', 'Sprawdzam błędy… 🔍')}>
                Idź do „Błędy API”
              </button>
              <button type="button" className="btn" onClick={() => pet.emit('order:new')}>
                Nowe zamówienie (reguła)
              </button>
              <button type="button" className="btn" onClick={() => pet.emit('deploy')}>
                Deploy (scenka z reguły)
              </button>
              <button
                type="button"
                className="btn"
                onClick={() =>
                  pet.sequence([
                    { goTo: '#note-card' },
                    { play: 'book', trick: 'read', ms: 3000 },
                    { pose: 'stretch', ms: 1800 },
                    { play: 'ball', trick: 'kick' },
                    { wait: 2500 },
                    { pose: 'lie', ms: 4000 },
                  ])
                }
              >
                Scenka: czyta, kopie piłkę, leży
              </button>
            </div>
            <ul className="activity">
              <li>
                <span className="dot" /> 12:41 · Zamówienie #10428 wysłane
              </li>
              <li>
                <span className="dot purple" /> 12:20 · Nowy klient: Kasia P.
              </li>
              <li>
                <span className="dot red" /> 11:58 · Timeout bramki płatności
              </li>
              <li>
                <span className="dot" /> 11:30 · Synchronizacja z Allegro
              </li>
            </ul>
          </section>
        </div>
      </main>

      <div className="toasts">
        {toasts.map((t) => (
          <div key={t.id} className="toast" data-pet-surface="perimeter" data-pet-attract="Coś nowego! 👀">
            <Icon name="box" />
            <span>{t.text}</span>
          </div>
        ))}
      </div>

      {windows.map((w, i) => (
        <FloatingWindow key={w.id} win={w} z={i} onMove={moveWindow} onFocus={focusWindow} onClose={closeWindow}>
          <div className="window-body">
            <p>Przeciągnij okno za pasek – maskotka pojedzie razem z nim. Chodzi po wszystkich krawędziach: po bokach i do góry nogami pod spodem.</p>
            <p className="muted">Zamknij je, kiedy maskotka na nim stoi – spadnie 🙃</p>
          </div>
          <div className="window-foot">
            <button type="button" className="btn" onClick={() => closeWindow(w.id)}>
              Zamknij
            </button>
            <button
              type="button"
              className="btn btn-primary"
              onClick={() => {
                pet.react('success', 'Zatwierdzone! ✅');
                closeWindow(w.id);
              }}
            >
              OK
            </button>
          </div>
        </FloatingWindow>
      ))}
    </div>
  );
}
