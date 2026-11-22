import { inject } from '@angular/core';
import { CanActivateFn } from '@angular/router';
import { I18n, Lang } from '../i18n/i18n';

/** Sets the active language from the route tree (`/en/...` is English, everything else Vietnamese). */
export const langGuard =
  (lang: Lang): CanActivateFn =>
  () => {
    inject(I18n).setLang(lang);
    return true;
  };
