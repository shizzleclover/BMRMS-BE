# BMRMS Backend - Blockchain-Based Medical Records Management System

A secure, blockchain-integrated backend API for managing medical records with IPFS storage, consent management, and offline sync capabilities.

## 🏗️ Architecture Overview

This backend follows a clean, modular architecture:

- **MongoDB** - Primary database for fast access and offline sync
- **IPFS** - Decentralized file storage for medical records
- **Blockchain** - Immutable audit trail, consent management, and data integrity
- **Express.js** - RESTful API server

## 📋 Features

### Current Implementation (MVP Complete)
- ✅ User authentication & authorization (JWT-based)
- ✅ Role-based access control (Admin, Doctor, Patient)
- ✅ Patient management (CRUD, clinical profile, emergency contacts)
- ✅ Clinic management (CRUD, staff management, facility details)
- ✅ Medical record management (Encryption, IPFS storage, Blockchain integrity)
- ✅ Encryption service (AES-256-GCM for files and sensitive data)
- ✅ IPFS integration (Decentralized file retrieval)
- ✅ Blockchain integration (Mock for MVP, production-ready structure)
- ✅ Consent management (Grant/Revoke access, on-chain verification)
- ✅ Audit logging (Comprehensive system event tracking)
- ✅ Offline sync queue system (Pull/Push data synchronization)

### Future Enhancements
- ⏳ Full blockchain smart contract integration
- ⏳ Advanced conflict resolution for offline sync
- ⏳ Multi-clinic interoperability
- ⏳ Advanced analytics and reporting

## 🚀 Getting Started

### Prerequisites

- Node.js (v18 or higher)
- MongoDB (v6 or higher)
- IPFS node (optional for MVP, required for production)
- Ethereum node (optional for MVP, required for production)

### Installation

1. **Clone the repository**
   ```bash
   cd backend
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up environment variables**
   ```bash
   cp .env.example .env
   ```
   
   Edit `.env` and configure:
   - `MONGODB_URI` - Your MongoDB connection string
   - `JWT_SECRET` - Strong secret for JWT tokens
   - `JWT_REFRESH_SECRET` - Strong secret for refresh tokens
   - `ENCRYPTION_KEY` - 32-character encryption key
   - Other optional services (IPFS, Blockchain)

4. **Start MongoDB**
   ```bash
   # Using Docker
   docker run -d -p 27017:27017 --name mongodb mongo:latest
   
   # Or use your local MongoDB installation
   ```

5. **Start the server**
   ```bash
   # Development mode with auto-reload
   npm run dev
   
   # Production mode
   npm start
   ```

The server will start on `http://localhost:5000` (or your configured PORT).

## 📁 Project Structure

```
backend/
├── src/
│   ├── config/           # Configuration files
│   │   ├── index.js      # Main config
│   │   └── database.js   # Database connection
│   ├── models/           # Mongoose models
│   │   ├── user.model.js
│   │   ├── patient.model.js
│   │   ├── clinic.model.js
│   │   ├── medicalRecord.model.js
│   │   ├── consent.model.js
│   │   ├── auditLog.model.js
│   │   └── syncQueue.model.js
│   ├── routes/           # API routes
│   │   ├── auth.routes.js
│   │   ├── patient.routes.js
│   │   ├── clinic.routes.js
│   │   ├── record.routes.js
│   │   ├── consent.routes.js
│   │   ├── audit.routes.js
│   │   ├── sync.routes.js
│   │   └── health.routes.js
│   ├── services/         # Business logic
│   │   ├── auth.service.js
│   │   ├── encryption.service.js
│   │   ├── ipfs.service.js
│   │   └── blockchain.service.js
│   ├── middleware/       # Express middleware
│   │   ├── auth.js
│   │   ├── validate.js
│   │   ├── errorHandler.js
│   │   └── upload.js
│   ├── app.js           # Express app setup
│   └── server.js        # Server entry point
├── .env.example         # Environment variables template
├── .gitignore
├── package.json
└── README.md
```

## 🔌 API Endpoints

