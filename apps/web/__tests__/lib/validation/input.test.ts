import {
  emailSchema,
  usernameSchema,
  passwordSchema,
  stellarPublicKeySchema,
  titleSchema,
  descriptionSchema,
  messageContentSchema,
  searchQuerySchema,
  validateInput,
  sanitizeHTML,
  sanitizePlainText,
  containsSuspiciousPatterns,
  validateFilename,
  createSafeError,
} from '@/lib/validation/input';

const assertSuccess = <T,>(result: { success: boolean; data?: T }) => {
  expect(result.success).toBe(true);
  return result;
};

describe('Input validation', () => {
  describe('emailSchema', () => {
    it('accepts valid email', () => {
      const result = validateInput(emailSchema, 'user@example.com');
      assertSuccess(result);
      expect(result.data).toBe('user@example.com');
    });

    it('rejects invalid email', () => {
      const result = validateInput(emailSchema, 'not-an-email');
      expect(result.success).toBe(false);
      expect(result.errors).toBeDefined();
    });

    it('rejects email with XSS attempt', () => {
      const result = validateInput(emailSchema, 'test<script>alert(1)</script>@example.com');
      expect(result.success).toBe(false);
    });

    it('lowercases email', () => {
      const result = validateInput(emailSchema, 'USER@EXAMPLE.COM');
      assertSuccess(result);
      expect(result.data).toBe('user@example.com');
    });
  });

  describe('usernameSchema', () => {
    it('accepts valid username', () => {
      const result = validateInput(usernameSchema, 'john_doe-123');
      assertSuccess(result);
    });

    it('rejects short username', () => {
      const result = validateInput(usernameSchema, 'ab');
      expect(result.success).toBe(false);
    });

    it('rejects username with special chars', () => {
      const result = validateInput(usernameSchema, 'user@name!');
      expect(result.success).toBe(false);
    });

    it('rejects username with spaces', () => {
      const result = validateInput(usernameSchema, 'user name');
      expect(result.success).toBe(false);
    });
  });

  describe('passwordSchema', () => {
    it('accepts strong password', () => {
      const result = validateInput(passwordSchema, 'MyP@ssw0rd!');
      assertSuccess(result);
    });

    it('rejects weak password', () => {
      const result = validateInput(passwordSchema, 'password');
      expect(result.success).toBe(false);
    });

    it('rejects password without uppercase', () => {
      const result = validateInput(passwordSchema, 'myp@ssw0rd!');
      expect(result.success).toBe(false);
    });

    it('rejects password without special char', () => {
      const result = validateInput(passwordSchema, 'MyPassw0rd');
      expect(result.success).toBe(false);
    });
  });

  describe('stellarPublicKeySchema', () => {
    it('accepts valid stellar address', () => {
      const validAddress = 'GBRPYHIL2CI3FNQ4BXLFMNDLFJUNPU2HY3ZMFSHONUCEOASW7QC7OX2H';
      const result = validateInput(stellarPublicKeySchema, validAddress);
      assertSuccess(result);
    });

    it('rejects wrong prefix', () => {
      const result = validateInput(
        stellarPublicKeySchema,
        'SBRPYHIL2CI3FNQ4BXLFMNDLFJUNPU2HY3ZMFSHONUCEOASW7QC7OX2H'
      );
      expect(result.success).toBe(false);
    });

    it('rejects wrong length', () => {
      const result = validateInput(
        stellarPublicKeySchema,
        'GBRPYHIL2CI3FNQ4BXLFMNDLFJUNPU2HY'
      );
      expect(result.success).toBe(false);
    });
  });
});

describe('Sanitization', () => {
  describe('sanitizeHTML', () => {
    it('preserves safe tags', () => {
      const input = '<p>Hello <strong>world</strong>!</p>';
      const output = sanitizeHTML(input);
      expect(output).toBe(input);
    });

    it('removes script tags', () => {
      const input = '<p>Hello</p><script>alert("XSS")</script>';
      const output = sanitizeHTML(input);
      expect(output).not.toContain('script');
      expect(output).toContain('Hello');
    });

    it('removes event handlers', () => {
      const input = '<p onclick="alert(1)">Click me</p>';
      const output = sanitizeHTML(input);
      expect(output).not.toContain('onclick');
    });

    it('removes javascript protocol', () => {
      const input = '<a href="javascript:alert(1)">Link</a>';
      const output = sanitizeHTML(input);
      expect(output).not.toContain('javascript:');
    });
  });

  describe('sanitizePlainText', () => {
    it('removes all HTML', () => {
      const input = '<p>Hello <strong>world</strong>!</p>';
      const output = sanitizePlainText(input);
      expect(output).toBe('Hello world!');
    });
  });
});

