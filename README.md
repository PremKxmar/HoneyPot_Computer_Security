# Honeypot-in-a-Box

A deception-based intrusion detection system. It exposes a set of deliberately
attractive fake endpoints — a login form, an admin panel, a `.env` file, a
database backup — and every request that touches one is captured, classified by
attack type, geolocated, and streamed live to a React dashboard.

Attackers think they found something. What they actually found is a sensor.

![Python](https://img.shields.io/badge/Python-3.11-3776AB?logo=python&logoColor=white)
![Flask](https://img.shields.io/badge/Flask-3.1-000000?logo=flask&logoColor=white)
![React](https://img.shields.io/badge/React-19-61DAFB?logo=react&logoColor=black)
![TypeScript](https://img.shields.io/badge/TypeScript-5.8-3178C6?logo=typescript&logoColor=white)
![scikit-learn](https://img.shields.io/badge/scikit--learn-1.8-F7931E?logo=scikitlearn&logoColor=white)
![License](https://img.shields.io/badge/license-MIT-green)

<!-- Live demo: add your deployed dashboard URL here once you've run the deploy steps below. -->

---

## Table of Contents

- [Why this exists](#why-this-exists)
- [Features](#features)
- [Architecture](#architecture)
- [Tech stack](#tech-stack)
- [Attack taxonomy](#attack-taxonomy)
- [The classifier](#the-classifier)
- [Project structure](#project-structure)
- [Getting started](#getting-started)
- [Running the live attack demo](#running-the-live-attack-demo)
- [API reference](#api-reference)
- [Deployment](#deployment)
- [Known limitations](#known-limitations)
- [Security notice](#security-notice)
- [License](#license)

---

## Why this exists

Most intrusion detection is *reactive*: you wait for something to go wrong in
production, then dig through logs. A honeypot inverts that. Nothing legitimate
should ever request `/wp-admin` or `GET /.env` on your infrastructure, so every
hit on those paths is, by construction, hostile or at minimum unauthorised
reconnaissance. That gives you a near-zero false-positive signal.

This project builds that idea end to end:

1. **Bait** — Flask serves fifteen trap routes that respond convincingly.
   The fake `/backup` returns a realistic-looking MySQL dump; `/.env` returns
   plausible-looking credentials. Nothing real is exposed.
2. **Capture** — every hit is written to the database with source IP, method,
   endpoint, raw payload, user-agent and timestamp.
3. **Classify** — the payload goes through a TF-IDF + Random Forest classifier,
   with a regex rule engine as a second layer for the categories the model
   wasn't trained on.
4. **Enrich** — the source IP is resolved to country, city and coordinates via
   MaxMind GeoLite2.
5. **Stream** — the enriched record is pushed to every connected dashboard over
   Server-Sent Events, so the UI reacts in roughly the time it takes the
   attacker's request to complete.

---

## Features

**Detection**
- 15 honeypot trap endpoints covering login, admin, config-file and
  upload-probe attack surfaces
- Two-stage classification: ML model first, regex rule engine as fallback
- 10 distinct attack categories with critical/high/medium/low severity mapping
- IP geolocation with graceful degradation when the GeoIP database is absent

**Dashboard**
- Live threat feed over SSE, with a 5-second polling fallback for hosts that
  buffer streaming responses
- Interactive world map (Leaflet) plotting attack origins, colour-coded by
  severity
- Analytics: attacks over time, distribution by type and by country, severity
  breakdown, and a top-attacker leaderboard
- Full-text search and per-type filtering across the threat feed
- Audio + visual alerts on new critical detections
- One-click PDF incident report export (ReportLab)
- Optional AI security assistant backed by Google Gemini

**Operations**
- JWT authentication with signup, login, token verification and password change
- Session expiry on 10 minutes of inactivity
- IP blocklist endpoint (in-memory; see [Known limitations](#known-limitations))
- Configurable email-alert thresholds

**Demo tooling**
- QR-code generator that points a phone at your running honeypot
- Mobile-friendly attack simulator with one button per attack class, so you can
  demonstrate the full pipeline live without any tooling on the attacking device

---

## Architecture

```
        ATTACKER                                      DEFENDER
  (phone / curl / scanner)                      (React dashboard)
           │                                            ▲
           │  malicious HTTP request                    │  SSE stream
           ▼                                            │
  ┌────────────────────────────────────────────────────┴──────────┐
  │                    FLASK BACKEND  :5000                        │
  │                                                                │
  │   routes/honeypot.py                                           │
  │     15 trap endpoints ── returns convincing fake responses     │
  │            │                                                   │
  │            ▼                                                   │
  │   models/ml_model.py                                           │
  │     TF-IDF ─► RandomForest ─► label                            │
  │            │        (falls through on low signal)              │
  │            ▼                                                   │
  │     regex rule engine ─► label                                 │
  │            │                                                   │
  │            ▼                                                   │
  │   utils/geoip.py         models/log_entry.py    utils/sse.py   │
  │     IP → lat/lon    ──►    persist row      ──►  fan-out       │
  └────────────────────────────────────────────────────────────────┘
           │                          │                      │
           ▼                          ▼                      ▼
     GeoLite2-City.mmdb        SQLite / Postgres      connected clients
```

The SSE announcer is an in-process fan-out queue. Every dashboard that opens
`/api/stream` registers a queue; `log_attack()` writes the enriched record to
all of them. This is why the backend runs on a single gunicorn worker with
multiple threads rather than multiple workers — the listener set lives in
process memory.

---

## Tech stack

| Layer | Choice | Why |
|---|---|---|
| Frontend | React 19 + TypeScript + Vite | Fast HMR, typed API surface |
| Styling | Tailwind (CDN) + Framer Motion | Rapid iteration, animation without a CSS pipeline |
| Charts | Recharts | Declarative, composes cleanly with React |
| Map | Leaflet + react-leaflet | Open tiles, no API key needed |
| Backend | Flask 3 + Flask-SQLAlchemy | Small surface, blueprints keep routes separable |
| Database | SQLite (dev) / PostgreSQL (prod) | Zero-config locally, swap via `DATABASE_URL` |
| ML | scikit-learn (TF-IDF + Random Forest) | Strong baseline on short text, interpretable, fast inference |
| GeoIP | MaxMind GeoLite2 | Free, offline, no per-request API cost |
| Realtime | Server-Sent Events | One-way server→client is all this needs; simpler than WebSockets |
| Auth | PyJWT + Werkzeug password hashing | Stateless tokens, no session store |
| Reports | ReportLab | PDF generation without external services |

---

## Attack taxonomy

The system recognises 10 categories. Five are handled by the trained model;
the rest are caught by the regex layer, which also acts as a safety net when
the model is unavailable or unsure.

| Category | Severity | Detected by | Example payload |
|---|---|---|---|
| SQL Injection | Critical | Model + regex | `' OR '1'='1` |
| Command Injection | Critical | Model + regex | `; cat /etc/passwd` |
| SSRF | Critical | Model + regex | `http://169.254.169.254/latest/meta-data/` |
| LDAP Injection | Critical | Regex | `*)(uid=*))(\|(uid=*` |
| XSS | High | Model + regex | `<script>alert(1)</script>` |
| Directory Traversal | High | Regex | `../../../../etc/passwd` |
| File Upload Attack | High | Regex | `shell.php` |
| Brute Force | Medium | Regex | repeated `admin` / `password123` |
| Suspicious Activity | Medium | Model (default class) | anything unmatched but non-empty |
| Reconnaissance | Low | Heuristic | endpoint probe with no payload |

Classification order lives in
[`backend/models/ml_model.py`](backend/models/ml_model.py): the model is asked
first, and its answer is used unless it returns nothing usable, at which point
the regex engine runs. Adding a category means adding labelled rows to the
training CSV *and* a pattern block — the two layers are intentionally
independent so one can cover the other's gaps.

---

## The classifier

**Pipeline:** `TfidfVectorizer(max_features=5000, ngram_range=(1,2))` →
`RandomForestClassifier(n_estimators=100, random_state=42)`

Attack payloads are short and structurally distinctive — bigrams over tokens
like `UNION SELECT`, `onerror=`, `169.254` carry most of the signal, which is
why a bag-of-ngrams model does well here without anything heavier.

**Dataset:** 499 labelled payloads in
[`backend/data/training_data.csv`](backend/data/training_data.csv), balanced
across five classes (~100 each), derived from the payload corpus in
[`backend/data/WEB_APPLICATION_PAYLOADS.jsonl`](backend/data/WEB_APPLICATION_PAYLOADS.jsonl).

**Measured performance** on a stratified 80/20 split (399 train / 100 test):

```
ACCURACY: 97.00%

5-fold cross-validation: 94.80%  (±9.24%)

                     precision    recall  f1-score   support
  Command Injection       0.95      1.00      0.98        20
      SQL Injection       1.00      1.00      1.00        20
               SSRF       0.91      1.00      0.95        20
Suspicious Activity       1.00      0.95      0.97        20
                XSS       1.00      0.90      0.95        20
           accuracy                           0.97       100
```

The residual errors are two XSS payloads misread as SSRF — both contained
embedded URLs, which is a genuinely ambiguous feature at this dataset size.

Reproduce it yourself:

```bash
cd backend
python scripts/evaluate_model.py
```

Note that this script prints the metrics *and then* retrains on the full
dataset and overwrites `models/classifier.pkl` — that is how the shipped model
was produced. `scripts/train_model.py` is a simpler variant kept for reference;
`scripts/benchmark.py` runs the shipped model against a handful of known
payloads as a smoke test.

---

## Project structure

```
.
├── App.tsx                     Dashboard shell: feed, search, alerts, routing
├── index.tsx / index.html      Vite entry point
├── types.ts                    Shared Threat / NodeStatus types
├── vite.config.ts              Dev proxy to :5000, build-time env injection
│
├── components/
│   ├── AnalyticsDashboard.tsx  Charts, leaderboard, PDF export
│   ├── WorldMap.tsx            Leaflet attack-origin map
│   ├── AuthPage.tsx            Signup / login
│   ├── AIChat.tsx              Gemini-backed security assistant
│   ├── ArtistCard.tsx          Threat card
│   └── FluidBackground.tsx · GlitchText.tsx · CustomCursor.tsx
│
├── contexts/AuthContext.tsx    JWT storage, inactivity timeout
├── services/
│   ├── config.ts               Single source of truth for the backend URL
│   ├── api.ts                  REST calls + SSE subscription
│   └── geminiService.ts        Gemini client
│
├── public/
│   ├── attacker.html           Mobile attack simulator (one button per class)
│   └── qrcode.html             QR generator pointing a phone at the simulator
│
└── backend/
    ├── app.py                  App setup, blueprint registration, SSE route
    ├── routes/
    │   ├── honeypot.py         15 trap endpoints + threat/blocklist APIs
    │   ├── dashboard.py        Aggregate stats, map coordinates
    │   ├── auth.py             JWT signup/login/verify/change-password
    │   └── reports.py          PDF export
    ├── models/
    │   ├── log_entry.py        AttackLog SQLAlchemy model
    │   ├── ml_model.py         Two-stage classifier
    │   └── *.pkl               Trained model + vectorizer
    ├── utils/
    │   ├── geoip.py            MaxMind lookup with fallbacks
    │   ├── sse.py              In-process fan-out announcer
    │   └── report_gen.py       ReportLab PDF builder
    ├── scripts/                train / evaluate / benchmark / convert dataset
    └── data/                   Training CSV, payload corpus, GeoIP database
```

---

## Getting started

**Prerequisites:** Node.js 18+, Python 3.11+

### 1. Clone

```bash
git clone https://github.com/PremKxmar/Honeypot-in-a-Box-Computer-Security.git
cd Honeypot-in-a-Box-Computer-Security
```

### 2. Backend

```bash
cd backend
python -m venv venv
source venv/bin/activate          # Windows: venv\Scripts\activate
pip install -r requirements.txt

cp .env.example .env              # then fill in SECRET_KEY
python -c "import secrets; print(secrets.token_hex(32))"

python app.py                     # http://localhost:5000
```

The database schema is created automatically on first import. Leaving
`DATABASE_URL` blank gives you a local SQLite file at `backend/database.db`.

### 3. GeoIP database (optional)

Attack geolocation needs MaxMind's GeoLite2 City database. It is **not**
committed here because MaxMind's licence forbids redistribution.

1. Create a free account at [MaxMind](https://dev.maxmind.com/geoip/geolite2-free-geolocation-data)
2. Download **GeoLite2 City** in MMDB format
3. Place it at `backend/data/GeoLite2-City.mmdb`

Without it the app still runs — `utils/geoip.py` falls back to a rotating set
of plausible world cities so the map stays populated for demos. Private and
loopback addresses are always mapped to a fixed local coordinate, since they
carry no real geographic information.

### 4. Frontend

```bash
cd ..                             # back to repo root
npm install
cp .env.example .env              # optional: GEMINI_API_KEY for the AI chat
npm run dev                       # http://localhost:3000
```

The Vite dev server proxies `/api`, `/login`, `/admin` and `/backup` to
`127.0.0.1:5000`, so no CORS configuration is needed locally.

### 5. Or start both at once

```bash
./start.sh          # macOS / Linux
start.bat           # Windows
```

Open http://localhost:3000 and create an account — the first signup is your
admin user.

---

## Running the live attack demo

The most convincing way to show this working is to attack it from a phone while
the dashboard is on screen.

1. Find your machine's LAN IP (`ipconfig` on Windows, `ipconfig getifaddr en0`
   on macOS).
2. Open http://localhost:3000/qrcode.html, choose **Local mode**, enter that IP,
   and generate the QR code.
3. Scan it with a phone on the same WiFi. It opens the attack simulator.
4. Tap any attack button.

Within a second or so the dashboard should play its alert, push a new card into
the threat feed, drop a marker on the map, and update the analytics counters.

For a deployed instance, use **Cloud mode** instead and paste your dashboard and
backend URLs — the generated QR embeds the backend as a `?target=` parameter, so
the simulator knows where to aim.

You can also drive it from a terminal:

```bash
curl -X POST http://localhost:5000/login \
     -H 'Content-Type: application/json' \
     -d '{"username": "admin", "password": "1 OR 1=1 UNION SELECT"}'

curl "http://localhost:5000/api/internal/proxy?url=http://169.254.169.254/latest/meta-data/"

curl http://localhost:5000/.env
```

---

## API reference

### Honeypot traps
Every one of these logs the request and returns a deliberately misleading response.

| Method | Endpoint | Bait |
|---|---|---|
| GET · POST | `/login` | Fake login form |
| GET · POST | `/admin`, `/administrator` | Fake admin panel |
| GET | `/wp-admin` | WordPress admin probe |
| GET | `/api/admin` | Unauthorised API surface |
| GET | `/backup`, `/database.sql` | Fake MySQL dump |
| GET | `/.env`, `/config.php` | Fake credentials file |
| POST | `/api/login` | Brute-force target |
| GET · POST | `/api/internal/proxy` | SSRF target |
| GET · POST | `/upload`, `/api/upload` | Malicious upload target |
| GET · POST | `/api/ldap/search`, `/api/directory/lookup` | LDAP injection target |

### Dashboard

| Method | Endpoint | Returns |
|---|---|---|
| GET | `/api/threats?limit=50` | Recent attack log entries |
| GET | `/api/stats` | Totals, per-type, per-country, timeline, severity, leaderboard |
| GET | `/api/attack-locations` | Last 100 attacks with coordinates |
| GET | `/api/stream` | SSE stream of new detections |
| POST | `/api/block-ip` | Add an IP to the blocklist |
| GET | `/api/blocked-ips` | Current blocklist |
| POST | `/api/reports/generate` | PDF incident report |

### Authentication

| Method | Endpoint |
|---|---|
| POST | `/api/auth/signup` |
| POST | `/api/auth/login` |
| GET | `/api/auth/verify` |
| POST | `/api/auth/logout` |
| POST | `/api/auth/change-password` |

### Email alerts

| Method | Endpoint |
|---|---|
| GET · POST | `/api/email-alerts/config` |
| POST | `/api/email-alerts/test` |
| GET | `/api/email-alerts/history` |

---

## Deployment

The frontend and backend deploy as two separate services.

### Render (both services, one file)

[`render.yaml`](render.yaml) is a Render Blueprint. In the Render dashboard
choose **New → Blueprint**, point it at your fork, and it provisions:

- `honeypot-backend` — Python web service running gunicorn, `SECRET_KEY`
  auto-generated
- `honeypot-dashboard` — static site built with `npm run build`

After the first deploy, set `BACKEND_URL` on the dashboard service to the
backend's public URL and trigger a rebuild. That value is baked in at build
time by `vite.config.ts`, so it needs a rebuild rather than just a restart.

> The backend runs on a single worker by design — the SSE listener registry is
> in-process. On Render's free tier the service also sleeps after inactivity, so
> the first request after idling takes roughly 50 seconds to cold-start.

### Vercel (frontend only)

[`vercel.json`](vercel.json) configures the Vite build and SPA rewrites. Import
the repo, then set `BACKEND_URL` and optionally `GEMINI_API_KEY` as environment
variables. Vercel is serverless and cannot hold a long-lived SSE connection, so
host the Flask backend on Render or Railway and point the frontend at it.

### Railway (backend)

Railway reads [`backend/Procfile`](backend/Procfile) directly. Set the root
directory to `backend`, add a PostgreSQL plugin, and Railway injects
`DATABASE_URL` automatically — `app.py` normalises the legacy `postgres://`
scheme that Railway still emits.

### Environment variables

| Variable | Service | Required | Purpose |
|---|---|---|---|
| `SECRET_KEY` | backend | Yes in production | JWT signing key |
| `DATABASE_URL` | backend | No | Postgres URL; defaults to local SQLite |
| `BACKEND_URL` | frontend | Yes when split-hosted | Backend base URL, baked in at build time |
| `GEMINI_API_KEY` | frontend | No | Enables the AI assistant panel |

---

## Known limitations

Being upfront about what this is and isn't:

- **The blocklist is advisory.** `/api/block-ip` stores IPs in a Python set for
  the dashboard to display. It does not touch iptables or a WAF, and it resets
  on restart. Real enforcement would need a firewall integration.
- **Email alerts are simulated.** The configuration and history endpoints work,
  but no SMTP client is wired in yet.
- **The model covers five of the ten categories.** The rest rely entirely on the
  regex layer. Expanding the labelled dataset is the natural next step.
- **499 training samples is small.** The 9.24% standard deviation across
  cross-validation folds reflects that — the headline accuracy is real, but the
  confidence interval around it is wide.
- **Single-worker constraint.** Horizontal scaling would require moving the SSE
  fan-out to Redis pub/sub.
- **Trap endpoints are unauthenticated by design** — that is the point — but it
  means anyone who finds the deployment can fill the database with noise.

---

## Security notice

This is a research and educational project. A honeypot is a system built to be
attacked, which makes it a liability if you deploy it carelessly.

- Deploy it on isolated infrastructure, never alongside anything real.
- Set `SECRET_KEY` to a generated value before exposing it publicly. The
  hardcoded development fallback is not safe outside localhost.
- The attack simulator in `public/attacker.html` targets whatever URL you give
  it. Only ever point it at your own honeypot. Using it against systems you do
  not own is illegal in most jurisdictions.
- Captured payloads are stored raw. Treat the database as untrusted input if you
  build anything downstream of it.

---

## License

[MIT](LICENSE) © Prem Kumar R

Built as an academic project for Computer Security.
GeoLite2 data © MaxMind, used under its own licence and not redistributed here.
