import { useState } from "react";
import { dedupeRequest } from "./requestDeduper";
import {
  createInitialState,
  startLoading,
  setSuccess,
  setError,
} from "./requestState";
import type { RequestState } from "./requestState";

export function useRequest<T = any>() {
  const [state, setState] = useState<RequestState<T>>(createInitialState());

  const run = async (fn: () => Promise<T>, key?: string) => {
    setState((prev) => startLoading(prev));

    try {
      const result = key ? await dedupeRequest(key, fn) : await fn();
      setState(setSuccess(result));
      return result;
    } catch (err: any) {
      const message = err?.message || "Something went wrong";
      setState(setError(message));
      throw err;
    }
  };

  return {
    ...state,
    run,
    setState,
  };
}
