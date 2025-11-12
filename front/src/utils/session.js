// utils/session.js
export function setSession(connection) {
  const session = {
    connection,
    createdAt: Date.now()
  };
  localStorage.setItem('vmSession', JSON.stringify(session));
}

export function getSession() {
  const session = JSON.parse(localStorage.getItem('vmSession') || 'null');
  if (!session) return null;
  
  const now = Date.now();
  const diff = now - session.createdAt;
  const TWENTY_MINUTES = 20 * 60 * 1000;

  if (diff > TWENTY_MINUTES) {
    localStorage.removeItem('vmSession');
    return null;
  }

  return session.connection;
}

export function clearSession() {
  localStorage.removeItem('vmSession');
}
