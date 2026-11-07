import { appsScript } from './appsScript.js';
import { googleSignIn } from './googleSignIn.js';
export const driveFor = s => (s.method === 'google' ? googleSignIn(s) : appsScript(s));
