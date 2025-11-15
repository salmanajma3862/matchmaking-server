# Complete Profile Setup - API Documentation

## Flow Overview

### Step 1: Signup (Email & Password Only)
User registers with just email and password.

### Step 2: Email Verification
User verifies email with 6-digit code.

### Step 3: Complete Profile (THIS STEP)
After email verification, user fills complete profile in ONE request with all information.

---

## Complete Profile Endpoint

**Endpoint:** `POST /api/user/complete-profile`

**Authentication:** Required (Bearer Token from email verification)

**Content-Type:** `multipart/form-data`

**Description:** This endpoint handles ALL user profile information in a single request, including photos and verification selfie upload to Cloudinary.

---

## Request Format

### Form Fields

#### **Personal Information** (Required)
```
name: "Ahmed Ali"
phone: "+923001234567"
gender: "male" (or "female")
dob: "1995-01-15" (YYYY-MM-DD format)
city: "Karachi"
country: "Pakistan"
```

#### **Personal Information** (Optional)
```
bio: "Looking for a compatible life partner..."
height: "175" (in cm)
weight: "70" (in kg)
bodyType: "athletic" (or "slim", "average", "heavy")
address: "DHA Phase 5, Karachi"
religion: "Islam"
sect: "Sunni" (or "Shia", etc.)
maritalStatus: "single" (or "divorced", "widowed")
education: "Bachelor's in Computer Science"
profession: "Software Engineer"
incomeRange: "50000-100000" (PKR per month)
```

#### **Life Habits**
```
smoking: "false" (or "true")
drinking: "false" (or "true")
dietPreference: "halal" (or "vegetarian", "non-vegetarian")
```

#### **Interests & Hobbies**
```
interests: ["traveling", "reading", "sports"] (JSON array or comma-separated string)
hobbies: ["cricket", "cooking", "photography"] (JSON array or comma-separated string)
```

#### **Family Details**
```
familyBackground: "Educated and well-settled family"
numberOfSiblings: "3"
livingWithFamily: "true" (or "false")
```

#### **Intentions**
```
intention: "marriage" (or "friendship", "dating", "not_sure")
readyForMarriageTimeframe: "6_months" (or "soon", "1_year", "not_sure")
```

#### **Matchmaking Preferences** (JSON object)
```
preferences: {
  "minAge": 25,
  "maxAge": 35,
  "city": ["Karachi", "Lahore"],
  "gender": "female",
  "maritalStatus": ["single"],
  "religion": ["Islam"],
  "education": ["Bachelor", "Master"],
  "searchRadiusKm": 50
}
```

#### **Location Coordinates**
```
latitude: "24.8607"
longitude: "67.0011"
```

#### **File Uploads**
```
photos[]: (File) - Multiple files, minimum 1, maximum 6 photos
              Formats: JPG, JPEG, PNG, WEBP
              Max size: 5MB per photo
              
selfie: (File) - Single file for verification
            Formats: JPG, JPEG, PNG, WEBP
            Max size: 5MB
            Will be saved in Verification schema
```

---

## Example Request (Using Postman or Frontend)

### JavaScript (Frontend) Example

