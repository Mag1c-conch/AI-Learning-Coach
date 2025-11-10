import AUTH from "../Constant";

const ACCOUNT_STORAGE_KEY = "auth:accounts";
const ACTIVE_ACCOUNT_KEY = "auth:active-account";
const LAST_ACCOUNT_KEY = "auth:last-account";

function safeParse(value) {
  if (!value) return null;
  try {
    return JSON.parse(value);
  } catch {
    return null;
  }
}

function readAccounts() {
  if (typeof window === "undefined") return {};
  return safeParse(window.localStorage.getItem(ACCOUNT_STORAGE_KEY)) || {};
}

function writeAccounts(accounts) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(ACCOUNT_STORAGE_KEY, JSON.stringify(accounts));
}

function ensureActiveAccountKey(accounts) {
  if (typeof window === "undefined") return null;
  const current = window.sessionStorage.getItem(ACTIVE_ACCOUNT_KEY);
  if (current && accounts[current]) {
    return current;
  }
  const fallback = window.localStorage.getItem(LAST_ACCOUNT_KEY);
  if (fallback && accounts[fallback]) {
    window.sessionStorage.setItem(ACTIVE_ACCOUNT_KEY, fallback);
    return fallback;
  }
  const firstKey = Object.keys(accounts)[0];
  if (firstKey) {
    window.sessionStorage.setItem(ACTIVE_ACCOUNT_KEY, firstKey);
    window.localStorage.setItem(LAST_ACCOUNT_KEY, firstKey);
    return firstKey;
  }
  return null;
}

export function listStoredAccounts() {
  const accounts = readAccounts();
  return Object.values(accounts);
}

export function getStoredAuthPayload() {
  if (typeof window === "undefined") return null;
  const sessionRaw = window.sessionStorage.getItem(AUTH.TOKEN_KEY);
  const sessionPayload = safeParse(sessionRaw);
  if (sessionPayload) {
    return sessionPayload;
  }
  const accounts = readAccounts();
  const activeKey = ensureActiveAccountKey(accounts);
  if (activeKey && accounts[activeKey]) {
    return accounts[activeKey];
  }
  // Legacy fallback
  return safeParse(window.localStorage.getItem(AUTH.TOKEN_KEY));
}

export function getActiveUser() {
  const payload = getStoredAuthPayload();
  if (!payload) return null;
  if (payload.user && typeof payload.user === "object") {
    return { ...payload.user, token: payload.token || payload.jwt };
  }
  return payload;
}

export function getAuthToken() {
  const payload = getStoredAuthPayload();
  if (!payload) return null;
  return payload.token || payload.jwt || null;
}

export function storeAuthPayload(apiResponse) {
  if (typeof window === "undefined" || !apiResponse) {
    return null;
  }

  const userData = apiResponse.user || apiResponse;
  if (!userData) {
    return null;
  }

  const token = apiResponse.token || apiResponse.jwt || userData.token;
  const accountKey = `${userData.id || userData.user_id || "user"}:${userData.role || "unknown"}`;
  const payload = {
    ...userData,
    accountKey,
  };
  if (token) {
    payload.token = token;
  }

  const accounts = readAccounts();
  accounts[accountKey] = payload;
  writeAccounts(accounts);
  window.sessionStorage.setItem(ACTIVE_ACCOUNT_KEY, accountKey);
  window.localStorage.setItem(LAST_ACCOUNT_KEY, accountKey);
  const serialized = JSON.stringify(payload);
  window.sessionStorage.setItem(AUTH.TOKEN_KEY, serialized);
  window.localStorage.setItem(AUTH.TOKEN_KEY, serialized);

  try {
    window.dispatchEvent(new CustomEvent("login:success", { detail: payload }));
  } catch {
    // ignore
  }
  return payload;
}

export function setActiveAccount(accountKey) {
  if (typeof window === "undefined" || !accountKey) return;
  const accounts = readAccounts();
  if (!accounts[accountKey]) return;
  window.sessionStorage.setItem(ACTIVE_ACCOUNT_KEY, accountKey);
  window.localStorage.setItem(LAST_ACCOUNT_KEY, accountKey);
}

export function clearAuthPayload(accountKey) {
  if (typeof window === "undefined") return;
  const accounts = readAccounts();
  const keyToRemove = accountKey || window.sessionStorage.getItem(ACTIVE_ACCOUNT_KEY);
  if (keyToRemove && accounts[keyToRemove]) {
    delete accounts[keyToRemove];
    writeAccounts(accounts);
  }
  if (!accountKey || keyToRemove === accountKey) {
    window.sessionStorage.removeItem(ACTIVE_ACCOUNT_KEY);
  }
  if (Object.keys(accounts).length === 0) {
    window.localStorage.removeItem(LAST_ACCOUNT_KEY);
  }
  if (!accountKey || keyToRemove === accountKey) {
    window.sessionStorage.removeItem(AUTH.TOKEN_KEY);
  }
  if (!Object.keys(accounts).length) {
    window.localStorage.removeItem(AUTH.TOKEN_KEY);
  }
  try {
    window.dispatchEvent(new CustomEvent("logout"));
  } catch {
    // ignore
  }
}
