export function createStore() {
  const contacts = new Map();
  const conversations = new Map();
  const messages = new Map();

  const now = () => new Date().toISOString();
  const id = (prefix) => `${prefix}_${crypto.randomUUID()}`;

  function upsertContact(input) {
    if (!input?.phone) {
      throw Object.assign(new Error('phone is required'), { status: 400 });
    }

    const phone = normalizePhone(input.phone);
    const existing = contacts.get(phone);
    const contact = {
      id: existing?.id ?? id('contact'),
      phone,
      name: input.name ?? existing?.name ?? null,
      email: input.email ?? existing?.email ?? null,
      company: input.company ?? existing?.company ?? null,
      tags: Array.isArray(input.tags) ? input.tags : existing?.tags ?? [],
      customFields: { ...(existing?.customFields ?? {}), ...(input.customFields ?? {}) },
      createdAt: existing?.createdAt ?? now(),
      updatedAt: now()
    };
    contacts.set(phone, contact);
    return contact;
  }

  function listContacts() {
    return [...contacts.values()].sort((a, b) => a.createdAt.localeCompare(b.createdAt));
  }

  function getContact(phone) {
    return contacts.get(normalizePhone(phone));
  }

  function getOrCreateConversation(phone) {
    const contact = upsertContact({ phone });
    const existing = conversations.get(contact.phone);
    if (existing) return existing;

    const conversation = {
      id: id('conversation'),
      contactPhone: contact.phone,
      status: 'open',
      lastMessageAt: null,
      createdAt: now(),
      updatedAt: now()
    };
    conversations.set(contact.phone, conversation);
    return conversation;
  }

  function addMessage({ phone, direction, text, whatsappMessageId = null, status = 'queued', raw = null }) {
    if (!phone) throw Object.assign(new Error('phone is required'), { status: 400 });
    if (!['inbound', 'outbound'].includes(direction)) {
      throw Object.assign(new Error('direction must be inbound or outbound'), { status: 400 });
    }
    if (!text) throw Object.assign(new Error('text is required'), { status: 400 });

    const conversation = getOrCreateConversation(phone);
    const message = {
      id: id('message'),
      conversationId: conversation.id,
      contactPhone: normalizePhone(phone),
      direction,
      text,
      whatsappMessageId,
      status,
      raw,
      createdAt: now(),
      updatedAt: now()
    };
    messages.set(message.id, message);
    conversation.lastMessageAt = message.createdAt;
    conversation.updatedAt = message.createdAt;
    return message;
  }

  function listConversations() {
    return [...conversations.values()].sort((a, b) => (b.lastMessageAt ?? '').localeCompare(a.lastMessageAt ?? ''));
  }

  function listMessages(conversationId) {
    return [...messages.values()]
      .filter((message) => message.conversationId === conversationId)
      .sort((a, b) => a.createdAt.localeCompare(b.createdAt));
  }

  function updateMessageStatus(whatsappMessageId, status) {
    const message = [...messages.values()].find((item) => item.whatsappMessageId === whatsappMessageId);
    if (!message) return null;
    message.status = status;
    message.updatedAt = now();
    return message;
  }

  return {
    upsertContact,
    listContacts,
    getContact,
    getOrCreateConversation,
    addMessage,
    listConversations,
    listMessages,
    updateMessageStatus
  };
}

export function normalizePhone(phone) {
  const trimmed = String(phone).trim();
  const normalized = trimmed.startsWith('+') ? `+${trimmed.slice(1).replace(/\D/g, '')}` : `+${trimmed.replace(/\D/g, '')}`;
  if (normalized.length < 8) {
    throw Object.assign(new Error('phone must include country code'), { status: 400 });
  }
  return normalized;
}
