'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';

export default function LoadingBalloon() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [percent, setPercent] = useState(0);
  const pumpPosRef = useRef(0);
  const pumpBoundsRef = useRef({ left: 0, right: 0, y: 0 });
  const lockedRef = useRef(false);
  const filledRef = useRef(true); // pumping direction flag like original
  const balloonImgRef = useRef<HTMLImageElement | null>(null);
  const explosionImgRef = useRef<HTMLImageElement | null>(null);
  const rafRef = useRef<number>(0);

  useEffect(() => {
    const canvas = canvasRef.current!;
    const ctx = canvas.getContext('2d')!;

    const loadImg = (src: string) => new Promise<HTMLImageElement>((resolve) => {
      const img = new Image();
      img.onload = () => resolve(img);
      img.src = src;
    });

    let running = true;
    const onResize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };
    onResize();
    window.addEventListener('resize', onResize);

    const init = async () => {
      balloonImgRef.current = await loadImg('/ballon.png');
      explosionImgRef.current = await loadImg('/ballon2.png');
      draw();
    };

    const getBalloonBottomCenter = () => {
      const img = balloonImgRef.current!;
      return { x: canvas.width - 200 - img.width / 2, y: canvas.height - 400 };
    };

    const getBalloonSize = (p: number) => {
      const img = balloonImgRef.current!;
      const w = img.width / 2 + (img.width / 2) * (p / 100);
      const h = img.height / 2 + (img.height / 2) * (p / 100);
      return { w, h };
    };

    const getBalloonPos = (size: { w: number; h: number }) => {
      const base = getBalloonBottomCenter();
      return { x: base.x - size.w / 2, y: base.y - size.h };
    };

    const drawTube = (anchor: { x: number; y: number }) => {
      ctx.strokeStyle = '#000';
      ctx.lineWidth = 20;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      ctx.beginPath();
      ctx.moveTo(anchor.x, anchor.y - 20);
      ctx.bezierCurveTo(anchor.x + 4, anchor.y + 132, anchor.x + 126, anchor.y + 46, anchor.x + 166, anchor.y + 112);
      ctx.bezierCurveTo(anchor.x + 213, anchor.y + 190, anchor.x + 122, anchor.y + 217, anchor.x + 81, anchor.y + 218);
      ctx.bezierCurveTo(anchor.x - 25, anchor.y + 221, anchor.x - 4, anchor.y + 209, anchor.x - 49, anchor.y + 202);
      ctx.bezierCurveTo(anchor.x - 113, anchor.y + 192, anchor.x - 164, anchor.y + 195, anchor.x - 196, anchor.y + 167);
      ctx.bezierCurveTo(anchor.x - 245, anchor.y + 125, anchor.x - 228, anchor.y + 3, anchor.x - 310, anchor.y - 13);
      ctx.stroke();

      // Pump housing
      ctx.strokeStyle = '#000';
      ctx.lineWidth = 20;
      const centerX = canvas.width / 2;
      const rectY = anchor.y - 13;
      const rectHalfW = Math.abs((anchor.x - 310) - centerX);
      const rectW = rectHalfW * 2;
      ctx.beginPath();
      // rounded rect
      const r = 10; const h = 100; const x = centerX - rectHalfW; const y = rectY - h / 2;
      ctx.moveTo(x + r, y);
      ctx.lineTo(x + rectW - r, y);
      ctx.quadraticCurveTo(x + rectW, y, x + rectW, y + r);
      ctx.lineTo(x + rectW, y + h - r);
      ctx.quadraticCurveTo(x + rectW, y + h, x + rectW - r, y + h);
      ctx.lineTo(x + r, y + h);
      ctx.quadraticCurveTo(x, y + h, x, y + h - r);
      ctx.lineTo(x, y + r);
      ctx.quadraticCurveTo(x, y, x + r, y);
      ctx.stroke();

      // Pump bounds
      const pumpLeft = 100;
      const pumpRight = canvas.width - (anchor.x - 310) - 40;
      pumpBoundsRef.current = { left: pumpLeft, right: pumpRight, y: anchor.y };

      // Pump handle + rod
      const px = Math.max(pumpLeft, Math.min(pumpRight, pumpPosRef.current));
      pumpPosRef.current = px;
      ctx.beginPath();
      ctx.moveTo(px, anchor.y - 63);
      ctx.lineTo(px, anchor.y + 37); // handle
      ctx.moveTo(px + 1, anchor.y - 13);
      ctx.lineTo(pumpRight + 27, anchor.y - 13); // rod
      ctx.stroke();
    };

    const draw = () => {
      if (!running) return;
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.fillStyle = 'rgb(30,30,30)';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      if (!balloonImgRef.current || !explosionImgRef.current) {
        rafRef.current = requestAnimationFrame(draw);
        return;
      }

      const size = getBalloonSize(percent);
      const pos = getBalloonPos(size);

      if (percent < 95) {
        ctx.drawImage(balloonImgRef.current, pos.x, pos.y, size.w, size.h);
        ctx.fillStyle = '#fff';
        ctx.font = '40px sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(`${Math.floor(percent)}%`, pos.x + size.w / 2, pos.y + size.h / 2 - 20);
      } else {
        ctx.drawImage(explosionImgRef.current, pos.x, pos.y, size.w, size.h);
      }

      const anchor = getBalloonBottomCenter();
      drawTube(anchor);

      rafRef.current = requestAnimationFrame(draw);
    };

    const onMouseDown = (e: MouseEvent) => {
      const { left, right, y } = pumpBoundsRef.current;
      const withinX = e.clientX > pumpPosRef.current - 15 && e.clientX < pumpPosRef.current + 15;
      const withinY = e.clientY > y - 73 && e.clientY < y + 47;
      if (withinX && withinY) lockedRef.current = true;
    };
    const onMouseUp = () => { lockedRef.current = false; };
    const onMouseMove = (e: MouseEvent) => {
      if (!lockedRef.current) return;
      const { left, right } = pumpBoundsRef.current;
      pumpPosRef.current = Math.max(left, Math.min(right, e.clientX));
      if (filledRef.current) {
        if (pumpPosRef.current > right - 10) {
          filledRef.current = false;
          if (percent < 96) setPercent((p) => Math.min(100, p + Math.random() * 2 + 1));
        }
      } else {
        if (pumpPosRef.current < left + 10) {
          filledRef.current = true;
        }
      }
    };

    window.addEventListener('mousedown', onMouseDown);
    window.addEventListener('mouseup', onMouseUp);
    window.addEventListener('mousemove', onMouseMove);

    init();

    return () => {
      running = false;
      cancelAnimationFrame(rafRef.current);
      window.removeEventListener('resize', onResize);
      window.removeEventListener('mousedown', onMouseDown);
      window.removeEventListener('mouseup', onMouseUp);
      window.removeEventListener('mousemove', onMouseMove);
    };
  }, [percent]);

  return (
    <div className="min-h-screen bg-black text-white relative">
      <Link href="/" className="absolute top-8 left-8 text-blue-300 hover:text-blue-100 underline z-50">
        ← Back to Home
      </Link>

      <canvas ref={canvasRef} className="fixed inset-0 w-full h-full" />

      <div className="absolute bottom-6 left-1/2 -translate-x-1/2 text-center z-10">
        <p className="text-sm opacity-80">Drag the pump handle to inflate the balloon</p>
      </div>
    </div>
  );
}

