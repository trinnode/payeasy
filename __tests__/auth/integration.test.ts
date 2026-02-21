import { POST as POST_login } from "@/app/api/auth/login/route";
import { POST as POST_verify } from "@/app/api/auth/verify/route";
import { POST as POST_logout } from "@/app/api/auth/logout/route";
import { Keypair } from "stellar-sdk";
import { createAuthRequest } from "../helpers/auth-helpers";

/**
 * Integration tests using real Stellar SDK
 * These tests verify the complete authentication flow without mocking Stellar operations
 */
describe("Authentication Integration Tests", () => {
  let realKeypair: Keypair;

  beforeEach(() => {
    // Generate a real Stellar keypair for each test
    realKeypair = Keypair.random();
  });

  describe("Complete auth flow", () => {
    it("should complete full authentication flow with real Stellar keypair", async () => {
      // Step 1: Request login challenge
      const loginRequest = new Request("http://localhost/api/auth/login", {
        method: "POST",
        body: JSON.stringify({ publicKey: realKeypair.publicKey() }),
      });

      const loginResponse = await POST_login(loginRequest);
      const loginData = await loginResponse.json();

      expect(loginResponse.status).toBe(200);
      expect(loginData.success).toBe(true);
      expect(loginData.data).toHaveProperty("nonce");
      expect(loginData.data).toHaveProperty("timestamp");
      expect(loginData.data).toHaveProperty("message");

      // Step 2: Sign the challenge with real keypair
      const { nonce, timestamp, message } = loginData.data;
      const messageBuffer = Buffer.from(message, "utf-8");
      const signatureBuffer = realKeypair.sign(messageBuffer);
      const signature = signatureBuffer.toString("base64");

      // Step 3: Verify signature and get JWT
      const verifyBody = {
        publicKey: realKeypair.publicKey(),
        signature,
        nonce,
        timestamp,
      };

      const verifyRequest = createAuthRequest(
        "http://localhost/api/auth/verify",
        verifyBody,
      );

      const verifyResponse = await POST_verify(verifyRequest);
      const verifyData = await verifyResponse.json();

      expect(verifyResponse.status).toBe(200);
      expect(verifyData.success).toBe(true);
      expect(verifyData.data.publicKey).toBe(realKeypair.publicKey());

      // Verify JWT cookie was set
      const cookies = verifyResponse.headers.get("set-cookie");
      expect(cookies).toContain("auth-token=");
      expect(cookies).toContain("HttpOnly");

      // Step 4: Logout
      const logoutResponse = await POST_logout();
      const logoutData = await logoutResponse.json();

      expect(logoutResponse.status).toBe(200);
      expect(logoutData.success).toBe(true);

      // Verify cookie was cleared
      const logoutCookies = logoutResponse.headers.get("set-cookie");
      expect(logoutCookies).toContain("Max-Age=0");
    });

    it("should reject invalid signature with real keypair", async () => {
      // Step 1: Get challenge
      const loginRequest = new Request("http://localhost/api/auth/login", {
        method: "POST",
        body: JSON.stringify({ publicKey: realKeypair.publicKey() }),
      });

      const loginResponse = await POST_login(loginRequest);
      const loginData = await loginResponse.json();
      const { nonce, timestamp } = loginData.data;

      // Step 2: Sign with a different keypair (wrong private key)
      const wrongKeypair = Keypair.random();
      const wrongMessage = `PayEasy Login: ${nonce}.${timestamp}`;
      const wrongSignature = wrongKeypair
        .sign(Buffer.from(wrongMessage, "utf-8"))
        .toString("base64");

      // Step 3: Try to verify with wrong signature
      const verifyBody = {
        publicKey: realKeypair.publicKey(),
        signature: wrongSignature,
        nonce,
        timestamp,
      };

      const verifyRequest = createAuthRequest(
        "http://localhost/api/auth/verify",
        verifyBody,
      );

      const verifyResponse = await POST_verify(verifyRequest);
      const verifyData = await verifyResponse.json();

      expect(verifyResponse.status).toBe(401);
      expect(verifyData.success).toBe(false);
      expect(verifyData.error.message).toBe("Invalid signature");
    });

    it("should accept valid signature from different keypairs", async () => {
      const keypair1 = Keypair.random();
      const keypair2 = Keypair.random();

      // Test with first keypair
      const login1 = new Request("http://localhost/api/auth/login", {
        method: "POST",
        body: JSON.stringify({ publicKey: keypair1.publicKey() }),
      });

      const loginResponse1 = await POST_login(login1);
      const loginData1 = await loginResponse1.json();
      const signature1 = keypair1
        .sign(Buffer.from(loginData1.data.message, "utf-8"))
        .toString("base64");

      const verify1 = createAuthRequest("http://localhost/api/auth/verify", {
        publicKey: keypair1.publicKey(),
        signature: signature1,
        nonce: loginData1.data.nonce,
        timestamp: loginData1.data.timestamp,
      });

      const verifyResponse1 = await POST_verify(verify1);
      expect(verifyResponse1.status).toBe(200);

      // Test with second keypair
      const login2 = new Request("http://localhost/api/auth/login", {
        method: "POST",
        body: JSON.stringify({ publicKey: keypair2.publicKey() }),
      });

      const loginResponse2 = await POST_login(login2);
      const loginData2 = await loginResponse2.json();
      const signature2 = keypair2
        .sign(Buffer.from(loginData2.data.message, "utf-8"))
        .toString("base64");

      const verify2 = createAuthRequest("http://localhost/api/auth/verify", {
        publicKey: keypair2.publicKey(),
        signature: signature2,
        nonce: loginData2.data.nonce,
        timestamp: loginData2.data.timestamp,
      });

      const verifyResponse2 = await POST_verify(verify2);
      expect(verifyResponse2.status).toBe(200);
    });
  });

  describe("Stellar SDK validation", () => {
    it("should validate real Stellar public key format", async () => {
      const request = new Request("http://localhost/api/auth/login", {
        method: "POST",
        body: JSON.stringify({ publicKey: realKeypair.publicKey() }),
      });

      const response = await POST_login(request);
      expect(response.status).toBe(200);
    });

    it("should reject malformed Stellar public key", async () => {
      const invalidKeys = [
        "INVALID",
        "G123", // Too short
        "XAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA", // Wrong prefix
        "GAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA!", // Invalid character
      ];

      for (const invalidKey of invalidKeys) {
        const request = new Request("http://localhost/api/auth/login", {
          method: "POST",
          body: JSON.stringify({ publicKey: invalidKey }),
        });

        const response = await POST_login(request);
        const data = await response.json();

        expect(response.status).toBe(400);
        expect(data.success).toBe(false);
        expect(data.error.message).toBe("Invalid Stellar public key");
      }
    });

    it("should handle signature verification with real cryptographic operations", async () => {
      const testMessage = "Test message for signature verification";
      const messageBuffer = Buffer.from(testMessage, "utf-8");

      // Sign with real keypair
      const signatureBuffer = realKeypair.sign(messageBuffer);
      const signature = signatureBuffer.toString("base64");

      // Verify with real keypair
      const signatureBack = Buffer.from(signature, "base64");
      const isValid = realKeypair.verify(messageBuffer, signatureBack);

      expect(isValid).toBe(true);
    });
  });

  describe("Replay attack prevention", () => {
    it("should reject reused challenge after successful authentication", async () => {
      // Step 1: Get challenge
      const loginRequest = new Request("http://localhost/api/auth/login", {
        method: "POST",
        body: JSON.stringify({ publicKey: realKeypair.publicKey() }),
      });

      const loginResponse = await POST_login(loginRequest);
      const loginData = await loginResponse.json();
      const { nonce, timestamp, message } = loginData.data;

      // Step 2: Sign and verify (first time)
      const signature = realKeypair
        .sign(Buffer.from(message, "utf-8"))
        .toString("base64");

      const verifyBody = {
        publicKey: realKeypair.publicKey(),
        signature,
        nonce,
        timestamp,
      };

      const verifyRequest1 = createAuthRequest(
        "http://localhost/api/auth/verify",
        verifyBody,
      );

      const verifyResponse1 = await POST_verify(verifyRequest1);
      expect(verifyResponse1.status).toBe(200);

      // Step 3: Try to reuse the same challenge after 5+ minutes
      // Mock time passing (in real scenario, this would be a delayed request)
      const oldTimestamp = Date.now() - 6 * 60 * 1000;
      const replayBody = {
        publicKey: realKeypair.publicKey(),
        signature,
        nonce,
        timestamp: oldTimestamp,
      };

      const verifyRequest2 = createAuthRequest(
        "http://localhost/api/auth/verify",
        replayBody,
      );

      const verifyResponse2 = await POST_verify(verifyRequest2);
      const verifyData2 = await verifyResponse2.json();

      expect(verifyResponse2.status).toBe(401);
      expect(verifyData2.error.message).toBe("Challenge expired");
    });
  });

  describe("Performance characteristics", () => {
    it("should respond to login requests within acceptable time", async () => {
      const request = new Request("http://localhost/api/auth/login", {
        method: "POST",
        body: JSON.stringify({ publicKey: realKeypair.publicKey() }),
      });

      const start = performance.now();
      await POST_login(request);
      const duration = performance.now() - start;

      // Should complete within 200ms
      expect(duration).toBeLessThan(200);
    });

    it("should respond to verify requests within acceptable time", async () => {
      // Get challenge
      const loginRequest = new Request("http://localhost/api/auth/login", {
        method: "POST",
        body: JSON.stringify({ publicKey: realKeypair.publicKey() }),
      });

      const loginResponse = await POST_login(loginRequest);
      const loginData = await loginResponse.json();
      const { nonce, timestamp, message } = loginData.data;

      const signature = realKeypair
        .sign(Buffer.from(message, "utf-8"))
        .toString("base64");

      const verifyBody = {
        publicKey: realKeypair.publicKey(),
        signature,
        nonce,
        timestamp,
      };

      const verifyRequest = createAuthRequest(
        "http://localhost/api/auth/verify",
        verifyBody,
      );

      const start = performance.now();
      await POST_verify(verifyRequest);
      const duration = performance.now() - start;

      // Should complete within 300ms (signature verification is more expensive)
      expect(duration).toBeLessThan(300);
    });
  });
});
