# BMRMS (Blockchain Medical Records Management System)
**Project Handover Documentation**

Welcome! This guide will walk you through everything you need to understand and run the BMRMS system.  

---

## 1. What Does This System Do?

BMRMS is a secure, web-based application for managing medical records. Think of it as a **digital filing cabinet** with two special superpowers:

- **Privacy:** Only doctors who have been granted permission ("consent") by a patient can view that patient's records.
- **Tamper-proof logging:** Every time someone views or changes a record, it can be permanently logged on a **Blockchain** — a technology that makes logs impossible to secretly delete or edit.

The system supports three types of users:
| Role | What they can do |
|------|-----------------|
| **Doctor** | View and manage their patients' medical records |
| **Patient** | View their own records, grant/revoke doctor access |
| **Admin** | Manage all users, patients, and system settings |

---

## 2. How Is It Built?

The app has four parts that work together:

```
┌─────────────────┐     talks to     ┌──────────────────┐
│   Frontend       │ ──────────────► │   Backend Server  │
│  (The Website)   │                 │  (The Brains)     │
│   Port 3000      │                 │   Port 5000       │
└─────────────────┘                 └──────┬───────────┘
                                           │
                              saves data to │
                         ┌─────────────────┼──────────────┐
                         ▼                 ▼              ▼
                   ┌──────────┐    ┌────────────┐  ┌────────────┐
                   │ MongoDB  │    │   IPFS     │  │ Blockchain │
                   │ Database │    │  Storage   │  │  Contracts │
                   │(user data)│   │(big files) │  │  (logs)    │
                   └──────────┘    └────────────┘  └────────────┘
```

1. **Frontend** (the website) — What users see and click on. Built with React/Next.js.
2. **Backend** (the server) — Handles all the logic behind the scenes. Built with Node.js/Express.
3. **MongoDB** — The database where user accounts and patient profiles are stored.
4. **Blockchain & IPFS** — Optional advanced features for tamper-proof logging and decentralized file storage. **Not required to get started — the system works without them.**

---

## 3. Does It Work Right Now?

**Status: ✅ CORE SYSTEMS CONNECTED AND FUNCTIONAL**

When you follow the setup steps below:
1. ✅ The website successfully communicates with the backend server.
2. ✅ The server successfully saves and retrieves data from the MongoDB database.
3. ⚙️ Blockchain logging is turned **OFF by default** (runs in mock mode). You can enable it later if needed.
4. ⚙️ IPFS file storage is configured but requires a separate IPFS service to be running.

> **For a basic working demo**, you only need: the Frontend, the Backend, and a MongoDB database. The blockchain and IPFS parts are optional.

---

## 4. How To Set It Up (Step-by-Step)

### Step 0: Install Required Software

Before anything else, you need to install these two programs on your computer:

