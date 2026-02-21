import { POST } from "@/app/api/auth/login/route";
import { Keypair } from "stellar-sdk";

jest.mock("stellar-sdk", () => ({
  Keypair: {
    fromPublicKey: jest.fn(),
    random: jest.fn(),
  },
}));

describe("POST /api/auth/login", () => {
  let testKeypair: any;

  beforeEach(() => {
    jest.clearAllMocks();

    testKeypair = {
      publicKey: () => "GDUMMYPUBLICKEY123456789",
      sign: jest.fn(),
      verify: jest.fn(),
    };

    (Keypair.random as jest.Mock).mockReturnValue(testKeypair);
    (Keypair.fromPublicKey as jest.Mock).mockReturnValue(testKeypair);
  });

  describe("Success cases", () => {
    it("should return challenge for valid public key", async () => {
      const request = new Request("http://localhost/api/auth/login", {
        method: "POST",
        body: JSON.stringify({ publicKey: testKeypair.publicKey() }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data).toHaveProperty("nonce");
      expect(data.data).toHaveProperty("timestamp");
      expect(data.data).toHaveProperty("message");
      expect(data.data.message).toContain("PayEasy Login:");
    });

    it("should generate unique nonces for multiple requests", async () => {
      const request1 = new Request("http://localhost/api/auth/login", {
        method: "POST",
        body: JSON.stringify({ publicKey: testKeypair.publicKey() }),
      });
      const request2 = new Request("http://localhost/api/auth/login", {
        method: "POST",
        body: JSON.stringify({ publicKey: testKeypair.publicKey() }),
      });

      const response1 = await POST(request1);
      const response2 = await POST(request2);
      const data1 = await response1.json();
      const data2 = await response2.json();

      expect(data1.data.nonce).not.toBe(data2.data.nonce);
    });
  });

  describe("Error cases - Missing fields", () => {
    it("should return 400 when publicKey is missing", async () => {
      const request = new Request("http://localhost/api/auth/login", {
        method: "POST",
        body: JSON.stringify({}),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.success).toBe(false);
      expect(data.error.code).toBe("MISSING_FIELD");
      expect(data.error.message).toBe("publicKey is required");
      expect(data.error.field).toBe("publicKey");
    });

    it("should return 400 when publicKey is not a string", async () => {
      const request = new Request("http://localhost/api/auth/login", {
        method: "POST",
        body: JSON.stringify({ publicKey: 123 }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.success).toBe(false);
      expect(data.error.code).toBe("MISSING_FIELD");
      expect(data.error.message).toBe("publicKey is required");
    });

    it("should return 400 when publicKey is empty string", async () => {
      const request = new Request("http://localhost/api/auth/login", {
        method: "POST",
        body: JSON.stringify({ publicKey: "" }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.success).toBe(false);
      expect(data.error.message).toBe("publicKey is required");
    });
  });

  describe("Error cases - Invalid public key", () => {
    it("should return 400 for invalid Stellar public key format", async () => {
      (Keypair.fromPublicKey as jest.Mock).mockImplementation(() => {
        throw new Error("Invalid public key");
      });

      const request = new Request("http://localhost/api/auth/login", {
        method: "POST",
        body: JSON.stringify({ publicKey: "INVALID_KEY" }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.success).toBe(false);
      expect(data.error.code).toBe("INVALID_PUBLIC_KEY");
      expect(data.error.message).toBe("Invalid Stellar public key");
    });
  });

  describe("Edge cases", () => {
    it("should handle malformed JSON", async () => {
      const request = new Request("http://localhost/api/auth/login", {
        method: "POST",
        body: "not-json",
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.success).toBe(false);
      expect(data.error.message).toBe("Internal server error");
    });
  });
});
