import test from 'node:test';
import assert from 'node:assert/strict';
import { createStore, normalizePhone } from '../src/store.js';
import { extractWebhookEvents } from '../src/whatsapp.js';

test('upserts CRM contacts and normalizes phone numbers', () => {
  const store = createStore();
  const contact = store.upsertContact({ phone: '(1) 555-0100', name: 'Ada', tags: ['lead'] });
  const updated = store.upsertContact({ phone: '+1 555 0100', company: 'Example Co' });

  assert.equal(contact.id, updated.id);
  assert.equal(updated.phone, '+15550100');
  assert.equal(updated.name, 'Ada');
  assert.equal(updated.company, 'Example Co');
  assert.deepEqual(updated.tags, ['lead']);
});

test('stores outbound and inbound messages by conversation', () => {
  const store = createStore();
  const outbound = store.addMessage({ phone: '+15550101', direction: 'outbound', text: 'Hello from CRM' });
  const inbound = store.addMessage({ phone: '+15550101', direction: 'inbound', text: 'Hi' });

  const conversations = store.listConversations();
  assert.equal(conversations.length, 1);
  assert.deepEqual(store.listMessages(conversations[0].id).map((message) => message.id), [outbound.id, inbound.id]);
});

test('extracts WhatsApp webhook messages and statuses', () => {
  const events = extractWebhookEvents({
    entry: [{
      changes: [{
        value: {
          contacts: [{ wa_id: '15550102', profile: { name: 'Grace' } }],
          messages: [{ id: 'wamid.1', from: '15550102', type: 'text', text: { body: 'Need support' } }],
          statuses: [{ id: 'wamid.2', status: 'delivered' }]
        }
      }]
    }]
  });

  assert.equal(events.length, 2);
  assert.deepEqual(events[0], {
    type: 'message',
    phone: '+15550102',
    name: 'Grace',
    text: 'Need support',
    whatsappMessageId: 'wamid.1',
    raw: { id: 'wamid.1', from: '15550102', type: 'text', text: { body: 'Need support' } }
  });
  assert.equal(events[1].status, 'delivered');
});

test('rejects invalid phone numbers', () => {
  assert.throws(() => normalizePhone('123'), /country code/);
});
