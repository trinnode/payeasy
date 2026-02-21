import { POST } from "@/app/api/auth/logout/route";

describe("POST /api/auth/logout", () => {
  describe("Success cases", () => {
    it("should clear auth cookie and return success", async () => {
      const response = await POST();
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data.message).toBe("Logged out successfully");

      const cookies = response.headers.get("set-cookie");
      expect(cookies).toContain("auth-token=;");
      expect(cookies).toContain("Max-Age=0");
      expect(cookies).toContain("HttpOnly");
      expect(cookies).toContain("SameSite=strict");
      expect(cookies).toContain("Path=/");
    });

    it("should set Secure flag in production", async () => {
      const originalEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = "production";

      try {
        const response = await POST();
        const cookies = response.headers.get("set-cookie");

        expect(cookies).toContain("Secure");
      } finally {
        if (originalEnv === undefined) {
          delete process.env.NODE_ENV;
        } else {
          process.env.NODE_ENV = originalEnv;
        }
      }
    });

    it("should not set Secure flag in development", async () => {
      const originalEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = "development";

      try {
        const response = await POST();
        const cookies = response.headers.get("set-cookie");

        expect(cookies).not.toContain("Secure");
      } finally {
        if (originalEnv === undefined) {
          delete process.env.NODE_ENV;
        } else {
          process.env.NODE_ENV = originalEnv;
        }
      }
    });

    it("should return success even when called multiple times", async () => {
      const response1 = await POST();
      const response2 = await POST();
      const data1 = await response1.json();
      const data2 = await response2.json();

      expect(response1.status).toBe(200);
      expect(response2.status).toBe(200);
      expect(data1.success).toBe(true);
      expect(data2.success).toBe(true);
    });
  });

  describe("Cookie attributes", () => {
    it("should set cookie with correct path", async () => {
      const response = await POST();
      const cookies = response.headers.get("set-cookie");

      expect(cookies).toContain("Path=/");
    });

    it("should expire cookie immediately", async () => {
      const response = await POST();
      const cookies = response.headers.get("set-cookie");

      expect(cookies).toContain("Max-Age=0");
    });

    it("should set HttpOnly flag to prevent JavaScript access", async () => {
      const response = await POST();
      const cookies = response.headers.get("set-cookie");

      expect(cookies).toContain("HttpOnly");
    });

    it("should use strict SameSite policy", async () => {
      const response = await POST();
      const cookies = response.headers.get("set-cookie");

      expect(cookies).toContain("SameSite=strict");
    });
  });
});
