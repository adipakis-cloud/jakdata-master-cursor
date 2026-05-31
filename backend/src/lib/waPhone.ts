/** Convert Baileys JID to readable Indonesian mobile format (08xxx). */
export function jidToPhone(jid: string): string {
  if (!jid) return 'Unknown';
  if (jid.includes('@lid')) return 'lid-internal';

  const match = jid.match(/^(\d+)(?::\d+)?@/);
  let digits = match ? match[1] : jid.replace(/@.*$/, '').replace(/:\d+$/, '').replace(/\D/g, '');

  if (!digits || digits.length > 15) return jid.includes('@') ? 'lid-internal' : jid;

  if (digits.startsWith('628')) return `0${digits.slice(2)}`;
  if (digits.startsWith('62')) return `0${digits.slice(2)}`;
  if (digits.startsWith('0')) return digits;
  return digits;
}

/** Format stored phone / legacy JID for display. */
export function formatPhone(raw: string | null | undefined): string {
  if (!raw) return '-';
  if (raw.includes('@lid') || raw === 'lid-internal') return 'Pengirim WA (ID internal)';
  if (raw.includes('@')) return jidToPhone(raw);
  const digits = raw.replace(/\D/g, '');
  if (digits.length > 13) return 'Pengirim WA (ID internal)';
  if (digits.startsWith('628')) return `0${digits.slice(2)}`;
  if (digits.startsWith('62')) return `0${digits.slice(2)}`;
  return raw;
}

export function formatSender(raw: string | null | undefined): string {
  return formatPhone(raw);
}

/** Normalize to 62xxx for WA API / warga lookup matching. */
export function toWaMatchPhone(jidOrPhone: string): string {
  if (!jidOrPhone) return '';
  if (jidOrPhone.includes('@lid')) return 'lid-internal';

  const display = jidOrPhone.includes('@') ? jidToPhone(jidOrPhone) : formatPhone(jidOrPhone);
  const digits = display.replace(/\D/g, '');
  if (!digits || digits === 'lidinternal') return 'lid-internal';
  if (digits.startsWith('62')) return digits;
  if (digits.startsWith('0')) return `62${digits.slice(1)}`;
  return digits;
}
