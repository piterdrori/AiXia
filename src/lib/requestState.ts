export type RequestStatus = "idle" | "loading" | "success" | "error";

export type RequestState<T = any> = {
  status: RequestStatus;
  data: T | null;
  error: string | null;
};

export function createInitialState<T = any>(): RequestState<T> {
  return {
    status: "idle",
    data: null,
    error: null,
  };
}

export function startLoading<T>(state: RequestState<T>): RequestState<T> {
  return {
    ...state,
    status: "loading",
    error: null,
  };
}

export function setSuccess<T>(data: T): RequestState<T> {
  return {
    status: "success",
    data,
    error: null,
  };
}

export function setError<T>(error: string): RequestState<T> {
  return {
    status: "error",
    data: null,
    error,
  };
}
