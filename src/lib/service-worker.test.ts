import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it, vi } from 'vitest';

/**
 * تست‌های منطق service worker (public/sw.js).
 *
 * sw.js خام است و به self/caches/fetch وابسته است — در Node با mock کردن
 * این سه، منطق network-first + fallback را مستقیم اجرا می‌کنیم.
 */

function loadSw(): string {
  return readFileSync(resolve(process.cwd(), 'public/sw.js'), 'utf8');
}

type SwRuntime = {
  caches: {
    open: (name: string) => Promise<{
      add: (req: Request) => Promise<void>;
      match: (url: string) => Promise<Response | undefined>;
      keys: () => Promise<unknown[]>;
    }>;
    keys: () => Promise<string[]>;
    delete: (name: string) => Promise<boolean>;
  };
  emit: (type: string, event: { waitUntil?: (p: Promise<unknown>) => void }) => void;
  runFetch: (url: string) => Promise<Response>;
};

function createSwRuntime(opts: {
  fetchImpl?: (req: Request) => Promise<Response>;
  networkDown?: boolean;
  preloadEnabled?: boolean;
}): SwRuntime {
  // حافظهٔ cache: map نام cache → map از URL → Response
  const store = new Map<string, Map<string, Response>>();

  // normalize URL نسبی (مثل '/offline.html') به absolute — در مرورگر خودکار
  // انجام می‌شود ولی در Node باید دستی.
  const normalize = (input: string | Request): string => {
    const raw = typeof input === 'string' ? input : input.url;
    return new URL(raw, 'http://localhost:3000').toString();
  };

  const caches = {
    open: vi.fn(async (name: string) => {
      if (!store.has(name)) store.set(name, new Map());
      return {
        add: async (req: Request) => {
          // cache.add همیشه در install اجرا می‌شود که شبکه برقرار است —
          // پس بدنهٔ offline.html را مستقیم (بدون throw) ذخیره می‌کنیم،
          // درست مثل مرورگر که آن را از شبکهٔ سالم می‌گیرد.
          store.get(name)?.set(normalize(req.url), new Response('offline page', { status: 200 }));
        },
        match: async (url: string) => store.get(name)?.get(normalize(url)) ?? undefined,
        keys: async () => [],
      };
    }),
    keys: vi.fn(async () => [...store.keys()]),
    delete: vi.fn(async (name: string) => store.delete(name)),
  };

  const listeners = new Map<string, (event: never) => void>();

  const self = {
    registration: {
      navigationPreload: opts.preloadEnabled ? { enable: vi.fn(async () => {}) } : undefined,
    },
    skipWaiting: vi.fn(),
    clients: { claim: vi.fn() },
    addEventListener: (type: string, fn: (event: never) => void) => {
      listeners.set(type, fn);
    },
  };

  // URLهای نسبی (مثل '/offline.html') در مرورگر resolve می‌شوند ولی در Node
  // نه — wrapper که آنها را به absolute تبدیل کند.
  const SafeRequest = class SafeRequest extends Request {
    constructor(input: string | Request | URL, init?: RequestInit) {
      if (typeof input === 'string' && input.startsWith('/')) {
        super(new URL(input, 'http://localhost:3000'), init);
      } else {
        super(input as RequestInfo | URL, init);
      }
    }
  };

  // اجرای کد SW در scope — دسترسی به self/caches/fetch ساختگی.
  const fn = new Function(
    'self',
    'caches',
    'fetch',
    'Request',
    'Response',
    `${loadSw()}\nreturn self;`,
  );
  fn(self, caches, opts.fetchImpl ?? globalThis.fetch, SafeRequest, Response);

  const emit = (type: string, event: { waitUntil?: (p: Promise<unknown>) => void }) => {
    const listener = listeners.get(type);
    if (!listener) throw new Error(`no listener for ${type}`);
    const result = listener(event as never);
    if (event.waitUntil) {
      void result;
      void event.waitUntil(Promise.resolve(result));
    }
  };

  const runFetch = (url: string): Promise<Response> => {
    const fetchListener = listeners.get('fetch');
    if (!fetchListener) throw new Error('no fetch listener');
    // مرورگر اجازهٔ ساخت Request با mode='navigate' از JS نمی‌دهد (هم در
    // window و هم در Node) — ولی این فقط محدودیت ساخت است؛ درخواست واقعی
    // navigation همان mode را دارد. با defineProperty شبیه‌سازی می‌کنیم.
    const request = new SafeRequest(url, { method: 'GET' });
    Object.defineProperty(request, 'mode', { value: 'navigate' });
    return new Promise<Response>((resolveResponse) => {
      const event = {
        request,
        preloadResponse: undefined,
        respondWith: (p: Promise<Response>) => {
          void p.then(resolveResponse);
        },
      };
      fetchListener(event as never);
    });
  };

  return { caches, emit, runFetch };
}

