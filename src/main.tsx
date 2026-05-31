import {StrictMode, useEffect, useState} from 'react';
import {createRoot} from 'react-dom/client';
import App from './app/App.tsx';
import './index.css';

// ── Global Error Catcher (shows errors in Tauri window instead of blank screen) ──
window.addEventListener('error', (e) => {
  console.error('[NYX] Uncaught error:', e.error || e.message);
  const overlay = document.createElement('div');
  overlay.style.cssText = 'position:fixed;top:0;left:0;width:100vw;height:100vh;z-index:999999;background:#111;color:#ef4444;padding:2rem;font-family:monospace;overflow:auto;';
  overlay.innerHTML = `
    <h2 style="color:#ef4444;margin-bottom:1rem">&#9888; NYX startup crash</h2>
    <pre style="white-space:pre-wrap;font-size:12px;opacity:0.9;background:#1a1a1a;padding:1rem;border-radius:4px">${e.message}\n\n${e.error?.stack || ''}</pre>
  `;
  document.body.appendChild(overlay);
});

window.addEventListener('unhandledrejection', (e) => {
  console.error('[NYX] Unhandled promise rejection:', e.reason);
  const overlay = document.createElement('div');
  overlay.style.cssText = 'position:fixed;top:0;left:0;width:100vw;height:100vh;z-index:999999;background:#111;color:#facc15;padding:2rem;font-family:monospace;overflow:auto;';
  overlay.innerHTML = `
    <h2 style="color:#facc15;margin-bottom:1rem">&#9888; NYX unhandled rejection</h2>
    <pre style="white-space:pre-wrap;font-size:12px;opacity:0.9;background:#1a1a1a;padding:1rem;border-radius:4px">${e.reason?.message || e.reason || 'Unknown error'}\n\n${e.reason?.stack || ''}</pre>
  `;
  document.body.appendChild(overlay);
});

// ── Transparent Global Session Fetch Interceptor ─────────────────────────────
let cachedToken: string | null = null;
let tokenExpiresAt = 0;
let inFlightTokenPromise: Promise<string> | null = null;

async function getOrFetchSessionToken(): Promise<string> {
  if (cachedToken && Date.now() < tokenExpiresAt - 10000) {
    return cachedToken;
  }
  if (inFlightTokenPromise) {
    return inFlightTokenPromise;
  }

  inFlightTokenPromise = (async () => {
    try {
      const res = await fetch('/api/auth/session');
      if (!res.ok) throw new Error(`Auth status ${res.status}`);
      const data = await res.json();
      cachedToken = data.token;
      tokenExpiresAt = data.expiresAt || (Date.now() + 5 * 60 * 1000);
      return data.token || '';
    } catch (err) {
      console.error('[Session Interceptor] Failed to fetch session token:', err);
      return '';
    } finally {
      inFlightTokenPromise = null;
    }
  })();

  return inFlightTokenPromise;
}

const originalFetch = window.fetch;
window.fetch = async function (input: RequestInfo | URL, init?: RequestInit): Promise<Response> {
  const urlStr = typeof input === 'string' ? input : (input instanceof URL ? input.href : input.url);
  const isApiCall = urlStr.includes('/api/') && 
                    !urlStr.includes('/api/auth/session') && 
                    !urlStr.includes('/api/vault/token') && 
                    !urlStr.includes('/api/health') && 
                    !urlStr.includes('/api/admin/logs');

  if (isApiCall) {
    try {
      const token = await getOrFetchSessionToken();
      if (token) {
        init = init || {};
        const headers = new Headers(init.headers);
        if (!headers.has('Authorization')) {
          headers.set('Authorization', `Bearer ${token}`);
        }
        if (!headers.has('X-NYX-Session-Token')) {
          headers.set('X-NYX-Session-Token', token);
        }
        init.headers = headers;
      }
    } catch (err) {
      console.warn('[Fetch Interceptor] Error applying auth header:', err);
    }
  }

  return originalFetch.call(this, input, init);
};

function RootContainer() {
  const [isBackendReady, setIsBackendReady] = useState(false);

  useEffect(() => {
    let mounted = true;
    const checkBackend = async () => {
      while (mounted) {
        try {
          const res = await originalFetch('/api/auth/session', { headers: { Accept: 'application/json' }});
          if (res.ok || res.status === 401 || res.status === 403) {
            // Backend is up and responding (even if unauthorized)
            if (mounted) setIsBackendReady(true);
            return;
          }
        } catch (e) {
          // Backend not up yet
        }
        await new Promise(r => setTimeout(r, 1000));
      }
    };
    checkBackend();
    return () => { mounted = false; };
  }, []);

  if (!isBackendReady) {
    return (
      <div style={{ display: 'flex', height: '100vh', width: '100vw', alignItems: 'center', justifyContent: 'center', backgroundColor: '#09090b', color: '#a1a1aa', fontFamily: 'sans-serif' }}>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1rem' }}>
          <div style={{ width: '2rem', height: '2rem', border: '3px solid #27272a', borderTopColor: '#3b82f6', borderRadius: '50%', animation: 'spin 1s linear infinite' }}></div>
          <style>{`@keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }`}</style>
          <div>Waiting for backend to start (compiling Tauri)...</div>
        </div>
      </div>
    );
  }

  return <App />;
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <RootContainer />
  </StrictMode>,
);
