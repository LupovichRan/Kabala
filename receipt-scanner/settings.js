const KEY = 'receipt-scanner-settings';
const DEFAULTS = { method: 'appsScript', endpoint: '', clientId: '', root: 'Expenses', color: 'color' };
export const getSettings = () => { try { return { ...DEFAULTS, ...JSON.parse(localStorage.getItem(KEY) || '{}') }; } catch { return { ...DEFAULTS }; } };
export const saveSettings = s => { try { localStorage.setItem(KEY, JSON.stringify(s)); } catch {} };
