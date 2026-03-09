import type { backendInterface } from "../backend";
import { createActorWithConfig } from "../config";

let _backend: backendInterface | null = null;
let _loading: Promise<backendInterface> | null = null;

export async function getBackend(): Promise<backendInterface> {
  if (_backend) return _backend;
  if (_loading) return _loading;
  _loading = createActorWithConfig().then((b) => {
    _backend = b;
    _loading = null;
    return b;
  });
  return _loading;
}

// Proxy that lazily resolves backend calls
export const backend: backendInterface = new Proxy({} as backendInterface, {
  get(_target, prop: string) {
    return (...args: unknown[]) =>
      getBackend().then((b) =>
        (b as unknown as Record<string, (...a: unknown[]) => unknown>)[prop](
          ...args,
        ),
      );
  },
});
