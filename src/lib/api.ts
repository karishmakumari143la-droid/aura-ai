/**
 * Safe fetch utility that guards against non-JSON (e.g. HTML <!doctype) responses.
 */
export async function safeFetchJson<T = any>(
  input: RequestInfo | URL,
  init?: RequestInit
): Promise<{ ok: boolean; status: number; data: T | null; error?: string }> {
  try {
    const res = await fetch(input, init);
    const contentType = res.headers.get('content-type') || '';
    
    if (!contentType.includes('application/json')) {
      return {
        ok: res.ok,
        status: res.status,
        data: null,
        error: `Expected JSON response but received ${contentType || 'text/html'}`
      };
    }

    const data = (await res.json()) as T;
    return {
      ok: res.ok,
      status: res.status,
      data
    };
  } catch (err: any) {
    return {
      ok: false,
      status: 0,
      data: null,
      error: err?.message || 'Network communication error'
    };
  }
}
