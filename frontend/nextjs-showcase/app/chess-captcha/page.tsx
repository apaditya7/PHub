'use client';

import { useState, useEffect, useRef, Fragment, useCallback } from 'react';
import { Chessboard } from 'react-chessboard';
import { Chess } from 'chess.js';
import { Transition } from '@headlessui/react';
import Link from 'next/link';

// Stockfish integration
function useStockfish(onCheckmate: (loser: string) => void) {
  const [fen, setFen] = useState('start');
  const gameRef = useRef(new Chess());
  const engineRef = useRef<Worker | null>(null);
  const evalerRef = useRef<Worker | null>(null);
  const announcedGameOverRef = useRef(false);
  const uciOkRef = useRef(false);
  const readyOkRef = useRef(false);

  useEffect(() => {
    // Load Stockfish workers
    const loadStockfish = () => {
      if (typeof window === 'undefined') return;

      try {
        // @ts-ignore
        if (typeof window.STOCKFISH === 'function') {
          // @ts-ignore
          engineRef.current = window.STOCKFISH();
          // @ts-ignore
          evalerRef.current = window.STOCKFISH();
        } else {
          engineRef.current = new Worker('/stockfish.js');
          evalerRef.current = new Worker('/stockfish.js');
        }

        // Set engine/evaler message handlers BEFORE sending any commands
        if (engineRef.current) {
          engineRef.current.onmessage = (event: MessageEvent<any>) => {
            const line = typeof event === 'object' ? (event as MessageEvent<any>).data : (event as unknown as string);

            if (line === 'uciok') {
              uciOkRef.current = true;
              uciCmd('isready');
              return;
            }
            if (line === 'readyok') {
              readyOkRef.current = true;
              // Start the game: engine (White) moves first
              prepareMove();
              return;
            }

            const match = (line as string).match(/^bestmove ([a-h][1-8])([a-h][1-8])([qrbn])?/);
            if (match) {
              try {
                gameRef.current.move({ from: match[1], to: match[2], promotion: match[3] });
                setFen(gameRef.current.fen());
                prepareMove();
              } catch (error) {
                console.error('Invalid move:', error);
              }
            }
          };
        }

        // The eval worker also expects a handler; attach a no-op/logging handler
        if (evalerRef.current) {
          evalerRef.current.onmessage = (event: MessageEvent<any>) => {
            // Optional: inspect evaluation output
            // const line = typeof event === 'object' ? (event as MessageEvent<any>).data : (event as unknown as string);
            // console.debug('[Stockfish eval]', line);
          };
        }

        // Initialize engine AFTER handler is set
        uciCmd('uci');
        uciCmd('ucinewgame');
        // wait for uciok → will send isready from handler
        uciCmd('setoption name Skill Level value 3');

        // Initialize evaler worker as well
        if (evalerRef.current) {
          uciCmd('uci', evalerRef.current as unknown as Worker);
          uciCmd('isready', evalerRef.current as unknown as Worker);
        }

      } catch (error) {
        console.error('Failed to load Stockfish:', error);
      }
    };

    // Load immediately (handles both window.STOCKFISH and Web Worker builds)
    loadStockfish();

    // Set initial FEN
    setFen(gameRef.current.fen());

    // Check for game over
    const gameOverInterval = setInterval(() => {
      if (announcedGameOverRef.current) return;

      if (gameRef.current.isGameOver()) {
        announcedGameOverRef.current = true;
        onCheckmate(gameRef.current.turn());
      }
    }, 500);

    return () => {
      clearInterval(gameOverInterval);
      const safeTerminate = (w: any) => {
        if (!w) return;
        if (typeof w.terminate === 'function') {
          try { w.terminate(); } catch {}
        } else if (typeof w.postMessage === 'function') {
          try { w.postMessage('quit'); } catch {}
        }
      };

      safeTerminate(engineRef.current);
      safeTerminate(evalerRef.current);
    };
  }, [onCheckmate]);

  const uciCmd = (cmd: string, which?: Worker) => {
    (which || engineRef.current)?.postMessage(cmd);
  };

  const getMoves = () => {
    let moves = '';
    const history = gameRef.current.history({ verbose: true });

    for (let i = 0; i < history.length; ++i) {
      const move = history[i];
      moves += ' ' + move.from + move.to + (move.promotion ? move.promotion : '');
    }

    return moves;
  };

  const sendPosition = (which?: Worker) => {
    const moves = getMoves();
    if (moves.length > 0) {
      uciCmd('position startpos moves' + moves, which);
    } else {
      uciCmd('position startpos', which);
    }
  };

  const prepareMove = () => {
    const game = gameRef.current;
    const turn = game.turn() === 'w' ? 'white' : 'black';

    if (!game.isGameOver()) {
      // Engine plays Black; user plays White
      if (turn !== 'white') {
        sendPosition();
        sendPosition(evalerRef.current! as unknown as Worker);
        uciCmd('eval', evalerRef.current!);
        uciCmd('go depth 10');
      }
    }
  };

  // Engine message handler is now set immediately after worker creation

  const onDrop = useCallback((sourceSquare: string, targetSquare: string) => {
    try {
      const move = gameRef.current.move({
        from: sourceSquare,
        to: targetSquare,
        promotion: 'q',
      });

      if (move === null) return false;

      setFen(gameRef.current.fen());
      setTimeout(() => prepareMove(), 100);
      return true;
    } catch (error) {
      return false;
    }
  }, []);

  return { fen, onDrop };
}

