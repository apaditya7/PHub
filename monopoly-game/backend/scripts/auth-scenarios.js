/* eslint-disable no-console */
const { io } = require('socket.io-client');

const URL = process.env.URL || 'http://localhost:4000';
function wait(ms) { return new Promise(r => setTimeout(r, ms)); }

async function main() {
  const A = io(URL, { transports: ['websocket'] });
  const B = io(URL, { transports: ['websocket'] });

  await Promise.all([
    new Promise(res => A.once('connect', res)),
    new Promise(res => B.once('connect', res)),
  ]);

  const pass = '1234';
  const roomId = await new Promise((resolve) => {
    A.emit('createRoomWithPass', 'Alice', pass, (rid) => resolve(rid));
  });
  console.log('Created room', roomId, 'with passcode', pass);

  // Join without pass should fail
  await new Promise((resolve) => {
    B.emit('joinRoom', roomId, 'Bob', (ok, msg) => { console.log('Join without pass:', ok, msg); resolve(); });
  });

  // Join with pass should succeed
  await new Promise((resolve) => {
    B.emit('joinRoomWithPass', roomId, pass, 'Bob', (ok, msg) => { console.log('Join with pass:', ok, msg); resolve(); });
  });

  A.close();
  B.close();
}

main().catch((e) => { console.error(e); process.exit(1); });

