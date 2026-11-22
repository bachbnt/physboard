import {
  afterNextRender,
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  effect,
  ElementRef,
  inject,
  input,
  signal,
  viewChild,
} from '@angular/core';
import { Chalk } from '../chalk/chalk';
import { createBoardTexture } from '../chalk/board-texture';
import { I18n } from '../i18n/i18n';
import { Scene } from './scene';

/**
 * The blackboard every simulation draws on. It owns the canvas, the pixel-ratio scaling, the
 * animation loop and pointer input, and hands the drawing to a `Scene`.
 *
 * The loop only runs while the board is visible and either `running` or something changed
 * (`invalidate()`), so an idle page costs no CPU.
 */
@Component({
  selector: 'app-board',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'block' },
  template: `
    <div
      #frame
      class="frame"
      [style.--ar]="aspect()"
      [style.--ar-narrow]="aspectNarrow() || aspect()"
      [class.draggable]="draggable()"
    >
      <canvas #canvas role="img" [attr.aria-label]="label()"></canvas>
      <div class="overlay"><ng-content /></div>
      @if (fullscreenable()) {
        <button type="button" class="fs" (click)="toggleFullscreen()" [attr.aria-label]="fsLabel()" [title]="fsLabel()">
          <svg width="18" height="18" viewBox="0 0 18 18" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" aria-hidden="true">
            @if (isFullscreen()) {
              <path d="M7 2v5H2M11 2v5h5M7 16v-5H2M11 16v-5h5" />
            } @else {
              <path d="M2 7V2h5M16 7V2h-5M2 11v5h5M16 11v5h-5" />
            }
          </svg>
        </button>
      }
    </div>
  `,
  styles: `
    .frame {
      position: relative;
      width: 100%;
      aspect-ratio: var(--ar);
      overflow: hidden;
      border-radius: 4px;
      background: #14241f;
      /* Wooden frame, built from borders and shadows so it needs no image. */
      border: 9px solid #6b4a2f;
      border-image: linear-gradient(135deg, #9a6e3f, #5a3b24 45%, #7d5733) 1;
      box-shadow:
        inset 0 0 0 1px rgba(0, 0, 0, 0.45),
        inset 0 6px 22px rgba(0, 0, 0, 0.45),
        0 10px 30px rgba(0, 0, 0, 0.35);
    }
    canvas {
      position: absolute;
      inset: 0;
      width: 100%;
      height: 100%;
      touch-action: pan-y;
    }
    .draggable canvas {
      touch-action: none;
      cursor: grab;
    }
    .draggable canvas:active {
      cursor: grabbing;
    }
    .overlay {
      position: absolute;
      inset: 0;
      pointer-events: none;
    }
    .overlay > * {
      pointer-events: auto;
    }
    .fs {
      position: absolute;
      right: 8px;
      top: 8px;
      display: grid;
      place-items: center;
      width: 34px;
      height: 34px;
      color: #efece0;
      background: rgba(20, 36, 31, 0.7);
      border: 1px solid rgba(239, 236, 224, 0.35);
      border-radius: 4px;
      cursor: pointer;
    }
    .fs:hover {
      border-color: #f3d56a;
      color: #f3d56a;
    }
    @media (max-width: 639px) {
      .frame {
        aspect-ratio: var(--ar-narrow);
      }
    }
    .frame:fullscreen {
      aspect-ratio: auto !important;
      height: 100%;
      border: 0;
    }
  `,
})
export class Board {
  /** Something to draw and (optionally) advance. */
  readonly scene = input.required<Scene>();
  /** Whether time advances. Drawing still happens on demand when this is false. */
  readonly running = input(true);
  /** CSS aspect-ratio of the board. */
  readonly aspect = input('16 / 10');
  /** Aspect-ratio on phones, where a wide board would be too short to read. */
  readonly aspectNarrow = input('');
  /** Accessible description of what the board shows. */
  readonly label = input('');
  /** Lets the scene receive pointer drags. */
  readonly draggable = input(false);
  readonly fullscreenable = input(true);

  protected readonly isFullscreen = signal(false);
  protected readonly fsLabel = () => this.i18n.t(this.isFullscreen() ? 'common.exitFullscreen' : 'common.fullscreen');

  private readonly i18n = inject(I18n);
  private readonly destroyRef = inject(DestroyRef);
  private readonly frame = viewChild.required<ElementRef<HTMLDivElement>>('frame');
  private readonly canvas = viewChild.required<ElementRef<HTMLCanvasElement>>('canvas');

