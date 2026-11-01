import { useSyncExternalStore } from "react";

const subscribe = () => () => {};

/** True after hydration. Used to render portals safely. */
export function useIsClient(): boolean {
  return useSyncExternalStore(
    subscribe,
    () => true,
    () => false,
  );
}