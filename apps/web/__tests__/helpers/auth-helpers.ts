import crypto from "crypto";

export function generateTestKeypair() {
  return {
    publicKey: () => "GDUMMYPUBLICKEY123456789",
    sign: jest.fn().mockReturnValue(Buffer.from("mockSignature", "base64")),
    verify: jest.fn(),
  };
}

export function generateTestChallenge() {
  const nonce = crypto.randomBytes(32).toString("hex");
  const timestamp = Date.now();
  return { nonce, timestamp };
}

export function signMessage(keypair: any, message: string): string {
  const messageBuffer = Buffer.from(message, "utf-8");
  const signature = keypair.sign(messageBuffer);
  return signature.toString("base64");
}

export function createLoginBody(publicKey: string) {
  return { publicKey };
}

export function createVerifyBody(
  publicKey: string,
  signature: string,
  nonce: string,
  timestamp: number,
) {
  return { publicKey, signature, nonce, timestamp };
}

export function getExpiredTimestamp(): number {
  return Date.now() - 6 * 60 * 1000;
}

export function getFutureTimestamp(): number {
  return Date.now() + 6 * 60 * 1000;
}

export function createAuthRequest(
  url: string,
  body: any,
  headers: Record<string, string> = {},
): Request {
  return new Request(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...headers,
    },
    body: JSON.stringify(body),
  });
}

export function parseCookie(cookieString: string | null): {
  name: string;
  value: string;
  attributes: string[];
} | null {
  if (!cookieString) return null;

  const parts = cookieString.split(";").map((p) => p.trim());
  const [nameValue] = parts;
  const [name, value] = nameValue.split("=");

  return {
    name: name.trim(),
    value: value || "",
    attributes: parts.slice(1),
  };
}

export function cookieHasAttribute(
  cookieString: string | null,
  attribute: string,
): boolean {
  const cookie = parseCookie(cookieString);
  if (!cookie) return false;

  return cookie.attributes.some((attr) =>
    attr.toLowerCase().includes(attribute.toLowerCase()),
  );
}
