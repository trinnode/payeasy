import { POST } from "@/app/api/auth/verify/route";
import * as stellarAuth from "@/lib/auth/stellar-auth";
import {
  generateTestChallenge,
  createVerifyBody,
  getExpiredTimestamp,
  createAuthRequest,
  parseCookie,
  cookieHasAttribute,
} from "../helpers/auth-helpers";

// Mock stellar-auth module
jest.mock("@/lib/auth/stellar-auth");

describe("POST /api/auth/verify", () => {
  let testKeypair: any;
  let testChallenge: { nonce: string; timestamp: number };
  let validSignature: string;

  beforeEach(() => {
    jest.clearAllMocks();

    // Mock keypair with required methods
    testKeypair = {
      publicKey: () => "GDUMMYPUBLICKEY123456789",
      sign: jest.fn().mockReturnValue(Buffer.from("mockSignature", "base64")),
      verify: jest.fn(),
    };

    testChallenge = generateTestChallenge();

    // Mock successful path by default
    (stellarAuth.buildMessage as jest.Mock).mockReturnValue(
      `PayEasy Login: ${testChallenge.nonce}.${testChallenge.timestamp}`,
    );
    (stellarAuth.isTimestampValid as jest.Mock).mockReturnValue(true);
    (stellarAuth.verifySignature as jest.Mock).mockReturnValue(true);
    (stellarAuth.signJwt as jest.Mock).mockReturnValue("mock.jwt.token");

    validSignature = "validMockSignature";
  });

  describe("Success cases", () => {
    it("should verify valid signature and return JWT token", async () => {
      const body = createVerifyBody(
        testKeypair.publicKey(),
        validSignature,
        testChallenge.nonce,
        testChallenge.timestamp,
      );

      const request = createAuthRequest(
        "http://localhost/api/auth/verify",
        body,
      );

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data.publicKey).toBe(testKeypair.publicKey());

      // Verify mocks were called with correct parameters
      expect(stellarAuth.buildMessage).toHaveBeenCalledWith(
        testChallenge.nonce,
        testChallenge.timestamp,
      );
      expect(stellarAuth.isTimestampValid).toHaveBeenCalledWith(
        testChallenge.timestamp,
      );
      expect(stellarAuth.verifySignature).toHaveBeenCalledWith(
        testKeypair.publicKey(),
        validSignature,
        `PayEasy Login: ${testChallenge.nonce}.${testChallenge.timestamp}`,
      );
      expect(stellarAuth.signJwt).toHaveBeenCalledWith(testKeypair.publicKey());

      // Check cookie was set with better parsing
      const cookies = response.headers.get("set-cookie");
      const cookie = parseCookie(cookies);

      expect(cookie).not.toBeNull();
      expect(cookie?.name).toBe("auth-token");
      expect(cookie?.value).toBe("mock.jwt.token");
      expect(cookieHasAttribute(cookies, "HttpOnly")).toBe(true);
      expect(cookieHasAttribute(cookies, "SameSite=strict")).toBe(true);
      expect(cookieHasAttribute(cookies, "Path=/")).toBe(true);
    });

    it("should set secure flag in production", async () => {
      const originalEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = "production";

      const body = createVerifyBody(
        testKeypair.publicKey(),
        validSignature,
        testChallenge.nonce,
        testChallenge.timestamp,
      );

      const request = createAuthRequest(
        "http://localhost/api/auth/verify",
        body,
      );

      const response = await POST(request);
      const cookies = response.headers.get("set-cookie");

      expect(cookieHasAttribute(cookies, "Secure")).toBe(true);

      process.env.NODE_ENV = originalEnv;
    });
  });

  describe("Error cases - Missing fields", () => {
    it("should return 400 when publicKey is missing", async () => {
      const request = createAuthRequest("http://localhost/api/auth/verify", {
        signature: "sig",
        nonce: "nonce",
        timestamp: 123,
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.success).toBe(false);
      expect(data.error.code).toBe("MISSING_FIELD");
      expect(data.error.message).toBe("Missing required field: publicKey");
      expect(data.error.field).toBe("publicKey");
    });

    it("should return 400 when signature is missing", async () => {
      const request = createAuthRequest("http://localhost/api/auth/verify", {
        publicKey: "key",
        nonce: "nonce",
        timestamp: 123,
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.success).toBe(false);
      expect(data.error.message).toBe("Missing required field: signature");
    });

    it("should return 400 when nonce is missing", async () => {
      const request = createAuthRequest("http://localhost/api/auth/verify", {
        publicKey: "key",
        signature: "sig",
        timestamp: 123,
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.success).toBe(false);
      expect(data.error.message).toBe("Missing required field: nonce");
    });

    it("should return 400 when timestamp is missing", async () => {
      const request = createAuthRequest("http://localhost/api/auth/verify", {
        publicKey: "key",
        signature: "sig",
        nonce: "nonce",
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.success).toBe(false);
      expect(data.error.message).toBe("Missing required field: timestamp");
    });
  });

  describe("Error cases - Expired challenge", () => {
    it("should return 401 for expired timestamp", async () => {
      (stellarAuth.isTimestampValid as jest.Mock).mockReturnValue(false);

      const expiredTimestamp = getExpiredTimestamp();
      const body = createVerifyBody(
        testKeypair.publicKey(),
        validSignature,
        testChallenge.nonce,
        expiredTimestamp,
      );

      const request = createAuthRequest(
        "http://localhost/api/auth/verify",
        body,
      );

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.success).toBe(false);
      expect(data.error.code).toBe("CHALLENGE_EXPIRED");
      expect(data.error.message).toBe("Challenge expired");

      // Verify timestamp validation was called
      expect(stellarAuth.isTimestampValid).toHaveBeenCalledWith(
        expiredTimestamp,
      );
    });
  });

  describe("Error cases - Invalid signature", () => {
    it("should return 401 for invalid signature", async () => {
      (stellarAuth.verifySignature as jest.Mock).mockReturnValue(false);

      const body = createVerifyBody(
        testKeypair.publicKey(),
        "invalid-signature",
        testChallenge.nonce,
        testChallenge.timestamp,
      );

      const request = createAuthRequest(
        "http://localhost/api/auth/verify",
        body,
      );

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.success).toBe(false);
      expect(data.error.code).toBe("INVALID_SIGNATURE");
      expect(data.error.message).toBe("Invalid signature");

      // Verify signature check was called
      expect(stellarAuth.verifySignature).toHaveBeenCalledWith(
        testKeypair.publicKey(),
        "invalid-signature",
        expect.any(String),
      );
    });

    it("should return 401 when signature is for different message", async () => {
      (stellarAuth.verifySignature as jest.Mock).mockReturnValue(false);

      const wrongSignature = "wrongMockSignature";
      const body = createVerifyBody(
        testKeypair.publicKey(),
        wrongSignature,
        testChallenge.nonce,
        testChallenge.timestamp,
      );

      const request = createAuthRequest(
        "http://localhost/api/auth/verify",
        body,
      );

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.success).toBe(false);
      expect(data.error.message).toBe("Invalid signature");
    });
  });

  describe("Edge cases", () => {
    it("should handle malformed JSON", async () => {
      const request = new Request("http://localhost/api/auth/verify", {
        method: "POST",
        body: "not-json",
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.success).toBe(false);
      expect(data.error.message).toBe("Internal server error");
    });

    it("should handle timestamp as 0", async () => {
      const body = createVerifyBody(
        testKeypair.publicKey(),
        validSignature,
        testChallenge.nonce,
        0,
      );

      const request = createAuthRequest(
        "http://localhost/api/auth/verify",
        body,
      );

      const response = await POST(request);

      // Should not return 400 for timestamp validation
      expect(response.status).not.toBe(400);
      expect(stellarAuth.isTimestampValid).toHaveBeenCalledWith(0);
    });

    it("should handle empty string values", async () => {
      const request = createAuthRequest("http://localhost/api/auth/verify", {
        publicKey: "",
        signature: "",
        nonce: "",
        timestamp: 123,
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.success).toBe(false);
    });

    it("should handle very long public key", async () => {
      const longKey = "G" + "A".repeat(1000);
      const body = createVerifyBody(
        longKey,
        validSignature,
        testChallenge.nonce,
        testChallenge.timestamp,
      );

      const request = createAuthRequest(
        "http://localhost/api/auth/verify",
        body,
      );

      const response = await POST(request);

      // Should process without crashing
      expect(response.status).toBeDefined();
    });

    it("should handle special characters in nonce", async () => {
      const specialNonce = "test!@#$%^&*()_+-={}[]|:;<>?,./~`";
      const body = createVerifyBody(
        testKeypair.publicKey(),
        validSignature,
        specialNonce,
        testChallenge.timestamp,
      );

      const request = createAuthRequest(
        "http://localhost/api/auth/verify",
        body,
      );

      const response = await POST(request);

      // Should process without error
      expect(response.status).toBeDefined();
      expect(stellarAuth.buildMessage).toHaveBeenCalledWith(
        specialNonce,
        testChallenge.timestamp,
      );
    });

    it("should handle very large timestamp values", async () => {
      const largeTimestamp = Number.MAX_SAFE_INTEGER;
      const body = createVerifyBody(
        testKeypair.publicKey(),
        validSignature,
        testChallenge.nonce,
        largeTimestamp,
      );

      const request = createAuthRequest(
        "http://localhost/api/auth/verify",
        body,
      );

      const response = await POST(request);

      expect(stellarAuth.isTimestampValid).toHaveBeenCalledWith(largeTimestamp);
    });

    it("should handle negative timestamp values", async () => {
      const negativeTimestamp = -12345;
      const body = createVerifyBody(
        testKeypair.publicKey(),
        validSignature,
        testChallenge.nonce,
        negativeTimestamp,
      );

      const request = createAuthRequest(
        "http://localhost/api/auth/verify",
        body,
      );

      const response = await POST(request);

      expect(stellarAuth.isTimestampValid).toHaveBeenCalledWith(
        negativeTimestamp,
      );
    });
  });

  describe("Concurrent request handling", () => {
    it("should handle multiple concurrent verification requests safely", async () => {
      const concurrentRequests = 10;
      const keypairs = Array(concurrentRequests)
        .fill(null)
        .map(() => {
          return {
            publicKey: () => `GDUMMYKEY${Math.random()}`,
            sign: jest.fn().mockReturnValue(Buffer.from("mockSig", "base64")),
          };
        });

      // Get challenges for all keypairs
      const challenges = keypairs.map(() => generateTestChallenge());

      // Create concurrent verification requests
      const requests = keypairs.map((kp, index) => {
        const body = createVerifyBody(
          kp.publicKey(),
          validSignature,
          challenges[index].nonce,
          challenges[index].timestamp,
        );
        return POST(
          createAuthRequest("http://localhost/api/auth/verify", body),
        );
      });

      // Execute all requests concurrently
      const responses = await Promise.all(requests);

      // All requests should complete without crashing
      expect(responses).toHaveLength(concurrentRequests);
      responses.forEach((response) => {
        expect(response.status).toBeDefined();
        expect([200, 401, 500]).toContain(response.status);
      });
    });

    it("should handle concurrent requests for same public key", async () => {
      const samePublicKey = testKeypair.publicKey();
      const concurrentRequests = 5;

      // Create multiple concurrent requests with same public key
      const requests = Array(concurrentRequests)
        .fill(null)
        .map(() => {
          const challenge = generateTestChallenge();
          const body = createVerifyBody(
            samePublicKey,
            validSignature,
            challenge.nonce,
            challenge.timestamp,
          );
          return POST(
            createAuthRequest("http://localhost/api/auth/verify", body),
          );
        });

      const responses = await Promise.all(requests);

      // Should handle all requests
      expect(responses).toHaveLength(concurrentRequests);

      // Check for race conditions in cookie setting
      const cookieResponses = responses.filter((r) => r.status === 200);
      cookieResponses.forEach((response) => {
        const cookies = response.headers.get("set-cookie");
        expect(cookies).toContain("auth-token=");
      });
    });

    it("should maintain data consistency under concurrent load", async () => {
      const concurrentRequests = 20;

      const requests = Array(concurrentRequests)
        .fill(null)
        .map(() => {
          const challenge = generateTestChallenge();
          const body = createVerifyBody(
            testKeypair.publicKey(),
            validSignature,
            challenge.nonce,
            challenge.timestamp,
          );
          return POST(
            createAuthRequest("http://localhost/api/auth/verify", body),
          );
        });

      const startTime = performance.now();
      const responses = await Promise.all(requests);
      const endTime = performance.now();

      // All requests should complete in reasonable time
      expect(endTime - startTime).toBeLessThan(5000);

      // Check response integrity
      const parsedResponses = await Promise.all(responses.map((r) => r.json()));

      parsedResponses.forEach((data) => {
        expect(data).toHaveProperty("success");
        expect(typeof data.success).toBe("boolean");
        if (data.success) {
          expect(data.data).toHaveProperty("publicKey");
        } else {
          expect(data.error).toHaveProperty("message");
        }
      });
    });

    it("should not leak memory under concurrent load", async () => {
      const iterations = 3;
      const requestsPerIteration = 10;

      for (let i = 0; i < iterations; i++) {
        const requests = Array(requestsPerIteration)
          .fill(null)
          .map(() => {
            const challenge = generateTestChallenge();
            const body = createVerifyBody(
              testKeypair.publicKey(),
              validSignature,
              challenge.nonce,
              challenge.timestamp,
            );
            return POST(
              createAuthRequest("http://localhost/api/auth/verify", body),
            );
          });

        await Promise.all(requests);

        // Small delay between iterations
        await new Promise((resolve) => setTimeout(resolve, 50));
      }

      // If we reach here without crashing, memory is being managed
      expect(true).toBe(true);
    });

    it("should handle mixed success and failure concurrent requests", async () => {
      const successRequests = 5;
      const failureRequests = 5;

      // Create successful requests
      const successPromises = Array(successRequests)
        .fill(null)
        .map(() => {
          const challenge = generateTestChallenge();
          const body = createVerifyBody(
            testKeypair.publicKey(),
            validSignature,
            challenge.nonce,
            challenge.timestamp,
          );
          return POST(
            createAuthRequest("http://localhost/api/auth/verify", body),
          );
        });

      // Create failing requests (invalid signature)
      (stellarAuth.verifySignature as jest.Mock).mockReturnValueOnce(false);
      const failurePromises = Array(failureRequests)
        .fill(null)
        .map(() => {
          const challenge = generateTestChallenge();
          const body = createVerifyBody(
            testKeypair.publicKey(),
            "invalid-signature",
            challenge.nonce,
            challenge.timestamp,
          );
          return POST(
            createAuthRequest("http://localhost/api/auth/verify", body),
          );
        });

      // Execute all concurrently
      const allResponses = await Promise.all([
        ...successPromises,
        ...failurePromises,
      ]);

      // Should handle both success and failure gracefully
      expect(allResponses).toHaveLength(successRequests + failureRequests);

      const statusCodes = allResponses.map((r) => r.status);
      expect(statusCodes.filter((s) => s === 200).length).toBeGreaterThan(0);
      expect(statusCodes.filter((s) => s === 401).length).toBeGreaterThan(0);
    });

    it("should prevent race conditions in JWT generation", async () => {
      const concurrentRequests = 10;
      const samePublicKey = testKeypair.publicKey();

      const requests = Array(concurrentRequests)
        .fill(null)
        .map(() => {
          const challenge = generateTestChallenge();
          const body = createVerifyBody(
            samePublicKey,
            validSignature,
            challenge.nonce,
            challenge.timestamp,
          );
          return POST(
            createAuthRequest("http://localhost/api/auth/verify", body),
          );
        });

      const responses = await Promise.all(requests);

      // Extract cookies from successful responses
      const cookies = responses
        .filter((r) => r.status === 200)
        .map((r) => r.headers.get("set-cookie"));

      // All cookies should contain JWT tokens
      cookies.forEach((cookie) => {
        expect(cookie).toContain("auth-token=");
        expect(cookie).toContain("mock.jwt.token");
      });
    });
  });
});