```javascript
const completeProfile = async () => {
  const formData = new FormData();
  
  // Personal Information
  formData.append('name', 'Ahmed Ali');
  formData.append('phone', '+923001234567');
  formData.append('gender', 'male');
  formData.append('dob', '1995-01-15');
  formData.append('city', 'Karachi');
  formData.append('country', 'Pakistan');
  formData.append('bio', 'Looking for a compatible life partner...');
  formData.append('height', '175');
  formData.append('weight', '70');
  formData.append('bodyType', 'athletic');
  formData.append('religion', 'Islam');
  formData.append('sect', 'Sunni');
  formData.append('maritalStatus', 'single');
  formData.append('education', "Bachelor's in Computer Science");
  formData.append('profession', 'Software Engineer');
  formData.append('incomeRange', '50000-100000');
  
  // Life Habits
  formData.append('smoking', 'false');
  formData.append('drinking', 'false');
  formData.append('dietPreference', 'halal');
  
  // Interests & Hobbies (as JSON)
  formData.append('interests', JSON.stringify(['traveling', 'reading', 'sports']));
  formData.append('hobbies', JSON.stringify(['cricket', 'cooking', 'photography']));
  
  // Family Details
  formData.append('familyBackground', 'Educated and well-settled family');
  formData.append('numberOfSiblings', '3');
  formData.append('livingWithFamily', 'true');
  
  // Intentions
  formData.append('intention', 'marriage');
  formData.append('readyForMarriageTimeframe', '6_months');
  
  // Preferences (as JSON)
  const preferences = {
    minAge: 25,
    maxAge: 35,
    city: ['Karachi', 'Lahore'],
    gender: 'female',
    maritalStatus: ['single'],
    religion: ['Islam'],
    education: ['Bachelor', 'Master'],
    searchRadiusKm: 50
  };
  formData.append('preferences', JSON.stringify(preferences));
  
  // Location
  formData.append('latitude', '24.8607');
  formData.append('longitude', '67.0011');
  
  // Photos (from file input)
  const photoInputs = document.querySelectorAll('input[name="photos"]');
  photoInputs.forEach(input => {
    if (input.files[0]) {
      formData.append('photos', input.files[0]);
    }
  });
  
  // Verification Selfie (from file input or camera)
  const selfieInput = document.querySelector('input[name="selfie"]');
  if (selfieInput.files[0]) {
    formData.append('selfie', selfieInput.files[0]);
  }
  
  // Send request
  const response = await fetch('http://localhost:5000/api/user/complete-profile', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}` // Token from email verification
    },
    body: formData
  });
  
  const data = await response.json();
  console.log(data);
};
```

### React Native Example

```javascript
import * as ImagePicker from 'expo-image-picker';

