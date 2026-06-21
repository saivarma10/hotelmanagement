# Hotel Management POS — Architecture Document

> Restaurant / F&B POS platform (Petpooja-class competitor).  
> This document describes the **current implementation**, the **target microservices architecture**, and the **full tech stack** required to run the system in development and production.

---

## Table of Contents

1. [Executive Summary](#1-executive-summary)
2. [Current Architecture (Phase 1)](#2-current-architecture-phase-1)
3. [Target Microservices Architecture](#3-target-microservices-architecture)
4. [Microservices Catalog](#4-microservices-catalog)
5. [Data Architecture](#5-data-architecture)
6. [Real-Time & Event Flow](#6-real-time--event-flow)
7. [Client Applications](#7-client-applications)
8. [Tech Stack Reference](#8-tech-stack-reference)
9. [Infrastructure to Run the System](#9-infrastructure-to-run-the-system)
10. [Security & Multi-Tenancy](#10-security--multi-tenancy)
11. [Deployment Topology](#11-deployment-topology)
12. [Phase Roadmap → Services](#12-phase-roadmap--services)

---

## 1. Executive Summary

| Aspect | Today (Phase 1) | Target (Production scale) |
|--------|-----------------|---------------------------|
| Architecture | **Modular monolith** (NestJS) | **Microservices** behind API Gateway |
| Database | Single PostgreSQL | Database-per-service + event sync |
| Frontend | Single React SPA (POS + KDS + Setup) | Multiple apps (POS, KDS, QR, Admin, Captain) |
| Real-time | HTTP polling (5s on KDS) | WebSockets / SSE via Realtime Service |
| Offline POS | Not yet | Local SQLite + sync engine on POS terminal |
| Scale target | 1 outlet, dev/demo | 100K+ outlets (Petpooja-class) |

The codebase today is a **well-structured monolith** with clear domain modules (`auth`, `orders`, `billing`, `kitchen`, etc.). These modules map 1:1 to future microservices boundaries.

---

## 2. Current Architecture (Phase 1)

### 2.1 System Context

```mermaid
flowchart TB
    subgraph Users
        Owner["Owner / Manager"]
        Cashier["Cashier / Waiter"]
        Chef["Kitchen Staff"]
    end

    subgraph Clients
        POS["POS Web App<br/>(React + Vite)<br/>:5173"]
    end

    subgraph Backend
        API["NestJS API<br/>:3000/api"]
    end

    subgraph Data
        PG[("PostgreSQL<br/>:5432")]
    end

    Owner --> POS
    Cashier --> POS
    Chef --> POS

    POS -->|REST + JWT| API
    API --> PG
```

### 2.2 Backend Module Map (Monolith)

```mermaid
flowchart LR
    subgraph NestJS["NestJS Modular Monolith"]
        Auth["auth"]
        Outlets["outlets"]
        Menus["menus"]
        Tables["tables"]
        Orders["orders"]
        Billing["billing"]
        Kitchen["kitchen"]
        Reports["reports"]
        Prisma["prisma"]
        Common["common"]
    end

    Auth --> Prisma
    Outlets --> Prisma
    Menus --> Prisma
    Tables --> Prisma
    Orders --> Prisma
    Billing --> Prisma
    Kitchen --> Prisma
    Reports --> Prisma
    Orders --> Common
    Billing --> Common
    Kitchen --> Common
```

### 2.3 Frontend Page Map

```mermaid
flowchart TB
    subgraph SPA["React SPA (frontend/)"]
        Login["/login"]
        Register["/register"]
        Setup["/setup"]
        Floor["/ — Floor Plan"]
        Order["/orders/:id"]
        Kitchen["/kitchen — KDS"]
        Reports["/reports"]
    end

    Login --> Floor
    Register --> Setup --> Floor
    Floor --> Order
```

### 2.4 Order Lifecycle (Current)

```mermaid
stateDiagram-v2
    [*] --> OPEN: Open table
    OPEN --> KOT_SENT: Send KOT
    KOT_SENT --> KOT_SENT: Add more items + KOT
    KOT_SENT --> BILLED: Settle bill
    OPEN --> CANCELLED: Cancel order
    KOT_SENT --> CANCELLED: Cancel order
    BILLED --> [*]
    CANCELLED --> [*]

    state OrderItem {
        [*] --> PENDING
        PENDING --> SENT_TO_KITCHEN: KOT
        PENDING --> CANCELLED: Remove
        SENT_TO_KITCHEN --> SERVED: KDS Ready
        SENT_TO_KITCHEN --> CANCELLED: Cancel item
        SERVED --> [*]
        CANCELLED --> [*]
    }
```

---

## 3. Target Microservices Architecture

Production target: services aligned with restaurant domain boundaries, similar to how Petpooja scales POS + KDS + aggregators + inventory as separate concerns.

### 3.1 High-Level Microservices Diagram

```mermaid
flowchart TB
    subgraph Clients["Client Layer"]
        POSApp["POS Terminal<br/>(React/Electron)"]
        KDSApp["Kitchen Display<br/>(React PWA)"]
        QRApp["QR Order PWA<br/>(Next.js)"]
        CaptainApp["Captain App<br/>(React Native)"]
        AdminDash["Admin Dashboard<br/>(React)"]
        TokenDisplay["Token Display<br/>(React)"]
    end

    subgraph Edge["Edge Layer"]
        CDN["CDN / CloudFront"]
        Nginx["Nginx / Load Balancer"]
        GW["API Gateway<br/>(Kong / NestJS Gateway)"]
    end

    subgraph Services["Microservices"]
        AuthSvc["Auth Service"]
        TenantSvc["Tenant Service<br/>(Org / Outlet)"]
        MenuSvc["Menu Service"]
        TableSvc["Table Service"]
        OrderSvc["Order Service"]
        KitchenSvc["Kitchen Service"]
        BillingSvc["Billing Service"]
        PaymentSvc["Payment Service"]
        ReportSvc["Report Service"]
        NotifySvc["Notification Service"]
        RealtimeSvc["Realtime Service<br/>(WebSocket)"]
        InventorySvc["Inventory Service"]
        CRMSvc["CRM Service"]
        IntegrationSvc["Integration Hub<br/>(Swiggy, Razorpay…)"]
        SyncSvc["Sync Service<br/>(Offline POS)"]
    end

    subgraph Messaging["Event Bus"]
        Kafka["Apache Kafka<br/>or Redis Streams"]
    end

    subgraph Data["Data Layer"]
        AuthDB[("auth_db")]
        TenantDB[("tenant_db")]
        MenuDB[("menu_db")]
        OrderDB[("order_db")]
        BillingDB[("billing_db")]
        ReportDB[("report_db<br/>read replica / OLAP")]
        Redis[("Redis<br/>cache + pub/sub")]
    end

    Clients --> CDN --> Nginx --> GW

    GW --> AuthSvc
    GW --> TenantSvc
    GW --> MenuSvc
    GW --> TableSvc
    GW --> OrderSvc
    GW --> KitchenSvc
    GW --> BillingSvc
    GW --> PaymentSvc
    GW --> ReportSvc
    GW --> RealtimeSvc

    OrderSvc --> Kafka
    KitchenSvc --> Kafka
    BillingSvc --> Kafka
    Kafka --> ReportSvc
    Kafka --> NotifySvc
    Kafka --> RealtimeSvc

    AuthSvc --> AuthDB
    TenantSvc --> TenantDB
    MenuSvc --> MenuDB
    OrderSvc --> OrderDB
    BillingSvc --> BillingDB
    ReportSvc --> ReportDB

    RealtimeSvc --> Redis
    OrderSvc --> Redis
    SyncSvc --> OrderDB
```

### 3.2 Service Communication Pattern

```mermaid
sequenceDiagram
    participant POS as POS Terminal
    participant GW as API Gateway
    participant Order as Order Service
    participant Kitchen as Kitchen Service
    participant RT as Realtime Service
    participant KDS as Kitchen Display
    participant Bus as Event Bus

    POS->>GW: POST /orders/:id/kot
    GW->>Order: Send KOT
    Order->>Order: Persist KOT + update items
    Order->>Bus: Publish OrderKotSent
    Bus->>Kitchen: Consume event
    Bus->>RT: Push to kitchen channel
    RT->>KDS: WebSocket: new KOT ticket
    KDS->>GW: POST /kitchen/items/:id/ready
    GW->>Kitchen: Mark ready
    Kitchen->>Bus: Publish ItemReady
    RT->>POS: WebSocket: item served
```

---

## 4. Microservices Catalog

| # | Service | Responsibility | Maps from (current monolith) | Own database |
|---|---------|----------------|------------------------------|--------------|
| 1 | **Auth Service** | Login, register, JWT, RBAC, staff users | `auth/` | `auth_db` |
| 2 | **Tenant Service** | Organizations, outlets, GST settings, areas | `outlets/` + org model | `tenant_db` |
| 3 | **Menu Service** | Categories, items, variations, add-ons, pricing | `menus/` | `menu_db` |
| 4 | **Table Service** | Floor plan, table status, reservations (future) | `tables/` | `tenant_db` (shared) or own |
| 5 | **Order Service** | Orders, order items, KOT generation, cancel | `orders/` | `order_db` |
| 6 | **Kitchen Service** | KDS queue, batch prep list, mark ready | `kitchen/` | reads `order_db` or own projection |
| 7 | **Billing Service** | Bill preview, GST, discounts, split bill | `billing/` | `billing_db` |
| 8 | **Payment Service** | Cash/UPI/card recording, Razorpay webhooks | part of `billing/` | `billing_db` |
| 9 | **Report Service** | Day-end sales, item-wise, payment breakdown | `reports/` | `report_db` (CQRS read model) |
| 10 | **Notification Service** | SMS, WhatsApp e-bills, push alerts | *future* | `notify_db` |
| 11 | **Realtime Service** | WebSocket rooms per outlet (POS, KDS, floor) | *replaces polling* | Redis |
| 12 | **Inventory Service** | Stock, recipes, auto-deduction, PO | *Phase 4* | `inventory_db` |
| 13 | **CRM Service** | Customers, loyalty, feedback | *Phase 5* | `crm_db` |
| 14 | **Integration Hub** | Swiggy, Zomato, Tally, delivery partners | *Phase 5* | `integration_db` |
| 15 | **Sync Service** | Offline POS delta sync, conflict resolution | *Phase 1 prod* | coordinates with Order/Menu |

### Monolith → Microservice Extraction Order

```mermaid
gantt
    title Service Extraction Roadmap
    dateFormat YYYY-MM
    section Phase 1
    Modular Monolith (current)     :done, 2026-01, 2026-03
    section Phase 2
    Realtime Service + QR Order    :2026-04, 2026-05
    section Phase 3
    Extract Kitchen + Order        :2026-06, 2026-07
    section Phase 4
    Extract Billing + Payment      :2026-08, 2026-09
    section Phase 5
    Inventory + CRM + Integrations :2026-10, 2026-12
```

---

## 5. Data Architecture

### 5.1 Current ER Model (Single PostgreSQL)

```mermaid
erDiagram
    Organization ||--o{ Outlet : has
    Organization ||--o{ User : employs
    Outlet ||--o{ Area : has
    Outlet ||--o{ Category : has
    Area ||--o{ Table : has
    Category ||--o{ MenuItem : has
    MenuItem ||--o{ Variation : has
    MenuItem ||--o{ Addon : links
    Table ||--o{ Order : receives
    Order ||--o{ OrderItem : contains
    Order ||--o{ Kot : fires
    Order ||--o{ Bill : generates
    Bill ||--o{ Payment : has
    User ||--o{ Order : creates
```

### 5.2 Target: Database Per Service

| Service | Primary entities | Store |
|---------|------------------|-------|
| Auth | User, Role, Session | PostgreSQL |
| Tenant | Organization, Outlet, Area | PostgreSQL |
| Menu | Category, MenuItem, Variation, Addon | PostgreSQL |
| Order | Order, OrderItem, Kot | PostgreSQL |
| Billing | Bill, Payment | PostgreSQL |
| Report | DailySummary, ItemSales (materialized) | PostgreSQL + ClickHouse (optional) |
| Realtime | Socket sessions, presence | Redis |
| Cache | Menu snapshot, floor plan | Redis |

**Cross-service rule:** No direct DB joins across services. Use REST/gRPC for sync calls and Kafka events for async updates.

---

## 6. Real-Time & Event Flow

### 6.1 Domain Events (Target)

| Event | Publisher | Subscribers |
|-------|-----------|-------------|
| `OrderCreated` | Order | Realtime, Report |
| `OrderKotSent` | Order | Kitchen, Realtime, Print |
| `OrderItemCancelled` | Order | Kitchen, Realtime |
| `OrderItemReady` | Kitchen | Order, Realtime, POS |
| `BillSettled` | Billing | Table, Report, CRM |
| `MenuUpdated` | Menu | POS cache, QR app, Sync |

### 6.2 Current vs Target Realtime

| Channel | Current | Target |
|---------|---------|--------|
| KDS refresh | HTTP poll every 5s | WebSocket push |
| Floor plan | HTTP poll every 10s | WebSocket push |
| QR order → POS | Not built | WebSocket + validation flow |

---

## 7. Client Applications

```mermaid
flowchart LR
    subgraph Phase1["Built Now"]
        POS["POS Web SPA<br/>Floor · Order · Bill · Setup · Reports · KDS"]
    end

    subgraph Phase2["Planned"]
        QR["QR Order PWA<br/>Guest mobile menu"]
    end

    subgraph Phase3["Planned"]
        Captain["Captain App<br/>Table-side ordering"]
        KDSStandalone["KDS Fullscreen<br/>Dedicated kitchen tablet"]
    end

    subgraph Phase4["Planned"]
        Admin["Owner Dashboard<br/>Multi-outlet analytics"]
        Kiosk["Self-order Kiosk"]
    end
```

| App | Tech | Users | Port / URL |
|-----|------|-------|------------|
| POS Web SPA | React 18, Vite, Tailwind, TanStack Query | Cashier, waiter, owner | `:5173` |
| Kitchen (embedded in SPA) | Same SPA, `/kitchen` route | Chef | `:5173/kitchen` |
| QR Order PWA | Next.js | Guest | `:3001` |
| Captain App | React Native | Waiter | App Store / APK |
| Admin Dashboard | React | Owner, chain manager | `:5174` |
| POS Desktop (offline) | Electron + SQLite | Cashier | Desktop app |

---

## 8. Tech Stack Reference

### 8.1 Application Stack

| Layer | Technology | Version (current) | Purpose |
|-------|------------|-------------------|---------|
| **API framework** | NestJS | 10.x | REST API, DI, modules |
| **Language** | TypeScript | 5.x | Backend + frontend |
| **ORM** | Prisma | 6.x | Schema, migrations, queries |
| **Database** | PostgreSQL | 14–16 | Primary data store |
| **Frontend** | React | 18.x | UI components |
| **Build tool** | Vite | 6.x | Dev server, bundling |
| **Styling** | Tailwind CSS | 3.x | Utility-first CSS |
| **Data fetching** | TanStack Query | 5.x | Caching, polling, mutations |
| **Routing** | React Router | 7.x | Client-side routes |
| **Auth** | JWT (passport-jwt) | — | Stateless API auth |
| **Validation** | class-validator | — | DTO validation |
| **Password hash** | bcrypt | — | Credential storage |

### 8.2 Target Production Stack (Additions)

| Layer | Technology | Purpose |
|-------|------------|---------|
| API Gateway | Kong / AWS API Gateway / NestJS gateway | Routing, rate limit, auth |
| Message broker | Apache Kafka or Redis Streams | Domain events |
| Cache | Redis 7 | Sessions, menu cache, pub/sub |
| Realtime | Socket.io / ws | KDS + floor live updates |
| Search | Elasticsearch (optional) | Menu search, report drill-down |
| OLAP | ClickHouse (optional) | Large chain analytics |
| Object storage | S3 / MinIO | Bill PDFs, menu images |
| Print service | Node ESC/POS service | Thermal KOT/bill printers |
| Mobile | React Native | Captain app |
| QR app | Next.js PWA | Guest ordering |
| Desktop POS | Electron + SQLite | Offline-first terminal |
| CI/CD | GitHub Actions | Build, test, deploy |
| Containers | Docker + Kubernetes | Service orchestration |
| Observability | Prometheus + Grafana + Loki | Metrics, dashboards, logs |
| Tracing | OpenTelemetry + Jaeger | Distributed tracing |
| Secrets | AWS Secrets Manager / Vault | JWT secret, DB creds |

### 8.3 Integration Stack (Petpooja Parity)

| Integration | Provider | Service owner |
|-------------|----------|---------------|
| UPI / Cards | Razorpay, Paytm | Payment Service |
| Food aggregators | Swiggy, Zomato APIs | Integration Hub |
| SMS / WhatsApp | Twilio, MSG91 | Notification Service |
| Accounting | Tally, SAP | Integration Hub |
| Delivery | Dunzo, Shadowfax | Integration Hub |

---

## 9. Infrastructure to Run the System

### 9.1 Local Development (Minimum)

```mermaid
flowchart LR
    Dev["Developer Machine"]
    PG[("PostgreSQL<br/>localhost:5432")]
    API["NestJS<br/>localhost:3000"]
    WEB["Vite Dev Server<br/>localhost:5173"]

    Dev --> PG
    Dev --> API
    Dev --> WEB
    WEB -->|proxy /api| API
    API --> PG
```

| Component | How to run | Required |
|-----------|------------|----------|
| PostgreSQL 14+ | `brew services start postgresql@14` or Docker | Yes |
| Node.js 20 LTS | `nvm use 20` | Yes |
| Backend API | `cd backend && npm run start:dev` | Yes |
| Frontend | `cd frontend && npm run dev` | Yes |
| Docker | `docker compose up -d` (optional) | No |

**Environment variables (backend `.env`):**

```env
DATABASE_URL=postgresql://hotel:hotel@localhost:5432/hotelmanagement
JWT_SECRET=<long-random-string>
JWT_EXPIRES_IN=24h
PORT=3000
CORS_ORIGIN=http://localhost:5173
```

### 9.2 Staging / Single-Server Production

```mermaid
flowchart TB
    subgraph Server["Single VM / EC2"]
        Nginx["Nginx<br/>:443 SSL"]
        API["NestJS API<br/>:3000"]
        Static["Static files<br/>frontend/dist"]
        PG[("PostgreSQL")]
        Redis[("Redis")]
    end

    Users["Browsers / Tablets"] --> Nginx
    Nginx -->|/api| API
    Nginx -->|/| Static
    API --> PG
    API --> Redis
```

| Component | Spec (minimum) |
|-----------|----------------|
| VM | 2 vCPU, 4 GB RAM |
| PostgreSQL | Same VM or managed RDS |
| Nginx | SSL termination, reverse proxy |
| Process manager | PM2 or systemd for API |

### 9.3 Production Microservices (Target)

```mermaid
flowchart TB
    subgraph Internet
        Users["Clients"]
    end

    subgraph K8s["Kubernetes Cluster"]
        Ingress["Ingress / ALB"]
        GW["API Gateway"]

        subgraph Pods["Service Pods"]
            S1["auth-svc x2"]
            S2["order-svc x3"]
            S3["kitchen-svc x2"]
            S4["billing-svc x2"]
            S5["realtime-svc x2"]
        end

        Kafka["Kafka cluster"]
    end

    subgraph Managed
        RDS[("RDS PostgreSQL<br/>Multi-AZ")]
        ElastiCache[("ElastiCache Redis")]
        S3["S3"]
    end

    Users --> Ingress --> GW --> Pods
    Pods --> RDS
    Pods --> ElastiCache
    Pods --> Kafka
    Pods --> S3
```

| Component | Spec |
|-----------|------|
| Kubernetes | EKS / GKE, 3+ nodes |
| PostgreSQL | RDS Multi-AZ, read replicas for reports |
| Redis | ElastiCache cluster mode |
| Kafka | MSK 3 brokers |
| CDN | CloudFront for static assets |

---

## 10. Security & Multi-Tenancy

```mermaid
flowchart TB
    Request["HTTP Request"] --> JWT["JWT Validation"]
    JWT --> RBAC["Role Check<br/>OWNER · MANAGER · CASHIER · CAPTAIN"]
    RBAC --> Tenant["Organization Scope"]
    Tenant --> Outlet["Outlet Access Guard"]
    Outlet --> Handler["Domain Handler"]
```

| Concern | Implementation |
|---------|----------------|
| Authentication | JWT bearer tokens |
| Authorization | Role-based (UserRole enum) |
| Tenant isolation | `organizationId` on all entities |
| Outlet isolation | `OutletAccessService` verifies outlet belongs to org |
| Transport | HTTPS in production |
| Secrets | Env vars / secrets manager (never commit `.env`) |
| Rate limiting | API Gateway (target) |

---

## 11. Deployment Topology

### 11.1 CI/CD Pipeline (Target)

```mermaid
flowchart LR
    Git["Git Push"] --> CI["GitHub Actions"]
    CI --> Test["Unit + E2E Tests"]
    Test --> Build["Docker Build"]
    Build --> Registry["ECR / GCR"]
    Registry --> Deploy["K8s Rollout"]
    Deploy --> Smoke["Smoke Tests"]
```

### 11.2 Per-Outlet Edge (Restaurant LAN — Target)

Petpooja-style outlets often run POS + KDS on local network with cloud sync:

```mermaid
flowchart TB
    subgraph RestaurantLAN["Restaurant Local Network"]
        POS1["POS Terminal 1"]
        POS2["POS Terminal 2"]
        KDS1["Kitchen Tablet"]
        LocalSync["Local Sync Node<br/>(optional edge)"]
        Printer["Thermal Printers"]
    end

    subgraph Cloud["Cloud"]
        API["API Services"]
        DB[("Cloud DB")]
    end

    POS1 --> LocalSync
    POS2 --> LocalSync
    KDS1 --> LocalSync
    POS1 --> Printer
    LocalSync <-->|sync when online| API
    API --> DB
```

---

## 12. Phase Roadmap → Services

| Phase | Features | Architecture impact |
|-------|----------|-------------------|
| **Phase 1** ✅ | POS, KOT, billing, KDS, setup, reports | Modular monolith |
| **Phase 2** | QR scan & order, guest PWA | + QR app, + Realtime Service |
| **Phase 3** | Captain app, dedicated KDS, WebSocket | + Mobile app, extract Kitchen Service |
| **Phase 4** | Inventory, recipes, stock alerts | + Inventory Service |
| **Phase 5** | CRM, aggregators, SMS, loyalty | + CRM, Integration Hub, Notification |
| **Phase 6** | Offline POS, multi-outlet, central kitchen | + Sync Service, Electron POS |

---

## Quick Reference — What Runs Where Today

```
┌─────────────────────────────────────────────────────────────┐
│  Browser (localhost:5173)                                   │
│  ┌─────────┬─────────┬─────────┬─────────┬─────────┐       │
│  │  Login  │  Floor  │  Order  │ Kitchen │ Reports │       │
│  └─────────┴─────────┴─────────┴─────────┴─────────┘       │
│                         │ REST /api                         │
└─────────────────────────┼───────────────────────────────────┘
                          ▼
┌─────────────────────────────────────────────────────────────┐
│  NestJS API (localhost:3000)                                │
│  auth · outlets · menus · tables · orders · billing ·       │
│  kitchen · reports                                          │
└─────────────────────────┼───────────────────────────────────┘
                          ▼
┌─────────────────────────────────────────────────────────────┐
│  PostgreSQL (localhost:5432 / hotelmanagement)              │
└─────────────────────────────────────────────────────────────┘
```

---

## Document History

| Version | Date | Changes |
|---------|------|---------|
| 1.0 | 2026-06-21 | Initial architecture doc: Phase 1 monolith + target microservices |
