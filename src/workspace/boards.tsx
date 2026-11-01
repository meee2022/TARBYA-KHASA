import { useMemo, useState } from 'react';
import { ArrowDown, ArrowLeft, ArrowRight, ArrowUp, Check, Star } from 'lucide-react';
import { art } from '../../packages/domain/catalog';
import { wordLetters } from '../../packages/domain/packs';
import type { GameRound, PracticeAttempt, Tile } from '../../packages/domain/games';
import { TileFace, TilePicture } from './accessibility';

/** Stable shuffle: order is fixed for a round, so it does not jump on re-render, and differs between rounds. */
function arrange<T>(items: T[], seed: string) {
  const out = [...items]; let n = [...seed].reduce((sum, c) => sum * 31 + c.codePointAt(0)! >>> 0, 7);
  for (let i = out.length - 1; i > 0; i--) { n = (n * 1103515245 + 12345) >>> 0; const j = n % (i + 1); [out[i], out[j]] = [out[j], out[i]]; }
  return out;
}
export type BoardProps = { round: GameRound; hinted: boolean; speakTile: (tile: Tile) => void; onDone: (attempts: PracticeAttempt[], message: string) => void; say: (text: string) => void };
const attempt = (round: GameRound, tile: Tile, wrong: Set<string>, hinted: boolean): PracticeAttempt => ({ roundId: `${round.id}-${tile.id}`, selected: tile.id, correct: !wrong.has(tile.id), hintUsed: hinted });