  private ctx: CanvasRenderingContext2D | null = null;
  private chalk: Chalk | null = null;
  private texture: HTMLCanvasElement | null = null;
  private width = 0;
  private height = 0;
  private dpr = 1;
  private raf = 0;
  private last = 0;
  private dirty = true;
  private visible = true;
  private ready = false;

  constructor() {
    afterNextRender(() => this.start());
    // A change in `running` should wake the loop (or let it settle).
    effect(() => {
      this.running();
      if (this.ready) this.invalidate();
    });
  }

  /** Asks for a repaint on the next frame. Call after changing anything the scene draws. */
  invalidate() {
    this.dirty = true;
    this.schedule();
  }

  protected toggleFullscreen() {
    const el = this.frame().nativeElement;
    if (document.fullscreenElement) void document.exitFullscreen();
    else void el.requestFullscreen?.();
  }

  private start() {
    const canvas = this.canvas().nativeElement;
    this.ctx = canvas.getContext('2d');
    if (!this.ctx) return;
    this.chalk = new Chalk(this.ctx);
    this.ready = true;

    const frame = this.frame().nativeElement;
    const resize = new ResizeObserver(() => this.resize());
    resize.observe(frame);
    const visibility = new IntersectionObserver(([entry]) => {
      this.visible = entry.isIntersecting;
      if (this.visible) {
        this.last = performance.now();
        this.invalidate();
      }
    });
    visibility.observe(frame);

    const onPointer = (type: 'down' | 'move' | 'up') => (e: PointerEvent) => {
      if (!this.draggable()) return;
      if (type === 'move' && e.buttons === 0 && e.pointerType === 'mouse') return;
      const rect = canvas.getBoundingClientRect();
      if (type === 'down') canvas.setPointerCapture(e.pointerId);
      this.scene().pointer?.({ type, x: e.clientX - rect.left, y: e.clientY - rect.top });
      this.invalidate();
    };
    const down = onPointer('down');
    const move = onPointer('move');
    const up = onPointer('up');
    canvas.addEventListener('pointerdown', down);
    canvas.addEventListener('pointermove', move);
    canvas.addEventListener('pointerup', up);
    canvas.addEventListener('pointercancel', up);

    const onFullscreen = () => {
      this.isFullscreen.set(document.fullscreenElement === frame);
      this.resize();
    };
    document.addEventListener('fullscreenchange', onFullscreen);

    // The chalk typeface loads after first paint; redraw once it is ready.
    void document.fonts?.ready.then(() => this.invalidate());

    this.resize();
    this.destroyRef.onDestroy(() => {
      cancelAnimationFrame(this.raf);
      resize.disconnect();
      visibility.disconnect();
      canvas.removeEventListener('pointerdown', down);
      canvas.removeEventListener('pointermove', move);
      canvas.removeEventListener('pointerup', up);
      canvas.removeEventListener('pointercancel', up);
      document.removeEventListener('fullscreenchange', onFullscreen);
    });
  }

  private resize() {
    const canvas = this.canvas().nativeElement;
    const rect = canvas.getBoundingClientRect();
    if (rect.width === 0 || rect.height === 0) return;
    this.dpr = Math.min(2, window.devicePixelRatio || 1);
    this.width = rect.width;
    this.height = rect.height;
    canvas.width = Math.round(rect.width * this.dpr);
    canvas.height = Math.round(rect.height * this.dpr);
    this.texture = createBoardTexture(canvas.width, canvas.height);
    this.invalidate();
  }

  private schedule() {
    if (!this.ready || !this.visible || this.raf) return;
    this.raf = requestAnimationFrame(this.tick);
  }

  private readonly tick = (now: number) => {
    this.raf = 0;
    const dt = Math.min(0.05, Math.max(0, (now - this.last) / 1000));
    this.last = now;
    const scene = this.scene();

    if (this.running()) scene.step?.(dt);
    if (this.running() || this.dirty) {
      this.dirty = false;
      this.paint();
    }
    if (this.running() || this.dirty) this.schedule();
  };

  private paint() {
    const { ctx, chalk, texture } = this;
    if (!ctx || !chalk || !texture || this.width === 0) return;
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.drawImage(texture, 0, 0);
    ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
    this.scene().draw(chalk, { w: this.width, h: this.height });
  }
}
