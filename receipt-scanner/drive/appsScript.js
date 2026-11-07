// Method A: POST the PDF (base64) to the user's deployed Apps Script web app.
const b64 = blob => new Promise(r => { const f = new FileReader(); f.onload = () => r(f.result.split(',')[1]); f.readAsDataURL(blob); });
export function appsScript(settings) {
  return async ({ folderPath, fileName, blob }) => {
    if (!settings.endpoint) throw new Error('Set the Apps Script URL in Settings.');
    // text/plain avoids a CORS preflight, which Apps Script cannot answer.
    const res = await fetch(settings.endpoint, { method: 'POST', headers: { 'Content-Type': 'text/plain;charset=utf-8' }, body: JSON.stringify({ folderPath, fileName, mime: 'application/pdf', data: await b64(blob) }) });
    const j = await res.json().catch(() => ({}));
    if (!j.ok) throw new Error(j.error || 'Apps Script upload failed (HTTP ' + res.status + ')');
  };
}
