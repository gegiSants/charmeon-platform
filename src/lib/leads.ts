/** Helpers de leads / WhatsApp / telefone */

export function normalizePhoneDigits(phone: string): string {
  let digits = phone.replace(/\D/g, '');
  if (digits.startsWith('55') && digits.length >= 12) return digits;
  if (digits.length >= 10 && digits.length <= 11) return `55${digits}`;
  return digits;
}

export function whatsappUrl(phone: string, message?: string): string {
  const digits = normalizePhoneDigits(phone);
  const base = `https://wa.me/${digits}`;
  if (!message) return base;
  return `${base}?text=${encodeURIComponent(message)}`;
}

export function paymentReminderMessage(opts: {
  clientName: string;
  serviceName: string;
  date: string;
  time: string;
  amount: number;
  paymentUrl?: string | null;
}): string {
  const valor = opts.amount.toFixed(2).replace('.', ',');
  const lines = [
    `Olá, ${opts.clientName}!`,
    `Seu agendamento de *${opts.serviceName}* em ${opts.date} às ${opts.time} ainda está aguardando pagamento.`,
    `Valor: R$ ${valor}`,
  ];
  if (opts.paymentUrl) {
    lines.push('', `Pague pelo link: ${opts.paymentUrl}`);
  } else {
    lines.push('', 'Responda esta mensagem para receber o link de pagamento.');
  }
  lines.push('', 'Se já pagou, ignore esta mensagem. 💛');
  return lines.join('\n');
}

export function formatCountdown(expiresAt: string | null | undefined): string {
  if (!expiresAt) return '—';
  const ms = new Date(expiresAt).getTime() - Date.now();
  if (ms <= 0) return 'Expirado';
  const mins = Math.floor(ms / 60000);
  if (mins < 60) return `${mins} min`;
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return m > 0 ? `${h}h ${m}min` : `${h}h`;
}

export function daysSince(dateStr: string | null | undefined): number | null {
  if (!dateStr) return null;
  const d = new Date(dateStr.includes('T') ? dateStr : `${dateStr}T12:00:00`);
  if (Number.isNaN(d.getTime())) return null;
  return Math.floor((Date.now() - d.getTime()) / 86400000);
}
