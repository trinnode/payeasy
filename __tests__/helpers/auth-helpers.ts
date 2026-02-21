import crypto from "crypto";

/**
 * Generate a valid test Stellar keypair
 * Note: This is a mock function - actual Keypair should be mocked in tests
 */
export function generateTestKeypair() {
  // Return a mock keypair structure - actual Keypair will be mocked in tests
  return {
    publicKey: () => "GDUMMYPUBLICKEY123456789",
    sign: jest.fn().mockReturnValue(Buffer.from("mockSignature", "base64")),
    verify: jest.fn(),
  };
}

// Generate test challenge data

export function generateTestChallenge() {
  const nonce = crypto.randomBytes(32).toString("hex");
  const timestamp = Date.now();
  return { nonce, timestamp };
}

//Sign a message with a Stellar keypair

export function signMessage(keypair: any, message: string): string {
  const messageBuffer = Buffer.from(message, "utf-8");
  const signature = keypair.sign(messageBuffer);
  return signature.toString("base64");
}

/**
 * Create test request body for login endpoint
 */
export function createLoginBody(publicKey: string) {
  return { publicKey };
}

/**
 * Create test request body for verify endpoint
 */
export function createVerifyBody(
  publicKey: string,
  signature: string,
  nonce: string,
  timestamp: number,
) {
  return { publicKey, signature, nonce, timestamp };
}

/**
 * Mock expired timestamp (older than 5 minutes)
 */
export function getExpiredTimestamp(): number {
  return Date.now() - 6 * 60 * 1000; // 6 minutes ago
}

/**
 * Mock future timestamp (more than 5 minutes ahead)
 */
export function getFutureTimestamp(): number {
  return Date.now() + 6 * 60 * 1000; // 6 minutes from now
}

/**
 * Create test HTTP request with JSON body
 */
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

/**
 * Parse Set-Cookie header into structured data
 */
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

/**
 * Check if cookie has specific attribute
 */
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
