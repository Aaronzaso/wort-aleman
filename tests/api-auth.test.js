import test from "node:test";
import assert from "node:assert/strict";
import { generateKeyPair, exportJWK, createLocalJWKSet, SignJWT } from "jose";
import { createTokenVerifier, authenticate } from "../server/auth.js";

const origin = "https://auth.example";
const { privateKey, publicKey } = await generateKeyPair("EdDSA");
const publicJwk = await exportJWK(publicKey);
const verifier = createTokenVerifier({
  baseUrl: `${origin}/neondb/auth`,
  jwks: createLocalJWKSet({
    keys: [{ ...publicJwk, alg: "EdDSA", kid: "test-key" }],
  }),
});
async function token(claims = {}, key = privateKey) {
  return new SignJWT({ role: "authenticated", ...claims })
    .setProtectedHeader({ alg: "EdDSA", kid: "test-key" })
    .setIssuedAt()
    .setExpirationTime("15m")
    .setSubject("account-a")
    .setIssuer(origin)
    .setAudience(origin)
    .sign(key);
}

test("valid Neon-style authenticated JWTs resolve only their signed subject", async () => {
  assert.equal(await verifier(await token()), "account-a");
});

test("anonymous, banned and invalid subject tokens cannot access progress", async () => {
  await assert.rejects(verifier(await token({ role: "anonymous" })));
  await assert.rejects(verifier(await token({ banned: true })));
  const badSubject = await new SignJWT({ role: "authenticated" })
    .setProtectedHeader({ alg: "EdDSA", kid: "test-key" })
    .setSubject("../other-user")
    .setIssuer(origin)
    .setAudience(origin)
    .setIssuedAt()
    .setExpirationTime("15m")
    .sign(privateKey);
  await assert.rejects(verifier(badSubject));
});

test("tokens for another issuer or audience are rejected despite a valid signature", async () => {
  for (const [issuer, audience] of [
    ["https://other-auth.example", origin],
    [origin, "https://other-auth.example"],
  ]) {
    const value = await new SignJWT({ role: "authenticated" })
      .setProtectedHeader({ alg: "EdDSA", kid: "test-key" })
      .setSubject("account-a")
      .setIssuer(issuer)
      .setAudience(audience)
      .setIssuedAt()
      .setExpirationTime("15m")
      .sign(privateKey);
    await assert.rejects(verifier(value));
  }
});

test("expired, unsigned, forged and claim-incomplete tokens are rejected", async () => {
  const expired = await new SignJWT({ role: "authenticated" })
    .setProtectedHeader({ alg: "EdDSA", kid: "test-key" })
    .setSubject("account-a")
    .setIssuer(origin)
    .setAudience(origin)
    .setIssuedAt(Math.floor(Date.now() / 1000) - 1800)
    .setExpirationTime(Math.floor(Date.now() / 1000) - 900)
    .sign(privateKey);
  await assert.rejects(verifier(expired));
  const incomplete = await new SignJWT({ role: "authenticated" })
    .setProtectedHeader({ alg: "EdDSA", kid: "test-key" })
    .setSubject("account-a")
    .setIssuer(origin)
    .setIssuedAt()
    .setExpirationTime("15m")
    .sign(privateKey);
  await assert.rejects(verifier(incomplete));
  const other = await generateKeyPair("EdDSA");
  await assert.rejects(verifier(await token({}, other.privateKey)));
  await assert.rejects(verifier("eyJhbGciOiJub25lIn0.e30."));
});

test("missing bearer tokens fail before any environment or JWKS access", async () => {
  await assert.rejects(authenticate({ headers: {} }), { status: 401 });
  await assert.rejects(
    authenticate({ headers: { authorization: "Bearer opaque session token" } }),
    { status: 401 },
  );
});
