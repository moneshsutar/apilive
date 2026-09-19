# Webhook Specifications & Documentation

This document contains full technical specifications, payload structures, expected responses, and end-to-end flows for all webhooks supported by the platform:

1. [Payment Gateway Webhook (Incoming)](#1-payment-gateway-webhook-incoming)
2. [Open Result Webhook (Outgoing & Dispatcher)](#2-open-result-webhook)
3. [Close Result Webhook (Outgoing & Dispatcher)](#3-close-result-webhook)

---

## 1. Payment Gateway Webhook (Incoming)

Handles incoming transaction status callbacks from the **IMB UPI Payment Gateway** to verify payments and automatically activate customer subscriptions in real-time.

### Endpoint Details
- **Method**: `POST`
- **URL**: `http://localhost:5000/api/payments/webhook`
- **Alternative URL**: `http://localhost:5000/api/payments/upi-webhook`
- **Production Example**: `https://your-domain.com/api/payments/webhook`
- **Authentication**: None (Publicly callable by the payment gateway server; verified via order matching and idempotency).
- **Content-Type**: `application/json` or `application/x-www-form-urlencoded`

### Request Payload (Data it Takes)

```json
{
  "status": "SUCCESS",
  "order_id": "txn_1726760000000",
  "result": {
    "utr": "426189123456",
    "amount": "1999"
  }
}
```

#### Field Definitions:
| Field | Type | Description |
| :--- | :--- | :--- |
| `status` | string | Payment status: `"SUCCESS"` or `"FAILED"` |
| `order_id` | string | The platform's unique transaction ID generated during checkout |
| `result.utr` | string | Unique 12-digit UPI Transaction Reference (UTR) number |
| `result.amount` | string / number | Amount paid in INR |

---

### Response Sent by Backend

#### On Success:
- **HTTP Status**: `200 OK`
- **Body**: `OK` (or `"Already processed"` if duplicate webhook received)

#### On Missing Order ID:
- **HTTP Status**: `400 Bad Request`
- **Body**: `Missing order_id`

#### On Processing Error:
- **HTTP Status**: `500 Internal Server Error`
- **Body**: `Webhook error`

---

### What this Webhook Does in the System:
1. **Idempotency Guard**: Checks if the order is already marked `paid`; prevents double-crediting.
2. **Audit Trail**: Logs raw incoming payload into `paymentEvents/{eventId}`.
3. **Receipt Generation**: Issues a sequential receipt number (e.g. `REC-2026-000001`) via atomic counter.
4. **Payment Record**: Inserts an immutable record into `payments/{payId}`.
5. **Subscription Activation**: Sets `subscriptions/{subId}.status = "active"` and updates `users/{uid}.currentSubscriptionId = subId`.
6. **Analytics**: Increments daily revenue in `todaymoney/{DD-MM-YYYY}`.

---

## 2. Open Result Webhook

Used to broadcast market **Opening Numbers** (Open Panel + Open Ank) to all subscribed users' configured webhook endpoints.

### A. Dispatching the Result (Backend Engine Route)

- **Method**: `POST`
- **URL**: `http://localhost:5000/api/webhooks/open`
- **Alternative URL**: `http://localhost:5000/api/webhooks/dispatch-open`
- **Content-Type**: `application/json`

#### Request Payload (Data it Takes):
```json
{
  "gameId": 8,
  "openPanel": "123",
  "openAnk": "6",
  "marketName": "KALYAN"
}
```

> **Note**: `marketName` is optional. If omitted, it is automatically resolved from the built-in market schedule based on `gameId`.

---

### B. Outgoing Request Sent to User's Webhook Endpoint

The backend queries all `webhookConfigs` documents, verifies each user has an active subscription (`currentSubscriptionId !== null`), and sends a `POST` request to the client's configured `openResultWebhook.url`:

- **Client Example URL**: `https://client-server.com/api/webhooks/open-result`
- **Method**: `POST`
- **Headers**: `Content-Type: application/json`

#### Payload Delivered to Client:
```json
{
  "gameId": 8,
  "marketName": "KALYAN",
  "openPanel": "123",
  "openAnk": "6",
  "type": "open",
  "timestamp": "2026-09-19T18:15:00.000Z"
}
```

---

### C. Expected Client Response & System Handling

- **Successful Delivery**: Client responds with any **`2xx`** HTTP code (e.g., `200 OK`).
  - Backend marks user result status as: `"pass"`.
- **Failed Delivery**: Client responds with `4xx`, `5xx`, or request times out (8 seconds).
  - Backend marks user result status as: `"fail"`.

#### Firestore User Document Update:
Updates `users/{userId}` with delivery status:
```json
{
  "results": {
    "kalyan_open": "pass",
    "8_open": "pass"
  },
  "rsults": {
    "kalyan_open": "pass",
    "8_open": "pass"
  }
}
```

---

### D. Response Returned by Dispatch Route (`/api/webhooks/open`)

```json
{
  "success": true,
  "message": "Open result processed. Dispatched to 3 active subscriber(s).",
  "gameId": 8,
  "marketName": "KALYAN",
  "openPanel": "123",
  "openAnk": "6",
  "dispatches": [
    {
      "userId": "user_uid_123",
      "targetUrl": "https://client-server.com/api/webhooks/open-result",
      "market": "KALYAN",
      "type": "open",
      "status": "pass",
      "httpStatusCode": 200
    },
    {
      "userId": "user_uid_456",
      "targetUrl": "https://another-client.com/webhook",
      "market": "KALYAN",
      "type": "open",
      "status": "fail",
      "httpStatusCode": 500
    }
  ]
}
```

---

## 3. Close Result Webhook

Used to broadcast market **Closing Numbers** (Close Panel + Close Ank) to all subscribed users' configured webhook endpoints.

### A. Dispatching the Result (Backend Engine Route)

- **Method**: `POST`
- **URL**: `http://localhost:5000/api/webhooks/close`
- **Alternative URL**: `http://localhost:5000/api/webhooks/dispatch-close`
- **Content-Type**: `application/json`

#### Request Payload (Data it Takes):
```json
{
  "gameId": 8,
  "closePanel": "456",
  "closeAnk": "5",
  "marketName": "KALYAN"
}
```

---

### B. Outgoing Request Sent to User's Webhook Endpoint

Sent to each active subscriber's `closeResultWebhook.url`:

- **Client Example URL**: `https://client-server.com/api/webhooks/close-result`
- **Method**: `POST`
- **Headers**: `Content-Type: application/json`

#### Payload Delivered to Client:
```json
{
  "gameId": 8,
  "marketName": "KALYAN",
  "closePanel": "456",
  "closeAnk": "5",
  "type": "close",
  "timestamp": "2026-09-19T20:15:00.000Z"
}
```

---

### C. Expected Client Response & System Handling

- **Successful Delivery**: Client responds with HTTP **`200 OK`** (or any `2xx`).
  - Marked as: `"pass"`.
- **Failed Delivery**: Client responds with `4xx`, `5xx`, or timeout.
  - Marked as: `"fail"`.

#### Firestore User Document Update:
Updates `users/{userId}` with delivery status:
```json
{
  "results": {
    "kalyan_close": "pass",
    "8_close": "pass"
  },
  "rsults": {
    "kalyan_close": "pass",
    "8_close": "pass"
  }
}
```

---

### D. Response Returned by Dispatch Route (`/api/webhooks/close`)

```json
{
  "success": true,
  "message": "Close result processed. Dispatched to 3 active subscriber(s).",
  "gameId": 8,
  "marketName": "KALYAN",
  "closePanel": "456",
  "closeAnk": "5",
  "dispatches": [
    {
      "userId": "user_uid_123",
      "targetUrl": "https://client-server.com/api/webhooks/close-result",
      "market": "KALYAN",
      "type": "close",
      "status": "pass",
      "httpStatusCode": 200
    }
  ]
}
```

---

## Market ID Quick Reference

| Game ID | Market Name | Open Time | Close Time |
| :--- | :--- | :--- | :--- |
| **0** | KARNATAKA DAY | 10:25 AM – 10:59 AM | 11:25 AM – 11:59 AM |
| **1** | MILAN MORNING | 10:39 AM – 10:59 AM | 11:39 AM – 11:59 AM |
| **2** | SRIDEVI | 11:45 AM – 11:59 AM | 12:45 PM – 12:59 PM |
| **3** | TIME BAZAR | 01:11 PM – 01:41 PM | 02:11 PM – 02:41 PM |
| **4** | MADHUR DAY | 01:40 PM – 01:59 PM | 02:40 PM – 02:59 PM |
| **5** | RAJDHANI DAY | 03:18 PM – 03:48 PM | 05:18 PM – 05:48 PM |
| **6** | MILAN DAY | 03:18 PM – 03:48 PM | 05:15 PM – 05:45 PM |
| **7** | SUPREME DAY | 03:50 PM – 04:20 PM | 05:50 PM – 06:20 PM |
| **8** | KALYAN | 04:00 PM – 04:40 PM | 06:00 PM – 06:40 PM |
| **9** | SRIDEVI NIGHT | 07:28 PM – 07:48 PM | 08:28 PM – 08:48 PM |
| **10** | MADHUR NIGHT | 08:40 PM – 08:58 PM | 10:40 PM – 10:58 PM |
| **11** | SUPREME NIGHT | 08:56 PM – 09:24 PM | 10:58 PM – 11:28 PM |
| **12** | MILAN NIGHT | 09:13 PM – 09:43 PM | 11:13 PM – 11:43 PM |
| **14** | RAJDHANI NIGHT | 09:40 PM – 09:58 PM | 11:50 PM – 11:58 PM |
| **15** | MAIN BAZAR | 09:58 PM – 10:25 PM | 12:05 AM – 12:35 AM (Next Day) |
| **16** | MAIN BAZAR MORNING | 11:28 AM – 11:58 AM | 12:28 PM – 12:58 PM |
| **17** | KALYAN NIGHT | 09:43 PM – 09:58 PM | 11:43 PM – 11:58 PM |
