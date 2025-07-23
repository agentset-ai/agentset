export function fetchWithTimeout(
  input: string | Request | URL,
  init?: RequestInit,
  timeout: number = 5000,
) {
  return new Promise<Response>((resolve, reject) => {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => {
      controller.abort();
      reject(new Error("Request timed out"));
    }, timeout);
    fetch(input, { ...init, signal: controller.signal })
      .then((response) => {
        clearTimeout(timeoutId);
        resolve(response);
      })
      .catch((error) => {
        clearTimeout(timeoutId);
        reject(error);
      });
  });
}
