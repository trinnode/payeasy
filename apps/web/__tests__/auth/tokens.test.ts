import {
  generateChallenge,
  buildMessage,
  verifySignature,
  isTimestampValid,
  signJwt,
  verifyJwt,
} from "@/lib/auth/stellar-auth";
import { Keypair } from "stellar-sdk";
import * as crypto from "crypto";
import * as jwt from "jsonwebtoken";

jest.mock("crypto");
jest.mock("jsonwebtoken");

describe("Challenge Generation", () => {
  beforeEach(() => {
    (crypto.randomBytes as jest.Mock).mockReturnValue(
      Buffer.from("a".repeat(64), "hex"),
    );
    jest.spyOn(Date, "now").mockReturnValue(1234567890000);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it("should generate challenge with nonce, timestamp, and message", () => {
    const challenge = generateChallenge();

    expect(challenge).toHaveProperty("nonce");
    expect(challenge).toHaveProperty("timestamp");
    expect(challenge).toHaveProperty("message");
    expect(challenge.nonce).toBe("a".repeat(64));
    expect(challenge.timestamp).toBe(1234567890000);
    expect(challenge.message).toBe(
      `PayEasy Login: ${"a".repeat(64)}.1234567890000`,
    );
  });

  it("should build message from nonce and timestamp", () => {
    const nonce = "test-nonce";
    const timestamp = 1234567890000;
    const message = buildMessage(nonce, timestamp);

    expect(message).toBe("PayEasy Login: test-nonce.1234567890000");
  });
});

describe("Signature Verification", () => {
  let mockKeypair: any;

  beforeEach(() => {
    mockKeypair = {
      verify: jest.fn(),
    };
    jest.spyOn(Keypair, "fromPublicKey").mockReturnValue(mockKeypair);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it("should return true for valid signature", () => {
    mockKeypair.verify.mockReturnValue(true);

    const result = verifySignature(
      "GDUMMYPUBLICKEY",
      "validSignature",
      "test message",
    );

    expect(result).toBe(true);
    expect(Keypair.fromPublicKey).toHaveBeenCalledWith("GDUMMYPUBLICKEY");
    expect(mockKeypair.verify).toHaveBeenCalledWith(
      Buffer.from("test message", "utf-8"),
      Buffer.from("validSignature", "base64"),
    );
    expect(mockKeypair.verify).toHaveBeenCalledTimes(1);
  });

  it("should return false for invalid signature", () => {
    mockKeypair.verify.mockReturnValue(false);

    const result = verifySignature(
      "GDUMMYPUBLICKEY",
      "invalidSignature",
      "test message",
    );

    expect(result).toBe(false);
  });

  it("should return false when Keypair.fromPublicKey throws", () => {
    jest.spyOn(Keypair, "fromPublicKey").mockImplementation(() => {
      throw new Error("Invalid key");
    });

    const result = verifySignature("INVALID", "signature", "message");

    expect(result).toBe(false);
  });

  it("should return false when signature decoding fails", () => {
    mockKeypair.verify.mockImplementation(() => {
      throw new Error("Invalid signature format");
    });

    const result = verifySignature("GDUMMYPUBLICKEY", "bad!@#", "message");

    expect(result).toBe(false);
  });

  it("should return false for empty signature", () => {
    const result = verifySignature("GDUMMYPUBLICKEY", "", "message");

    expect(result).toBe(false);
  });

  it("should return false for empty public key", () => {
    jest.spyOn(Keypair, "fromPublicKey").mockImplementation(() => {
      throw new Error("Empty key");
    });

    const result = verifySignature("", "signature", "message");

    expect(result).toBe(false);
  });

  it("should handle very long messages", () => {
    mockKeypair.verify.mockReturnValue(true);
    const longMessage = "a".repeat(10000);

    const result = verifySignature("GDUMMYPUBLICKEY", "signature", longMessage);

    expect(result).toBe(true);
    expect(mockKeypair.verify).toHaveBeenCalledWith(
      Buffer.from(longMessage, "utf-8"),
      Buffer.from("signature", "base64"),
    );
  });
});

describe("Timestamp Validation", () => {
  beforeEach(() => {
    jest.spyOn(Date, "now").mockReturnValue(1000000);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it("should return true for current timestamp", () => {
    expect(isTimestampValid(1000000)).toBe(true);
  });

  it("should return true for timestamp within 5 minutes (past)", () => {
    const fourMinutesAgo = 1000000 - 4 * 60 * 1000;
    expect(isTimestampValid(fourMinutesAgo)).toBe(true);
  });

  it("should return true for timestamp within 5 minutes (future)", () => {
    const fourMinutesLater = 1000000 + 4 * 60 * 1000;
    expect(isTimestampValid(fourMinutesLater)).toBe(true);
  });

  it("should return false for expired timestamp (>5 minutes old)", () => {
    const sixMinutesAgo = 1000000 - 6 * 60 * 1000;
    expect(isTimestampValid(sixMinutesAgo)).toBe(false);
  });

  it("should return false for future timestamp (>5 minutes ahead)", () => {
    const sixMinutesLater = 1000000 + 6 * 60 * 1000;
    expect(isTimestampValid(sixMinutesLater)).toBe(false);
  });

  it("should return true at exact 5 minute boundary", () => {
    const exactlyFiveMinutes = 1000000 - 5 * 60 * 1000;
    expect(isTimestampValid(exactlyFiveMinutes)).toBe(true);
  });

  it("should handle negative timestamps", () => {
    expect(isTimestampValid(-1000)).toBe(false);
  });

  it("should handle very large timestamp values", () => {
    const veryFarFuture = Date.now() + 365 * 24 * 60 * 60 * 1000;
    expect(isTimestampValid(veryFarFuture)).toBe(false);
  });

  it("should return false for zero timestamp when current time is not zero", () => {
    expect(isTimestampValid(0)).toBe(false);
  });
});

describe("JWT Operations", () => {
  const mockToken = "mock.jwt.token";
  const validStellarKey =
    "GBRPYHIL2CI3FNQ4BXLFMNDLFJUNPU2HY3ZMFSHONUCEOASW7QC7OX2H";
  const mockPayload = {
    sub: validStellarKey,
    iat: 1234567890,
    exp: 1234654290,
  };

  beforeEach(() => {
    (jwt.sign as jest.Mock).mockReturnValue(mockToken);
    (jwt.verify as jest.Mock).mockReturnValue(mockPayload);
  });

  describe("signJwt", () => {
    it("should create JWT with public key as subject", () => {
      const token = signJwt(validStellarKey);

      expect(token).toBe(mockToken);
      expect(jwt.sign).toHaveBeenCalledWith(
        { sub: validStellarKey },
        "test-jwt-secret-key-for-testing-only",
        { expiresIn: "24h" },
      );
      expect(jwt.sign).toHaveBeenCalledTimes(1);
    });

    it("should throw when JWT_SECRET is not set", () => {
      const originalSecret = process.env.JWT_SECRET;
      delete process.env.JWT_SECRET;

      expect(() => signJwt(validStellarKey)).toThrow(
        "JWT_SECRET environment variable is not set",
      );

      process.env.JWT_SECRET = originalSecret;
    });
  });

  describe("verifyJwt", () => {
    beforeEach(() => {
      jest.clearAllMocks();
      (jwt.verify as jest.Mock).mockReturnValue(mockPayload);
    });

    it("should return payload for valid token", () => {
      const result = verifyJwt(mockToken);

      expect(result).toEqual(mockPayload);
      expect(jwt.verify).toHaveBeenCalledWith(
        mockToken,
        "test-jwt-secret-key-for-testing-only",
      );
    });

    it("should return null for expired token", () => {
      (jwt.verify as jest.Mock).mockImplementation(() => {
        throw new jwt.TokenExpiredError("Token expired", new Date());
      });

      const result = verifyJwt(mockToken);

      expect(result).toBeNull();
    });

    it("should return null for invalid token", () => {
      (jwt.verify as jest.Mock).mockImplementation(() => {
        throw new jwt.JsonWebTokenError("Invalid token");
      });

      const result = verifyJwt("invalid.token");

      expect(result).toBeNull();
    });

    it("should return null when verify returns string", () => {
      (jwt.verify as jest.Mock).mockReturnValue("string-payload");

      const result = verifyJwt(mockToken);

      expect(result).toBeNull();
    });

    it("should verify JWT was called with correct secret", () => {
      verifyJwt(mockToken);

      expect(jwt.verify).toHaveBeenCalledWith(
        mockToken,
        "test-jwt-secret-key-for-testing-only",
      );
      expect(jwt.verify).toHaveBeenCalledTimes(1);
    });

    it("should return null for empty token", () => {
      const result = verifyJwt("");

      expect(result).toBeNull();
    });

    it("should return null for malformed token", () => {
      (jwt.verify as jest.Mock).mockImplementation(() => {
        throw new jwt.JsonWebTokenError("jwt malformed");
      });

      const result = verifyJwt("not.a.jwt");

      expect(result).toBeNull();
    });

    it("should extract correct payload from valid token", () => {
      const result = verifyJwt(mockToken);

      expect(result).toEqual(mockPayload);
      expect(result?.sub).toBe(validStellarKey);
      expect(result?.iat).toBe(1234567890);
      expect(result?.exp).toBe(1234654290);
    });

    describe("Enhanced JWT payload validation", () => {
      it("should return null when payload is missing sub field", () => {
        const invalidPayload = { iat: 123456, exp: 789012 };
        (jwt.verify as jest.Mock).mockReturnValue(invalidPayload);

        const result = verifyJwt(mockToken);

        expect(result).toBeNull();
      });

      it("should return null when sub is not a string", () => {
        const invalidPayload = { sub: 12345, iat: 123456 };
        (jwt.verify as jest.Mock).mockReturnValue(invalidPayload);

        const result = verifyJwt(mockToken);

        expect(result).toBeNull();
      });

      it("should return null when sub is empty string", () => {
        const invalidPayload = { sub: "", iat: 123456 };
        (jwt.verify as jest.Mock).mockReturnValue(invalidPayload);

        const result = verifyJwt(mockToken);

        expect(result).toBeNull();
      });

      it("should return null when sub is not a valid Stellar public key format", () => {
        const invalidPayloads = [
          { sub: "INVALID_KEY" },
          { sub: "XABC123" },
          { sub: "G123" },
          { sub: "GABC!" },
          { sub: "gabc" + "a".repeat(52) },
        ];

        invalidPayloads.forEach((invalidPayload) => {
          (jwt.verify as jest.Mock).mockReturnValue(invalidPayload);
          const result = verifyJwt(mockToken);
          expect(result).toBeNull();
        });
      });

      it("should accept valid Stellar public key format in sub", () => {
        const validPayload = {
          sub: "GA7QYNF7SOWQ3GLR2BGMZEHXAVIRZA4KVWLTJJFC7MGXUA74P7UJVSGZ",
          iat: 123456,
          exp: 789012,
        };
        (jwt.verify as jest.Mock).mockReturnValue(validPayload);

        const result = verifyJwt(mockToken);

        expect(result).toEqual(validPayload);
      });

      it("should return null when iat is not a number", () => {
        const invalidPayload = {
          sub: "GA7QYNF7SOWQ3GLR2BGMZEHXAVIRZA4KVWLTJJFC7MGXUA74P7UJVSGZ",
          iat: "not-a-number",
          exp: 789012,
        };
        (jwt.verify as jest.Mock).mockReturnValue(invalidPayload);

        const result = verifyJwt(mockToken);

        expect(result).toBeNull();
      });

      it("should return null when exp is not a number", () => {
        const invalidPayload = {
          sub: "GA7QYNF7SOWQ3GLR2BGMZEHXAVIRZA4KVWLTJJFC7MGXUA74P7UJVSGZ",
          iat: 123456,
          exp: "not-a-number",
        };
        (jwt.verify as jest.Mock).mockReturnValue(invalidPayload);

        const result = verifyJwt(mockToken);

        expect(result).toBeNull();
      });

      it("should accept payload without iat field", () => {
        const validPayload = {
          sub: "GA7QYNF7SOWQ3GLR2BGMZEHXAVIRZA4KVWLTJJFC7MGXUA74P7UJVSGZ",
          exp: 789012,
        };
        (jwt.verify as jest.Mock).mockReturnValue(validPayload);

        const result = verifyJwt(mockToken);

        expect(result).toEqual(validPayload);
      });

      it("should accept payload without exp field", () => {
        const validPayload = {
          sub: "GA7QYNF7SOWQ3GLR2BGMZEHXAVIRZA4KVWLTJJFC7MGXUA74P7UJVSGZ",
          iat: 123456,
        };
        (jwt.verify as jest.Mock).mockReturnValue(validPayload);

        const result = verifyJwt(mockToken);

        expect(result).toEqual(validPayload);
      });

      it("should return null for null token", () => {
        const result = verifyJwt(null as any);

        expect(result).toBeNull();
      });

      it("should return null for undefined token", () => {
        const result = verifyJwt(undefined as any);

        expect(result).toBeNull();
      });

      it("should return null for non-string token", () => {
        const result = verifyJwt(12345 as any);

        expect(result).toBeNull();
      });

      it("should validate Stellar public key checksum format", () => {
        const validKeys = [
          "GBRPYHIL2CI3FNQ4BXLFMNDLFJUNPU2HY3ZMFSHONUCEOASW7QC7OX2H",
          "GA5ZSEJYB37JRC5AVCIA5MOP4RHTM335X2KGX3IHOJAPP5RE34K4KZVN",
          "GA7QYNF7SOWQ3GLR2BGMZEHXAVIRZA4KVWLTJJFC7MGXUA74P7UJVSGZ",
        ];

        validKeys.forEach((key) => {
          const validPayload = { sub: key, iat: 123456 };
          (jwt.verify as jest.Mock).mockReturnValue(validPayload);

          const result = verifyJwt(mockToken);

          expect(result).toEqual(validPayload);
        });
      });
    });
  });
});
