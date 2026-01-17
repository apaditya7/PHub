/* eslint-disable no-console */
const { io } = require('socket.io-client');

const URL = process.env.URL || 'http://localhost:4000';

function wait(ms) { return new Promise(r => setTimeout(r, ms)); }

function logScenario(name, ok, extra = '') {
  console.log(`${ok ? '✅' : '❌'} ${name}${extra ? ' - ' + extra : ''}`);
}

async function main() {
  const A = io(URL, { transports: ['websocket'] });
  const B = io(URL, { transports: ['websocket'] });

  let stateA = null;
  A.on('gameUpdate', (s) => { stateA = s; });
  A.on('errorMessage', (m) => console.log('[A error]', m));
  B.on('errorMessage', (m) => console.log('[B error]', m));

  await Promise.all([
    new Promise(res => A.once('connect', res)),
    new Promise(res => B.once('connect', res)),
  ]);

  const roomId = await new Promise((resolve) => {
    A.emit('createRoom', 'Alice', (rid) => resolve(rid));
  });
  B.emit('joinRoom', roomId, 'Bob', () => {});
  await wait(200);
  A.emit('startGame', roomId);
  await wait(200);

  // Deterministic deck order (requires DEV_TOOLS=true on server)
  const chanceOrder = [
    'CH_ADV_GO',          // Advance to GO (Collect $200)
    'CH_BANK_DIV',        // Collect $50
    'CH_GOOJF',           // Keep card
    'CH_GOTO_JAIL',       // Go to Jail
    'CH_PAY_TAX'          // Pay $50
  ];
  A.emit('dev_setDeck', roomId, 'chance', chanceOrder);
  await wait(150);

  // Helper: ensure current turn belongs to playerId
  async function ensureTurn(playerId) {
    let tries = 0;
    while (stateA && stateA.turnOrder[stateA.currentTurn] !== playerId && tries < 8) {
      const cur = stateA.turnOrder[stateA.currentTurn];
      if (cur === A.id) A.emit('endTurn', roomId); else B.emit('endTurn', roomId);
      await wait(120);
      tries++;
    }
  }

  // 1) CHANCE: Advance to GO (from 6 -> roll 1 -> land on 7 -> card moves to 0 and +200)
  await ensureTurn(A.id);
  A.emit('dev_forcePosition', roomId, A.id, 6);
  await wait(80);
  const cash0 = stateA.players[A.id].cash;
  A.emit('dev_forceRoll', roomId, A.id, 1, 0);
  await wait(200);
  const t1 = stateA.players[A.id];
  logScenario('Chance: Advance to GO', t1.position === 0 && t1.cash === cash0 + 200);

  // 2) CHANCE: Bank Dividend (+50)
  await ensureTurn(A.id);
  A.emit('dev_forcePosition', roomId, A.id, 6);
  await wait(80);
  const cash1 = stateA.players[A.id].cash;
  A.emit('dev_forceRoll', roomId, A.id, 1, 0);
  await wait(200);
  const t2 = stateA.players[A.id];
  logScenario('Chance: Bank Dividend +$50', t2.cash === cash1 + 50);

  // 3) CHANCE: Get Out of Jail Free (card retained)
  await ensureTurn(A.id);
  A.emit('dev_forcePosition', roomId, A.id, 6);
  await wait(80);
  const goojf0 = stateA.players[A.id].getOutOfJailFree || 0;
  A.emit('dev_forceRoll', roomId, A.id, 1, 0);
  await wait(200);
  const goojf1 = stateA.players[A.id].getOutOfJailFree || 0;
  logScenario('Chance: Get Out of Jail Free acquired', goojf1 === goojf0 + 1);

  // 4) CHANCE: Go To Jail -> position 10, inJail true
  await ensureTurn(A.id);
  A.emit('dev_forcePosition', roomId, A.id, 6);
  await wait(80);
  A.emit('dev_forceRoll', roomId, A.id, 1, 0);
  await wait(200);
  const t4 = stateA.players[A.id];
  logScenario('Chance: Go To Jail', t4.inJail === true && t4.position === 10);

  // 5) CHANCE: Pay $50
  // Use GOOJF to leave jail to continue drawing
  await ensureTurn(A.id);
  A.emit('useGetOutOfJailCard', roomId);
  await wait(120);
  A.emit('dev_forcePosition', roomId, A.id, 6);
  await wait(80);
  const cash4 = stateA.players[A.id].cash;
  A.emit('dev_forceRoll', roomId, A.id, 1, 0);
  await wait(200);
  const t5 = stateA.players[A.id];
  logScenario('Chance: Pay $50', t5.cash === cash4 - 50);

  // Teardown
  A.close();
  B.close();
}

main().catch((e) => { console.error(e); process.exit(1); });

