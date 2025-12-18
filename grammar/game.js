document.addEventListener("DOMContentLoaded", () => {
  const SIZE = 6;

  /**
   * A board cell is either:
   * - null (empty)
   * - a piece: {type:'R'|'N'|'P', color:'W'|'B', royal?:boolean}
   * - a collapsed marker: {collapsed:true}
   */
  let board = [];
  let turn = 'W';
  let selected = null;
  let legalTargets = new Map();
  let gameOver = false;

  const boardEl = document.getElementById('board');
  const statusEl = document.getElementById('status');
  const resetBtn = document.getElementById('resetBtn');

  if (!boardEl || !statusEl || !resetBtn) {
    console.error("Missing required elements (#board, #status, #resetBtn). Check your HTML IDs.");
    return;
  }

  resetBtn.addEventListener('click', () => init());

  function init() {
    board = makeEmptyBoard();
    gameOver = false;
    selected = null;
    legalTargets.clear();
    turn = 'W';

    // White
    place(5, 5, { type: 'R', color: 'W', royal: true });
    place(5, 0, { type: 'R', color: 'W' });
    place(5, 2, { type: 'N', color: 'W' });
    place(5, 3, { type: 'R', color: 'W' });
    place(4, 1, { type: 'P', color: 'W' });
    place(4, 5, { type: 'P', color: 'W' });

    // Black
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

  function isCollapsed(r, c) {
    return board[r][c]?.collapsed === true;
  }

  function isPiece(cell) {
    return cell && cell.collapsed !== true;
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

        if (isCollapsed(r, c)) sq.classList.add('collapsed');

        const isSelected = selected && selected.r === r && selected.c === c;
        if (isSelected) sq.classList.add('selected');

        const key = `${r},${c}`;
        if (legalTargets.has(key)) {
          const t = legalTargets.get(key);
          sq.classList.add(t.kind === 'capture' ? 'capture' : 'move');
        }

        const cell = board[r][c];
        if (isPiece(cell)) {
          const piece = cell;
          const p = document.createElement('div');
          p.className = 'piece ' + (piece.color === 'W' ? 'white' : 'black');

          // Royal rook: crown only (no "R")
          if (piece.royal) {
            p.textContent = '👑';
          } else {
            p.textContent = piece.type;
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

    if (isCollapsed(r, c)) return;

    const cell = board[r][c];
    const piece = isPiece(cell) ? cell : null;

    const key = `${r},${c}`;
    if (selected && legalTargets.has(key)) {
      doMove(selected.r, selected.c, r, c);
      return;
    }

    if (!piece) {
      selected = null;
      legalTargets.clear();
      render();
      return;
    }

    if (piece.color !== turn) return;

    selected = { r, c };
    legalTargets = computeLegalTargets(r, c);
    render();
  }

  function doMove(sr, sc, tr, tc) {
    const moving = board[sr][sc];
    const targetCell = board[tr][tc];

    // Safety
    if (!isPiece(moving)) return;
    if (isCollapsed(tr, tc)) return;

    // Royal capture ends game immediately
    if (isPiece(targetCell) && targetCell.royal) {
      board[tr][tc] = moving;
      board[sr][sc] = null;
      selected = null;
      legalTargets.clear();
      gameOver = true;
      render();
      setStatus((turn === 'W' ? 'White' : 'Black') + " wins! Captured the Royal Rook 👑");
      return;
    }

    const isCapture = isPiece(targetCell) && targetCell.color !== moving.color;

    // Normal move
    board[tr][tc] = moving;
    board[sr][sc] = null;

    // Pawn promotion (only if it survived and landed on a normal square)
    if (moving.type === 'P') {
      if (moving.color === 'W' && tr === 0) board[tr][tc] = { type: 'N', color: 'W' };
      if (moving.color === 'B' && tr === SIZE - 1) board[tr][tc] = { type: 'N', color: 'B' };
    }

    // ✅ CAPTURE & COLLAPSE:
    // If it was a capture, the TARGET square collapses (and anything on it is removed).
    if (isCapture) {
      board[tr][tc] = { collapsed: true };
    }

    selected = null;
    legalTargets.clear();

    turn = (turn === 'W') ? 'B' : 'W';
    render();
    setStatus();
  }

  function computeLegalTargets(r, c) {
    const cell = board[r][c];
    const piece = isPiece(cell) ? cell : null;

    const m = new Map();
    if (!piece) return m;

    const add = (rr, cc) => {
      if (!inBounds(rr, cc)) return;
      if (isCollapsed(rr, cc)) return;

      const t = board[rr][cc];
      if (!t) {
        m.set(`${rr},${cc}`, { kind: 'move' });
      } else if (isPiece(t) && t.color !== piece.color) {
        m.set(`${rr},${cc}`, { kind: 'capture' });
      }
      // If it's collapsed, we already returned above.
      // If it's same-color piece, do nothing.
    };

    if (piece.type === 'R') {
      const dirs = [[-1,0],[1,0],[0,-1],[0,1]];
      for (const [dr, dc] of dirs) {
        let rr = r + dr, cc = c + dc;
        while (inBounds(rr, cc)) {
          if (isCollapsed(rr, cc)) break;

          const t = board[rr][cc];
          if (!t) {
            m.set(`${rr},${cc}`, { kind: 'move' });
          } else if (isPiece(t)) {
            if (t.color !== piece.color) m.set(`${rr},${cc}`, { kind: 'capture' });
            break; // blocked by any piece
          } else {
            // Shouldn't happen, but break anywa
            break;
          }

          rr += dr; cc += dc;
        }
      }
    }

    if (piece.type === 'N') {
      const jumps = [[-2,-1],[-2,1],[-1,-2],[-1,2],[1,-2],[1,2],[2,-1],[2,1]];
      for (const [dr, dc] of jumps) add(r + dr, c + dc);
    }

    if (piece.type === 'P') {
      const dir = (piece.color === 'W') ? -1 : 1;

      const fr = r + dir;
      if (inBounds(fr, c) && !isCollapsed(fr, c) && board[fr][c] === null) {
        m.set(`${fr},${c}`, { kind: 'move' });
      }

      for (const dc of [-1, 1]) {
        const rr = r + dir, cc = c + dc;
        if (!inBounds(rr, cc)) continue;
        if (isCollapsed(rr, cc)) continue;

        const t = board[rr][cc];
        if (isPiece(t) && t.color !== piece.color) {
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
});
