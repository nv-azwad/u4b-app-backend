# Upcycle4Better (U4B) - Backend API

RESTful API server for **Upcycle4Better** — a sustainability platform that gamifies textile donation through a voucher reward system. Handles user authentication, donation submissions with video verification, admin review workflows, and voucher management.

> Built with Express.js 5, PostgreSQL, JWT authentication, and Google Cloud Storage.

## Features

- **JWT Authentication** — Registration, login, email verification, OTP-based password reset
- **Donation System** — Video upload to Google Cloud Storage, GPS-based distance verification (Haversine formula), 30-day cooldown enforcement
- **Admin Panel API** — Pending donation reviews, approve/reject with notes, dashboard statistics, user management
- **Voucher Engine** — Eligibility checks, transactional claiming with Wix API promo code generation, 3-month expiry
- **Bin Management** — CRUD operations, geospatial nearby search, status management
- **Email Notifications** — Branded HTML emails via Gmail SMTP for verification, approvals, and rejections

## Tech Stack

| Technology | Version | Purpose |
|-----------|---------|---------|
| [Express.js](https://expressjs.com/) | 5.1.0 | Web framework |
| [PostgreSQL](https://www.postgresql.org/) | - | Database (via `pg`) |
| [JWT](https://github.com/auth0/node-jsonwebtoken) | 9.0.2 | Token-based authentication |
| [bcryptjs](https://github.com/dcodeIO/bcrypt.js) | 3.0.3 | Password hashing |
| [Multer](https://github.com/expressjs/multer) | 2.0.2 | File upload handling (50MB limit) |
| [Google Cloud Storage](https://cloud.google.com/storage) | 7.18.0 | Video file storage |
| [Nodemailer](https://nodemailer.com/) | 7.0.12 | Email delivery (Gmail SMTP) |
| [nodemon](https://nodemon.io/) | 3.1.10 | Development auto-restart |

## Project Structure

```
config/
└── database.js              # PostgreSQL connection pool

controllers/
├── authController.js        # Register, login, email verify, password reset
├── donationsController.js   # Submit, history, eligibility checks
├── binsController.js        # Bin CRUD, nearby search
├── vouchersController.js    # Availability, claiming, Wix integration
└── adminController.js       # Dashboard stats, reviews, user management

middleware/
├── auth.js                  # JWT token verification
├── admin.js                 # Admin role check
└── upload.js                # Multer + GCS file upload

routes/
├── auth.js                  # /api/auth/*
├── donations.js             # /api/donations/*
├── bins.js                  # /api/bins/*
├── vouchers.js              # /api/vouchers/*
└── admin.js                 # /api/admin/*

utils/
└── emailSender.js           # Branded HTML email templates
```

## API Endpoints

### Health Check
```
GET /  →  { message: "U4B Backend API is running!", status: "success" }
```

### Auth (`/api/auth`)
| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| POST | `/register` | - | Register with email verification |
| GET | `/verify-email?token=` | - | Verify email address |
| POST | `/login` | - | Login (returns JWT, 30-day expiry) |
| POST | `/forgot-password` | - | Request OTP (6-digit, 10-min expiry) |
| POST | `/reset-password` | - | Reset password with OTP |
| GET | `/profile` | Bearer | Get user profile |
| POST | `/change-password` | Bearer | Change password |

### Donations (`/api/donations`)
| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| POST | `/submit` | Bearer | Submit donation (multipart: video, binId, fabricCount, lat/lng) |
| GET | `/history` | Bearer | Get donation history (paginated) |
| GET | `/my-donations` | Bearer | Alias for history |
| GET | `/check-eligibility` | Bearer | Check 30-day cooldown status |
| GET | `/:id` | Bearer | Get donation details |

### Bins (`/api/bins`)
| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/` | - | List all bins (filter by status) |
| GET | `/code/:binCode` | - | Get bin by code or QR |
| GET | `/nearby?lat=&lng=&radius=` | - | Find nearby bins (Haversine, default 50km) |
| PATCH | `/:id/status` | Bearer | Update bin status |

### Vouchers (`/api/vouchers`)
| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/available` | Bearer | List active vouchers |
| GET | `/check-eligibility` | Bearer | Check claim eligibility |
| POST | `/claim` | Bearer | Claim voucher (transactional) |
| GET | `/my-vouchers` | Bearer | List claimed vouchers |

### Admin (`/api/admin`)
| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/stats` | Admin | Dashboard statistics |
| GET | `/donations/pending` | Admin | Pending donations (paginated) |
| GET | `/donations` | Admin | All donations (filterable) |
| POST | `/donations/:id/approve` | Admin | Approve donation |
| POST | `/donations/:id/reject` | Admin | Reject donation |
| GET | `/users` | Admin | List all users |
| GET | `/users/:id/donations` | Admin | User details with donations |

## Database Schema

### Core Tables

**users** — `id`, `email`, `name`, `phone`, `password_hash`, `is_verified`, `verification_token`, `reset_otp`, `otp_expires_at`, `is_admin`, `total_donations_count`, `created_at`

**sites** — `site_id`, `site_name`, `site_address`, `latitude`, `longitude`

**bins** — `bin_id`, `site_id` (FK), `bin_qr_code`, `bin_type`, `active_inactive`

**donations** — `id`, `user_id` (FK), `bin_id` (FK), `media_url`, `media_latitude`, `media_longitude`, `status`, `verification_notes`, `weight_kg`, `is_claimed`, `admin_id`, `admin_notes`, `reviewed_at`, `created_at`

**vouchers** — `id`, `partner_name`, `description`, `discount_amount`, `is_active`

**claimed_vouchers** — `id`, `user_id` (FK), `voucher_id` (FK), `voucher_code`, `claimed_at`, `expiry_date`, `donation_id` (FK)

## Getting Started

### Prerequisites
- Node.js 18+
- PostgreSQL 14+
- Google Cloud Storage bucket (for video uploads)
- Gmail account with App Password (for emails)

### Installation

```bash
# Clone the repository
git clone https://github.com/nv-azwad/u4b-app-backend.git
cd u4b-app-backend

# Install dependencies
npm install

# Set up environment variables
cp .env.example .env
# Edit .env with your configuration

# Start development server
npm run dev
```

Server starts at [http://localhost:5000](http://localhost:5000).

### Available Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start with nodemon (auto-restart) |
| `npm start` | Start production server |

## Environment Variables

See [`.env.example`](.env.example) for all required variables.

## Related

- **Frontend** — [u4b-app-frontend](https://github.com/nv-azwad/u4b-app-frontend)

## License

All rights reserved. This source code is made publicly available for portfolio and demonstration purposes only. See [LICENSE](LICENSE) for details.
