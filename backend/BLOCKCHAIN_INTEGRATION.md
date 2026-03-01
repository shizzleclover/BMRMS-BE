# BMRMS — Ethereum Blockchain Integration

> Technical documentation for integrating Ethereum smart contracts into the Blockchain-Based Medical Records Management System (BMRMS).

---

## Table of Contents

1. [Overview](#overview)
2. [Architecture](#architecture)
3. [Infrastructure & Network](#infrastructure--network)
4. [Smart Contracts](#smart-contracts)
5. [Backend Integration](#backend-integration)
6. [Data Flow](#data-flow)
7. [Security Considerations](#security-considerations)
8. [Environment Setup](#environment-setup)
9. [Deployment Process](#deployment-process)
10. [File Changes Summary](#file-changes-summary)

---

## Overview

### Current State (Mock)

The BMRMS backend currently uses **mock blockchain interactions** — every blockchain function returns fake transaction hashes and hardcoded responses. This was sufficient for MVP development, but the system was always designed to use real smart contracts.

### Target State (Production)

Replace all mock implementations with **real Solidity smart contracts** deployed to the **Ethereum Sepolia testnet**, interacted with via the existing `ethers.js` library. The backend acts as a trusted intermediary that signs and submits transactions on behalf of the system.

### What Changes, What Doesn't

| Layer | Changes? | Details |
|-------|----------|---------|
| Smart Contracts | **NEW** | 3 Solidity contracts (MedicalRecords, ConsentManager, AuditTrail) |
| Hardhat Config | **NEW** | Compiler config, network config, deploy scripts, tests |
| `blockchain.service.js` | **MODIFIED** | 6 mock functions → real contract calls |
| `config/index.js` | **MODIFIED** | Add `blockchain.enabled` toggle |
| `.env` / `.env.example` | **MODIFIED** | Sepolia RPC URL, chain ID, deployed contract addresses |
| `package.json` | **MODIFIED** | Hardhat devDependencies + new npm scripts |
| Mongoose Models | No change | `blockchainHash`, `blockchainTxHash` fields already exist |
| Services (record, consent) | No change | Already call `blockchainService` functions correctly |
| Routes & Middleware | No change | No blockchain references |
| Frontend | No change | No blockchain references |

---

## Architecture

### System Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                         BMRMS Backend                           │
│                                                                 │
│  ┌──────────────┐  ┌───────────────┐  ┌──────────────────────┐  │
│  │ Routes       │→ │ Services      │→ │ blockchain.service   │  │
│  │ (Express)    │  │ (Business     │  │                      │  │
│  │              │  │  Logic)       │  │  • storeRecordHash() │  │
│  │ auth         │  │              │  │  • verifyRecordHash() │  │
│  │ patients     │  │ record.svc   │  │  • grantConsent()     │  │
│  │ records      │  │ consent.svc  │  │  • revokeConsent()    │  │
│  │ consent      │  │ patient.svc  │  │  • checkConsent()     │  │
│  │ audit        │  │ clinic.svc   │  │  • logAudit()         │  │
│  │ sync         │  │ sync.svc     │  │                      │  │
│  │ health       │  │ auth.svc     │  └───────┬──────────────┘  │
│  └──────────────┘  └───────────────┘          │                 │
│                                               │ ethers.js       │
│  ┌──────────────┐  ┌───────────────┐          │                 │
│  │ Middleware   │  │ Models        │          │                 │
│  │ (auth, etc)  │  │ (Mongoose)    │          │                 │
│  └──────────────┘  └───────┬───────┘          │                 │
│                            │                  │                 │
└────────────────────────────┼──────────────────┼─────────────────┘
                             │                  │
                    ┌────────▼───────┐  ┌───────▼──────────────┐
                    │   MongoDB      │  │  Ethereum Sepolia    │
                    │   Atlas        │  │  (via Infura RPC)    │
                    │                │  │                      │
                    │  • Users       │  │  ┌─────────────────┐ │
                    │  • Patients    │  │  │ MedicalRecords  │ │
                    │  • Records     │  │  │ .sol            │ │
                    │  • Consents    │  │  ├─────────────────┤ │
                    │  • AuditLogs   │  │  │ ConsentManager  │ │
                    │  • SyncQueue   │  │  │ .sol            │ │
                    │  • Clinics     │  │  ├─────────────────┤ │
                    │                │  │  │ AuditTrail      │ │
                    │                │  │  │ .sol            │ │
                    └────────────────┘  │  └─────────────────┘ │
                                        └──────────────────────┘
```

### Dual-Storage Pattern

The system uses a **dual-storage** approach:

- **MongoDB** — Primary datastore for fast reads, queries, and full record data
- **Ethereum** — Immutable audit trail storing only **hashes and references** (not the actual data)

This means:
- ✅ Fast reads from MongoDB (no blockchain query latency)
- ✅ Immutable proof of data integrity on Ethereum
- ✅ Blockchain verifies that MongoDB data hasn't been tampered with
- ✅ Minimal on-chain storage (hashes only = low gas cost)

---

## Infrastructure & Network

### Ethereum Sepolia Testnet

| Property | Value |
|----------|-------|
| Network Name | Sepolia |
| Chain ID | `11155111` |
| Currency | SepoliaETH (no real value) |
| Block Explorer | [sepolia.etherscan.io](https://sepolia.etherscan.io) |
| Avg Block Time | ~12 seconds |
| Gas Cost | Free (faucet-provided ETH) |

### Required External Services

| Service | Purpose | Cost |
|---------|---------|------|
| **Infura** or **Alchemy** | Ethereum RPC endpoint (talks to Sepolia) | Free tier (100k requests/day) |
| **Sepolia Faucet** | Get free testnet ETH for gas | Free |
| **MetaMask** (or any wallet) | Generate wallet address + private key | Free |

### RPC Provider Setup

The backend connects to Sepolia via an RPC URL from Infura or Alchemy:

```
https://sepolia.infura.io/v3/YOUR_PROJECT_ID
```

This is configured in the `.env` file. The backend uses `ethers.js` `JsonRpcProvider` to connect.

---

## Smart Contracts

### Overview

Three simple, non-upgradeable Solidity contracts:

| Contract | File | Purpose | Gas per Call (est.) |
|----------|------|---------|---------------------|
| **MedicalRecords** | `contracts/MedicalRecords.sol` | Store & verify record hashes | ~50,000–80,000 |
| **ConsentManager** | `contracts/ConsentManager.sol` | Manage consent grants/revocations | ~60,000–100,000 |
| **AuditTrail** | `contracts/AuditTrail.sol` | Immutable event logging | ~40,000–60,000 |

### MedicalRecords.sol

**Purpose**: Provides an immutable, tamper-proof ledger of medical record hashes. When a record is created, its SHA-256 hash is stored on-chain. Later, the system can verify that the MongoDB record hasn't been altered by comparing the stored hash.

**Functions**:
| Function | Access | Description |
|----------|--------|-------------|
| `storeRecord(recordId, ipfsHash, recordHash)` | Owner only | Stores the record hash on-chain |
| `getRecordHash(recordId)` | Public | Returns the stored hash for a record |
| `verifyRecord(recordId, hash)` | Public | Compares provided hash against stored hash |

**Events**:
- `RecordStored(string recordId, string ipfsHash, bytes32 recordHash, uint256 timestamp)`

### ConsentManager.sol

**Purpose**: Tracks consent grants and revocations on-chain for auditability. When a patient grants a doctor access to their records, this is recorded immutably.

**Functions**:
| Function | Access | Description |
|----------|--------|-------------|
| `grantConsent(consentId, patientId, doctorId, accessLevel)` | Owner only | Records a consent grant |
| `revokeConsent(consentId)` | Owner only | Marks consent as revoked |
| `checkConsent(consentId)` | Public | Returns consent status and access level |

**Events**:
- `ConsentGranted(string consentId, string patientId, string doctorId, string accessLevel, uint256 timestamp)`
- `ConsentRevoked(string consentId, uint256 timestamp)`

### AuditTrail.sol

**Purpose**: Append-only log for critical system events. Only important events are logged on-chain to save gas.

**On-chain events** (3 types only):
- `record_created` — When a medical record is created
- `consent_granted` — When consent is granted to a doctor
- `consent_revoked` — When consent is revoked

All other audit events (logins, profile updates, etc.) remain in MongoDB only.

**Functions**:
| Function | Access | Description |
|----------|--------|-------------|
| `logEvent(action, userId, resourceId, resourceType)` | Owner only | Logs an event on-chain |
| `getEventCount()` | Public | Returns total number of logged events |

**Events**:
- `AuditEvent(string action, string userId, string resourceId, string resourceType, uint256 timestamp)`

### Access Control

All write functions are restricted to the **contract owner** (the wallet whose private key is in the backend `.env`). This means:
- Only the BMRMS backend can write to the contracts
- Anyone can read/verify data (public view functions)
- The backend acts as a trusted intermediary between users and the blockchain

---

## Backend Integration

### blockchain.service.js — Before vs After

| Function | Before (Mock) | After (Real) |
|----------|---------------|--------------|
| `storeRecordHash(recordId, patientId, ipfsHash, recordHash)` | Returns `ethers.id(...)` as fake hash | Calls `MedicalRecords.storeRecord()`, returns real tx receipt |
| `verifyRecordHash(recordId, recordHash)` | Returns `{ verified: true }` always | Calls `MedicalRecords.verifyRecord()`, returns actual comparison |
| `grantConsentOnChain(consentId, patientId, doctorId, accessLevel)` | Returns fake tx hash | Calls `ConsentManager.grantConsent()`, returns real tx receipt |
| `revokeConsentOnChain(consentId)` | Returns fake tx hash | Calls `ConsentManager.revokeConsent()`, returns real tx receipt |
| `checkConsentOnChain(patientId, doctorId)` | Returns `{ hasConsent: true }` always | Calls `ConsentManager.checkConsent()`, returns real data |
| `logAuditOnChain(action, userId, resourceId, resourceType)` | Returns fake tx hash | Calls `AuditTrail.logEvent()`, returns real tx receipt |

### BLOCKCHAIN_ENABLED Toggle

A new environment variable `BLOCKCHAIN_ENABLED` (default: `false`) controls whether real blockchain calls are made:

- `BLOCKCHAIN_ENABLED=false` → Mock behavior (current behavior, app works without blockchain)
- `BLOCKCHAIN_ENABLED=true` → Real Ethereum transactions

This allows development and testing without a blockchain connection.

### ABI Loading

After Hardhat compiles the contracts (`npx hardhat compile`), it generates JSON artifacts in `backend/artifacts/contracts/`. The `blockchain.service.js` loads the ABIs from these files at startup.

---

## Data Flow

### Medical Record Creation

```
Doctor uploads record via POST /api/v1/records
    │
    ├── 1. Encrypt file buffer (AES-256-GCM)
    ├── 2. Upload encrypted file to IPFS → get ipfsHash
    ├── 3. Generate SHA-256 hash of record metadata → recordHash
    ├── 4. Store on Ethereum: MedicalRecords.storeRecord(recordId, ipfsHash, recordHash)
    │       └── Returns: transactionHash, blockNumber
    ├── 5. Save to MongoDB: MedicalRecord.create({
    │       ipfsHash, blockchainHash: recordHash, blockchainTxHash: tx.hash, ...
    │   })
    └── 6. Log to MongoDB: AuditLog.create({ action: 'record_created', ... })
           └── Also: AuditTrail.logEvent('record_created', ...) [on-chain]
```

### Record Integrity Verification

```
User requests GET /api/v1/records/:id/verify
    │
    ├── 1. Fetch record from MongoDB → get blockchainHash
    ├── 2. Call MedicalRecords.verifyRecord(recordNumber, blockchainHash)
    │       └── Contract compares stored hash vs provided hash
    └── 3. Return { verified: true/false }
```

### Consent Grant/Revoke

```
Patient grants consent via POST /api/v1/consent/grant
    │
    ├── 1. Validate patient and check for existing consent (MongoDB)
    ├── 2. Store on Ethereum: ConsentManager.grantConsent(consentId, patientId, doctorId, accessLevel)
    │       └── Returns: transactionHash
    ├── 3. Save to MongoDB: Consent.create({ blockchainTxHash: tx.hash, ... })
    └── 4. Log: AuditLog + AuditTrail.logEvent('consent_granted', ...)

Patient revokes consent via DELETE /api/v1/consent/:id
    │
    ├── 1. Fetch consent from MongoDB
    ├── 2. Store on Ethereum: ConsentManager.revokeConsent(consentId)
    ├── 3. Update MongoDB: consent.revoke(userId, reason)
    └── 4. Log: AuditLog + AuditTrail.logEvent('consent_revoked', ...)
```

---

## Security Considerations

### Private Key Management

- The backend wallet private key is stored in `.env` (never committed to git)
- This key signs all blockchain transactions
- In production, use a secrets manager (AWS Secrets Manager, HashiCorp Vault, etc.)

### On-Chain Data Privacy

- **NO patient data is stored on-chain** — only hashes and identifiers
- Record contents remain encrypted in IPFS and queryable in MongoDB
- Even if someone reads the blockchain, they cannot derive any patient information

### Contract Ownership

- All write operations are owner-restricted (`onlyOwner` modifier)
- Only the backend wallet can write to the contracts
- Read/verify operations are public (anyone can verify integrity)

### Transaction Failures

- If a blockchain transaction fails, the backend catches the error
- Record/consent is still saved to MongoDB (with `blockchainTxHash: null`)
- The system remains functional — blockchain is supplementary, not blocking

---

## Environment Setup

### Prerequisites

| Step | Action | Link |
|------|--------|------|
| 1 | Install **MetaMask** browser extension | [metamask.io](https://metamask.io) |
| 2 | Create a wallet and **export the private key** | MetaMask → Account Details → Export Private Key |
| 3 | Switch MetaMask to **Sepolia testnet** | MetaMask → Network Dropdown → Sepolia |
| 4 | Get **free Sepolia ETH** from a faucet | [sepoliafaucet.com](https://sepoliafaucet.com) or [Google Cloud Faucet](https://cloud.google.com/application/web3/faucet/ethereum/sepolia) |
| 5 | Create a free **Infura account** | [infura.io](https://infura.io) → Create Project → Copy Sepolia URL |
| 6 | Run `npm install` in `backend/` | Installs Hardhat + all dependencies |

### Environment Variables

```env
# Blockchain Configuration
BLOCKCHAIN_ENABLED=true
BLOCKCHAIN_NETWORK=sepolia
BLOCKCHAIN_RPC_URL=https://sepolia.infura.io/v3/YOUR_INFURA_PROJECT_ID
BLOCKCHAIN_CHAIN_ID=11155111
BLOCKCHAIN_PRIVATE_KEY=0xYOUR_METAMASK_PRIVATE_KEY

# Contract Addresses (populated after deployment)
RECORD_CONTRACT_ADDRESS=0x_deployed_address
CONSENT_CONTRACT_ADDRESS=0x_deployed_address
AUDIT_CONTRACT_ADDRESS=0x_deployed_address
```

---

## Deployment Process

### Step 1: Compile Contracts

```bash
cd backend
npx hardhat compile
```

This generates ABI artifacts in `backend/artifacts/contracts/`.

### Step 2: Run Tests

```bash
npx hardhat test
```

Runs all contract unit tests using Hardhat's built-in local Ethereum node.

### Step 3: Deploy to Sepolia

```bash
npx hardhat run scripts/deploy.cjs --network sepolia
```

This:
1. Deploys `MedicalRecords`, `ConsentManager`, and `AuditTrail` to Sepolia
2. Prints the deployed contract addresses to the console
3. Saves addresses to `backend/deployments.json`

### Step 4: Update .env

Copy the deployed contract addresses into your `.env`:

```env
RECORD_CONTRACT_ADDRESS=0x1234...
CONSENT_CONTRACT_ADDRESS=0x5678...
AUDIT_CONTRACT_ADDRESS=0x9abc...
```

### Step 5: Verify on Etherscan

Visit [sepolia.etherscan.io](https://sepolia.etherscan.io) and search for each contract address to confirm deployment.

### Step 6: Start Backend

```bash
npm run dev
```

The backend will now make real blockchain transactions on every record creation, consent grant/revoke, and critical audit event.

---

## File Changes Summary

### New Files (6)

| File | Type | Description |
|------|------|-------------|
| `backend/contracts/MedicalRecords.sol` | Solidity | Record hash storage contract |
| `backend/contracts/ConsentManager.sol` | Solidity | Consent management contract |
| `backend/contracts/AuditTrail.sol` | Solidity | Immutable audit log contract |
| `backend/hardhat.config.cjs` | JavaScript | Hardhat compiler + network config |
| `backend/scripts/deploy.cjs` | JavaScript | Contract deployment script |
| `backend/test/contracts.test.cjs` | JavaScript | Smart contract unit tests |

### Modified Files (4)

| File | Change |
|------|--------|
| `backend/src/services/blockchain.service.js` | Mock functions → real contract calls, ABI loading, BLOCKCHAIN_ENABLED toggle |
| `backend/src/config/index.js` | Add `blockchain.enabled` field |
| `backend/.env` + `.env.example` | Sepolia network config, contract addresses |
| `backend/package.json` | Hardhat devDependencies, new npm scripts |

### Unchanged Files

All models, other services, routes, middleware, and the entire frontend remain unchanged.
