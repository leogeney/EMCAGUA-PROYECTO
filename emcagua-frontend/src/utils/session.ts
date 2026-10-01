const KEY = 'emcagua_user'

export function getUsername(fallback = 'Trabajador'): string {
  try {
    const u = localStorage.getItem(KEY)
    return u ? JSON.parse(u).username || fallback : fallback
  } catch {
    return fallback
  }
}

export function isLoggedIn() {
  try {
    return !!localStorage.getItem(KEY)
  } catch {
    return false
  }
}

export function login(username: string) {
  localStorage.setItem(KEY, JSON.stringify({ username }))
}

export function logout() {
  localStorage.removeItem(KEY)
}
