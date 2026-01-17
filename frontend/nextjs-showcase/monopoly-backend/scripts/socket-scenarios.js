/* eslint-disable no-console */
const { io } = require('socket.io-client');

const URL = process.env.URL || 'http://localhost:4000';
const USE_DEV = process.env.USE_DEV_TOOLS !== 'false'; // assume true unless explicitly disabled

function once(socket, event, timeoutMs = 3000) {
  return new Promise((resolve, reject) => {
    const to = setTimeout(() => reject(new Error(`Timeout waiting for ${event}`)), timeoutMs);
    socket.once(event, (data) => { clearTimeout(to); resolve(data); });
  });
}

function wait(ms) { return new Promise(r => setTimeout(r, ms)); }

function logScenario(name, ok, extra = '') {
  console.log(`${ok ? '✅' : '❌'} ${name}${extra ? ' - ' + extra : ''}`);
}

async function main() {
  const A = io(URL, { transports: ['websocket'] });
  const B = io(URL, { transports: ['websocket'] });

  // wire error logs
  A.on('errorMessage', (m) => console.log('[A error]', m));
  B.on('errorMessage', (m) => console.log('[B error]', m));

  await Promise.all([
    new Promise(res => A.once('connect', res)),
    new Promise(res => B.once('connect', res)),
  ]);
  console.log('[A] connected', A.id);
  console.log('[B] connected', B.id);

  // Create room and join
  const roomId = await new Promise((resolve) => {
    A.emit('createRoom', 'Alice', (rid) => resolve(rid));
  });
  B.emit('joinRoom', roomId, 'Bob', () => {});
  // Wait for room updates to settle
  await wait(200);

  // Start game (host)
  A.emit('startGame', roomId);
  await wait(200);

  // 1) Out-of-turn action: B tries to roll on Alice's turn
  let outOfTurnOK = false;
  const e1 = new Promise((resolve) => {
    const handler = (m) => { if (String(m).includes('Not your turn')) { outOfTurnOK = true; } resolve(); };
    B.once('errorMessage', handler);
  });
  B.emit('rollDice', roomId);
  await Promise.race([e1, wait(500)]);
  logScenario('Out-of-turn roll blocked', outOfTurnOK);

  // 2) Invalid buy on non-property tile (GO at start)
  let invalidBuyOK = false;
  const e2 = new Promise((resolve) => {
    const handler = (m) => { if (String(m).includes('Not a property')) { invalidBuyOK = true; } resolve(); };
    A.once('errorMessage', handler);
  });
  A.emit('buyProperty', roomId);
  await Promise.race([e2, wait(500)]);
  logScenario('Invalid buy rejected on non-property', invalidBuyOK);

  if (USE_DEV) {
    // Keep track of latest state
    let latest = null;
    A.on('gameUpdate', (s) => { latest = s; });
    await wait(150);

    // Helper: ensure turn belongs to socket id
    async function ensureTurn(playerId) {
      let tries = 0;
      while (latest && latest.turnOrder[latest.currentTurn] !== playerId && tries < 6) {
        // whoever's turn it is, end turn
        const cur = latest.turnOrder[latest.currentTurn];
        if (cur === A.id) A.emit('endTurn', roomId); else B.emit('endTurn', roomId);
        await wait(120);
        tries++;
      }
    }

    // 3) Go To Jail deterministically (Alice)
    await ensureTurn(A.id);
    let goToJailOK = false;
    A.emit('dev_forcePosition', roomId, A.id, 28);
    await wait(100);
    const jailUpdateP = new Promise((resolve) => {
      const handler = (state) => {
        const me = state.players[A.id];
        if (me && me.inJail === true && me.position === 10) { goToJailOK = true; }
        resolve();
      };
      A.once('gameUpdate', handler);
    });
    A.emit('dev_forceRoll', roomId, A.id, 1, 1);
    await Promise.race([jailUpdateP, wait(800)]);
    logScenario('Go To Jail applied (position 30 -> 10, inJail)', goToJailOK);

    // 4) Rent transfer
    // Alice owns tile 1
    await ensureTurn(A.id);
    A.emit('dev_forcePosition', roomId, A.id, 1);
    await wait(120);
    const price = latest.board[1].price || 0;
    const aCash0 = latest.players[A.id].cash;
    A.emit('buyProperty', roomId);
    await wait(150);
    const boughtOK = latest.players[A.id].cash === aCash0 - price;
    // Now make it Bob's turn and land on 1
    await ensureTurn(B.id);
    const aCash1 = latest.players[A.id].cash;
    const bCash1 = latest.players[B.id].cash;
    B.emit('dev_forcePosition', roomId, B.id, 0);
    await wait(80);
    B.emit('dev_forceRoll', roomId, B.id, 1, 0);
    await wait(200);
    const rent = latest.board[1].rent || 0;
    const aCash2 = latest.players[A.id].cash;
    const bCash2 = latest.players[B.id].cash;
    const rentOK = boughtOK && aCash2 === aCash1 + rent && bCash2 === bCash1 - rent;
    logScenario('Rent transfer on owned tile', rentOK, `(rent=${rent})`);
  } else {
    console.log('Note: Set server DEV_TOOLS=true and run with USE_DEV_TOOLS=true to run deterministic tests 3 & 4');
  }

  // Teardown
  A.close();
  B.close();
}

main().catch((e) => { console.error(e); process.exit(1); });
