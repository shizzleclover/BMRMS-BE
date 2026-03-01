# BMRMS Backend - Quick Start Guide

## Prerequisites

- Node.js v18+ installed
- MongoDB running (locally or remote)
- Git (for version control)

## Setup Steps

### 1. Install Dependencies

```bash
npm install
```

### 2. Configure Environment

```bash
# Copy the environment template
cp .env.example .env
```

Edit `.env` and set these **required** variables:

```env
# Required for MVP
JWT_SECRET=your-super-secret-jwt-key-change-this
JWT_REFRESH_SECRET=your-super-secret-refresh-key-change-this
ENCRYPTION_KEY=your-32-character-encryption-key

# MongoDB (use your connection string)
MONGODB_URI=mongodb://localhost:27017/bmrms
```

### 3. Start MongoDB

**Option A: Using Docker**
```bash
docker run -d -p 27017:27017 --name bmrms-mongodb mongo:latest
```

**Option B: Local Installation**
Ensure MongoDB is running on `localhost:27017`

### 4. Start the Server

```bash
# Development mode (with auto-reload)
npm run dev
```

You should see:
```
✅ MongoDB connected: localhost
╔═══════════════════════════════════════════════════════════╗
║   🏥  BMRMS Backend Server                                ║
║   Environment: development                                ║
║   Port:        5000                                       ║
║   API Version: v1                                         ║
║   Server running at http://localhost:5000                 ║
╚═══════════════════════════════════════════════════════════╝
```

## Test the API

### 1. Health Check

```bash
curl http://localhost:5000/api/v1/health
```

### 2. Authentication Flow

**Register a User:**
```bash
curl -X POST http://localhost:5000/api/v1/auth/register \
  -H "Content-Type: application/json" \
  -d '{"firstName": "John", "lastName": "Doe", "email": "john@example.com", "password": "SecurePass123", "role": "doctor"}'
```

**Login:**
```bash
curl -X POST http://localhost:5000/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email": "john@example.com", "password": "SecurePass123"}'
```
*Save the `accessToken` and `clinicId` (once associated) for subsequent requests.*

### 3. Clinic Management (Admin only)
```bash
curl -X POST http://localhost:5000/api/v1/clinics \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"name": "General Hospital", "address": {"street": "123 Main St", "city": "Lagos", "state": "LA", "country": "NG", "zipCode": "100001"}, "contact": {"phone": "+2348000000000", "email": "info@hospital.com"}}'
```

### 4. Medical Records (Doctor only)
```bash
# Upload a record (multipart/form-data)
curl -X POST http://localhost:5000/api/v1/records \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -F "file=@/path/to/report.pdf" \
  -F "patientId=PATIENT_OBJECT_ID" \
  -F "recordType=consultation" \
  -F "title=Monthly Checkup"
```

## Available Endpoints

### Authentication (✅ Fully Implemented)
- `POST /api/v1/auth/register` - Create account
- `POST /api/v1/auth/login` - Get tokens
- `GET /api/v1/auth/profile` - Current user details

### Clinics & Patients (✅ Fully Implemented)
- `POST /api/v1/clinics` - Create a clinic (Admin)
- `POST /api/v1/patients` - Create patient profile
- `GET /api/v1/patients/:id` - View patient details

### Medical Records (✅ Fully Implemented)
- `POST /api/v1/records` - Upload encrypted record (Doctor)
- `GET /api/v1/records/patient/:id` - Fetch patient history
- `GET /api/v1/records/:id/download` - Decrypt and download file

### Consent & Blockchain (✅ Fully Implemented)
- `POST /api/v1/consent/grant` - Patient grants access
- `GET /api/v1/records/:id/verify` - Verify record on blockchain

### Offline Sync (✅ Fully Implemented)
- `GET /api/v1/sync/pull` - Get server updates
- `POST /api/v1/sync/push` - Send local changes

## Project Structure

```
backend/
├── src/
│   ├── config/          # Configuration & DB connection
│   ├── models/          # 7 Mongoose models (User, Record, Consent, etc.)
│   ├── services/        # Logic (IPFS, Blockchain, Encryption, etc.)
│   ├── routes/          # API Route handlers
│   ├── middleware/      # Auth, Validation, Multer
│   ├── app.js           # Express setup
│   └── server.js        # Entry point
├── README.md
└── QUICKSTART.md
```

## Next Steps

1. ✅ Validate Auth and Role flow.
2. ✅ Test Record creation with IPFS upload.
3. ✅ Verify Blockchain integrity checks.
4. 🔄 Deploy Smart Contracts for Production use.
5. 🔄 Configure Production IPFS pinning service.

## Troubleshooting

### IPFS/Blockchain Connection
By default, the services use mock implementations for MVP development. Ensure `.env` points to valid RPC/Nodes for production.

---
See [README.md](./README.md) for full technical details.
