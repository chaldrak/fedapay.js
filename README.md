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
  webhookSecret: "whsec_xxxx", // optionnel, requis pour les webhooks
});
```

### Créer une transaction

```ts
const { transactionId, paymentUrl } = await client.createTransaction({
  amount: 5000,
  currency: "XOF", // par défaut
  description: "Commande #42",
  callbackUrl: "https://monsite.com/callback",
  customerEmail: "client@example.com",
  customerFirstName: "Jean",
  customerLastName: "Dupont",
  metadata: { orderId: "42" },
});

// Rediriger le client vers paymentUrl pour effectuer le paiement
```

### Vérifier la signature d'un webhook

```ts
// Express
app.post("/webhook", express.raw({ type: "application/json" }), (req, res) => {
  const isValid = client.verifyWebhookSignature(
    req.body.toString(),
    req.headers["x-fedapay-signature"] as string,
  );

  if (!isValid) {
    return res.status(400).send("Signature invalide");
  }

  // Traiter l'événement…
  res.json({ received: true });
});
```

Vous pouvez aussi utiliser `verifyWebhookSignature` directement sans instancier un client :

```ts
import { verifyWebhookSignature } from "fedapay.js";

const isValid = verifyWebhookSignature(rawBody, signatureHeader, webhookSecret);
```

## API

### `new FedaPayClient(config)`

| Paramètre        | Type                   | Requis | Description                          |
| ---------------- | ---------------------- | ------ | ------------------------------------ |
| `secretKey`      | `string`               | Oui    | Clé secrète FedaPay (`sk_live_...`)  |
| `environment`    | `"sandbox" \| "live"` | Non    | `"sandbox"` par défaut               |
| `webhookSecret`  | `string`               | Non    | Secret pour valider les webhooks     |

### `client.createTransaction(input)`

| Paramètre           | Type                       | Requis | Description                        |
| ------------------- | -------------------------- | ------ | ---------------------------------- |
| `amount`            | `number`                   | Oui    | Montant en centimes                |
| `description`       | `string`                   | Oui    | Description de la transaction      |
| `callbackUrl`       | `string`                   | Oui    | URL de retour après paiement       |
| `currency`          | `string`                   | Non    | `"XOF"` par défaut                 |
| `customerEmail`     | `string`                   | Non    | Email du client                    |
| `customerFirstName` | `string`                   | Non    | Prénom du client                   |
| `customerLastName`  | `string`                   | Non    | Nom du client                      |
| `metadata`          | `Record<string, string>`   | Non    | Données arbitraires                |

Retourne `{ transactionId: string, paymentUrl: string }`.

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