// Chess popup component
function ChessPopup({
  open,
  onBlur,
  onCheckmate,
}: {
  open: boolean;
  onBlur: () => void;
  onCheckmate: (loser: string) => void;
}) {
  const [showBoard, setShowBoard] = useState(false);
  const [loser, setLoser] = useState('');
  const chessBoardContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (open) {
      setTimeout(() => {
        if (open) {
          setShowBoard(true);
          setLoser('');
        }
      }, 750);
    } else {
      setShowBoard(false);
    }
  }, [open]);

  const handleCheckmate = (loserColor: string) => {
    setLoser(loserColor);
  };

  const submit = () => {
    onBlur();
    onCheckmate(loser);
  };

  const { fen, onDrop } = useStockfish(handleCheckmate);

  return (
    <Transition
      as={Fragment}
      show={open}
      enter="transition-opacity delay-1000 duration-150"
      enterFrom="opacity-0"
      enterTo="opacity-100"
      leave="transition-opacity duration-150"
      leaveFrom="opacity-100"
      leaveTo="opacity-0"
    >
      <div className="fixed grid place-items-center z-[100] inset-0">
        <div
          className="absolute inset-0 bg-gray-500 opacity-40"
          onClick={onBlur}
        ></div>
        <div className="bg-white w-full max-w-lg border border-gray-300 shadow-sm z-30">
          <div className="px-2 mt-2 mb-2">
            <div className="w-full p-6 text-white bg-blue-500">
              <h1 className="text-md">Complete the following challenge</h1>
              <h1 className="font-bold text-3xl">checkmate a computer</h1>
              <h1 className="text-md">
                Click verify once the opponent can't move.
              </h1>
            </div>
          </div>

          <div className="px-2 mb-2" ref={chessBoardContainerRef}>
            {showBoard ? (
              <Chessboard
                position={fen}
                boardOrientation="white"
                onPieceDrop={onDrop}
                boardWidth={chessBoardContainerRef.current?.offsetWidth ? chessBoardContainerRef.current.offsetWidth - 16 : 500}
              />
            ) : (
              <div className="grid place-items-center w-full aspect-square">
                <p>loading</p>
              </div>
            )}
          </div>

          <div className="flex justify-end p-2 border-t border-gray-300">
            <div className="flex items-center flex-grow">
              {loser !== 'b' && loser !== '' && <p>good job mate</p>}
              {loser !== 'w' && loser !== '' && <p>lol</p>}
            </div>
            <button
              className="uppercase flex-0 text-white font-bold disabled:bg-gray-300 bg-blue-500 px-7 py-3 rounded-sm"
              onClick={submit}
              disabled={loser === ''}
            >
              Verify
            </button>
          </div>
        </div>
      </div>
    </Transition>
  );
}

