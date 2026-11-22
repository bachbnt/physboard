import type { vi } from './vi';

/** Turns every string literal in `T` into plain `string`, keeping the same nesting and arrays. */
type DeepStrings<T> = T extends string
  ? string
  : T extends readonly (infer U)[]
    ? DeepStrings<U>[]
    : { -readonly [K in keyof T]: DeepStrings<T[K]> };

export type Dict = DeepStrings<typeof vi>;