describe('Content validation', () => {
  it('accepts valid title', () => {
    const result = validateInput(titleSchema, 'Beautiful Apartment Downtown');
    assertSuccess(result);
  });

  it('sanitizes HTML from title', () => {
    const result = validateInput(titleSchema, 'Title <script>alert(1)</script>');
    assertSuccess(result);
    expect(result.data).not.toContain('script');
  });

  it('allows safe HTML in description', () => {
    const input = '<p>Great location with <strong>amazing</strong> views!</p>';
    const result = validateInput(descriptionSchema, input);
    assertSuccess(result);
    expect(result.data).toContain('<strong>');
  });

  it('removes unsafe HTML from description', () => {
    const input = '<p>Great location</p><script>alert(1)</script>';
    const result = validateInput(descriptionSchema, input);
    assertSuccess(result);
    expect(result.data).not.toContain('script');
  });

  it('strips HTML from message content', () => {
    const result = validateInput(messageContentSchema, 'Hello <b>friend</b>!');
    assertSuccess(result);
    expect(result.data).toBe('Hello friend!');
  });
});

describe('Search query sanitization', () => {
  it('accepts normal query', () => {
    const result = validateInput(searchQuerySchema, 'apartment downtown');
    assertSuccess(result);
  });

  it('sanitizes SQL injection attempt', () => {
    const result = validateInput(searchQuerySchema, "'; DROP TABLE users; --");
    assertSuccess(result);
    expect(result.data).not.toContain(';');
    expect(result.data).not.toContain('--');
  });

  it('sanitizes HTML in search query', () => {
    const result = validateInput(searchQuerySchema, '<script>alert(1)</script>');
    assertSuccess(result);
    expect(result.data).not.toContain('script');
  });
});

describe('Suspicious pattern detection', () => {
  it('detects XSS patterns', () => {
    const patterns = [
      '<script>alert(1)</script>',
      'javascript:alert(1)',
      '<img src=x onerror=alert(1)>',
      '<iframe src="evil.com"></iframe>',
    ];
    patterns.forEach((pattern) => {
      expect(containsSuspiciousPatterns(pattern)).toBe(true);
    });
  });

  it('detects SQL injection patterns', () => {
    const patterns = [
      "'; DROP TABLE users; --",
      "' OR '1'='1",
      'UNION SELECT * FROM passwords',
      'INSERT INTO users VALUES',
      'DELETE FROM users WHERE',
    ];
    patterns.forEach((pattern) => {
      expect(containsSuspiciousPatterns(pattern)).toBe(true);
    });
  });

  it('detects path traversal patterns', () => {
    const patterns = ['../../../etc/passwd', '..\\..\\..\\windows\\system32'];
    patterns.forEach((pattern) => {
      expect(containsSuspiciousPatterns(pattern)).toBe(true);
    });
  });

  it('does not flag normal input', () => {
    const inputs = [
      'Hello world!',
      'This is a normal message.',
      'Looking for an apartment in downtown',
      'Price: $1,200/month',
    ];
    inputs.forEach((input) => {
      expect(containsSuspiciousPatterns(input)).toBe(false);
    });
  });
});

describe('Filename validation', () => {
  it('accepts valid filename', () => {
    const result = validateFilename('document.pdf');
    expect(result).toBe('document.pdf');
  });

  it('rejects path traversal', () => {
    const result = validateFilename('../../../etc/passwd');
    expect(result).toBeNull();
  });

  it('rejects hidden files', () => {
    const result = validateFilename('.htaccess');
    expect(result).toBeNull();
  });

  it('rejects invalid chars', () => {
    const result = validateFilename('file<script>.pdf');
    expect(result).toBeNull();
  });
});

describe('Safe error messages', () => {
  it('escapes HTML', () => {
    const error = createSafeError('<script>alert(1)</script>');
    expect(error.error).not.toContain('<script>');
    expect(error.error).toContain('&lt;script&gt;');
  });

  it('includes timestamp', () => {
    const error = createSafeError('Test error');
    expect(error.timestamp).toBeDefined();
  });

  it('includes field when provided', () => {
    const error = createSafeError('Invalid input', 'email');
    expect(error.field).toBe('email');
  });
});
