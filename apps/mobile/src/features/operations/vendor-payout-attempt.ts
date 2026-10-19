export function createVendorPayoutAttempt<Result>(newKey: () => string) {
  const attempts = new Map<string, { key: string; pending?: Promise<Result>; result?: Result; confirmed: boolean }>();
  let pendingIdentity: string | null = null;

  return {
    submit(identity: string, request: (key: string) => Promise<Result>): Promise<Result> {
      if (pendingIdentity !== null && pendingIdentity !== identity) return Promise.reject(new Error("A payout request is already in progress"));
      let attempt = attempts.get(identity);
      if (!attempt) {
        attempt = { key: newKey(), confirmed: false };
        attempts.set(identity, attempt);
      }
      if (attempt.confirmed) return Promise.resolve(attempt.result as Result);
      if (attempt.pending) return attempt.pending;
      const current = attempt;
      pendingIdentity = identity;
      current.pending = Promise.resolve().then(() => request(current.key)).then((result) => {
        current.result = result;
        current.confirmed = true;
        return result;
      }).finally(() => {
        current.pending = undefined;
        pendingIdentity = null;
      });
      return current.pending;
    },
    reset(identity: string) {
      if (pendingIdentity !== identity) attempts.delete(identity);
    }
  };
}