// Main app component
export default function ChessCaptcha() {
  const [open, setOpen] = useState(false);
  const [loser, setLoser] = useState('');
  const [checkmarkFrame, setCheckmarkFrame] = useState(0);

  useEffect(() => {
    // Load Stockfish script
    const script = document.createElement('script');
    script.src = '/stockfish.js';
    script.async = true;
    document.body.appendChild(script);

    return () => {
      document.body.removeChild(script);
    };
  }, []);

  const handlePopup = () => {
    setOpen(true);
  };

  const onBlur = () => {
    setOpen(false);
  };

  const handleCheckmate = (loserColor: string) => {
    setLoser(loserColor);

    // Animate checkmark
    setTimeout(() => {
      for (let i = 0; i < 20; i++) {
        setTimeout(() => {
          setCheckmarkFrame(i);
        }, i * 15);
      }
    }, 150);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-100 to-purple-100 flex flex-col items-center justify-center p-8">
      <Link href="/" className="absolute top-8 left-8 text-blue-600 hover:text-blue-800 underline z-50">
        ← Back to Home
      </Link>

      <div className="text-center mb-12">
        <h1 className="text-4xl font-bold text-gray-800 mb-4">Chess CAPTCHA</h1>
        <p className="text-gray-600">Prove you're human by checkmating Stockfish!</p>
        <p className="text-sm text-gray-500 mt-2">Stockfish skill level: 3</p>
      </div>

      <div className="flex flex-col items-center justify-center">
        <div className="inline-flex items-stretch w-72 justify-between py-2 px-3 border border-gray-300 rounded-sm shadow-sm bg-[#F9F9F9]">
          <div className="flex items-center space-x-3">
            <div className="w-7 h-7 relative">
              <Transition
                as={Fragment}
                show={!open && (loser === '' ? true : loser === 'b' && false)}
                enter="transition-all transform duration-150"
                enterFrom="rounded-none scale-0"
                enterTo="rounded-full scale-100"
                leave="transition-all transform duration-150"
                leaveFrom="rounded-full scale-100"
                leaveTo="rounded-none scale-0"
              >
                <button
                  id="checkmark"
                  onClick={handlePopup}
                  className="absolute border-2 w-7 h-7 border-gray-400 rounded-sm bg-white active:bg-[#EBEBEB]"
                ></button>
              </Transition>

              <Transition
                as={Fragment}
                show={open}
                enter="transition-opacity duration-150"
                enterFrom="opacity-0"
                enterTo="opacity-100"
                leave="transition-opacity duration-150"
                leaveFrom="opacity-100"
                leaveTo="opacity-0"
              >
                <svg
                  className="absolute spinner w-7 h-7"
                  viewBox="0 0 66 66"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <circle
                    className="path"
                    fill="none"
                    strokeWidth="6"
                    cx="33"
                    cy="33"
                    r="30"
                  ></circle>
                </svg>
              </Transition>

              <Transition
                as={Fragment}
                show={!open && (loser === '' ? false : loser === 'b' && true)}
                enter="transition-opacity duration-150"
                enterFrom="opacity-0"
                enterTo="opacity-100"
                leave="transition-opacity duration-150"
                leaveFrom="opacity-100"
                leaveTo="opacity-0"
              >
                <div
                  style={{
                    backgroundImage: 'url(/checkmark.png)',
                    backgroundPosition: `0px -${checkmarkFrame * 30}px`,
                    width: '38px',
                    height: '30px',
                    marginLeft: '-5px',
                  }}
                ></div>
              </Transition>
            </div>
            <label htmlFor="checkmark" className="flex items-center text-sm mr-5 h-full">
              I'm not a robot
            </label>
          </div>
          <div className="flex flex-col items-center">
            <img src="/logo_48.png" className="w-8 h-8" alt="recaptcha logo" />
            <p className="text-[0.6rem] text-gray-600">reCAPTCHA</p>
            <p className="text-[0.6rem] text-gray-600">Privacy - Terms</p>
          </div>
        </div>

        {!open && loser === 'b' && (
          <p className="text-sm font-bold mt-3">
            good stuff man. ur verified despite losing
          </p>
        )}
        {!open && loser === 'w' && (
          <p className="text-sm font-bold mt-3">
            haha I caught you, you can't beat a computer u must be a robot
          </p>
        )}
      </div>

      <ChessPopup open={open} onBlur={onBlur} onCheckmate={handleCheckmate} />

      <style jsx global>{`
        .spinner {
          animation: rotator 1.4s linear infinite;
        }

        @keyframes rotator {
          0% {
            transform: rotate(0deg);
          }
          100% {
            transform: rotate(270deg);
          }
        }

        .path {
          stroke-dasharray: 187;
          stroke-dashoffset: 0;
          transform-origin: center;
          animation: dash 1.4s ease-in-out infinite, colors 5.6s ease-in-out infinite;
          stroke: #4285f4;
        }

        @keyframes colors {
          0% {
            stroke: #4285f4;
          }
          25% {
            stroke: #de3e35;
          }
          50% {
            stroke: #f7c223;
          }
          75% {
            stroke: #1b9a59;
          }
          100% {
            stroke: #4285f4;
          }
        }

        @keyframes dash {
          0% {
            stroke-dashoffset: 187;
          }
          50% {
            stroke-dashoffset: 46.75;
            transform: rotate(135deg);
          }
          100% {
            stroke-dashoffset: 187;
            transform: rotate(450deg);
          }
        }
      `}</style>
    </div>
  );
}
