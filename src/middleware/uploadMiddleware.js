import multer from 'multer';
import CloudinaryStorageModule from 'multer-storage-cloudinary';
console.log('CloudinaryStorageModule:', CloudinaryStorageModule);
const CloudinaryStorage = CloudinaryStorageModule.default || CloudinaryStorageModule.CloudinaryStorage || CloudinaryStorageModule;
import cloudinary from '../config/cloudinary.js';

// Storage configuration for profile photos
const photoStorage = new CloudinaryStorage({
  cloudinary: cloudinary,
  params: {
    folder: 'matchmaking/profile-photos',
    allowed_formats: ['jpg', 'jpeg', 'png', 'webp'],
    transformation: [{ width: 1000, height: 1000, crop: 'limit' }],
    public_id: (req, file) => `user_${req.user.userId}_photo_${Date.now()}`,
  },
});

// Storage configuration for verification selfies
const selfieStorage = new CloudinaryStorage({
  cloudinary: cloudinary,
  params: {
    folder: 'matchmaking/verification-selfies',
    allowed_formats: ['jpg', 'jpeg', 'png', 'webp'],
    transformation: [{ width: 800, height: 800, crop: 'limit' }],
    public_id: (req, file) => `user_${req.user.userId}_selfie_${Date.now()}`,
  },
});

// File filter to validate image types
const fileFilter = (req, file, cb) => {
  const allowedMimes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
  
  console.log(`📝 Uploading file: ${file.originalname}, Mimetype: ${file.mimetype}`);

  if (allowedMimes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    console.warn(`❌ Rejected file type: ${file.mimetype} for file: ${file.originalname}`);
    cb(new Error('Invalid file type. Only JPEG, JPG, PNG, and WEBP are allowed.'), false);
  }
};

// Multer configuration for profile photos (max 6 photos, each max 5MB)
export const uploadPhotos = multer({
  storage: photoStorage,
  fileFilter: fileFilter,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB
    files: 6,
  },
});

// Multer configuration for verification selfie (single file, max 5MB)
export const uploadSelfie = multer({
  storage: selfieStorage,
  fileFilter: fileFilter,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB
  },
});

// Combined upload for complete profile (photos + selfie)
export const uploadProfileData = multer({
  storage: multer.memoryStorage(),
  fileFilter: fileFilter,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB per file
    files: 7, // 6 photos + 1 selfie
  },
}).fields([
  { name: 'photos', maxCount: 6 },
  { name: 'selfie', maxCount: 1 },
]);
