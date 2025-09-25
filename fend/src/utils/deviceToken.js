export function getOrCreateDeviceToken() {
    let t = localStorage.getItem('device_token');
    if (!t) {
      // crypto.randomUUID() is supported in modern browsers; fallback if needed
      t = (crypto?.randomUUID?.() || Math.random().toString(36).slice(2)) + Date.now();
      localStorage.setItem('device_token', t);
    }
    return t;
  }
  