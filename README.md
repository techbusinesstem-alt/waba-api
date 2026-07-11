# WABA CRM API

A lightweight CRM-oriented WhatsApp Business API service. It stores contacts, conversations, and messages in memory, exposes CRM endpoints, and can send outbound WhatsApp text messages through Meta Graph API when credentials are configured.

## Requirements

- Node.js 20 or newer
- A Meta WhatsApp Business API phone number ID and access token for real outbound delivery

## Configuration

| Variable | Purpose |
| --- | --- |
| `PORT` | HTTP port, defaults to `3000` |
| `WHATSAPP_ACCESS_TOKEN` | Meta Graph API access token used for outbound messages |
| `WHATSAPP_PHONE_NUMBER_ID` | WhatsApp Business phone number ID used to send messages |
| `WHATSAPP_GRAPH_VERSION` | Graph API version, defaults to `v20.0` |
| `WHATSAPP_VERIFY_TOKEN` | Verification token for webhook subscription setup |

If outbound credentials are not set, `POST /whatsapp/messages` still records the CRM message and returns a skipped WhatsApp delivery result so local CRM flows can be tested without Meta credentials.

## Run

```bash
npm start
```

## Test

```bash
npm test
```

## API

### Health

```http
GET /health
```

### CRM contacts

```http
GET /crm/contacts
POST /crm/contacts
Content-Type: application/json

{
  "phone": "+15550100",
  "name": "Ada Lovelace",
  "email": "ada@example.com",
  "company": "Example Co",
  "tags": ["lead"],
  "customFields": { "source": "website" }
}
```

### CRM conversations

```http
GET /crm/conversations
GET /crm/conversations/{conversationId}
```

### Send WhatsApp message from CRM

```http
POST /whatsapp/messages
Content-Type: application/json

{
  "to": "+15550100",
  "text": "Hello from the CRM team"
}
```

### WhatsApp webhook

Configure Meta to call:

```http
GET /webhooks/whatsapp?hub.verify_token=...&hub.challenge=...
POST /webhooks/whatsapp
```

Inbound WhatsApp text messages are converted into CRM contacts, conversations, and received messages. Status callbacks update matching outbound message delivery state when the WhatsApp message ID is known.