export function MatchBoard({ round, hinted, speakTile, onDone, say }: BoardProps) {
  const tiles = round.board!; const pictures = useMemo(() => arrange(tiles, round.id), [tiles, round.id]);
  const [word, setWord] = useState(''); const [done, setDone] = useState<string[]>([]); const [wrong] = useState(() => new Set<string>());
  const press = (tile: Tile) => {
    if (!word) { say('اختر الكلمة أولًا.'); return; }
    if (tile.id !== word) { wrong.add(word); say('لنحاول مرة أخرى.'); return; }
    const next = [...done, tile.id]; setDone(next); setWord(''); speakTile(tile);
    if (next.length === tiles.length) onDone(tiles.map(t => attempt(round, t, wrong, hinted || tiles.length === 1)), 'طابقت كل البطاقات. أحسنت.');
  };
  return <div className="board-columns">
    <div role="group" aria-label="الكلمات">{tiles.map(t => <button data-scan key={t.id} className={`board-tile ${word === t.id ? 'selected' : ''} ${done.includes(t.id) ? 'solved' : ''}`} disabled={done.includes(t.id)} aria-pressed={word === t.id} onClick={() => setWord(t.id)}><span className="tile-label" dir="auto" lang={t.lang}>{t.label}</span>{done.includes(t.id) && <Check size={22} aria-hidden="true" />}</button>)}</div>
    <div role="group" aria-label="الصور">{pictures.map(t => <button data-scan key={t.id} className={`board-tile ${done.includes(t.id) ? 'solved' : ''}`} disabled={done.includes(t.id)} aria-label={done.includes(t.id) ? `${t.label}، تمت مطابقتها` : `صورة: ${t.description ?? t.label}`} onClick={() => press(t)}><TilePicture tile={t} />{done.includes(t.id) && <Check size={22} aria-hidden="true" />}</button>)}</div>
  </div>;
}
export function MemoryBoard({ round, hinted, speakTile, onDone, say }: BoardProps) {
  const tiles = round.board!; const cards = useMemo(() => arrange(tiles.flatMap(t => [{ key: `${t.id}-a`, tile: t }, { key: `${t.id}-b`, tile: t }]), round.id), [tiles, round.id]);
  const [open, setOpen] = useState<string[]>([]); const [found, setFound] = useState<string[]>([]); const [wrong] = useState(() => new Set<string>());
  const press = (key: string, tile: Tile) => {
    if (open.length === 2) { setOpen([key]); return; } // A mismatched pair stays visible until the next press: no timer to beat.
    const next = [...open, key]; setOpen(next); speakTile(tile);
    if (next.length < 2) return;
    const first = cards.find(c => c.key === next[0])!.tile;
    if (first.id !== tile.id) { wrong.add(first.id); wrong.add(tile.id); say('ليستا متشابهتين. افتح بطاقة أخرى عندما تكون مستعدًا.'); return; }
    const solved = [...found, tile.id]; setFound(solved); setOpen([]);
    // Pair-finding is exploratory, so it always reports practice and not independent recognition.
    if (solved.length === tiles.length) onDone(tiles.map(t => attempt(round, t, wrong, true)), 'وجدت كل الأزواج. أحسنت.');
  };
  return <div className="board-grid memory-grid" role="group" aria-label="بطاقات الذاكرة">{cards.map(({ key, tile }, n) => { const shown = open.includes(key) || found.includes(tile.id); return <button data-scan key={key} className={`board-tile memory-card ${shown ? 'open' : ''} ${found.includes(tile.id) ? 'solved' : ''}`} disabled={found.includes(tile.id) || open.includes(key)} aria-label={shown ? tile.label : `بطاقة ${n + 1} مغلقة`} onClick={() => press(key, tile)}>{shown ? <TileFace tile={{ ...tile, hideLabel: false }} /> : <Star className="memory-back" size={44} aria-hidden="true" />}</button>; })}</div>;
}
export function PuzzleBoard({ round, hinted, speakTile, onDone, say }: BoardProps) {
  const tile = round.board![0]; const count = 4; const pieces = useMemo(() => { const order = Array.from({ length: count }, (_, i) => i); const mixed = arrange(order, round.id); return mixed.every((p, i) => p === i) ? [1, 0, 3, 2] : mixed; }, [round.id]);
  const [piece, setPiece] = useState<number | null>(null); const [placed, setPlaced] = useState<number[]>([]); const [mistake, setMistake] = useState(false);
  const place = (slot: number) => {
    if (piece === null) { say('اختر قطعة أولًا.'); return; }
    if (piece !== slot) { setMistake(true); say('هذه القطعة لها مكان آخر.'); return; }
    const next = [...placed, slot]; setPlaced(next); setPiece(null);
    if (next.length === count) { speakTile(tile); onDone([{ roundId: round.id, selected: tile.id, correct: !mistake, hintUsed: hinted }], `اكتملت الصورة: ${tile.label}.`); }
  };
  const part = (n: number) => <span className="puzzle-window" aria-hidden="true"><span style={{ transform: `translate(${n % 2 ? '-50%' : '0'}, ${n > 1 ? '-50%' : '0'})` }}><TilePicture tile={tile} /></span></span>;
  return <div className="puzzle-layout">
    <div className="puzzle-frame" dir="ltr" role="group" aria-label="مكان القطع">{[0, 1, 2, 3].map(n => <button data-scan key={n} disabled={placed.includes(n)} className={placed.includes(n) ? 'solved' : ''} aria-label={placed.includes(n) ? `المكان ${n + 1}، مكتمل` : `المكان ${n + 1}`} onClick={() => place(n)}>{placed.includes(n) && part(n)}</button>)}</div>
    <div className="puzzle-pieces" dir="ltr" role="group" aria-label="القطع">{pieces.filter(p => !placed.includes(p)).map(p => <button data-scan key={p} className={piece === p ? 'selected' : ''} aria-pressed={piece === p} aria-label={`قطعة ${p + 1}`} onClick={() => setPiece(p)}>{part(p)}</button>)}</div>
  </div>;
}
export function BuildBoard({ round, hinted, speakTile, onDone, say }: BoardProps) {
  const tile = round.board![0]; const letters = useMemo(() => wordLetters(tile.label), [tile.label]);
  const shuffled = useMemo(() => arrange(letters.map((letter, i) => ({ letter, i })), round.id), [letters, round.id]);
  const [used, setUsed] = useState<number[]>([]); const [mistake, setMistake] = useState(false);
  const press = (entry: { letter: string; i: number }) => {
    if (entry.letter !== letters[used.length]) { setMistake(true); say('جرّب حرفًا آخر.'); return; }
    const next = [...used, entry.i]; setUsed(next);
    if (next.length === letters.length) { speakTile(tile); onDone([{ roundId: round.id, selected: tile.id, correct: !mistake, hintUsed: hinted }], `ركّبت كلمة ${tile.label}.`); }
  };
  return <div className="build-board"><TilePicture tile={tile} /><p className="build-word" dir="auto" lang={tile.lang} aria-live="polite">{letters.slice(0, used.length).join('')}<span className="build-left" aria-label={`باقي ${letters.length - used.length} حروف`}>{'•'.repeat(letters.length - used.length)}</span></p><div className="build-letters" dir={tile.lang === 'en' ? 'ltr' : 'rtl'} role="group" aria-label="الحروف">{shuffled.map(entry => <button data-scan key={entry.i} disabled={used.includes(entry.i)} lang={tile.lang} onClick={() => press(entry)}>{entry.letter}</button>)}</div></div>;
}
/** Answers sit on the grid edges; the robot's cell is the selection. Arrows work with touch, keyboard and switch scanning. */
export function RobotBoard({ options, disabled, onSelect }: { options: Tile[]; disabled: boolean; onSelect: (tile: Tile) => void }) {
  const spots = [[0, 0], [2, 0], [0, 2], [2, 2]]; const placed = options.map((tile, i) => ({ tile, x: spots[i][0], y: spots[i][1] }));
  const [pos, setPos] = useState({ x: 1, y: 1 });
  const move = (dx: number, dy: number) => { if (disabled) return; const next = { x: Math.max(0, Math.min(2, pos.x + dx)), y: Math.max(0, Math.min(2, pos.y + dy)) }; setPos(next); const hit = placed.find(s => s.x === next.x && s.y === next.y); if (hit) onSelect(hit.tile); };
  return <div className="robot-board"><div className="robot-grid" dir="ltr" role="group" aria-label={`الروبوت في الصف ${pos.y + 1} والعمود ${pos.x + 1}`}>{Array.from({ length: 9 }, (_, n) => { const x = n % 3; const y = Math.floor(n / 3); const spot = placed.find(s => s.x === x && s.y === y); const here = pos.x === x && pos.y === y; return <div key={n} className={`robot-cell ${here ? 'here' : ''}`}>{spot && <span className="robot-target"><TilePicture tile={spot.tile} /><span className="visually-hidden">{spot.tile.label}</span></span>}{here && <img className="robot-self" src={art('tpl-robot')} alt="" />}</div>; })}</div>
    <div className="robot-pad" dir="ltr" role="group" aria-label="تحريك الروبوت"><button data-scan disabled={disabled} className="up" aria-label="إلى الأعلى" onClick={() => move(0, -1)}><ArrowUp size={34} /></button><button data-scan disabled={disabled} className="left" aria-label="إلى اليسار" onClick={() => move(-1, 0)}><ArrowLeft size={34} /></button><button data-scan disabled={disabled} className="right" aria-label="إلى اليمين" onClick={() => move(1, 0)}><ArrowRight size={34} /></button><button data-scan disabled={disabled} className="down" aria-label="إلى الأسفل" onClick={() => move(0, 1)}><ArrowDown size={34} /></button></div></div>;
}
export function DoorReveal({ tile, opened, onOpen }: { tile: Tile; opened: boolean; onOpen: () => void }) {
  return opened ? <div className="door-open"><TilePicture tile={tile} /><span className="visually-hidden">{tile.description ?? tile.label}</span></div> : <button data-scan className="door-closed" aria-label="افتح الباب" onClick={onOpen}><img src={art('door')} alt="" /><span>افتح الباب</span></button>;
}
