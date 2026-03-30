type RequestKey = string;

type InFlightMap = Map<RequestKey, Promise<any>>;

const inFlightRequests: InFlightMap = new Map();

export async function dedupeRequest<T>(
  key: RequestKey,
  fn: () => Promise<T>
): Promise<T> {
  if (inFlightRequests.has(key)) {
    return inFlightRequests.get(key)!;
  }

  const promise = fn()
    .catch((err) => {
      throw err;
    })
    .finally(() => {
      inFlightRequests.delete(key);
    });

  inFlightRequests.set(key, promise);

  return promise;
}
