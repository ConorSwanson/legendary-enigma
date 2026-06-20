// Module-level store for Clerk's getToken so api.ts can access it without hooks
type GetToken = () => Promise<string | null>;
let _getToken: GetToken | null = null;

export function setGetToken(fn: GetToken) {
  _getToken = fn;
}

export async function getAuthToken(): Promise<string | null> {
  try {
    return (await _getToken?.()) ?? null;
  } catch {
    return null;
  }
}
