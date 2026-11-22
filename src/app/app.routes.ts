import { Routes } from '@angular/router';
import { langGuard } from './core/lang-guard';

/**
 * One page tree, mounted twice: at the root for Vietnamese and under `/en` for English.
 * A function, so each mount gets its own route objects.
 */
const pages = (): Routes => [
  { path: '', loadComponent: () => import('./features/home/home-page').then((m) => m.HomePage) },
  { path: 'projectile', loadComponent: () => import('./features/projectile/projectile-page').then((m) => m.ProjectilePage) },
  { path: 'pendulum', loadComponent: () => import('./features/pendulum/pendulum-page').then((m) => m.PendulumPage) },
  { path: 'interference', loadComponent: () => import('./features/interference/interference-page').then((m) => m.InterferencePage) },
  { path: 'orbit', loadComponent: () => import('./features/orbit/orbit-page').then((m) => m.OrbitPage) },
  { path: 'rlc', loadComponent: () => import('./features/rlc/rlc-page').then((m) => m.RlcPage) },
  { path: 'lens', loadComponent: () => import('./features/lens/lens-page').then((m) => m.LensPage) },
  { path: '**', loadComponent: () => import('./features/not-found/not-found-page').then((m) => m.NotFoundPage) },
];

export const routes: Routes = [
  { path: 'en', canActivate: [langGuard('en')], children: pages() },
  { path: '', canActivate: [langGuard('vi')], children: pages() },
];
