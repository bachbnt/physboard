import { DestroyRef, effect, inject, PLATFORM_ID, Signal, signal, WritableSignal } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';

const clamp = (v: number, min: number, max: number) => Math.min(max, Math.max(min, v));

/** Reads a number from the query string (clamped to range), falling back to a default. */
export function readNumber(raw: string | null, fallback: number, min: number, max: number): number {
  if (raw === null || raw.trim() === '') return fallback;
  const n = Number(raw);
  return Number.isFinite(n) ? clamp(n, min, max) : fallback;
}

/** A writable signal whose first value comes from `?name=` in the URL. Call during construction. */
export function urlParam(name: string, fallback: number, min: number, max: number): WritableSignal<number> {
  const route = inject(ActivatedRoute);
  return signal(readNumber(route.snapshot.queryParamMap.get(name), fallback, min, max));
}

/**
 * Keeps the query string in step with the given signals, so any setting can be shared as a link.
 * Writes are debounced and replace the history entry instead of adding one per slider tick.
 */
export function syncUrlParams(params: Record<string, Signal<number>>): void {
  const router = inject(Router);
  const route = inject(ActivatedRoute);
  const destroyRef = inject(DestroyRef);
  if (!isPlatformBrowser(inject(PLATFORM_ID))) return;

  let timer: ReturnType<typeof setTimeout> | undefined;
  effect(() => {
    const queryParams: Record<string, number> = {};
    for (const [name, sig] of Object.entries(params)) queryParams[name] = Math.round(sig() * 1000) / 1000;
    clearTimeout(timer);
    timer = setTimeout(
      () => void router.navigate([], { relativeTo: route, queryParams, queryParamsHandling: 'merge', replaceUrl: true }),
      350,
    );
  });
  destroyRef.onDestroy(() => clearTimeout(timer));
}
