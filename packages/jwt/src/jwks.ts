import { DecodedJwt, JsonWebKeyset } from './types';

/**
 * Fetch a json web keyset.
 */
export async function getJwks(issuer: string): Promise<JsonWebKeyset> {
  const url = new URL(issuer);
  url.pathname = '/.well-known/jwks.json';
  const response = await fetch(url.href);
  if (!response.ok) {
    throw new Error(
      `Error loading jwks at ${url.href}. ${response.status} ${response.statusText}`
    );
  }
  return response.json();
}

const importedKeys: Record<string, CryptoKey> = {};

/**
 * Import and cache a JsonWebKeyset
 * @param issuer The issuer. Serves as the cache key.
 * @param jwks The JsonWebKeyset to import.
 */
export async function importKey(issuer: string, jwk: JsonWebKey) {
  const input = {
    kty: 'RSA',
    e: 'AQAB',
    n: jwk.n,
    alg: 'RS256',
    ext: true
  };
  const key = await crypto.subtle.importKey(
    'jwk',
    input,
    { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' },
    false,
    ['verify']
  );
  importedKeys[issuer] = key;
}

/**
 * Get the CryptoKey associated with the JWT's issuer.
 */
export async function getkey(decoded: DecodedJwt): Promise<CryptoKey> {
  if (!importedKeys[decoded.payload.iss]) {
    const jwks = await getJwks(decoded.payload.iss);
    await importKey(decoded.payload.iss, jwks.keys[0]);
  }
  return importedKeys[decoded.payload.iss];
}
