### 4.3 Graphical View of the Project
The graphical views of the project help readers quickly grasp the overall system architecture, data flow, and the end-to-end user experience. By mapping the abstract technical concepts to tangible user interfaces, these visuals breathe life into the theoretical models discussed in the previous section [1]. 

The Next.js frontend is structured around a Role-Based Access Control (RBAC) architecture, intelligently adapting its views whether the authenticated user is a **Doctor**, **Patient**, or **Administrator**. The following diagrams and interface views systematically cover every primary page, subpage, and feature module within the application for each unique user role.

#### 4.3.1 System Architecture Diagram
The architecture diagram illustrates the system's three-tier hybrid approach, which is designed to be both highly scalable and strictly private. The approach is a combination of the best of both worlds:
1. **The Blockchain:** Acts as a neutral trust backbone, handling metadata verification and executing immutable access logic via `ConsentManager.sol`, `AuditTrail.sol`, and `MedicalRecords.sol` smart contracts on the Ethereum network.
2. **IPFS & Local Caching:** Act as performance accelerators. The InterPlanetary File System securely stores the heavily encrypted, high-volume files, while local browser caching (via Service Workers) ensures clinical data is instantly retrievable even offline [1].

#### 4.3.2 Secure Login and Authentication Interface (`/login`)
The **Login Page** serves as the system's shared secure entry point for all roles. Visually, it provides a clean, minimalistic interface where healthcare providers, administrators, and patients authenticate using secure credentials. 
* **Feature Highlight:** Behind the scenes, this view interacts with the backend authentication services to issue secure JWT (JSON Web Tokens). It establishes the RBAC session required before the React Router permits navigation to any protected dashboard route, shielding all sensitive healthcare boundaries and establishing the user's role payload.

#### 4.3.3 The Main Command Dashboard (`/dashboard`)
The **Dashboard View** acts as the central command center, dynamically molding itself to the user's explicit role payload via RBAC UI rendering.
* **For Providers (Doctors):** Upon logging in, doctors are presented with high-level clinical metrics—such as recent patient interactions in their assigned department, pending consent approvals from patients, and active sync statuses. This graphical view aggregates data fetched securely from the off-chain MongoDB instance, providing a fast, at-a-glance summary of hospital operations.
* **For Patients:** The layout heavily emphasizes data sovereignty. It highlights the total number of medical facilities currently accessing their file, lists active consent agreements waiting for their review, and shows recent audit trail alerts to ensure their data hasn't been misused.
* **For Administrators:** The dashboard shifts focus from clinical data to system health. Admins see overarching statistics like total registered users across the platform, global system uptime, rate-limiting statuses, and IPFS node connectivity health. 

#### 4.3.4 Patients Directory (`/patients`)
The **Patients Page** forms the core of the clinical workflow, filtering results strictly by role.
* **For Providers (Doctors):** It features a robust search and filtering directory interface. Doctors use this graphical view to securely query the blockchain metadata and database, quickly locating specific patient profiles assigned to them or searching the global registry to request emergency access.
* **For Patients:** This view is heavily restricted or non-existent, ensuring they cannot browse the global patient registry of the hospital, thus complying with strict NDPA privacy laws.
* **For Administrators:** Admins use this view to manage system records. While they cannot view decrypted medical files (due to cryptographic barriers), they can manage account statuses, handle password resets, and audit the system metadata of patient records.

#### 4.3.5 Individual Patient Timeline and Records (`/patients/[id]`)
Clicking into a specific patient from the directory opens their **Detail Subpage**. This is the highest-density graphical view in the application.
* **For Providers (Doctors):** 
    * **The Health Timeline:** Displays a chronological feed of past diagnoses, uploaded encrypted IPFS files (like X-Rays or lab results), and medical notes.
    * **File Decryption UI:** Providers can click specifically requested files to trigger the background AES-256 decryption sequence, seamlessly rendering the confidential medical file directly into the browser memory without exposing it to local hard drives.
    * **Offline-First Interaction:** A key visual highlight of this workflow is the Service Worker’s role in handling data during connectivity outages. The UI decouples the "save medical record" action from the blockchain confirmation. If a provider is offline, the interface visually queues the action locally and syncs it securely in the background once the connection is restored, ensuring that clinical workflows are never stalled by network latency [1].
* **For Patients:** Instead of looking up other patients, this view loads *their own* health timeline. They can review the exact medical notes doctors have uploaded about them, download their own encrypted files from IPFS, and maintain full visibility over their health history.

#### 4.3.6 Patient Access and Consent Dashboard (`/consent`)
The **Consent Page** represents the Ethereum smart contract interface, completely changing functionality based on the user's role.
* **For Patients:** This is a self-sovereign interface allowing users to visually audit exactly which facilities and doctors have been granted access to their medical records [13]. Patients use interactive toggles to grant, modify, or instantly revoke permissions. The transparent access controls presented on this dashboard empower patients to monitor potential data misuse, fundamentally restoring trust in the modern healthcare system [1]. Every toggle switched on this graphical interface triggers a direct state change on the underlying Ethereum smart contracts via `ethers.js`.
* **For Providers (Doctors):** Doctors use this interface not to grant permissions, but to *request* access. They can view a list of their current, active access grants, see when a consent token is about to expire, and submit on-chain queries requesting new access levels from patients.
* **For Administrators:** Admins see an aggregated, anonymized audit trail of consent events to ensure compliance with hospital policy, but cannot forge consent or bypass the blockchain's cryptographic access controls.

#### 4.3.7 Application Settings and Security Configurations (`/settings`)
The **Settings Page** provides a graphical interface for configuring user preferences and security parameters. 
* **For All Roles:** Users can manage their demographic details, update their local encryption key preferences, and interact with account-level security features. This page ensures that the complex cryptographic layers and Ethereum wallet interactions required by the system remain user-friendly and accessible without intimidating the end-user.
* **Role-Specific Settings:** Doctors can configure their departments and clinical specialties, while Administrators gain access to global system flags, such as toggling the global `BLOCKCHAIN_ENABLED` variable or adjusting global rate-limiting configurations.

#### 4.3.8 Entity Relationship & On-Chain/Off-Chain Data Mapping
Finally, the data mapping diagram illustrates the strict division between what data is stored on the public blockchain versus what is kept safely off-chain. By only storing the cryptographic digital footprints (hashes) and consent logs on the blockchain, while keeping the encrypted payload files on IPFS and fast-query metadata in MongoDB, the application definitively abides by strict healthcare data privacy laws such as the NDPA for all users.
