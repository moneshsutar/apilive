# API Results Platform — Architecture, Workflows & Technical Documentation

A production-grade B2B SaaS platform for delivering real-time market API results directly to client HTTPS webhooks. Built with a decoupled architecture featuring a **Next.js 16 (React 19)** frontend, an **Express.js (Node.js)** secure backend, **Firebase Authentication & Firestore Database**, and the **IMB UPI Payment Gateway**.

---

## Table of Contents

1. [System Architecture Overview](#system-architecture-overview)
2. [Security Architecture & Design Principles](#security-architecture--design-principles)
3. [Database & Firestore Schema Design](#database--firestore-schema-design)
4. [File-by-File Breakdown & Analysis](#file-by-file-breakdown--analysis)
   - [Backend Architecture & Files](#backend-architecture--files)
   - [Frontend Architecture & Files](#frontend-architecture--files)
5. [End-to-End Payment & Subscription Flow](#end-to-end-payment--subscription-flow)
6. [Webhook Delivery & Market Integration Flow](#webhook-delivery--market-integration-flow)
7. [Admin & Subscription Expiration Engine](#admin--subscription-expiration-engine)
8. [Setup, Deployment & Environment Configuration](#setup-deployment--environment-configuration)

---

## System Architecture Overview

```mermaid
flowchart TD
    subgraph Client ["Frontend (Next.js 16 / React 19)"]
        UI["Tailored UI / CSS System"]
        AuthCtx["AuthContext (Firebase Client SDK)"]
        APILayer["API Helper (app/lib/api.js)"]
    end

    subgraph AuthGateway ["Firebase Authentication"]
        FBAuth["Firebase Auth Service\n(Email/Password + Custom Claims)"]
    end

    subgraph Server ["Backend (Express.js / Node.js)"]
        Index["Express Server (src/index.js)"]
        MW_Auth["Auth Middleware (verifyIdToken)"]
        MW_Admin["Admin Middleware (claims.admin)"]
        
        subgraph Services ["Core Services"]
            SubSvc["Subscription Service"]
            PaySvc["Payment Service"]
            WebSvc["Webhook Validation Service"]
        end

        subgraph Routes ["API Endpoints"]
            R_Auth["/api/auth"]
            R_Plans["/api/plans"]
            R_Subs["/api/subscriptions"]
            R_Pay["/api/payments"]
            R_Hooks["/api/webhooks"]
            R_Admin["/api/admin"]
        end
    end

    subgraph External ["External Services"]
        IMB["IMB UPI Payment Gateway (api.imbpay.in)"]
        ClientWebhooks["Client Webhook Targets (HTTPS)"]
    end

    subgraph Database ["Google Cloud Firestore"]
        FS_Users["users"]
        FS_Plans["plans"]
        FS_Subs["subscriptions"]
        FS_Orders["paymentOrders"]
        FS_Payments["payments"]
        FS_Events["paymentEvents"]
        FS_Webhooks["webhookConfigs"]
        FS_TodayMoney["todaymoney"]
        FS_Counters["counters"]
    end

    %% Client Interactions
    UI --> AuthCtx
    AuthCtx --> FBAuth
    UI --> APILayer
    APILayer -- "Bearer ID Token" --> Index

    %% Express Routing & Middleware
    Index --> MW_Auth
    MW_Auth --> MW_Admin
    MW_Auth --> Routes

    %% Route to Service Connections
    R_Auth --> Database
    R_Plans --> Database
    R_Subs --> SubSvc
    R_Pay --> PaySvc
    R_Hooks --> WebSvc
    R_Admin --> SubSvc
    R_Admin --> Database

    %% Service to DB
    SubSvc --> Database
    PaySvc --> Database
    WebSvc --> ClientWebhooks

    %% Payment Gateway
    PaySvc -- "POST /api/create-order" --> IMB
    IMB -- "Webhook Callback (POST)" --> R_Pay
```

---

## Security Architecture & Design Principles

1. **Zero Client-Side Database Access**:
   - The frontend Firebase SDK is configured **strictly for Authentication**.
   - No direct Firestore read/write operations occur in the browser. Every data interaction is routed through the Express REST API.
2. **Authoritative Server-Side Pricing & Calculations**:
   - The frontend never submits price amounts or subscription expiration dates.
   - Prices are loaded directly from the Firestore `plans` collection on the server.
   - Subscription end dates are computed by `subscription.js` on the backend using UTC/server time.
3. **Tamper-Proof Admin Authorization**:
   - The admin role is governed through **Firebase Custom Claims** (`admin: true`), managed by privileged server-side scripts (`setAdmin.js`) via the Firebase Admin SDK.
   - It cannot be altered by modifying documents in Firestore.
4. **SSRF-Protected Webhooks**:
   - Webhook URLs are strictly validated: HTTPS required, credentials forbidden, private IPs (`10.0.0.0/8`, `192.168.0.0/16`, `172.16.0.0/12`, `127.0.0.1`, `::1`, link-local, `.local`, `.internal`) blocked.
5. **Idempotent Webhook Processing**:
   - Gateway callbacks record raw events in `paymentEvents`.
   - Orders check whether they are already marked `paid` or `success` to prevent double crediting or duplicate subscription extensions.
6. **Production DevTools Protection**:
   - `DevToolsBlocker.js` disables context menu (right click), dev tools shortcuts (`F12`, `Ctrl+Shift+I/J/C`, `Ctrl+U`), and monitors viewport dimensions in production builds.

---

## Database & Firestore Schema Design

| Collection | Document ID | Purpose / Schema Description |
| :--- | :--- | :--- |
| **`users`** | Firebase `uid` | User profile data: `{ email, displayName, phone (10-digit), status: 'active', currentSubscriptionId, createdAt, updatedAt }` |
| **`plans`** | `monthly`, `six_month`, `yearly` | Plan catalogue: `{ id, name, durationMonths, price, currency: 'INR', isActive: true, features: [] }` |
| **`subscriptions`** | `sub_<timestamp>_<random>` | User subscription instances: `{ userId, planId, planNameSnapshot, durationMonths, priceSnapshot, currencySnapshot, status ('pending'\|'active'\|'expired'\|'payment_failed'), startDate, endDate, paymentId, orderId, createdAt, updatedAt }` |
| **`paymentOrders`** | Gateway `order_id` (e.g., `txn_<timestamp>`) | Initiated gateway payment orders: `{ userId, subscriptionId, planId, amount, currency, gateway: 'imb_upi', gatewayOrderId, order_id, customer_name, customer_email, customer_mobile, status, paymentstatus, createdAt, updatedAt }` |
| **`payments`** | `pay_<timestamp>_<random>` | Immutable successful payment records: `{ userId, orderId, gatewayOrderId, gateway: 'imb_upi', gatewayTransactionId, utr, amount, currency, status: 'success', paymentstatus: 'success', paymentResponse, paymentReceivedDate (DD-MM-YYYY), paymentReceivedTime (hh:mm A), receiptNumber, planName, durationMonths, paidAt, createdAt, updatedAt }` |
| **`paymentEvents`** | `evt_<orderId>_<timestamp>` | Raw incoming gateway webhook logs for audit and replay: `{ gateway, orderId, order_id, eventType, rawPayload, receivedAt }` |
| **`webhookConfigs`** | User `uid` | User-configured API destination endpoints: `{ userId, openResultWebhook: { url }, closeResultWebhook: { url }, status ('active'\|'inactive'), createdAt, updatedAt }` |
| **`todaymoney`** | `DD-MM-YYYY` (IST) | Daily financial aggregations: `{ date, todaysgetwaydeposite: FieldValue.increment(amount), updatedAt }` |
| **`counters`** | `receipts` | Atomic transaction counter used to issue sequential receipts: `{ count: integer }` |
| **`adminAuditLogs`** | Auto-generated ID | Logs administrative actions such as manual expiry jobs: `{ action, performedBy, result, createdAt }` |

---

## File-by-File Breakdown & Analysis

### Backend Architecture & Files

The backend is built with **Node.js**, **Express.js**, and the **Firebase Admin SDK**.

#### 1. Configuration & Server Setup
- [backend/package.json](file:///c:/Users/mones/Desktop/prathmesh1/backend/package.json): Defines backend dependencies (`express`, `firebase-admin`, `axios`, `cors`, `helmet`, `express-rate-limit`, `validator`, `uuid`, `dotenv`) and startup/seeding npm scripts.
- [backend/src/index.js](file:///c:/Users/mones/Desktop/prathmesh1/backend/src/index.js): Main Express entry point. Configures Helmet HTTP headers, CORS with credentials for `FRONTEND_URL`, JSON and URL-encoded body parsing (10MB limit), health check route (`/api/health`), mounts all modular API routers, and registers global 404 and 500 error handlers.
- [backend/src/config/firebase.js](file:///c:/Users/mones/Desktop/prathmesh1/backend/src/config/firebase.js): Initializes the Firebase Admin SDK. Supports loading credentials via `serviceAccountKey.json`, `GOOGLE_APPLICATION_CREDENTIALS`, or granular environment variables (`FIREBASE_PROJECT_ID`, `FIREBASE_CLIENT_EMAIL`, `FIREBASE_PRIVATE_KEY`). Exports `admin`, `db` (Firestore), and `auth`.

#### 2. Middleware
- [backend/src/middleware/auth.js](file:///c:/Users/mones/Desktop/prathmesh1/backend/src/middleware/auth.js): Intercepts `Authorization: Bearer <token>`, decodes and validates Firebase ID tokens via `auth.verifyIdToken(idToken)`. Populates `req.user` with `{ uid, email, emailVerified, admin, displayName }`. Returns 401 on expired or invalid tokens.
- [backend/src/middleware/admin.js](file:///c:/Users/mones/Desktop/prathmesh1/backend/src/middleware/admin.js): Secondary guard applied after `authenticate`. Checks `req.user.admin === true`. Returns 403 Forbidden if the user lacks the custom admin claim.

#### 3. Services (Core Business Logic)
- [backend/src/services/payment.js](file:///c:/Users/mones/Desktop/prathmesh1/backend/src/services/payment.js):
  - `createPaymentOrder(userId, subscriptionId, planId)`: Fetches authoritative plan pricing from Firestore, verifies pending subscription ownership, prepares customer details, generates `gatewayOrderId` (`txn_<timestamp>`), dispatches URL-encoded POST to `https://api.imbpay.in/api/create-order` with the user token and redirect URL (`/dashboard/payments?paid=1`), and saves `paymentOrders` document.
  - `processPaymentWebhook(payload)`: Receives incoming gateway postback, validates existence of order, enforces idempotency (ignoring already successful orders), records raw payload in `paymentEvents`, computes IST date & 12-hour format time, creates immutable `payments` document, generates sequential receipt ID (`REC-YYYY-NNNNNN`), marks `paymentOrders` as paid, invokes `activateSubscription`, and increments daily revenue in `todaymoney/<DD-MM-YYYY>`.
  - `generateReceiptNumber()`: Uses a Firestore transaction on `counters/receipts` to increment counter and format as `REC-YYYY-000001`.
  - `getPaymentHistory(userId, limit, startAfterDoc)`: Returns paginated user payment records sorted by `createdAt desc`.
  - `getPaymentReceipt(paymentId, userId)`: Fetches receipt ensuring user ownership.
- [backend/src/services/subscription.js](file:///c:/Users/mones/Desktop/prathmesh1/backend/src/services/subscription.js):
  - `createSubscription(userId, planId, startDate)`: Validates plan existence and availability, parses `startDate` (rejects past dates), calculates `endDate` (`startDate + durationMonths` minus 1 second), and creates a `pending` subscription document.
  - `activateSubscription(subscriptionId, paymentId, orderId)`: Uses a Firestore atomic batch to set subscription status to `active`, assigns `paymentId` and `orderId`, and updates `users/<uid>.currentSubscriptionId` for fast single-document lookups.
  - `getCurrentSubscription(userId)`: Reads user document's `currentSubscriptionId` pointer, verifies expiration date against current timestamp, and returns active subscription.
  - `getSubscriptionHistory(userId, limit, startAfterDoc)`: Queries user subscriptions sorted by `createdAt desc`.
  - `expireSubscriptions()`: Scans for active subscriptions where `endDate < now` and updates status to `expired` in a batch.
- [backend/src/services/webhook.js](file:///c:/Users/mones/Desktop/prathmesh1/backend/src/services/webhook.js):
  - `validateWebhookUrl(webhookUrl)`: Validates syntax, enforces HTTPS protocol, blocks embedded credentials (`user:pass@host`), and blocks internal hostnames (`localhost`, `0.0.0.0`, `::1`, `.local`, `.internal`) as well as private CIDR IP blocks to prevent SSRF vulnerabilities.
  - `isPrivateIP(ip)`: Helper regex/range checker for IPv4 and IPv6 private spaces.

#### 4. API Routes
- [backend/src/routes/auth.js](file:///c:/Users/mones/Desktop/prathmesh1/backend/src/routes/auth.js):
  - `POST /api/auth/register`: Authenticated route called immediately after Firebase signup to create user document in `users/<uid>` with validated 10-digit mobile number and name.
  - `GET /api/auth/profile`: Returns authenticated user document.
- [backend/src/routes/plans.js](file:///c:/Users/mones/Desktop/prathmesh1/backend/src/routes/plans.js):
  - `GET /api/plans`: Public route returning all active plans sorted in-memory by duration months.
- [backend/src/routes/subscriptions.js](file:///c:/Users/mones/Desktop/prathmesh1/backend/src/routes/subscriptions.js):
  - `POST /api/subscriptions/create`: Initiates pending subscription.
  - `GET /api/subscriptions/current`: Fetches currently active subscription.
  - `GET /api/subscriptions/history`: Returns paginated subscription history.
- [backend/src/routes/payments.js](file:///c:/Users/mones/Desktop/prathmesh1/backend/src/routes/payments.js):
  - `POST /api/payments/create-order`: Authenticated endpoint to generate UPI order.
  - `POST /api/payments/webhook` & `POST /api/payments/upi-webhook`: Unauthenticated gateway callback endpoint handling JSON and urlencoded data from IMB Pay.
  - `GET /api/payments/history`: User payment list.
  - `GET /api/payments/receipt/:paymentId`: Payment receipt details.
- [backend/src/routes/webhooks.js](file:///c:/Users/mones/Desktop/prathmesh1/backend/src/routes/webhooks.js):
  - `GET /api/webhooks`: Returns client's configured open/close webhook endpoints.
  - `PUT /api/webhooks`: Validates and saves open/close webhook URLs to `webhookConfigs/<uid>`.
- [backend/src/routes/admin.js](file:///c:/Users/mones/Desktop/prathmesh1/backend/src/routes/admin.js): Protected by `authenticate` and `requireAdmin`.
  - `GET /api/admin/stats`: Calculates total users, active/expired subscriptions, total payments, and gross revenue in INR.
  - `GET /api/admin/users`: Paginated user list with status filtering and nested current subscription metadata.
  - `GET /api/admin/subscriptions`: Paginated subscription list filtered by `active`, `expired`, or `pending`.
  - `POST /api/admin/expire-subscriptions`: Manual trigger to run expiration engine and write audit log to `adminAuditLogs`.

#### 5. Operational Scripts
- [backend/src/scripts/seedPlans.js](file:///c:/Users/mones/Desktop/prathmesh1/backend/src/scripts/seedPlans.js): Seeds the 3 canonical plans (`monthly` @ ₹1,999, `six_month` @ ₹9,999, `yearly` @ ₹17,999) into Firestore.
- [backend/src/scripts/setAdmin.js](file:///c:/Users/mones/Desktop/prathmesh1/backend/src/scripts/setAdmin.js): Command-line tool to assign `{ admin: true }` Firebase Custom User Claim to any target Firebase UID.

---

### Frontend Architecture & Files

Built with **Next.js 16 (App Router)**, **React 19**, and a bespoke vanilla CSS design system.

#### 1. Core Config & Providers
- [frontend/package.json](file:///c:/Users/mones/Desktop/prathmesh1/frontend/package.json): Dependencies: `next@16.3.5`, `react@19.2.8`, `firebase@12.19.0`.
- [frontend/app/layout.js](file:///c:/Users/mones/Desktop/prathmesh1/frontend/app/layout.js): Root layout wrapping application in `AuthProvider`, mounting `DevToolsBlocker`, and rendering top-level `Navbar`.
- [frontend/app/globals.css](file:///c:/Users/mones/Desktop/prathmesh1/frontend/app/globals.css): Unified design system tokens (colors, typography, elevation, glassmorphism, responsive grids, buttons, tables, badges, animations).
- [frontend/app/lib/firebase-client.js](file:///c:/Users/mones/Desktop/prathmesh1/frontend/app/lib/firebase-client.js): Initializes Firebase client app using public configuration environment variables (`NEXT_PUBLIC_FIREBASE_*`). Exports initialized client `auth`.
- [frontend/app/lib/auth-context.js](file:///c:/Users/mones/Desktop/prathmesh1/frontend/app/lib/auth-context.js): React Context (`AuthContext`, `useAuth`) listening to `onAuthStateChanged`. Extracts token claims via `getIdTokenResult()` to expose `isAdmin`. Provides `signUp`, `signIn`, `signOut`, and `getToken()`.
- [frontend/app/lib/api.js](file:///c:/Users/mones/Desktop/prathmesh1/frontend/app/lib/api.js): Centralized API client abstraction. Appends `Authorization: Bearer <token>` to request headers and handles JSON responses and error parsing for all auth, plan, subscription, payment, webhook, and admin endpoints.

#### 2. Reusable UI Components
- [frontend/app/components/Navbar.js](file:///c:/Users/mones/Desktop/prathmesh1/frontend/app/components/Navbar.js): Responsive top navigation bar. Displays logo, dashboard routes (`Plans`, `Payments`, `Webhooks`, `Admin`), user avatar profile shortcut (`/dashboard`), and Sign In / Sign Out actions. Automatically hides on auth routes.
- [frontend/app/components/ProtectedRoute.js](file:///c:/Users/mones/Desktop/prathmesh1/frontend/app/components/ProtectedRoute.js): Route wrapper that checks auth state and redirects unauthenticated visitors to `/auth/signin`.
- [frontend/app/components/AdminRoute.js](file:///c:/Users/mones/Desktop/prathmesh1/frontend/app/components/AdminRoute.js): Guard component that verifies user authentication and `isAdmin === true`, redirecting non-admins to `/dashboard`.
- [frontend/app/components/PlanCard.js](file:///c:/Users/mones/Desktop/prathmesh1/frontend/app/components/PlanCard.js): Presentational pricing card with feature list, calculated monthly breakdown, popularity badge, and plan selection handler.
- [frontend/app/components/PaymentSuccessModal.js](file:///c:/Users/mones/Desktop/prathmesh1/frontend/app/components/PaymentSuccessModal.js): High-impact success modal triggered upon payment verification. Displays amount, UTR reference, receipt shortcut, and direct call-to-action to configure webhooks.
- [frontend/app/components/AvailableMarkets.js](file:///c:/Users/mones/Desktop/prathmesh1/frontend/app/components/AvailableMarkets.js): Searchable schedule displaying 16+ market games (e.g., Kalyan, Milan Morning, Rajdhani, Time Bazar, Main Bazar) with designated Open and Close result delivery time windows.
- [frontend/app/components/DevToolsBlocker.js](file:///c:/Users/mones/Desktop/prathmesh1/frontend/app/components/DevToolsBlocker.js): Production-only security guard blocking inspection keybindings and right-click context menus.

#### 3. Pages & User Interfaces
- [frontend/app/page.js](file:///c:/Users/mones/Desktop/prathmesh1/frontend/app/page.js): Public landing page with hero banner, live market schedule preview, feature highlights, and call-to-action buttons.
- [frontend/app/auth/signin/page.js](file:///c:/Users/mones/Desktop/prathmesh1/frontend/app/auth/signin/page.js): User login interface with password visibility toggle, Firebase authentication error handling, and redirection to `/dashboard`.
- [frontend/app/auth/signup/page.js](file:///c:/Users/mones/Desktop/prathmesh1/frontend/app/auth/signup/page.js): Two-step registration page: creates Firebase user credentials, then immediately invokes `POST /api/auth/register` to save display name and 10-digit mobile number in Firestore.
- [frontend/app/dashboard/page.js](file:///c:/Users/mones/Desktop/prathmesh1/frontend/app/dashboard/page.js): Overview dashboard displaying current subscription status (active/expired badges, days remaining, dates), configured webhook preview, market schedule, quick actions, and real-time payment success modal.
- [frontend/app/dashboard/plans/page.js](file:///c:/Users/mones/Desktop/prathmesh1/frontend/app/dashboard/plans/page.js): Plan catalog displaying available subscription tiers fetched from backend. Navigates to checkout upon selection.
- [frontend/app/dashboard/checkout/page.js](file:///c:/Users/mones/Desktop/prathmesh1/frontend/app/dashboard/checkout/page.js): Two-column checkout page allowing users to pick a start date, view computed end date and summary, create pending subscription and payment orders, and redirect to the UPI gateway.
- [frontend/app/dashboard/payments/page.js](file:///c:/Users/mones/Desktop/prathmesh1/frontend/app/dashboard/payments/page.js): Payment history table with 5-second polling for real-time verification, receipt viewer modal, pagination, and success notifications.
- [frontend/app/dashboard/webhooks/page.js](file:///c:/Users/mones/Desktop/prathmesh1/frontend/app/dashboard/webhooks/page.js): Client webhook configuration form for entering HTTPS Open and Close result endpoints with validation feedback.
- [frontend/app/admin/page.js](file:///c:/Users/mones/Desktop/prathmesh1/frontend/app/admin/page.js): Admin control panel displaying platform metrics (users, active/expired subscriptions, revenue) and trigger button for subscription expiry.
- [frontend/app/admin/users/page.js](file:///c:/Users/mones/Desktop/prathmesh1/frontend/app/admin/users/page.js): Paginated table of registered users with status filtering and subscription plan status indicators.
- [frontend/app/admin/subscriptions/page.js](file:///c:/Users/mones/Desktop/prathmesh1/frontend/app/admin/subscriptions/page.js): Paginated subscription viewer with tabs for Active, Expired, and Pending states.

---

## End-to-End Payment & Subscription Flow

The payment and subscription architecture operates with server-controlled pricing, third-party UPI integration, asynchronous webhooks, and real-time frontend acknowledgement.

```mermaid
sequenceDiagram
    autonumber
    actor User as Client User
    participant Front as Frontend (Next.js)
    participant API as Express API
    participant SubSvc as Subscription Service
    participant PaySvc as Payment Service
    participant DB as Cloud Firestore
    participant Gateway as IMB UPI Gateway (api.imbpay.in)

    %% Step 1: User selects plan
    User->>Front: Select Plan & Start Date
    Front->>API: POST /api/subscriptions/create { planId, startDate } (Bearer Token)
    API->>SubSvc: createSubscription(uid, planId, startDate)
    SubSvc->>DB: Read plans/{planId} (Authoritative Price & Duration)
    SubSvc->>DB: Insert subscriptions/{subId} (status: 'pending')
    SubSvc-->>Front: Return subscriptionId

    %% Step 2: Create payment order
    Front->>API: POST /api/payments/create-order { subscriptionId, planId }
    API->>PaySvc: createPaymentOrder(uid, subscriptionId, planId)
    PaySvc->>DB: Validate subscriptions/{subId} & plans/{planId}
    PaySvc->>Gateway: POST /api/create-order (amount, user_token, order_id, redirect_url)
    Gateway-->>PaySvc: Return payment_url & gateway details
    PaySvc->>DB: Insert paymentOrders/{orderId} (status: 'pending')
    PaySvc->>DB: Update subscriptions/{subId} with orderId
    PaySvc-->>Front: Return { payment_url }

    %% Step 3: Redirection & Payment
    Front->>Gateway: Redirect browser to payment_url
    User->>Gateway: Scans UPI QR / Pays via UPI App (GPay/PhonePe/Paytm)
    Gateway->>Front: Redirects to /dashboard/payments?paid=1

    %% Step 4: Webhook callback from Gateway
    Gateway->>API: POST /api/payments/webhook { status: 'SUCCESS', order_id, result: { utr, amount } }
    API->>PaySvc: processPaymentWebhook(payload)
    PaySvc->>DB: Check idempotency on paymentOrders/{orderId}
    PaySvc->>DB: Log paymentEvents/{eventId}
    PaySvc->>DB: Transaction on counters/receipts -> Generate REC-YYYY-NNNNNN
    PaySvc->>DB: Insert payments/{payId} (status: 'success', utr, receiptNumber)
    PaySvc->>DB: Update paymentOrders/{orderId} (status: 'paid')
    PaySvc->>SubSvc: activateSubscription(subId, payId, orderId)
    SubSvc->>DB: Batch update subscriptions/{subId} (status: 'active')
    SubSvc->>DB: Batch update users/{uid} (currentSubscriptionId: subId)
    PaySvc->>DB: Increment todaymoney/{DD-MM-YYYY}.todaysgetwaydeposite

    %% Step 5: Frontend Polling & Modal
    loop Every 5s (in Payments Page) or on Dashboard load
        Front->>API: GET /api/payments/history or /api/subscriptions/current
        API-->>Front: Returns updated active status & payment
    end
    Front->>User: Displays PaymentSuccessModal 🎉 with UTR & Receipt
```

### Detailed Lifecycle Steps

1. **Plan & Date Selection**:
   The user browses `/dashboard/plans` and selects a plan (1 Month, 6 Months, 1 Year). At `/dashboard/checkout`, the user picks their start date.
2. **Server-Side Order & Subscription Initialization**:
   - `POST /api/subscriptions/create`: The backend computes the exact `endDate` based on `plan.durationMonths` and creates a `pending` subscription document.
   - `POST /api/payments/create-order`: The backend queries `plans/{planId}` for the authentic price, issues an API call to IMB UPI Gateway (`https://api.imbpay.in/api/create-order`), creates a `paymentOrders` document, and attaches the `orderId` to the subscription.
3. **UPI Payment Execution**:
   The user's browser redirects to the secure IMB UPI checkout page. Once payment completes via any UPI app (PhonePe, Google Pay, Paytm, etc.), the user is redirected to `/dashboard/payments?paid=1`.
4. **Gateway Webhook & Subscription Activation**:
   - The IMB gateway dispatches a server-to-server HTTP POST to `/api/payments/webhook` or `/api/payments/upi-webhook`.
   - `processPaymentWebhook()` verifies the order ID and checks idempotency so duplicate webhooks are discarded.
   - Raw payload is archived into `paymentEvents`.
   - Sequential receipt number (`REC-YYYY-NNNNNN`) is generated via atomic transaction.
   - A new immutable record is inserted into `payments`.
   - An atomic batch commits: updates `subscriptions/{subId}` to `status: 'active'` and updates `users/{uid}.currentSubscriptionId = subId`.
   - `todaymoney/{DD-MM-YYYY}` is incremented by the transaction amount for IST revenue accounting.
5. **Real-Time Client Detection**:
   The frontend detects the new active subscription either via URL parameter `paid=1`, sessionStorage acknowledgement verification, or 5-second polling on `/dashboard/payments`. The `PaymentSuccessModal` is shown with the transaction's UTR, receipt, and an immediate link to configure webhooks.

---

## Webhook Delivery & Market Integration Flow

Once a subscription is active, users can configure endpoints to receive real-time market data.

1. **Client Configuration**:
   - At `/dashboard/webhooks`, users enter two URLs:
     - **Open Result Webhook**: Dispatched when market opening numbers are announced.
     - **Close Result Webhook**: Dispatched when market closing numbers are announced.
   - Client and server enforce strict HTTPS protocols and reject private IP ranges (preventing SSRF).
2. **Delivery Windows**:
   - Results are dispatched according to the designated market schedule:
     - *KARNATAKA DAY*: Open 10:25 AM – 10:59 AM \| Close 11:25 AM – 11:59 AM
     - *SRIDEVI*: Open 11:45 AM – 11:59 AM \| Close 12:45 PM – 12:59 PM
     - *TIME BAZAR*: Open 01:11 PM – 01:41 PM \| Close 02:11 PM – 02:41 PM
     - *KALYAN*: Open 04:00 PM – 04:40 PM \| Close 06:00 PM – 06:40 PM
     - *MAIN BAZAR*: Open 09:58 PM – 10:25 PM \| Close 12:05 AM – 12:35 AM (Next Day)
     - *(and additional markets listed in `AvailableMarkets.js`)*

---

## Admin & Subscription Expiration Engine

### Custom Claims RBAC
- Admin privileges are verified using Firebase custom claims (`req.user.admin === true`).
- To grant admin access to a user:
  ```bash
  npm run set:admin -- <firebase-uid>
  ```
  *(Or: `node src/scripts/setAdmin.js <firebase-uid>` inside `backend/`)*

### Expiration Engine
- Subscriptions store an explicit `endDate` timestamp.
- The `expireSubscriptions()` service method queries active subscriptions where `endDate < now` and updates their status to `expired` in atomic batches.
- This can be triggered:
  1. Manually via the Admin Dashboard (`POST /api/admin/expire-subscriptions`).
  2. Automatically by configuring a Google Cloud Scheduler cron or Cloud Function to ping the endpoint.
  3. Dynamic client-side fallback: `getCurrentSubscription` checks if `endDate < now` and returns `effectiveStatus: 'expired'`.

---

## Setup, Deployment & Environment Configuration

### Prerequisites
- **Node.js**: v18.0.0 or higher
- **Firebase Project**: With Authentication (Email/Password) and Cloud Firestore enabled.
- **IMB UPI Merchant Account**: Providing API credentials and webhook integration.

---

### Backend Configuration (`backend/.env`)

```ini
# Firebase Credentials
# Option 1: Relative or absolute path to Service Account JSON
GOOGLE_APPLICATION_CREDENTIALS=./serviceAccountKey.json

# Option 2: Individual variables (for cloud/Docker environments)
# FIREBASE_PROJECT_ID=your-project-id
# FIREBASE_CLIENT_EMAIL=your-client-email
# FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n..."

# Server
PORT=5000
NODE_ENV=development

# Frontend URL (for CORS)
FRONTEND_URL=http://localhost:3000

# Payment Gateway (IMB UPI)
PAYMENT_GATEWAY_KEY=your_imb_user_token
PAYMENT_GATEWAY_SECRET=your_gateway_secret
PAYMENT_WEBHOOK_SECRET=your_webhook_verification_secret
```

---

### Frontend Configuration (`frontend/.env`)

```ini
# Firebase Client SDK Configuration (Public)
NEXT_PUBLIC_FIREBASE_API_KEY=AIzaSy...
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your-project.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=your-project
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=your-project.firebasestorage.app
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=1234567890
NEXT_PUBLIC_FIREBASE_APP_ID=1:1234567890:web:...

# Backend API Endpoint
NEXT_PUBLIC_API_URL=http://localhost:5000/api
```

---

### Initial Setup & Seeding

1. **Install Dependencies**:
   ```bash
   # Backend
   cd backend
   npm install

   # Frontend
   cd ../frontend
   npm install
   ```

2. **Seed Plans Database**:
   ```bash
   cd backend
   npm run seed:plans
   ```

3. **Grant Admin Role**:
   ```bash
   cd backend
   npm run set:admin -- <your-firebase-user-uid>
   ```

4. **Run Development Servers**:
   ```bash
   # Terminal 1 - Backend (port 5000)
   cd backend
   npm run dev

   # Terminal 2 - Frontend (port 3000)
   cd frontend
   npm run dev
   ```

5. **Production Build**:
   ```bash
   # Backend
   cd backend
   npm start

   # Frontend
   cd frontend
   npm run build
   npm start
   ```

---

## Summary of Key Endpoints

| Method | Route | Protection | Description |
| :--- | :--- | :--- | :--- |
| `GET` | `/api/health` | Public | Backend health check & timestamp |
| `POST` | `/api/auth/register` | Auth | Register user profile with phone & display name |
| `GET` | `/api/auth/profile` | Auth | Get current user profile |
| `GET` | `/api/plans` | Public | Get all active subscription plans |
| `POST` | `/api/subscriptions/create` | Auth | Create pending subscription with calculated `endDate` |
| `GET` | `/api/subscriptions/current` | Auth | Get user's current active subscription |
| `GET` | `/api/subscriptions/history` | Auth | Get user's paginated subscription history |
| `POST` | `/api/payments/create-order` | Auth | Generate IMB UPI payment order & get redirect URL |
| `POST` | `/api/payments/webhook` | Webhook | Gateway callback to verify transaction & activate subscription |
| `GET` | `/api/payments/history` | Auth | Get user's paginated payment records |
| `GET` | `/api/payments/receipt/:id` | Auth | Get payment receipt details |
| `GET` | `/api/webhooks` | Auth | Fetch user's registered webhook endpoints |
| `PUT` | `/api/webhooks` | Auth | Update open/close webhook URLs |
| `POST` | `/api/webhooks/open` | Public / Engine | Dispatch open result to active subscribers & update user `results` with pass/fail |
| `POST` | `/api/webhooks/close` | Public / Engine | Dispatch close result to active subscribers & update user `results` with pass/fail |
| `GET` | `/api/admin/stats` | Admin | Fetch platform KPIs & total revenue |
| `GET` | `/api/admin/users` | Admin | Paginated user management list |
| `GET` | `/api/admin/subscriptions` | Admin | Paginated subscription list (active/expired/pending) |
| `POST` | `/api/admin/expire-subscriptions` | Admin | Manually trigger subscription expiry worker |
| `GET` | `/api/cron/expire-subscriptions` | Public / Cron | Cron-callable endpoint: expires overdue subscriptions & nulls `users/{uid}.currentSubscriptionId` |
| `GET` | `/api/cron/delete-pending` | Public / Cron | Cron-callable endpoint: deletes all pending documents from `subscriptions` and `paymentOrders` |
