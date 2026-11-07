// Method B: Google Identity Services token flow + Drive REST v3, scope drive.file.
import { loadScript, LIBS } from '../lib.js';
let token = null, expires = 0;
async function getToken(clientId) {
  if (token && Date.now() < expires - 30000) return token;
  await loadScript(LIBS.gis);
  return new Promise((res, rej) => {
    google.accounts.oauth2.initTokenClient({
      client_id: clientId, scope: 'https://www.googleapis.com/auth/drive.file',
      callback: r => r.error ? rej(new Error('Google sign-in failed: ' + r.error)) : (token = r.access_token, expires = Date.now() + r.expires_in * 1000, res(token)),
    }).requestAccessToken();
  });
}
const api = async (t, url, init = {}) => {
  const r = await fetch(url, { ...init, headers: { Authorization: 'Bearer ' + t, ...init.headers } });
  if (!r.ok) throw new Error('Drive error ' + r.status + (r.status === 401 ? ' - check Settings / sign in again' : ''));
  return r.json();
};
async function ensureFolder(t, name, parent) {
  const q = `name='${name.replace(/'/g, "\\'")}' and mimeType='application/vnd.google-apps.folder' and trashed=false and '${parent}' in parents`;
  const f = await api(t, 'https://www.googleapis.com/drive/v3/files?fields=files(id)&q=' + encodeURIComponent(q));
  if (f.files[0]) return f.files[0].id;
  return (await api(t, 'https://www.googleapis.com/drive/v3/files?fields=id', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name, mimeType: 'application/vnd.google-apps.folder', parents: [parent] }) })).id;
}
export function googleSignIn(settings) {
  return async ({ folderPath, fileName, blob }) => {
    if (!settings.clientId) throw new Error('Set the Google OAuth Client ID in Settings.');
    const t = await getToken(settings.clientId);
    let parent = 'root';
    for (const n of folderPath) parent = await ensureFolder(t, n, parent);
    const meta = { name: fileName, parents: [parent] }, b = 'rcpt' + Date.now();
    const body = new Blob([`--${b}\r\nContent-Type: application/json\r\n\r\n${JSON.stringify(meta)}\r\n--${b}\r\nContent-Type: application/pdf\r\n\r\n`, blob, `\r\n--${b}--`]);
    await api(t, 'https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id', { method: 'POST', headers: { 'Content-Type': 'multipart/related; boundary=' + b }, body });
  };
}
