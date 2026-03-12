export function createRequestTracker() {
  let requestId = 0;

  return {
    next() {
      requestId += 1;
      return requestId;
    },
    isLatest(id: number) {
      return id === requestId;
    },
  };
}