const completeProfile = async () => {
  // Get location
  const location = await Location.getCurrentPositionAsync({});
  
  // Pick photos
  const photos = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ImagePicker.MediaTypeOptions.Images,
    allowsMultipleSelection: true,
    quality: 0.8,
  });
  
  // Take selfie
  const selfie = await ImagePicker.launchCameraAsync({
    mediaTypes: ImagePicker.MediaTypeOptions.Images,
    quality: 0.8,
  });
  
  const formData = new FormData();
  
  // Add all fields (same as above)
  formData.append('name', profileData.name);
  formData.append('phone', profileData.phone);
  // ... other fields
  
  // Add location
  formData.append('latitude', location.coords.latitude.toString());
  formData.append('longitude', location.coords.longitude.toString());
  
  // Add photos
  photos.assets.forEach((photo, index) => {
    formData.append('photos', {
      uri: photo.uri,
      type: 'image/jpeg',
      name: `photo_${index}.jpg`,
    });
  });
  
  // Add selfie
  formData.append('selfie', {
    uri: selfie.uri,
    type: 'image/jpeg',
    name: 'selfie.jpg',
  });
  
  // Send request
  const response = await fetch('http://localhost:5000/api/user/complete-profile', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
    },
    body: formData,
  });
  
  const data = await response.json();
  console.log(data);
};
```

---

## Response Format

### Success Response (200 OK)

```json
{
  "success": true,
  "message": "Profile completed successfully!",
  "data": {
    "user": {
      "_id": "507f1f77bcf86cd799439011",
      "email": "ahmed@example.com",
      "name": "Ahmed Ali",
      "phone": "+923001234567",
      "gender": "male",
      "dob": "1995-01-15T00:00:00.000Z",
      "bio": "Looking for a compatible life partner...",
      "height": 175,
      "weight": 70,
      "bodyType": "athletic",
      "city": "Karachi",
      "country": "Pakistan",
      "religion": "Islam",
      "sect": "Sunni",
      "maritalStatus": "single",
      "education": "Bachelor's in Computer Science",
      "profession": "Software Engineer",
      "incomeRange": "50000-100000",
      "photos": [
        {
          "url": "https://res.cloudinary.com/.../photo1.jpg",
          "isPrimary": true
        },
        {
          "url": "https://res.cloudinary.com/.../photo2.jpg",
          "isPrimary": false
        }
      ],
      "smoking": false,
      "drinking": false,
      "dietPreference": "halal",
      "interests": ["traveling", "reading", "sports"],
      "hobbies": ["cricket", "cooking", "photography"],
      "familyBackground": "Educated and well-settled family",
      "numberOfSiblings": 3,
      "livingWithFamily": true,
      "intention": "marriage",
      "readyForMarriageTimeframe": "6_months",
      "preferences": {
        "minAge": 25,
        "maxAge": 35,
        "city": ["Karachi", "Lahore"],
        "gender": "female",
        "maritalStatus": ["single"],
        "religion": ["Islam"],
        "education": ["Bachelor", "Master"],
        "searchRadiusKm": 50
      },
      "currentLocation": {
        "lat": 24.8607,
        "lng": 67.0011,
        "lastUpdated": "2025-11-16T10:30:00.000Z"
      },
      "onboardingCompleted": true,
      "profileCompleteness": 85,
      "isEmailVerified": true,
      "createdAt": "2025-11-16T10:00:00.000Z",
      "updatedAt": "2025-11-16T10:30:00.000Z"
    },
    "profileCompleteness": 85,
    "photosUploaded": 6,
    "verificationSubmitted": true
  }
}
```

### Error Responses

#### 400 - Validation Error
```json
{
  "success": false,
  "message": "City and country are required"
}
```

#### 400 - Missing Photos
```json
{
  "success": false,
  "message": "At least one profile photo is required"
}
```

#### 403 - Email Not Verified
```json
{
  "success": false,
  "message": "Please verify your email first"
}
```

#### 500 - Upload Error
```json
{
  "success": false,
  "message": "Failed to upload verification selfie"
}
```

---

## What Happens Behind the Scenes

1. **Authentication Check**: Verifies JWT token
2. **Email Verification Check**: Ensures email is verified
3. **File Processing**: Handles multipart form data
4. **Photo Upload**: 
   - Uploads each photo to Cloudinary
   - Resizes to 1000x1000 (max)
   - Stores in `matchmaking/profile-photos` folder
   - First photo is marked as primary
5. **Selfie Upload**:
   - Uploads to Cloudinary
   - Resizes to 800x800 (max)
   - Stores in `matchmaking/verification-selfies` folder
   - Creates/updates Verification record with status 'pending'
6. **Data Parsing**: Handles JSON strings for arrays and objects
7. **Profile Update**: Updates User model with all information
8. **Completeness Calculation**: Calculates profile completion percentage
9. **Onboarding Status**: Sets `onboardingCompleted` to true

---

## Important Notes

- **Phone Number**: Now properly updated (no more temp values)
- **Name**: Real name from user input
- **Gender & DOB**: Properly set from user
- **Photos**: Minimum 1 required, maximum 6 allowed
- **Selfie**: Used for verification (saved in Verification schema)
- **Location**: Real-time coordinates from device
- **Cloudinary URLs**: All images return secure HTTPS URLs
- **Profile Completeness**: Automatically calculated (0-100%)

---

## Complete User Flow

```
1. Signup (Email + Password)
   POST /api/auth/signup
   ↓
2. Verify Email (6-digit code)
   POST /api/auth/verify-email
   ↓
3. Complete Profile (All Info + Photos)
   POST /api/user/complete-profile
   ↓
4. User can now use the app!
```

---

## Testing with Postman

1. **Signup**: Get userId
2. **Verify Email**: Get token
3. **Complete Profile**:
   - Set Authorization: Bearer {token}
   - Set Body: form-data
   - Add all text fields
   - Add files for photos[] and selfie
   - Send request

---

Built for Pakistani Matchmaking App 🇵🇰
