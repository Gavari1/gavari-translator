// 6x6 Mini Rooks (hot-seat)
// Win condition: capture opponent Royal Rook (marked 👑)
// Pieces: 4 rooks, 2 knights, 2 pawns (per both sides total on board: 8 pieces)
// Pawns: single-step forward, diagonal capture, promote to Knight only.

(() => {
  const SIZE = 6;

  /** @type {(null | {type:'R'|'N'|'P', color:'W'|'B', royal?:boolean})[][]} */
  let board = [];
  let turn = 'W'; // 'W' or 'B'
  let selected = null; // {r,c} or null
  let legalTargets = new Map(); // key "r,c" -> {kind:'move'|'capture'}
  let gameOver = false;

  const boardEl = document.getElementById('board');
  const statusEl = document.getElementById('status');
  const resetBtn = document.getElementById('resetBtn');

  resetBtn.addEventListener('click', () => init());

  function init() {
    board = makeEmptyBoard();
    gameOver = false;
    selected = null;
    legalTargets.clear();
    turn = 'W';

    // Starting layout (row 0 = top, row 4 = bottom)
    // White back rank at row 4: R N R _ R
    // White pawns at row 3: b4? (actually col1) and d4 (col3)
    place(5, 5, { type: 'R', color: 'W', royal: true });
    place(5, 0, { type: 'R', color: 'W' });
    place(5, 2, { type: 'N', color: 'W' });
    place(5, 3, { type: 'R', color: 'W' });
    place(4, 1, { type: 'P', color: 'W' });
    place(4, 5, { type: 'P', color: 'W' });

    // Black at row 0: R _ R N R (a little asymmetry makes it fun)
    // Black pawns at row 1: col1 and col3
    place(0, 0, { type: 'R', color: 'B', royal: true });
    place(0, 2, { type: 'R', color: 'B' });
    place(0, 3, { type: 'N', color: 'B' });
    place(0, 5, { type: 'R', color: 'B' });
    place(1, 0, { type: 'P', color: 'B' });
    place(1, 4, { type: 'P', color: 'B' });

    render();
    setStatus();
  }

  function makeEmptyBoard() {
    return Array.from({ length: SIZE }, () => Array.from({ length: SIZE }, () => null));
  }

  function place(r, c, piece) {
    board[r][c] = piece;
  }

  function setStatus(msg) {
    if (msg) {
      statusEl.textContent = msg;
      return;
    }
    if (gameOver) return;
    statusEl.textContent = (turn === 'W' ? 'White' : 'Black') + " to move";
  }

  function render() {
    boardEl.innerHTML = '';
    for (let r = 0; r < SIZE; r++) {
      for (let c = 0; c < SIZE; c++) {
        const sq = document.createElement('div');
        sq.className = 'square ' + (((r + c) % 2 === 0) ? 'light' : 'dark');
        sq.dataset.r = String(r);
        sq.dataset.c = String(c);

        const isSelected = selected && selected.r === r && selected.c === c;
        if (isSelected) sq.classList.add('selected');

        const key = `${r},${c}`;
        if (legalTargets.has(key)) {
          const t = legalTargets.get(key);
          sq.classList.add(t.kind === 'capture' ? 'capture' : 'move');
        }

        const piece = board[r][c];
        if (piece) {
          const p = document.createElement('div');
          p.className = 'piece ' + (piece.color === 'W' ? 'white' : 'black');
          p.textContent = piece.type;

          if (piece.royal) {
            const crown = document.createElement('span');
            crown.className = 'crown';
            crown.textContent = '👑';
            p.appendChild(crown);
          }

          sq.appendChild(p);
        }

        sq.addEventListener('click', onSquareClick);
        boardEl.appendChild(sq);
      }
    }
  }

  function onSquareClick(e) {
    if (gameOver) return;

    const r = Number(e.currentTarget.dataset.r);
    const c = Number(e.currentTarget.dataset.c);
    const piece = board[r][c];

    // If we clicked a legal target, perform move.
    const key = `${r},${c}`;
    if (selected && legalTargets.has(key)) {
      doMove(selected.r, selected.c, r, c);
      return;
    }

    // Otherwise: selection logic
    if (!piece) {
      // Clicking empty square clears selection
      selected = null;
      legalTargets.clear();
      render();
      return;
    }

    // Only select your own piece
    if (piece.color !== turn) {
      // ignore (or you can set a little message)
      return;
    }

    selected = { r, c };
    legalTargets = computeLegalTargets(r, c);
    render();
  }

  function doMove(sr, sc, tr, tc) {
    const moving = board[sr][sc];
    const target = board[tr][tc];

    // Capture check for Royal Rook
    if (target && target.royal) {
      board[tr][tc] = moving;
      board[sr][sc] = null;
      selected = null;
      legalTargets.clear();
      gameOver = true;
      render();
      setStatus((turn === 'W' ? 'White' : 'Black') + " wins! Captured the Royal Rook 👑");
      return;
    }

    // Normal move
    board[tr][tc] = moving;
    board[sr][sc] = null;

    // Pawn promotion to Knight only
    if (moving.type === 'P') {
      if (moving.color === 'W' && tr === 0) {
        board[tr][tc] = { type: 'N', color: 'W' };
      }
      if (moving.color === 'B' && tr === SIZE - 1) {
        board[tr][tc] = { type: 'N', color: 'B' };
      }
    }

    selected = null;
    legalTargets.clear();

    // Switch turn
    turn = (turn === 'W') ? 'B' : 'W';
    render();
    setStatus();
  }

  function computeLegalTargets(r, c) {
    const piece = board[r][c];
    const m = new Map();
    if (!piece) return m;

    const add = (rr, cc) => {
      if (!inBounds(rr, cc)) return;
      const t = board[rr][cc];
      if (!t) {
        m.set(`${rr},${cc}`, { kind: 'move' });
      } else if (t.color !== piece.color) {
        m.set(`${rr},${cc}`, { kind: 'capture' });
      }
    };

    if (piece.type === 'R') {
      // Rook rays: up, down, left, right
      const dirs = [
        [-1, 0],
        [ 1, 0],
        [ 0,-1],
        [ 0, 1],
      ];
      for (const [dr, dc] of dirs) {
        let rr = r + dr, cc = c + dc;
        while (inBounds(rr, cc)) {
          const t = board[rr][cc];
          if (!t) {
            m.set(`${rr},${cc}`, { kind: 'move' });
          } else {
            if (t.color !== piece.color) {
              m.set(`${rr},${cc}`, { kind: 'capture' });
            }
            break; // blocked
          }
          rr += dr; cc += dc;
        }
      }
    }

    if (piece.type === 'N') {
      const jumps = [
        [-2,-1], [-2, 1],
        [-1,-2], [-1, 2],
        [ 1,-2], [ 1, 2],
        [ 2,-1], [ 2, 1],
      ];
      for (const [dr, dc] of jumps) add(r + dr, c + dc);
    }

    if (piece.type === 'P') {
      // White moves "up" (toward row 0), Black moves "down" (toward row 4)
      const dir = (piece.color === 'W') ? -1 : 1;

      // Forward one if empty
      const fr = r + dir;
      if (inBounds(fr, c) && board[fr][c] === null) {
        m.set(`${fr},${c}`, { kind: 'move' });
      }

      // Diagonal captures
      for (const dc of [-1, 1]) {
        const rr = r + dir;
        const cc = c + dc;
        if (!inBounds(rr, cc)) continue;
        const t = board[rr][cc];
        if (t && t.color !== piece.color) {
          m.set(`${rr},${cc}`, { kind: 'capture' });
        }
      }
    }

    return m;
  }

  function inBounds(r, c) {
    return r >= 0 && r < SIZE && c >= 0 && c < SIZE;
  }

  // Boot
  init();
})();
