import FingerprintJS from '@fingerprintjs/fingerprintjs';

export const getFingerprint = async () => {
  // Check cache first
  const cached = localStorage.getItem('fingerprint');
  if (cached) return cached;

  const fp = await FingerprintJS.load();
  const result = await fp.get();
  localStorage.setItem('fingerprint', result.visitorId);
  return result.visitorId;
};
