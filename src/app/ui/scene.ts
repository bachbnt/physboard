import type { Chalk } from '../chalk/chalk';

export interface BoardSize {
  w: number;
  h: number;
}

export interface BoardPointer {
  type: 'down' | 'move' | 'up';
  /** Position in CSS pixels from the board's top-left corner. */
  x: number;
  y: number;
}

/** What a simulation page hands to the board: how to advance time and how to draw a frame. */
export interface Scene {
  /** Advances the simulation by `dt` real seconds. Called only while the board is running. */
  step?(dt: number): void;
  draw(g: Chalk, size: BoardSize): void;
  /** Receives drag input when the board is `draggable`. */
  pointer?(e: BoardPointer): void;
}
