import { RenderMode, ServerRoute } from '@angular/ssr';

/** Every page is prerendered at build time, so the deployed site is plain static files. */
export const serverRoutes: ServerRoute[] = [{ path: '**', renderMode: RenderMode.Prerender }];
