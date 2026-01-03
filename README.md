# Simba Bingwa Kikoba Endelevu (SBK)

**Simba Bingwa Kikoba Endelevu (SBK)** is a comprehensive React Native/Expo mobile application with a Next.js web admin dashboard designed for managing community savings groups (Vikoba). It handles member management, transaction tracking (contributions, loans, repayments), and provides detailed reporting and audit logs.

---

## 📑 Table of Contents

1. [Features](#features)
2. [Project Quick Start](#project-quick-start)
3. [Member ID System](#member-id-system)
4. [Bulk Transaction Upload](#bulk-transaction-upload)
5. [Standard Loan Interest (10%)](#standard-loan-interest-10)
6. [Email Reminder System](#email-reminder-system)
7. [Firestore Security Rules](#firestore-security-rules)
8. [Security & Type Safety](#security--type-safety)
9. [Deployment Instructions](#deployment-instructions)
10. [Project Structure](#project-structure)
11. [Testing & Troubleshooting](#testing--troubleshooting)

---

## 🚀 Features

- ✅ **Member Management**: Authentication and role-based access (Admins & Members).
- ✅ **Member ID System**: Automatic generation of IDs (SBK001, SBK002) for all members.
- ✅ **Bulk Upload**: Batch process contributions from Excel files.
- ✅ **Transaction Tracking**: Record contributions (Hisa, Jamii), loans (Standard, Dharura), and repayments.
- ✅ **Interest Logic**: Automatic 10% interest application for Standard loans.
- ✅ **Email Reminder System**: Automated and manual reminders for contributions and loan repayments.
- ✅ **Reporting**: Monthly statistics and reports for both individuals and the entire group.
- ✅ **Audit Trail**: Detailed activity logging for all administrative actions.
- ✅ **Security**: Secure credential management and input validation.
- ✅ **Cross-Platform**: Mobile app (iOS/Android) and Web Admin Portal.

---

## 🛠️ Project Quick Start

### 1. Prerequisites
- Node.js & npm
- Expo CLI
- Firebase Project

### 2. Environment Setup
Create a `.env.local` file in both the root directory (for mobile) and the `/web` directory.

**Mobile App (.env.local):**
```env
EXPO_PUBLIC_FIREBASE_API_KEY=your_api_key
EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN=your_auth_domain
EXPO_PUBLIC_FIREBASE_PROJECT_ID=your_project_id
EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET=your_bucket
EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
EXPO_PUBLIC_FIREBASE_APP_ID=your_app_id
```

**Web App (web/.env.local):**
```env
NEXT_PUBLIC_FIREBASE_API_KEY=your_api_key
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your_auth_domain
NEXT_PUBLIC_FIREBASE_PROJECT_ID=your_project_id
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=your_bucket
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
NEXT_PUBLIC_FIREBASE_APP_ID=your_app_id

# Server-Side Variables
FIREBASE_PROJECT_ID=your_project_id
FIREBASE_CLIENT_EMAIL=your_service_account_email
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"

# Email Configuration
EMAIL_USER=your-email@gmail.com
EMAIL_PASSWORD=your-app-password
```

### 3. Installation
```bash
# Install root dependencies (Mobile)
npm install

# Install web dependencies
cd web
npm install
cd ..
```

---

## 🆔 Member ID System

- **Format**: `SBK001`, `SBK002`, `SBK003`, etc.
- **Generation**: New members get an ID automatically upon signup.
- **Admin Tools**: On the **Members** screen (both Web and Mobile), admins can click **"Generate IDs"** to assign sequential IDs to any existing members who lack one.
- **Display**: Shown prominently on Member details and Profile screens.

---

## 📊 Bulk Transaction Upload

Admins can batch-import monthly contributions (Hisa & Jamii) using an Excel file.

### Excel Template Format
| Date       | Member ID | Full name      | HISA Amount | Jamii Amount |
|------------|-----------|----------------|-------------|--------------|
| 2026-01-15 | SBK001    | John Doe       | 30000       | 5000         |
| 2026-01-15 | SBK002    | Jane Smith     | 30000       | 5000         |

### Usage (Mobile)
1. Navigate to **Transactions** screen.
2. Tap **"Bulk Upload"**.
3. Select your Excel file.
4. Preview the validation results (checks for valid Member IDs and amounts).
5. Click **"Process"** to create all transactions at once.

---

## 📉 Standard Loan Interest (10%)

All Standard loans automatically accrue a **10% interest** charge at the time of creation.

- **Storage**: The principal is stored in `originalAmount` and the total (principal + 10%) is stored in `amount`.
- **Display**: UI shows a live interest preview during creation.
- **Active Loans**: The dashboard counts "Active Loans" only for members with an outstanding balance > 0.
- **Migration**: For historical data, an admin can run the **"Migrate Standard Loans"** tool in the **Profile** (Mobile) or **Reminders** (Web) section to apply the 10% rate retroactively to old loans.

---

## 📧 Email Reminder System

A dual-reminder system that sends:
1. **Contribution Reminders**: To all members about monthly HISA and JAMII contributions (30,000 & 5,000).
2. **Loan Repayment Reminders**: To members with outstanding loans, showing their current balance.

- **Mobile**: Dashboard → Send Reminders section (Admin only).
- **Web**: Reminders page in the sidebar menu.

---

## 🔐 Firestore Security Rules

To ensure data integrity and security, use the following rules in your Firebase Console. These rules allow Admins to manage Member IDs and Transactions while protecting individual user privacy.

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    
    // Users collection - users can read/write their own document
    // Admin users can update ANY document (needed for Member ID generation)
    match /users/{userId} {
      allow read: if request.auth != null;
      allow write: if request.auth != null && request.auth.uid == userId;
      allow update, delete: if request.auth != null && 
        get(/databases/$(database)/documents/users/$(request.auth.uid)).data.role == 'Admin';
    }
    
    // Transactions collection - authenticated users can read, only admins can write
    match /transactions/{transactionId} {
      allow read: if request.auth != null;
      allow write: if request.auth != null && 
        get(/databases/$(database)/documents/users/$(request.auth.uid)).data.role == 'Admin';
    }

    // GroupCodes collection - allow read for group code validation
    match /groupCodes/{code} {
      allow read: if true;
      allow update: if request.auth != null;
    }

    // Activity Logs - Only admins can read, members can create
    match /activityLogs/{logId} {
      allow read: if request.auth != null && 
        get(/databases/$(database)/documents/users/$(request.auth.uid)).data.role == 'Admin';
      allow create: if request.auth != null;
      allow update, delete: if false;
    }
    
    // Default catch-all rule
    match /{document=**} {
      allow read: if request.auth != null;
      allow write: if false;
    }
  }
}
```

---

## 🚢 Deployment Instructions

### Vercel (Web Admin)
1. Import the repository to Vercel.
2. Set **Root Directory** to `web`.
3. Configure all environment variables.
4. Deployment will trigger automatically on push to `master`.

### EAS Build (Mobile App)
1. Install EAS CLI: `npm install -g eas-cli`.
2. Login: `eas login`.
3. Build for Android: `eas build --platform android`.
4. Build for iOS: `eas build --platform ios`.

---

## 📁 Project Structure

```
Maono_App/
├── app/                  # Mobile UI (Expo Router)
├── components/           # Reusable React Native components
├── services/             # API and business logic
├── web/                  # Next.js Admin Dashboard
│   ├── app/              # Web pages and API routes
│   └── lib/              # Web-specific logic
└── i18n/                 # Internationalization (EN/SW)
```

---

## ❓ Testing & Troubleshooting

### Troubleshooting Checklist
1. **Firebase Permission Denied**: Verify Firestore rules are published.
2. **Emails Not Sending**: Check `EMAIL_PASSWORD` (use App Password for Gmail).
3. **Invalid Token**: Ensure you are logged in as an Admin.
4. **Member IDs Missing**: Use the "Generate IDs" tool in the Members/Profile screen.

---

**Last Updated:** January 3, 2026
**Status:** ✅ Production Ready
