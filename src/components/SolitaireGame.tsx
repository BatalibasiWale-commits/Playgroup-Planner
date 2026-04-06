import { useState } from 'react';

// ── Types ─────────────────────────────────────────────────────────────────────
type Suit = '♠' | '♥' | '♦' | '♣';
type Rank = 'A' | '2' | '3' | '4' | '5' | '6' | '7' | '8' | '9' | '10' | 'J' | 'Q' | 'K';
interface Card { id: string; suit: Suit; rank: Rank; faceUp: boolean; }
type Sel = { from: 'waste' } | { from: 'tab'; col: number; idx: number } | null;
interface GameState { stock: Card[]; waste: Card[]; foundations: Card[][]; tableau: Card[][]; }

// ── Constants ─────────────────────────────────────────────────────────────────
const SUITS: Suit[] = ['♠', '♥', '♦', '♣'];
const RANKS: Rank[] = ['A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K'];
const VAL: Record<Rank, number> = { A:1,'2':2,'3':3,'4':4,'5':5,'6':6,'7':7,'8':8,'9':9,'10':10,J:11,Q:12,K:13 };
const CW = 48;   // card width px
const CH = 68;   // card height px
const OVL = 19;  // vertical overlap for stacked cards

// ── Helpers ───────────────────────────────────────────────────────────────────
const isRed = (s: Suit) => s === '♥' || s === '♦';

