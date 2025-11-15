# Pakistani Matchmaking App - Authentication System

## Overview
Comprehensive authentication system with email verification, password reset, and security features.

## Features Implemented

### 1. **User Signup**
- Email and password registration
- Phone number validation
- Password strength validation (min 8 characters)
- Automatic 6-digit verification code generation
- Code expires in 2 minutes
- Email verification sent via Resend API

### 2. **Email Verification**
- 6-digit code verification
- Expiry time validation
- Failed attempt tracking (max 3 attempts)
- Account lockout after max failed attempts
- Welcome email sent after successful verification
- JWT token generated upon verification

### 3. **Resend Verification Code**
- Generate new 6-digit code
- Reset failed attempt counter
- 2-minute expiry window

### 4. **Login**
- Email and password authentication
- Email verification check
- Account deletion check
- Account lockout mechanism (5 failed attempts)
- 15-minute lockout period
- Security alert email after 3 failed attempts
- Last login tracking (timestamp, IP, location)
- Session management
- Device type tracking
- Location tracking (latitude/longitude)
- Session history (last 10 sessions)
- JWT token generation

### 5. **Forgot Password**
- Email-based password reset
- Secure token generation (32-byte hex)
- Token hashing for database storage
- 1-hour expiry window
- Password reset email with link

### 6. **Reset Password**
- Token validation
- Password strength validation
- Reset login attempts counter
- Clear lockout status

### 7. **Logout**
- Update online status to offline
- Clear socket connection
- Update last seen timestamp
- Session cleanup

### 8. **Security Features**
- Bcrypt password hashing
- JWT authentication
- Account lockout mechanism
- Failed login attempt tracking
- Security alert emails
- Session management
- IP tracking
- Location tracking

## API Endpoints

### Public Endpoints (No Authentication)

#### 1. Signup
```
POST /api/auth/signup
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "securePassword123",
  "name": "Ahmed Ali",
  "phone": "+923001234567",
  "gender": "male",
  "dob": "1995-01-15"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Signup successful! Please check your email for verification code.",
  "data": {
    "userId": "507f1f77bcf86cd799439011",
    "email": "user@example.com",
    "name": "Ahmed Ali",
    "isEmailVerified": false,
    "codeExpiresIn": "2 minutes"
  }
}
```

#### 2. Verify Email
```
POST /api/auth/verify-email
Content-Type: application/json

{
  "email": "user@example.com",
  "verificationCode": "123456"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Email verified successfully!",
  "data": {
    "userId": "507f1f77bcf86cd799439011",
    "email": "user@example.com",
    "name": "Ahmed Ali",
    "isEmailVerified": true,
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
  }
}
```

#### 3. Resend Verification Code
```
POST /api/auth/resend-verification
Content-Type: application/json

{
  "email": "user@example.com"
}
```

#### 4. Login
```
POST /api/auth/login
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "securePassword123",
  "deviceType": "Android",
  "latitude": 24.8607,
  "longitude": 67.0011
}
```

**Response:**
```json
{
  "success": true,
  "message": "Login successful!",
  "data": {
    "userId": "507f1f77bcf86cd799439011",
    "email": "user@example.com",
    "name": "Ahmed Ali",
    "phone": "+923001234567",
    "isEmailVerified": true,
    "onboardingCompleted": false,
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
  }
}
```

#### 5. Forgot Password
```
POST /api/auth/forgot-password
Content-Type: application/json

{
  "email": "user@example.com"
}
```

#### 6. Reset Password
```
POST /api/auth/reset-password
Content-Type: application/json

{
  "token": "a1b2c3d4e5f6...",
  "newPassword": "newSecurePassword123"
}
```

### Protected Endpoints (Authentication Required)

#### 7. Logout
```
POST /api/auth/logout
Authorization: Bearer <token>
Content-Type: application/json

{
  "userId": "507f1f77bcf86cd799439011"
}
```

#### 8. Get Current User
```
GET /api/auth/me
Authorization: Bearer <token>
```

## Environment Variables

Create a `.env` file in the root directory:

```env
# Server Configuration
PORT=5000
NODE_ENV=development

# Database
MONGODB_URI=mongodb://localhost:27017/matchmaking

# JWT Authentication
JWT_SECRET=your_super_secret_jwt_key_here_change_in_production
JWT_EXPIRE=7d

# Email Service (Resend)
RESEND_API_KEY=re_your_resend_api_key_here

# Email Configuration
FROM_EMAIL=noreply@yourdomain.com
FROM_NAME=Pakistani Matchmaking App

# Security
BCRYPT_SALT_ROUNDS=10
MAX_LOGIN_ATTEMPTS=5
ACCOUNT_LOCK_TIME=15

# Verification
VERIFICATION_CODE_EXPIRY=2
OTP_MAX_ATTEMPTS=3

# Frontend URL (for password reset links)
FRONTEND_URL=http://localhost:3000
```

## Installation

1. Install dependencies:
```bash
npm install
```

2. Copy `.env.example` to `.env` and update values:
```bash
copy .env.example .env
```

3. Get your Resend API key from [https://resend.com](https://resend.com)

4. Start the server:
```bash
node server.js
```

## Email Templates

The system includes professionally designed email templates for:
- ✉️ Email verification
- 🔄 Resend verification code
- 🔑 Password reset
- 🚨 Failed login security alerts
- 🎉 Welcome email

## Security Features

### Password Security
- Minimum 8 characters required
- Bcrypt hashing with 10 salt rounds
- Password reset token expiry (1 hour)

### Account Protection
- Max 5 failed login attempts
- 15-minute account lockout
- Max 3 failed OTP attempts
- Email alerts on failed login (after 3 attempts)

### Session Management
- JWT tokens with 7-day expiry
- Session history tracking (last 10 sessions)
- IP address logging
- Device type tracking
- Location tracking

## Database Schema Updates

The following fields were added to the User model:

```javascript
// Email verification
isEmailVerified: Boolean
verificationCode: String
verificationCodeExpiry: Date

// Password reset
passwordResetToken: String
passwordResetExpiry: Date

// Login tracking
lastLoginAt: Date
lastLoginIp: String
lastLoginLocation: String
```

## Error Handling

All endpoints return consistent error responses:

```json
{
  "success": false,
  "message": "Error message here",
  "error": "Detailed error (development only)"
}
```

## Logging

Console logs are strategically placed for:
- 📝 Signup requests
- 🔍 Verification attempts
- 🔐 Login attempts
- 🔑 Password reset requests
- ✅ Successful operations
- ❌ Failed operations
- ⚠️ Security alerts

## Next Steps

After authentication is complete, users should:
1. Complete profile information
2. Upload photos to Cloudinary
3. Take live selfie for verification
4. Provide location permissions
5. Complete onboarding flow

## Testing

Test the endpoints using Postman or similar tools:

1. Health check: `GET http://localhost:5000/health`
2. Signup: `POST http://localhost:5000/api/auth/signup`
3. Verify email: `POST http://localhost:5000/api/auth/verify-email`
4. Login: `POST http://localhost:5000/api/auth/login`

## Support

For issues or questions, refer to the console logs with emoji indicators:
- 📧 Email operations
- 🔐 Security operations
- ✅ Success
- ❌ Errors
- ⚠️ Warnings
- 🔍 Verification

---

**Built for Pakistani Matchmaking App** 🇵🇰
