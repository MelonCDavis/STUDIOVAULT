const BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:5000";

async function request(method, url, body) {
  const res = await fetch(`${BASE_URL}${url}`, {
    method,
    headers: {
      "Content-Type": "application/json",
    },
    body: body ? JSON.stringify(body) : undefined,
  });

 if (res.status === 304) {
  return null;
}

if (!res.ok) {
  const error = new Error("API Error");
  error.status = res.status;
  error.response = await res.json().catch(() => ({}));
  throw error;
}

  if (res.status === 204) return null;

  return res.json();
}

export function apiGet(url) {
  return request("GET", url);
}

export function apiPost(url, body) {
  return request("POST", url, body);
}

export function apiPatch(url, body) {
  return request("PATCH", url, body);
}

export function apiDelete(url) {
  return request("DELETE", url);
}
