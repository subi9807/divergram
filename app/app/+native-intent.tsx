import { rewriteIncomingAppPath } from '../src/lib/deepLinks';

export function redirectSystemPath({ path }: { path: string; initial: boolean }) {
  return rewriteIncomingAppPath(path);
}
