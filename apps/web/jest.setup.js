require('@testing-library/jest-dom');
const { TextEncoder, TextDecoder } = require('util');

global.TextEncoder = TextEncoder;
global.TextDecoder = TextDecoder;

global.Headers =
    global.Headers ||
    class Headers {
        constructor(init = {}) {
            this._map = new Map();
            if (init instanceof Headers) {
                init.forEach((value, key) => this.set(key, value));
            } else if (typeof init === 'object') {
                Object.entries(init).forEach(([key, value]) => this.set(key, value));
            }
        }
        set(key, value) {
            this._map.set(String(key).toLowerCase(), String(value));
        }
        get(key) {
            return this._map.get(String(key).toLowerCase()) ?? null;
        }
        has(key) {
            return this._map.has(String(key).toLowerCase());
        }
        forEach(callback) {
            this._map.forEach((value, key) => callback(value, key));
        }
    };

global.Request = class Request {
    constructor(url, init = {}) {
        this.url = url;
        this.method = init.method || 'GET';
        this.headers = init.headers instanceof Headers ? init.headers : new Headers(init.headers);
        this._body = init.body;
    }
    async json() {
        if (typeof this._body === 'string') {
            return JSON.parse(this._body);
        }
        return this._body;
    }
};

global.Response = class Response {
    constructor(body, init) {
        this._body = body;
        this.status = init?.status ?? 200;
        this.headers = init?.headers instanceof Headers ? init.headers : new Headers(init?.headers);
    }
    async json() {
        if (typeof this._body === 'string') {
            try {
                return JSON.parse(this._body);
            } catch {
                return this._body;
            }
        }
        return this._body;
    }
    static json(body, init) {
        const headers = new Headers(init?.headers);
        if (!headers.has('content-type')) {
            headers.set('content-type', 'application/json');
        }
        return new Response(JSON.stringify(body), { ...init, headers });
    }
};

jest.mock('next/server', () => {
    class CookieStore {
        constructor(headers) {
            this._headers = headers;
        }
        set(name, value, options = {}) {
            const parts = [`${name}=${value ?? ''}`];
            if (options.path) parts.push(`Path=${options.path}`);
            if (options.maxAge != null) parts.push(`Max-Age=${options.maxAge}`);
            if (options.sameSite) parts.push(`SameSite=${options.sameSite}`);
            if (options.httpOnly) parts.push('HttpOnly');
            if (options.secure) parts.push('Secure');
            const nextValue = parts.join('; ');
            const existing = this._headers.get('set-cookie');
            this._headers.set('set-cookie', existing ? `${existing}, ${nextValue}` : nextValue);
        }
    }

    class NextResponse extends Response {
        constructor(body, init) {
            super(body, init);
            this.cookies = new CookieStore(this.headers);
        }
        static json(body, init) {
            const headers = new Headers(init?.headers);
            if (!headers.has('content-type')) {
                headers.set('content-type', 'application/json');
            }
            return new NextResponse(JSON.stringify(body), { ...init, headers });
        }
    }

    class NextRequest {}

    return { NextResponse, NextRequest };
});

jest.mock('next/navigation', () => ({
    useRouter: () => ({ push: jest.fn(), replace: jest.fn(), prefetch: jest.fn() }),
    usePathname: () => '/',
    useSearchParams: () => new URLSearchParams(),
}));
