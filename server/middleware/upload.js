import fs from 'fs';
import path from 'path';
import multer from 'multer';
import { fileURLToPath } from 'url';
import { v2 as cloudinary } from 'cloudinary';
import { CloudinaryStorage } from 'multer-storage-cloudinary';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const uploadsRoot = path.resolve(__dirname, '../../uploads');

const cloudinaryConfig = {
  cloud_name: (process.env.CLOUDINARY_CLOUD_NAME || '').trim(),
  api_key: (process.env.CLOUDINARY_API_KEY || '').trim(),
  api_secret: (process.env.CLOUDINARY_API_SECRET || '').trim(),
};

cloudinary.config(cloudinaryConfig);

const hasCloudinaryConfig = Boolean(
  cloudinaryConfig.cloud_name &&
  cloudinaryConfig.api_key &&
  cloudinaryConfig.api_secret
);

const requestedStorage = (process.env.FILE_STORAGE || '').trim().toLowerCase();
const useCloudinary = requestedStorage === 'cloudinary'
  || (requestedStorage === '' && process.env.NODE_ENV === 'production' && hasCloudinaryConfig);

const activeStorage = useCloudinary ? 'cloudinary' : 'local';

if (activeStorage === 'local') {
  fs.mkdirSync(uploadsRoot, { recursive: true });
  console.log('[Upload] Using local file storage');
} else {
  console.log('[Upload] Using Cloudinary storage');
}

const ensureDir = (dirPath) => {
  fs.mkdirSync(dirPath, { recursive: true });
  return dirPath;
};

const localStorageFor = (folder) => multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, ensureDir(path.join(uploadsRoot, folder)));
  },
  filename: (req, file, cb) => {
    const safeName = file.originalname.replace(/[^a-zA-Z0-9._-]/g, '_');
    cb(null, `${Date.now()}-${Math.random().toString(36).slice(2)}-${safeName}`);
  },
});

// Helper: create a Cloudinary storage for a specific folder + allowed formats
const makeCloudinaryStorage = (folder, allowPdf = false) =>
  new CloudinaryStorage({
    cloudinary,
    params: async (req, file) => ({
      folder: `eventpass/${folder}`,
      allowed_formats: allowPdf ? ['jpg', 'jpeg', 'png', 'gif', 'pdf'] : ['jpg', 'jpeg', 'png', 'gif'],
      resource_type: file.mimetype === 'application/pdf' ? 'raw' : 'image',
      public_id: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
    }),
  });

const makeStorage = (folder, allowPdf = false) => (
  activeStorage === 'cloudinary'
    ? makeCloudinaryStorage(folder, allowPdf)
    : localStorageFor(folder)
);

// File filter
const fileFilter = (req, file, cb) => {
  const allowedTypes = [
    'image/jpeg', 'image/png', 'image/gif',
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  ];
  if (allowedTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('Invalid file type. Only images, PDFs, and Word documents are allowed.'), false);
  }
};

const limits = { fileSize: parseInt(process.env.MAX_FILE_SIZE) || 10 * 1024 * 1024 };

const normalizeUploadedFiles = (req) => {
  if (activeStorage !== 'local') return;

  const normalizeFile = (file) => {
    if (!file?.path) return file;

    const relativePath = path.relative(uploadsRoot, file.path).replace(/\\/g, '/');
    file.local_path = file.path;
    file.path = `/uploads/${relativePath}`;
    return file;
  };

  if (Array.isArray(req.files)) {
    req.files = req.files.map(normalizeFile);
    return;
  }

  if (req.file) {
    req.file = normalizeFile(req.file);
    return;
  }

  if (req.files && typeof req.files === 'object') {
    Object.keys(req.files).forEach((key) => {
      if (Array.isArray(req.files[key])) {
        req.files[key] = req.files[key].map(normalizeFile);
      }
    });
  }
};

const wrapUploader = (uploader) => (req, res, cb) => {
  uploader(req, res, (err) => {
    if (err) {
      if (activeStorage === 'cloudinary') {
        console.error('[Upload] Cloudinary upload failed', {
          message: err.message,
          name: err.name,
          http_code: err.http_code,
          storageErrors: err.storageErrors,
        });
      }
      cb(err);
      return;
    }

    normalizeUploadedFiles(req);
    cb(null);
  });
};

// Multi-field uploader used by submit-result (certificate + photos together)
export const upload = multer({
  storage: makeStorage('mixed', true),
  fileFilter,
  limits,
});

// Named single-purpose middlewares
export const uploadDocuments = wrapUploader(
  multer({ storage: makeStorage('documents', true), fileFilter, limits }).array('documents', 5)
);
export const uploadCertificate = wrapUploader(
  multer({ storage: makeStorage('certificates', true), fileFilter, limits }).single('certificate')
);
export const uploadPhotos = wrapUploader(
  multer({ storage: makeStorage('photos'), fileFilter, limits }).array('photos', 10)
);
export const uploadProfile = wrapUploader(
  multer({ storage: makeStorage('profiles'), fileFilter, limits }).single('profile')
);
export const uploadCheckInPhoto = wrapUploader(
  multer({ storage: makeStorage('photos'), fileFilter, limits }).single('photo')
);

// Export cloudinary instance for direct use (e.g. delete files)
export { cloudinary };
