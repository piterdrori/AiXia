/** TS 5.9-safe narrow for `{ ok: true } | { ok: false; error: string }` discriminated unions. */
export function isOkResultFailed<R extends { ok: boolean }>(
  result: R,
): result is Extract<R, { ok: false }> {
  return result.ok === false;
}

export function okResultError(result: { ok: false; error: string }): string {
  return result.error;
}
