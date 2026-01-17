const { io } = require('socket.io-client');
const url = 'http://localhost:4000';

const A = io(url, { transports: ['websocket'] });
const B = io(url, { transports: ['websocket'] });

const log = (p, ...args) => console.log(`[${p}]`, ...args);

function wire(name, s) {
  s.on('connect', () => log(name, 'connected', s.id));
  s.on('roomUpdate', (r) => log(name, 'roomUpdate', {
    roomId: r.roomId, players: r.players.map(p => ({ id: p.id, name: p.name, cash: p.cash, pos: p.position })), 
    currentTurn: r.currentTurn, started: r.started
  }));
  s.on('gameUpdate', (g) => log(name, 'gameUpdate', { lastRoll: g.lastRoll, turnOrder: g.turnOrder, currentTurn: g.turnOrder[g.currentTurn] }));
  s.on('errorMessage', (m) => log(name, 'error', m));
}

wire('A', A);
wire('B', B);

A.on('connect', () => {
  A.emit('createRoom', 'Alice', (roomId) => {
    log('A', 'created room', roomId);
    B.emit('joinRoom', roomId, 'Bob', (ok, msg) => {
      log('B', 'join', ok, msg || '');
      A.emit('startGame', roomId);

      setTimeout(() => {
        A.emit('rollDice', roomId);
        setTimeout(() => {
          A.emit('buyProperty', roomId); // may error if not on property
          setTimeout(() => {
            A.emit('endTurn', roomId);
            setTimeout(() => {
              B.emit('rollDice', roomId);
              setTimeout(() => {
                B.emit('endTurn', roomId);
                setTimeout(() => {
                  A.close(); B.close(); process.exit(0);
                }, 500);
              }, 500);
            }, 500);
          }, 500);
        }, 500);
      }, 500);
    });
  });
});