### Authentication
- `POST /api/v1/auth/register` - Create account
- `POST /api/v1/auth/login` - Login & get tokens
- `POST /api/v1/auth/refresh` - Refresh access token
- `POST /api/v1/auth/logout` - Logout user
- `GET /api/v1/auth/profile` - Get current profile
- `PATCH /api/v1/auth/profile` - Update profile data
- `POST /api/v1/auth/change-password` - Update password

### Patients
- `POST /api/v1/patients` - Create patient profile
- `GET /api/v1/patients` - List patients (Doctor/Admin)
- `GET /api/v1/patients/:id` - View patient details
- `PATCH /api/v1/patients/:id` - Update profile
- `POST /api/v1/patients/:id/assign-clinic` - Associate with a clinic

### Clinics
- `POST /api/v1/clinics` - Create a clinic (Admin)
- `GET /api/v1/clinics` - List healthcare facilities
- `GET /api/v1/clinics/:id` - View facility details
- `POST /api/v1/clinics/:id/staff` - Add staff member
- `DELETE /api/v1/clinics/:id/staff/:userId` - Remove staff member

### Medical Records
- `POST /api/v1/records` - Upload record (Encrypted + IPFS)
- `GET /api/v1/records/patient/:patientId` - View patient history
- `GET /api/v1/records/:id/download` - Decrypt and download file
- `GET /api/v1/records/:id/verify` - Verify integrity on blockchain

### Consent Management
- `POST /api/v1/consent/grant` - Patient grants access
- `DELETE /api/v1/consent/:id` - Revoke access
- `GET /api/v1/consent/my-consents` - View current permissions
- `GET /api/v1/consent/check-access/:patientId` - Verify doctor access

### Audit & Sync
- `GET /api/v1/audit` - View system logs (Admin)
- `GET /api/v1/sync/pull` - Fetch server updates (Offline sync)
- `POST /api/v1/sync/push` - Submit local changes

### Health Checks
- `GET /api/v1/health` - API server status
- `GET /api/v1/health/db` - MongoDB connection
- `GET /api/v1/health/ipfs` - IPFS node connectivity
- `GET /api/v1/health/blockchain` - Blockchain provider status

## 🔐 Security Features

- **JWT Authentication** - Secure token-based auth with refresh tokens
- **Role-Based Access Control** - Admin, Doctor, Patient roles
- **Data Encryption** - AES-256-GCM encryption for sensitive data
- **File Encryption** - Encrypted file storage on IPFS
- **Rate Limiting** - Protection against brute force attacks
- **Helmet.js** - Security headers
- **HPP** - HTTP parameter pollution protection
- **CORS** - Configurable cross-origin resource sharing
- **Input Validation** - Zod schema validation

## 🧪 Testing

```bash
# Run tests (to be implemented)
npm test

# Run tests with coverage
npm run test:coverage
```

## 📝 Environment Variables

See `.env.example` for all available configuration options.

### Required Variables
- `JWT_SECRET` - Secret for access tokens
- `JWT_REFRESH_SECRET` - Secret for refresh tokens
- `ENCRYPTION_KEY` - 32-character key for data encryption

### Optional Variables (MVP)
- `MONGODB_URI` - MongoDB connection (defaults to localhost)
- `IPFS_HOST` - IPFS node host (defaults to localhost)
- `BLOCKCHAIN_RPC_URL` - Blockchain RPC endpoint (mock for MVP)

## 🛠️ Development

```bash
# Run in development mode with auto-reload
npm run dev

# Format code
npm run format

# Check code formatting
npm run format:check

# Lint code
npm run lint
```

## 📦 Deployment

1. Set `NODE_ENV=production` in your environment
2. Configure production environment variables
3. Set up MongoDB, IPFS, and blockchain nodes
4. Run `npm start`

## 🤝 Contributing

The MVP implementation is complete. Future contributions should focus on:
- Integrating real smart contracts (mainnet/testnet)
- Enhancing offline sync with advanced conflict resolution
- Adding comprehensive end-to-end and performance tests
- Developing the frontend web/mobile applications
- Adding advanced analytics and AI-driven insights

## 📄 License

MIT

## 👥 Team

Backend Developer - BMRMS Project