describe('public/sw.js — offline fallback', () => {
  it('install: /offline.html را precache می‌کند', async () => {
    const rt = createSwRuntime({});
    // اجرای install — waitUntil را capture می‌کنیم تا await کنیم
    await new Promise<void>((resolveInstall) => {
      rt.emit('install', {
        waitUntil: (promise: Promise<unknown>) => {
          void promise.then(() => resolveInstall());
          return promise;
        },
      });
    });

    // cache باید حاوی /offline.html باشد
    const keys = await rt.caches.keys();
    expect(keys).toContain('offline-v1');
  });

  it('fallback: خطای شبکه در navigation → /offline.html از cache', async () => {
    const rt = createSwRuntime({
      fetchImpl: async () => {
        throw new TypeError('Failed to fetch');
      },
    });

    // install — cache را پر کن
    await new Promise<void>((resolveInstall) => {
      rt.emit('install', {
        waitUntil: (promise: Promise<unknown>) => {
          void promise.then(() => resolveInstall());
          return promise;
        },
      });
    });

    // navigation با شبکهٔ قطع
    const resp = await rt.runFetch('http://localhost:3000/dashboard');
    expect(resp.status).toBe(200);
    expect(await resp.text()).toContain('offline');
  });

  it('شبکه برقرار → پاسخ واقعی شبکه (network-first)', async () => {
    const rt = createSwRuntime({
      fetchImpl: async () => new Response('<html>real page</html>', { status: 200 }),
    });

    await new Promise<void>((resolveInstall) => {
      rt.emit('install', {
        waitUntil: (promise: Promise<unknown>) => {
          void promise.then(() => resolveInstall());
          return promise;
        },
      });
    });

    const resp = await rt.runFetch('http://localhost:3000/');
    expect(resp.status).toBe(200);
    expect(await resp.text()).toBe('<html>real page</html>');
  });

  it('فقط navigation ها رهگیری می‌شوند (مابقی دست‌نخورده)', async () => {
    const rt = createSwRuntime({});
    const fetchImpl = vi.fn(async () => new Response('asset', { status: 200 }));
    // برای non-navigate، listener نباید respondWith صدا بزند
    const listeners = new Map<string, (event: never) => void>();
    const self = {
      registration: {},
      skipWaiting: vi.fn(),
      clients: { claim: vi.fn() },
      addEventListener: (type: string, fn: (event: never) => void) => listeners.set(type, fn),
    };
    const SafeRequest = class SafeRequest extends Request {
      constructor(input: string | Request | URL, init?: RequestInit) {
        if (typeof input === 'string' && input.startsWith('/')) {
          super(new URL(input, 'http://localhost:3000'), init);
        } else {
          super(input as RequestInfo | URL, init);
        }
      }
    };
    const fn = new Function('self', 'caches', 'fetch', 'Request', 'Response', `${loadSw()}`);
    fn(self, rt.caches, fetchImpl, SafeRequest, Response);

    let respondCalled = false;
    const event = {
      request: new Request('http://localhost:3000/_next/static/x.js', { method: 'GET' }),
      respondWith: () => {
        respondCalled = true;
      },
    };
    listeners.get('fetch')?.(event as never);
    expect(respondCalled).toBe(false);
  });
});
