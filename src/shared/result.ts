export type Result<T, E extends Error = Error> =
  | Readonly<{ ok: true; value: T }>
  | Readonly<{ ok: false; error: E }>;

export function ok<T>(value: T): Result<T> {
  return Object.freeze({ ok: true, value });
}

export function err<E extends Error>(error: E): Result<never, E> {
  return Object.freeze({ ok: false, error });
}
