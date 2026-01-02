# KIKOBA - Community Savings Group Management System

**KIKOBA** is a comprehensive React Native/Expo mobile application with a Next.js web admin dashboard designed for managing community savings groups (Vikoba). It handles member management, transaction tracking (contributions, loans, repayments), and provides detailed reporting and audit logs.

---

## 📑 Table of Contents

1. [Features](#features)
2. [Project Quick Start](#project-quick-start)
3. [Email Reminder System](#email-reminder-system)
   - [Setup](#email-system-setup)
   - [Usage](#email-system-usage)
   - [Migration Guide](#email-migration-guide)
4. [Security & Type Safety](#security--type-safety)
5. [Firestore Security Rules](#firestore-security-rules)
6. [Deployment Instructions](#deployment-instructions)
7. [Project Structure](#project-structure)
8. [Testing & Troubleshooting](#testing--troubleshooting)

---

## 🚀 Features

- ✅ **Member Management**: Authentication and role-based access (Admins & Members).
- ✅ **Transaction Tracking**: Record contributions (HISA, JAMII), loans (Standard, Dharura), and repayments.
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

### 4. Running the Apps
```bash
# Start Mobile App
npx expo start

# Start Web App
cd web
npm run dev
```

---

## 📧 Email Reminder System

A dual-reminder system that sends:
1. **Contribution Reminders**: To all members about monthly HISA (30,000) and JAMII (5,000) contributions.
2. **Loan Repayment Reminders**: To members with outstanding loans, showing their current balance.

### Setup
1. Configure Gmail App Password (if using Gmail).
2. Add credentials to `web/.env.local`.
3. Verify connection in the admin dashboard.

### Usage
- **Mobile**: Dashboard → Send Reminders section (Admin only).
- **Web**: Reminders page in the sidebar menu.

### Email Migration Guide
We have migrated from **EmailJS** (client-side) to **Nodemailer** (server-side) for better security and zero cost.
- **Old way**: Mobile → EmailJS API (Public keys exposed).
- **New way**: Mobile → Next.js API → SMTP (Credentials secure on server).

---

## 🔒 Security & Type Safety

### 1. Credential Security
- No hardcoded secrets. All API keys and private keys are stored in environment variables.
- `.env` files are ignored by git.

### 2. Input Validation
Comprehensive validation service implemented for:
- Email formats
- Passwords (strength and matching)
- Amounts (numeric limits)
- Group codes and phone numbers

### 3. Type Safety
- 100% TypeScript coverage.
- Centralized types in `types/index.ts`.
- No `any` types in core logic.

---

## 🔐 Firestore Security Rules

To ensure data integrity and security, use the following rules in your Firebase Console:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /users/{userId} {
      allow read: if request.auth != null;
      allow write: if request.auth != null && request.auth.uid == userId;
    }
    match /members/{memberId} {
      allow read: if request.auth != null;
      allow write: if request.auth != null && 
                     get(/databases/$(database)/documents/users/$(request.auth.uid)).data.role == 'Admin';
    }
    match /transactions/{transactionId} {
      allow read: if request.auth != null;
      allow write: if request.auth != null && 
                     get(/databases/$(database)/documents/users/$(request.auth.uid)).data.role == 'Admin';
    }
    match /groupCodes/{code} {
      allow read: if true;
      allow update: if request.auth != null;
    }
    match /activityLogs/{logId} {
      allow read: if request.auth != null && 
                     get(/databases/$(database)/documents/users/$(request.auth.uid)).data.role == 'Admin';
      allow create: if request.auth != null;
      allow update, delete: if false;
    }
  }
}
```

---

## 🚢 Deployment Instructions

### Vercel (Web Admin)
1. Import the repository to Vercel.
2. Set **Root Directory** to `web`.
3. Configure all environment variables listed in the Quick Start.
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
├── types/                # TypeScript definitions
├── web/                  # Next.js Admin Dashboard
│   ├── app/              # Web pages and API routes
│   ├── lib/              # Web-specific logic
│   └── components/       # Web components
└── i18n/                 # Internationalization (EN/SW)
```

---

## ❓ Testing & Troubleshooting

### Troubleshooting Checklist
1. **Firebase Permission Denied**: Verify Firestore rules are published.
2. **Emails Not Sending**: Check `EMAIL_PASSWORD` (use App Password for Gmail).
3. **Invalid Token**: Ensure you are logged in as an Admin.
4. **Build Errors**: Run `npx tsc --noEmit` to check for TypeScript errors.

### Success Criteria
- [ ] Users can sign up and log in.
- [ ] Admins can record transactions for any member.
- [ ] Activity logs capture all crucial actions.
- [ ] Emails are received by members with correct data.
- [ ] Dashboard displays accurate totals.

---

**Last Updated:** January 3, 2026
**Status:** ✅ Production Ready
