import { hash } from './chalk';

/**
 * Paints a slate-green blackboard once, with a soft light in the middle, fine chalk dust and a
 * few faint eraser sweeps. The result is reused every frame, so drawing the board costs nothing.
 */
export function createBoardTexture(width: number, height: number): HTMLCanvasElement {
  const canvas = document.createElement('canvas');
  canvas.width = Math.max(1, Math.round(width));
  canvas.height = Math.max(1, Math.round(height));
  const ctx = canvas.getContext('2d');
  if (!ctx) return canvas;

  const glow = ctx.createRadialGradient(width * 0.5, height * 0.4, 0, width * 0.5, height * 0.5, Math.max(width, height) * 0.75);
  glow.addColorStop(0, '#264239');
  glow.addColorStop(1, '#14241f');
  ctx.fillStyle = glow;
  ctx.fillRect(0, 0, width, height);

  // Eraser sweeps: wide, very faint, slightly curved bands.
  ctx.lineCap = 'round';
  for (let i = 0; i < 5; i++) {
    ctx.strokeStyle = `rgba(239, 236, 224, ${0.012 + hash(i * 9.1) * 0.012})`;
    ctx.lineWidth = 26 + hash(i * 3.3) * 40;
    ctx.beginPath();
    const y = height * (0.15 + hash(i * 5.7) * 0.7);
    ctx.moveTo(-20, y);
    ctx.bezierCurveTo(width * 0.3, y - 30 + hash(i) * 60, width * 0.6, y + 30 - hash(i + 3) * 60, width + 20, y + hash(i + 7) * 40 - 20);
    ctx.stroke();
  }

  // Chalk dust.
  const specks = Math.round((width * height) / 380);
  for (let i = 0; i < specks; i++) {
    const x = hash(i * 1.37) * width;
    const y = hash(i * 2.71 + 5) * height;
    ctx.fillStyle = `rgba(239, 236, 224, ${0.015 + hash(i * 7.13) * 0.05})`;
    ctx.fillRect(x, y, 1 + hash(i * 3.17) * 1.4, 1 + hash(i * 4.91) * 1.4);
  }
  return canvas;
}
