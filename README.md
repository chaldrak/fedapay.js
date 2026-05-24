# fedapay.js

Zero-dependency TypeScript wrapper for the [FedaPay](https://fedapay.com) API.

## Installation

```bash
npm install fedapay.js
pnpm add fedapay.js
```

## Usage

### Initialiser le client

```ts
import { FedaPayClient } from "fedapay.js";

const client = new FedaPayClient({
  secretKey: "sk_live_xxxx",
  environment: "live", // "sandbox" par défaut
  webhookSecret: "whsec_xxxx", // optionnel, requis pour vérifier les signatures
});
```

---

### Transactions

```ts
// Créer
const { transactionId, paymentUrl } = await client.transactions.create({
  amount: 5000,
  currency: "XOF", // par défaut
  description: "Commande #42",
  callbackUrl: "https://monsite.com/callback",
  customerEmail: "client@example.com",
  customerFirstName: "Jean",
  customerLastName: "Dupont",
  metadata: { orderId: "42" },
});

// Récupérer
const tx = await client.transactions.get(transactionId);
console.log(tx.status); // "pending" | "approved" | "declined" | ...

// Lister
const { transactions, meta } = await client.transactions.list({ page: 1, perPage: 25 });

// Générer un lien de paiement sur une transaction existante
const { token, paymentUrl } = await client.transactions.createPaymentToken(transactionId);
```

---

### Customers

```ts
// Créer
const customer = await client.customers.create({
  firstname: "Jean",
  lastname: "Dupont",
  email: "jean@example.com",
  phoneNumber: { number: "90090909", country: "bj" },
});

// Récupérer
const customer = await client.customers.get(customerId);

// Lister
const { customers, meta } = await client.customers.list({ page: 1, perPage: 25 });

// Mettre à jour
const updated = await client.customers.update(customerId, { lastname: "Martin" });

// Supprimer
await client.customers.delete(customerId);
```

---

### Payouts (dépôts Mobile Money)

```ts
// Créer un payout (customer existant)
const payout = await client.payouts.create({
  amount: 10000,
  currency: "XOF",
  mode: "mtn_open", // mtn_open | moov | wave_ci | orange_ci | ...
  customer: { id: customerId },
});

// Créer un payout (nouveau customer)
const payout = await client.payouts.create({
  amount: 10000,
  mode: "moov",
  customer: { email: "client@example.com", firstname: "Jean", lastname: "Dupont" },
  merchantReference: "order_42",
});

// Envoyer immédiatement
await client.payouts.send([{ id: payout.id }]);

// Envoyer plusieurs, certains programmés
await client.payouts.send([
  { id: 10 },
  { id: 11, scheduledAt: "2026-06-01T08:00:00Z" },
]);

// Récupérer
const payout = await client.payouts.get(payoutId);
console.log(payout.status); // "pending" | "scheduled" | "sent" | "failed" | ...

// Lister
const { payouts, meta } = await client.payouts.list({ page: 1, perPage: 25 });
```

---

### Webhooks

```ts
// Lister les types d'événements disponibles (pour connaître les IDs)
const eventTypes = await client.webhooks.listEventTypes();
// [{ id: 5, name: "transaction.approved" }, { id: 6, name: "transaction.declined" }, ...]

// Créer
const webhook = await client.webhooks.create({
  url: "https://monsite.com/webhook",
  enabled: true,
  sslVerify: true,
  disableOnError: false,
  eventTypeIds: [5, 6, 7, 10],             // optionnel — tous les events par défaut
  httpHeaders: { "x-my-signature": "abc" }, // optionnel — headers ajoutés à chaque requête
});

// Récupérer
const webhook = await client.webhooks.get(webhookId);
console.log(webhook.eventTypes);
// [{ id: 5, name: "transaction.approved" }, { id: 1, name: "customer.created" }]

// Lister
const { webhooks, meta } = await client.webhooks.list();

// Mettre à jour
const updated = await client.webhooks.update(webhookId, { enabled: false });

// Supprimer
await client.webhooks.delete(webhookId);
```

---

### Balances

```ts
// Récupérer une balance
const balance = await client.balances.get(balanceId);
console.log(balance.amount, balance.mode);

// Lister toutes les balances
const { balances } = await client.balances.list();
```

---

### Events

```ts
// Récupérer un événement
const event = await client.events.get(eventId);
console.log(event.type); // "transaction.approved" | ...

// Lister les événements
const { events, meta } = await client.events.list({ page: 1, perPage: 25 });
```

---

### Vérifier la signature d'un webhook

```ts
// Express
app.post("/webhook", express.raw({ type: "application/json" }), (req, res) => {
  const isValid = client.verifyWebhookSignature(
    req.body.toString(),
    req.headers["x-fedapay-signature"] as string,
  );

  if (!isValid) return res.status(400).send("Signature invalide");

  // Traiter l'événement…
  res.json({ received: true });
});
```

Utilisation sans client :

```ts
import { verifyWebhookSignature } from "fedapay.js";

const isValid = verifyWebhookSignature(rawBody, signatureHeader, webhookSecret);
```

---

## API

### `new FedaPayClient(config)`

| Paramètre       | Type                  | Requis | Description                         |
| --------------- | --------------------- | ------ | ----------------------------------- |
| `secretKey`     | `string`              | Oui    | Clé secrète FedaPay (`sk_live_...`) |
| `environment`   | `"sandbox" \| "live"` | Non    | `"sandbox"` par défaut              |
| `webhookSecret` | `string`              | Non    | Secret pour valider les signatures  |

### `client.transactions`

| Méthode                       | Description                                      |
| ----------------------------- | ------------------------------------------------ |
| `create(input)`               | Crée une transaction, retourne `{ transactionId, paymentUrl }` |
| `get(id)`                     | Récupère une `Transaction`                       |
| `list(params?)`               | Liste les transactions, retourne `{ transactions, meta }` |
| `createPaymentToken(id)`      | Génère un token de paiement, retourne `{ token, paymentUrl }` |

### `client.customers`

| Méthode           | Description                        |
| ----------------- | ---------------------------------- |
| `create(input)`   | Crée un `Customer`                 |
| `get(id)`         | Récupère un `Customer`             |
| `list(params?)`   | Liste les customers                |
| `update(id, input)` | Met à jour un `Customer`         |
| `delete(id)`      | Supprime un customer               |

### `client.payouts`

| Méthode           | Description                                              |
| ----------------- | -------------------------------------------------------- |
| `create(input)`   | Crée un `Payout`                                         |
| `get(id)`         | Récupère un `Payout`                                     |
| `list(params?)`   | Liste les payouts                                        |
| `send(items)`     | Déclenche l'envoi — `items: { id, scheduledAt? }[]`     |

**Modes supportés :** `mtn_open`, `moov`, `mtn_ci`, `moov_tg`, `togocel`, `wave_ci`, `orange_ci`, `wave_sn`, `orange_sn`, `orange_bf`, `moov_bf`, `mtn_open_gn`, `moov_ci`

### `client.webhooks`

| Méthode              | Description                                            |
| -------------------- | ------------------------------------------------------ |
| `create(input)`      | Crée un `Webhook`                                      |
| `get(id)`            | Récupère un `Webhook`                                  |
| `list(params?)`      | Liste les webhooks                                     |
| `update(id, input)`  | Met à jour un `Webhook`                                |
| `delete(id)`         | Supprime un webhook                                    |
| `listEventTypes()`   | Retourne `{ id, name }[]` — types d'événements disponibles |

**Champs de `CreateWebhookInput` / `UpdateWebhookInput` :**

| Champ             | Type                     | Description                                      |
| ----------------- | ------------------------ | ------------------------------------------------ |
| `url`             | `string`                 | URL de destination                               |
| `enabled`         | `boolean`                | Activer/désactiver                               |
| `sslVerify`       | `boolean`                | Vérification SSL                                 |
| `disableOnError`  | `boolean`                | Désactivation automatique après échec            |
| `eventTypeIds`    | `number[]`               | IDs des événements à recevoir (tous par défaut) — voir `listEventTypes()` |
| `httpHeaders`     | `Record<string, string>` | Headers personnalisés ajoutés à chaque requête   |

### `client.balances`

| Méthode     | Description              |
| ----------- | ------------------------ |
| `get(id)`   | Récupère une `Balance`   |
| `list()`    | Liste toutes les balances |

### `client.events`

| Méthode       | Description            |
| ------------- | ---------------------- |
| `get(id)`     | Récupère un `Event`    |
| `list(params?)` | Liste les événements |

### `client.verifyWebhookSignature(rawBody, header)`

Vérifie la signature HMAC-SHA256 du webhook. Rejette les requêtes de plus de 5 minutes (tolérance anti-rejeu). Retourne `true` si la signature est valide, `false` sinon.

## Environnements

| Environnement | URL de base                          |
| ------------- | ------------------------------------ |
| `sandbox`     | `https://sandbox-api.fedapay.com/v1` |
| `live`        | `https://api.fedapay.com/v1`         |

## Prérequis

- Node.js >= 18

## Licence

MIT
