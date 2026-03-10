"use client";

import * as React from "react";

type RefreshState = "idle" | "loading" | "done";

export function useRefreshState() {
  const [refreshState, setRefreshState] = React.useState<RefreshState>("idle");

  const startRefresh = React.useCallback(() => {
    setRefreshState("loading");
  }, []);

  const finishRefresh = React.useCallback(() => {
    setRefreshState("done");

    const timer = window.setTimeout(() => {
      setRefreshState("idle");
    }, 2000);

    return () => window.clearTimeout(timer);
  }, []);

  const failRefresh = React.useCallback(() => {
    setRefreshState("idle");
  }, []);

  return {
    refreshState,
    startRefresh,
    finishRefresh,
    failRefresh,
    isRefreshing: refreshState === "loading",
  };
}