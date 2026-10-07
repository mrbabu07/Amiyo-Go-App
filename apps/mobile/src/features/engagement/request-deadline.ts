export async function withRequestDeadline<Result>(operation: (signal: AbortSignal) => Promise<Result>, timeoutMs = 20_000): Promise<Result> {
  const controller = new AbortController();
  let timer: ReturnType<typeof setTimeout> | undefined;
  const deadline = new Promise<never>((_resolve, reject) => {
    timer = setTimeout(() => {
      reject(new Error("The request took too long. Refresh to check the latest state before retrying."));
      controller.abort();
    }, timeoutMs);
  });
  try { return await Promise.race([operation(controller.signal), deadline]); }
  finally { if (timer) clearTimeout(timer); }
}
