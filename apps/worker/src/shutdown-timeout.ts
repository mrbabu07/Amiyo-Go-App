export class ShutdownTimeoutError extends Error {
  constructor(readonly timeoutMs: number) {
    super(`Worker shutdown exceeded ${timeoutMs}ms`);
    this.name = "ShutdownTimeoutError";
  }
}

export async function withShutdownTimeout<T>(operation: Promise<T>, timeoutMs: number) {
  let timer: NodeJS.Timeout | undefined;
  try {
    return await Promise.race([
      operation,
      new Promise<never>((_resolve, reject) => { timer = setTimeout(() => reject(new ShutdownTimeoutError(timeoutMs)), timeoutMs); })
    ]);
  } finally {
    if (timer) clearTimeout(timer);
  }
}