**Node.js** (the engine that runs the app):
1. Go to [https://nodejs.org](https://nodejs.org)
2. Download the **LTS** version (the big green button)
3. Run the installer — click "Next" through all the defaults
4. To verify it worked: open a terminal (search "Terminal" or "Command Prompt" on your computer) and type:
   ```
   node --version
   ```
   You should see something like `v18.x.x` or higher.

**MongoDB** (the database):
- **Easiest option — use the free cloud version:**
  1. Go to [https://www.mongodb.com/cloud/atlas](https://www.mongodb.com/cloud/atlas)
  2. Create a free account
  3. Create a free cluster (choose the free tier, any region)
  4. Click "Connect" → "Drivers" → "Node.js"
  5. Copy the connection string — it looks like: `mongodb+srv://username:password@cluster0.xxxxx.mongodb.net/bmrms`
  6. You'll paste this into your settings file in Step 2.

---

### Step 1: Set Up Your Secret Settings Files

The app needs to know your database address, passwords, and other settings. These are stored in hidden files called `.env` files that you create yourself.

#### Backend Settings (`backend/.env`)

1. Open the `backend` folder
2. You should see a file called `.env.example` — this is a template
3. Make a **copy** of `.env.example` and rename the copy to `.env`
4. Open `.env` in any text editor (Notepad works fine)
5. Fill in these important values:

```env
# Server Configuration (these defaults are fine, don't change them)
NODE_ENV=development
PORT=5000
API_VERSION=v1

# Database — PASTE YOUR MONGODB CONNECTION STRING HERE
MONGODB_URI=mongodb+srv://YOUR_USERNAME:YOUR_PASSWORD@cluster0.xxxxx.mongodb.net/bmrms?retryWrites=true&w=majority

# Security Keys — replace with any long random text you want
JWT_SECRET=replace-this-with-a-long-random-sentence-like-MyDogAte42Pancakes
JWT_EXPIRES_IN=7d
JWT_REFRESH_SECRET=replace-with-another-long-random-sentence-like-TheCatSang99Songs
JWT_REFRESH_EXPIRES_IN=30d

# Encryption — must be exactly 32 characters long
ENCRYPTION_KEY=abcdefghijklmnopqrstuvwxyz123456

# Blockchain — leave these as-is to start (blockchain is disabled by default)
BLOCKCHAIN_ENABLED=false
BLOCKCHAIN_NETWORK=localhost
BLOCKCHAIN_RPC_URL=http://127.0.0.1:8545
BLOCKCHAIN_CHAIN_ID=1337
BLOCKCHAIN_PRIVATE_KEY=
CONSENT_CONTRACT_ADDRESS=
RECORD_CONTRACT_ADDRESS=
AUDIT_CONTRACT_ADDRESS=

# IPFS — leave these as-is to start
IPFS_HOST=localhost
IPFS_PORT=5001
IPFS_PROTOCOL=http
IPFS_GATEWAY=http://localhost:8080/ipfs/

# CORS — tells the server to accept requests from the website
CORS_ORIGIN=http://localhost:3000

# Logging
LOG_LEVEL=info

# Rate Limiting (request limits, defaults are fine)
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100
```

> **The most important thing to fill in is the `MONGODB_URI`** — without it, nothing works.  
> The `JWT_SECRET` and `JWT_REFRESH_SECRET` can be any random text — they're used to secure user logins.

#### Frontend Settings (`Frontend/.env.local`)

1. Open the `Frontend` folder
2. Create a new file called `.env.local` (or edit it if it already exists)
3. Put this single line in it:

```env
NEXT_PUBLIC_API_URL=http://localhost:5000/api/v1
```

This tells the website where to find the backend server.

---

### Step 2: Start the Backend Server

Open a terminal window:
```bash
cd backend
npm install
npm run dev
```

- `npm install` downloads all the software the backend needs (only needed the first time)
- `npm run dev` starts the server

You should see output like:
```
✅ Connected to MongoDB
🚀 Server running on port 5000
```

> **Leave this terminal window open!** The server needs to keep running.

---

### Step 3: Start the Frontend Website

Open a **second** terminal window:
```bash
cd Frontend
npm install
npm run dev
```

You should see output like:
```
▲ Next.js 15.x.x
- Local: http://localhost:3000
```

**Open your web browser and go to: [http://localhost:3000](http://localhost:3000)**

🎉 You should see the BMRMS login page!

---

## 5. How To Use the App

### Creating Your First User Account

Since this is a fresh start, there are no users yet. You need to create one:

1. Open your web browser and go to: `http://localhost:3000`
2. The login page will appear — but you don't have an account yet
3. To create a user, open a **third terminal window** and run this command:

```bash
curl -X POST http://localhost:5000/api/v1/auth/register -H "Content-Type: application/json" -d "{\"firstName\": \"Admin\", \"lastName\": \"User\", \"email\": \"admin@bmrms.com\", \"password\": \"Password123!\", \"role\": \"admin\"}"
```

> **If `curl` doesn't work on your computer (Windows):** Instead, open your browser and go to `http://localhost:5000/api/v1/health` to verify the server is running. Then you can use a free tool like [Postman](https://www.postman.com/downloads/) to send the registration request.

4. Now go back to `http://localhost:3000` and log in with:
   - Email: `admin@bmrms.com`
   - Password: `Password123!`

5. Once logged in as admin, you can create Doctor and Patient accounts through the app's patient management page.

---

## 6. Troubleshooting (If Something Goes Wrong)

| Problem | Solution |
|---------|----------|
| `npm install` shows errors | Make sure Node.js is installed (run `node --version`). Delete the `node_modules` folder and try `npm install` again. |
| "Cannot connect to MongoDB" | Check that your `MONGODB_URI` in `backend/.env` is correct. Make sure you replaced `YOUR_USERNAME` and `YOUR_PASSWORD` with your actual MongoDB Atlas credentials. |
| Website shows a blank page | Make sure the backend is running (check Terminal 1). Check that `Frontend/.env.local` has the correct API URL. |
| "CORS error" in the browser console | Make sure `CORS_ORIGIN=http://localhost:3000` is set in your `backend/.env` file. |
| Port already in use | Another program is using port 5000 or 3000. Close it, or change the `PORT` value in the `.env` file. |
| Login fails after registration | Double-check that you typed the email and password exactly as you registered them. Passwords are case-sensitive. |

---

## 7. Optional: Setting Up the Blockchain

> **You do NOT need this to use the app.** The app works perfectly fine without it. This is only needed if you want tamper-proof logging on a real blockchain.

### 7.1 Start a Local Blockchain (Terminal Window)
```bash
cd smart_contracts
npm install
npx hardhat node
```
Leave this running.

### 7.2 Deploy the Smart Contracts (Another Terminal)
```bash
cd smart_contracts
npx hardhat run scripts/deploy.cjs --network localhost
```

This will print three addresses like `0x5FbDB2315...`. Copy them.

### 7.3 Update Your Backend Settings
Open `backend/.env` and update:
```env
BLOCKCHAIN_ENABLED=true
BLOCKCHAIN_RPC_URL=http://127.0.0.1:8545
BLOCKCHAIN_PRIVATE_KEY=<copy Account #0 private key from the Hardhat terminal>
CONSENT_CONTRACT_ADDRESS=<paste address 1>
RECORD_CONTRACT_ADDRESS=<paste address 2>
AUDIT_CONTRACT_ADDRESS=<paste address 3>
```

Restart the backend server — blockchain logging is now active.

---

## 8. Project File Structure

```
LEAAS-BMRMS/
├── Frontend/          ← The website (React/Next.js)
│   ├── app/           ← All the pages (login, dashboard, patients, etc.)
│   ├── components/    ← Reusable UI pieces (sidebar, buttons, cards)
│   ├── lib/           ← Data fetching logic (API calls)
│   └── .env.local     ← Frontend settings
│
├── backend/           ← The server (Node.js/Express)
│   ├── src/
│   │   ├── routes/    ← API endpoints
│   │   ├── models/    ← Database schemas
│   │   ├── services/  ← Business logic (blockchain, IPFS)
│   │   └── config/    ← Settings loader
│   ├── .env           ← Backend settings (secrets!)
│   └── .env.example   ← Template for .env
│
├── smart_contracts/   ← Blockchain code (Solidity)
│   ├── contracts/     ← The smart contracts
│   ├── scripts/       ← Deploy script
│   └── test/          ← Contract tests
│
└── HANDOVER.md        ← This file!
```

---

## Additional otes

- **Deployment**: Currently everything runs on your computer ("locally"). The next step is deploying to the internet using services like Vercel (frontend) and Railway or AWS (backend) so anyone can access it via a real website URL.
- **Real Blockchain**: The local test blockchain resets every time you stop it. For permanent logging, deploy the contracts to a public test network like Ethereum Sepolia.
 
