import { createServer } from 'node:http';
import { createStore } from './store.js';
import { extractWebhookEvents, sendWhatsAppText } from './whatsapp.js';

const store = createStore();

export function createApp({ crmStore = store, sendText = sendWhatsAppText } = {}) {
  return async function handler(req, res) {
    try {
      const url = new URL(req.url, 'http://localhost');

      if (req.method === 'GET' && url.pathname === '/health') return json(res, 200, { ok: true });
      if (req.method === 'GET' && url.pathname === '/crm/contacts') return json(res, 200, { data: crmStore.listContacts() });
      if (req.method === 'POST' && url.pathname === '/crm/contacts') return json(res, 201, { data: crmStore.upsertContact(await readJson(req)) });
      if (req.method === 'GET' && url.pathname === '/crm/conversations') return json(res, 200, { data: crmStore.listConversations() });
      if (req.method === 'GET' && url.pathname.startsWith('/crm/conversations/')) {
        const conversationId = decodeURIComponent(url.pathname.split('/').at(-1));
        return json(res, 200, { data: crmStore.listMessages(conversationId) });
      }
      if (req.method === 'POST' && url.pathname === '/whatsapp/messages') {
        const body = await readJson(req);
        const message = crmStore.addMessage({ phone: body.to, direction: 'outbound', text: body.text });
        const sent = await sendText({ to: message.contactPhone, text: message.text });
        if (sent.messages?.[0]?.id) crmStore.updateMessageStatus(sent.messages[0].id, 'sent');
        return json(res, 202, { data: { ...message, whatsapp: sent } });
      }
      if (req.method === 'GET' && url.pathname === '/webhooks/whatsapp') {
        const expected = process.env.WHATSAPP_VERIFY_TOKEN;
        if (expected && url.searchParams.get('hub.verify_token') === expected) {
          res.writeHead(200, { 'Content-Type': 'text/plain' });
          return res.end(url.searchParams.get('hub.challenge') ?? '');
        }
        return json(res, 403, { error: 'invalid verify token' });
      }
      if (req.method === 'POST' && url.pathname === '/webhooks/whatsapp') {
        const events = extractWebhookEvents(await readJson(req));
        const processed = events.map((event) => {
          if (event.type === 'message') {
            crmStore.upsertContact({ phone: event.phone, name: event.name });
            return crmStore.addMessage({ phone: event.phone, direction: 'inbound', text: event.text, whatsappMessageId: event.whatsappMessageId, status: 'received', raw: event.raw });
          }
          return crmStore.updateMessageStatus(event.whatsappMessageId, event.status);
        });
        return json(res, 200, { data: processed.filter(Boolean) });
      }

      return json(res, 404, { error: 'not found' });
    } catch (error) {
      return json(res, error.status ?? 500, { error: error.message, details: error.payload });
    }
  };
}

async function readJson(req) {
  const chunks = [];
  for await (const chunk of req) chunks.push(chunk);
  if (!chunks.length) return {};
  return JSON.parse(Buffer.concat(chunks).toString('utf8'));
}

function json(res, statusCode, payload) {
  res.writeHead(statusCode, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify(payload));
}

if (process.argv[1] === new URL(import.meta.url).pathname) {
  const port = Number(process.env.PORT ?? 3000);
  createServer(createApp()).listen(port, () => console.log(`WABA CRM API listening on :${port}`));
}