function shuffle<T>(a: T[]): T[] {
  const arr = [...a];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

function deal(): GameState {
  const deck = shuffle(
    SUITS.flatMap(suit => RANKS.map(rank => ({ id: `${rank}${suit}`, suit, rank, faceUp: false })))
  );
  const tableau: Card[][] = [];
  let i = 0;
  for (let col = 0; col < 7; col++) {
    const column: Card[] = [];
    for (let row = 0; row <= col; row++) column.push({ ...deck[i++], faceUp: row === col });
    tableau.push(column);
  }
  return { stock: deck.slice(i).map(c => ({ ...c, faceUp: false })), waste: [], foundations: [[], [], [], []], tableau };
}

function canFoundation(card: Card, f: Card[]): boolean {
  if (f.length === 0) return card.rank === 'A';
  const top = f[f.length - 1];
  return top.suit === card.suit && VAL[top.rank] + 1 === VAL[card.rank];
}
function canTableau(card: Card, col: Card[]): boolean {
  if (col.length === 0) return card.rank === 'K';
  const top = col[col.length - 1];
  return top.faceUp && isRed(top.suit) !== isRed(card.suit) && VAL[top.rank] === VAL[card.rank] + 1;
}

// ── Sub-components (defined outside to avoid remount on each render) ──────────
function CardView({ card, selected, onClick, onDblClick }: {
  card: Card; selected: boolean; onClick: () => void; onDblClick?: () => void;
}) {
  const red = isRed(card.suit);
  return (
    <div
      onClick={e => { e.stopPropagation(); onClick(); }}
      onDoubleClick={e => { e.stopPropagation(); onDblClick?.(); }}
      style={{
        width: CW, height: CH, borderRadius: 7, flexShrink: 0,
        border: selected ? '2.5px solid #fb923c' : '1px solid rgba(0,0,0,0.22)',
        background: card.faceUp ? '#fff' : 'linear-gradient(135deg,#1e3a8a 0%,#3b82f6 100%)',
        cursor: 'pointer', position: 'relative',
        boxShadow: selected
          ? '0 0 0 3px rgba(251,146,60,0.45), 0 3px 10px rgba(0,0,0,0.35)'
          : '0 2px 5px rgba(0,0,0,0.28)',
        userSelect: 'none', transition: 'box-shadow 0.1s',
      }}
    >
      {card.faceUp ? (
        <>
          <span style={{
            position: 'absolute', top: 2, left: 4,
            fontSize: 10, fontWeight: 900, lineHeight: 1.25,
            color: red ? '#dc2626' : '#111827',
            fontFamily: 'Nunito, sans-serif',
          }}>
            {card.rank}<br />{card.suit}
          </span>
          <span style={{
            position: 'absolute', bottom: 2, right: 4,
            fontSize: 10, fontWeight: 900, lineHeight: 1.25,
            color: red ? '#dc2626' : '#111827',
            fontFamily: 'Nunito, sans-serif',
            transform: 'rotate(180deg)',
          }}>
            {card.rank}<br />{card.suit}
          </span>
        </>
      ) : (
        <div style={{
          position: 'absolute', inset: 4, borderRadius: 4,
          background: 'repeating-linear-gradient(45deg,#1d4ed8,#1d4ed8 2px,#2563eb 2px,#2563eb 5px)',
          opacity: 0.85,
        }} />
      )}
    </div>
  );
}

function EmptySlot({ onClick, label }: { onClick: () => void; label?: string }) {
  return (
    <div onClick={e => { e.stopPropagation(); onClick(); }} style={{
      width: CW, height: CH, borderRadius: 7, flexShrink: 0,
      border: '2px dashed rgba(255,255,255,0.28)', cursor: 'pointer',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      color: 'rgba(255,255,255,0.32)', fontSize: 18, fontFamily: 'Nunito, sans-serif',
      fontWeight: 800,
    }}>
      {label}
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────
interface Props { loadingMessage: string; loadingEmoji: string; }

export default function SolitaireGame({ loadingMessage, loadingEmoji }: Props) {
  const [g, setG] = useState<GameState>(deal);
  const [sel, setSel] = useState<Sel>(null);
  const [moves, setMoves] = useState(0);
  const [won, setWon] = useState(false);

  function newGame() { setG(deal()); setSel(null); setMoves(0); setWon(false); }

  function selCards(state: GameState): Card[] {
    if (!sel) return [];
    if (sel.from === 'waste') return state.waste.length ? [state.waste[state.waste.length - 1]] : [];
    return state.tableau[sel.col].slice(sel.idx);
  }

  // Remove selected cards from their source pile, flip newly exposed top cards
  function removeSel(s: GameState): { waste: Card[]; tableau: Card[][] } {
    const waste = [...s.waste];
    const tableau = s.tableau.map(c => [...c]);
    if (!sel) return { waste, tableau };
    if (sel.from === 'waste') {
      waste.pop();
    } else {
      tableau[sel.col] = tableau[sel.col].slice(0, sel.idx);
      const col = tableau[sel.col];
      if (col.length > 0) col[col.length - 1] = { ...col[col.length - 1], faceUp: true };
    }
    return { waste, tableau };
  }

  function tryFoundation(fIdx: number) {
    const cards = selCards(g);
    if (cards.length !== 1 || !canFoundation(cards[0], g.foundations[fIdx])) { setSel(null); return; }
    setG(prev => {
      const { waste, tableau } = removeSel(prev);
      const foundations = prev.foundations.map((f, i) => i === fIdx ? [...f, cards[0]] : f);
      if (foundations.every(f => f.length === 13)) setWon(true);
      return { ...prev, waste, tableau, foundations };
    });
    setSel(null);
    setMoves(m => m + 1);
  }

  function tryTableau(col: number) {
    const cards = selCards(g);
    if (!cards.length || !canTableau(cards[0], g.tableau[col])) { setSel(null); return; }
    setG(prev => {
      const { waste, tableau } = removeSel(prev);
      tableau[col] = [...tableau[col], ...cards];
      return { ...prev, waste, tableau };
    });
    setSel(null);
    setMoves(m => m + 1);
  }

  function autoToFoundation(card: Card, removeFromWaste: boolean, removeFromTab?: { col: number }) {
    const fIdx = g.foundations.findIndex(f => canFoundation(card, f));
    if (fIdx === -1) return false;
    setG(prev => {
      let waste = prev.waste;
      const tableau = prev.tableau.map(c => [...c]);
      if (removeFromWaste) { waste = waste.slice(0, -1); }
      if (removeFromTab !== undefined) {
        tableau[removeFromTab.col] = tableau[removeFromTab.col].slice(0, -1);
        const col = tableau[removeFromTab.col];
        if (col.length > 0) col[col.length - 1] = { ...col[col.length - 1], faceUp: true };
      }
      const foundations = prev.foundations.map((f, i) => i === fIdx ? [...f, card] : f);
      if (foundations.every(f => f.length === 13)) setWon(true);
      return { ...prev, waste, tableau, foundations };
    });
    setSel(null);
    setMoves(m => m + 1);
    return true;
  }

  // ── Click handlers ──────────────────────────────────────────────────────────
  function onStock() {
    setSel(null);
    setG(prev => {
      if (prev.stock.length === 0) {
        return { ...prev, stock: [...prev.waste].reverse().map(c => ({ ...c, faceUp: false })), waste: [] };
      }
      const stock = [...prev.stock];
      const card = { ...stock.pop()!, faceUp: true };
      return { ...prev, stock, waste: [...prev.waste, card] };
    });
    setMoves(m => m + 1);
  }

  function onWaste() {
    if (!g.waste.length) return;
    if (sel?.from === 'waste') { setSel(null); return; }
    if (sel) { setSel(null); return; } // deselect existing selection
    setSel({ from: 'waste' });
  }

  function onFoundation(fIdx: number) {
    if (sel) { tryFoundation(fIdx); return; }
    // Clicking foundation with no selection: no-op (can't move cards back out)
  }

  function onTabCard(col: number, idx: number) {
    const card = g.tableau[col][idx];
    const isTop = idx === g.tableau[col].length - 1;

    if (!card.faceUp) {
      if (isTop) {
        setG(prev => ({
          ...prev,
          tableau: prev.tableau.map((c, i) =>
            i !== col ? c : c.map((cd, j) => j === idx ? { ...cd, faceUp: true } : cd)
          ),
        }));
        setMoves(m => m + 1);
      }
      setSel(null);
      return;
    }

    if (sel) {
      // Check if clicking the same selection — deselect
      if (sel.from === 'tab' && sel.col === col && sel.idx === idx) { setSel(null); return; }
      tryTableau(col);
      return;
    }

    setSel({ from: 'tab', col, idx });
  }

  function onEmptyTab(col: number) {
    if (!sel) return;
    const cards = selCards(g);
    if (!cards.length || cards[0].rank !== 'K') { setSel(null); return; }
    tryTableau(col);
  }

  function onDblTab(col: number) {
    const col_ = g.tableau[col];
    if (!col_.length) return;
    const card = col_[col_.length - 1];
    if (!card.faceUp) return;
    autoToFoundation(card, false, { col });
  }

  function onDblWaste() {
    const card = g.waste[g.waste.length - 1];
    if (!card) return;
    autoToFoundation(card, true);
  }

  const isSel = (from: string, col?: number, idx?: number): boolean => {
    if (!sel || sel.from !== from) return false;
    if (from === 'waste') return true;
    const s = sel as { from: 'tab'; col: number; idx: number };
    return s.col === col && idx !== undefined && idx >= s.idx;
  };

  // ── Render ──────────────────────────────────────────────────────────────────
  const foundationSuits: Suit[] = ['♠', '♥', '♦', '♣'];

  return (
    <div style={{
      background: 'linear-gradient(160deg,#166534 0%,#15803d 100%)',
      borderRadius: 20, padding: '14px 10px 14px',
      fontFamily: 'Nunito, sans-serif', userSelect: 'none',
      boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.08)',
    }}>

      {/* ── Header ── */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12, flexWrap: 'wrap', gap: 6 }}>
        <span style={{ color: '#fff', fontWeight: 900, fontSize: 14 }}>🃏 Solitaire · {moves} moves</span>
        <span style={{ color: 'rgba(255,255,255,0.55)', fontSize: 11, fontWeight: 700, textAlign: 'center' }}>
          {loadingEmoji} {loadingMessage}
        </span>
        <button
          onClick={newGame}
          style={{ padding: '4px 12px', borderRadius: 999, background: 'rgba(255,255,255,0.18)', color: '#fff', border: 'none', cursor: 'pointer', fontWeight: 800, fontSize: 12 }}
        >
          New Game
        </button>
      </div>

      {/* ── Win banner ── */}
      {won && (
        <div style={{ textAlign: 'center', padding: '14px 0', background: 'rgba(255,255,255,0.12)', borderRadius: 12, marginBottom: 12 }}>
          <div style={{ fontSize: 28, marginBottom: 6 }}>🎉</div>
          <div style={{ color: '#fff', fontWeight: 900, fontSize: 15 }}>You won in {moves} moves!</div>
          <button
            onClick={newGame}
            style={{ marginTop: 8, padding: '5px 16px', borderRadius: 999, background: 'linear-gradient(135deg,#f97316,#ec4899)', color: '#fff', border: 'none', cursor: 'pointer', fontWeight: 800, fontSize: 12 }}
          >
            Play Again
          </button>
        </div>
      )}

      {/* ── Top row: stock · waste · gap · foundations ── */}
      <div style={{ display: 'flex', gap: 5, marginBottom: 10, alignItems: 'flex-start' }}>
        {/* Stock */}
        {g.stock.length > 0
          ? <CardView card={{ ...g.stock[g.stock.length - 1], faceUp: false }} selected={false} onClick={onStock} />
          : <EmptySlot onClick={onStock} label="↺" />
        }

        {/* Waste */}
        {g.waste.length > 0
          ? <CardView card={g.waste[g.waste.length - 1]} selected={isSel('waste')} onClick={onWaste} onDblClick={onDblWaste} />
          : <EmptySlot onClick={() => setSel(null)} />
        }

        <div style={{ flex: 1 }} />

        {/* Foundations */}
        {g.foundations.map((f, fIdx) => (
          f.length > 0
            ? <CardView key={fIdx} card={f[f.length - 1]} selected={false} onClick={() => onFoundation(fIdx)} />
            : <EmptySlot key={fIdx} onClick={() => onFoundation(fIdx)} label={foundationSuits[fIdx]} />
        ))}
      </div>

      {/* ── Tableau ── */}
      <div style={{ display: 'flex', gap: 5 }}>
        {g.tableau.map((col, colIdx) => (
          <div
            key={colIdx}
            onClick={() => col.length === 0 && onEmptyTab(colIdx)}
            style={{ position: 'relative', width: CW, flexShrink: 0, minHeight: CH }}
          >
            {col.length === 0 ? (
              <EmptySlot onClick={() => onEmptyTab(colIdx)} label="K" />
            ) : (
              <div style={{ position: 'relative', height: CH + (col.length - 1) * OVL }}>
                {col.map((card, idx) => (
                  <div key={card.id} style={{ position: 'absolute', top: idx * OVL, left: 0, zIndex: idx + 1 }}>
                    <CardView
                      card={card}
                      selected={isSel('tab', colIdx, idx)}
                      onClick={() => onTabCard(colIdx, idx)}
                      onDblClick={idx === col.length - 1 ? () => onDblTab(colIdx) : undefined}
                    />
                  </div>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>

      {/* ── Footer hint ── */}
      <div style={{ marginTop: 10, textAlign: 'center', color: 'rgba(255,255,255,0.35)', fontSize: 10, lineHeight: 1.5 }}>
        Click card to select · click destination to move · double-click top card to auto-move to foundation
      </div>
    </div>
  );
}
