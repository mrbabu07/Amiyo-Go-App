export function createCheckoutAttempt<Result>(newKey: () => string) {
  const attempts = new Map<string, { key: string; pending?: Promise<Result>; result?: Result; complete: boolean }>();
  let pendingIdentity: string | null = null;
  return async (identity: string, submit: (key: string) => Promise<Result>): Promise<Result> => {
    if (pendingIdentity !== null && pendingIdentity !== identity) throw new Error("A checkout is already in progress");
    let attempt = attempts.get(identity);
    if (!attempt) {
      attempt = { key: newKey(), complete: false };
      attempts.set(identity, attempt);
    }
    if (attempt.complete) return attempt.result as Result;
    if (attempt.pending) return attempt.pending;
    const current = attempt;
    pendingIdentity = identity;
    current.pending = Promise.resolve().then(() => submit(current.key)).then((result) => {
      current.result = result;
      current.complete = true;
      return result;
    }).finally(() => {
      current.pending = undefined;
      pendingIdentity = null;
    });
    return current.pending;
  };
}
