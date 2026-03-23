import { useState } from "react";

export function useAsyncState() {
  const [isBootstrapping, setIsBootstrapping] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState("");

  const startInitial = () => {
    setIsBootstrapping(true);
    setError("");
  };

  const startRefresh = () => {
    setIsRefreshing(true);
    setError("");
  };

  const setFailure = (message: string) => {
    setError(message);
  };

  const finish = () => {
    setIsBootstrapping(false);
    setIsRefreshing(false);
  };

  return {
    isBootstrapping,
    isRefreshing,
    error,
    setError,
    startInitial,
    startRefresh,
    setFailure,
    finish,
  };
}
