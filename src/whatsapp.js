const GRAPH_VERSION = process.env.WHATSAPP_GRAPH_VERSION ?? 'v20.0';

export async function sendWhatsAppText({ to, text, token = process.env.WHATSAPP_ACCESS_TOKEN, phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID, fetchImpl = fetch }) {
  if (!token || !phoneNumberId) {
    return {
      skipped: true,
      reason: 'WHATSAPP_ACCESS_TOKEN and WHATSAPP_PHONE_NUMBER_ID are required to send through Meta'
    };
  }

  const response = await fetchImpl(`https://graph.facebook.com/${GRAPH_VERSION}/${phoneNumberId}/messages`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      messaging_product: 'whatsapp',
      recipient_type: 'individual',
      to: to.replace(/^\+/, ''),
      type: 'text',
      text: { preview_url: false, body: text }
    })
  });

  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    const error = new Error(payload.error?.message ?? 'WhatsApp API request failed');
    error.status = response.status;
    error.payload = payload;
    throw error;
  }

  return payload;
}

export function extractWebhookEvents(payload) {
  const entries = payload?.entry ?? [];
  return entries.flatMap((entry) => entry.changes ?? []).flatMap((change) => {
    const value = change.value ?? {};
    const contacts = new Map((value.contacts ?? []).map((contact) => [contact.wa_id, contact]));
    const messages = (value.messages ?? []).map((message) => ({
      type: 'message',
      phone: `+${message.from}`,
      name: contacts.get(message.from)?.profile?.name ?? null,
      text: message.text?.body ?? `[${message.type} message]`,
      whatsappMessageId: message.id,
      raw: message
    }));
    const statuses = (value.statuses ?? []).map((status) => ({
      type: 'status',
      whatsappMessageId: status.id,
      status: status.status,
      raw: status
    }));
    return [...messages, ...statuses];
  });
}
