export class ApiError extends Error {
  status: number
  constructor(message: string, status: number) {
    super(message)
    this.status = status
  }
}

async function parse(res: Response) {
  let body: any = null
  try {
    body = await res.json()
  } catch {
    /* empty body */
  }
  if (!res.ok) {
    throw new ApiError(body?.error || `Request failed (${res.status})`, res.status)
  }
  return body
}

export const fetcher = (url: string) => fetch(url, { cache: 'no-store' }).then(parse)

export async function api<T = any>(
  url: string,
  method: 'POST' | 'PUT' | 'DELETE' | 'PATCH',
  body?: unknown
): Promise<T> {
  const res = await fetch(url, {
    method,
    headers: body !== undefined ? { 'Content-Type': 'application/json' } : undefined,
    body: body !== undefined ? JSON.stringify(body) : undefined,
  })
  return parse(res)
}
