/** Thrown when a promise does not settle within the given time. */
export const HRMS_FETCH_TIMEOUT = 'HRMS_FETCH_TIMEOUT'

export function isTimeoutError(e: unknown): boolean {
  return e instanceof Error && e.message === HRMS_FETCH_TIMEOUT
}

export function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  return new Promise((resolve, reject) => {
    const t = window.setTimeout(() => {
      reject(new Error(HRMS_FETCH_TIMEOUT))
    }, ms)
    promise
      .then((v) => {
        window.clearTimeout(t)
        resolve(v)
      })
      .catch((e) => {
        window.clearTimeout(t)
        reject(e)
      })
  })
}
