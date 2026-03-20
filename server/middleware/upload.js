import multer from 'multer';
import { v2 as cloudinary } from 'cloudinary';
import { CloudinaryStorage } from 'multer-storage-cloudinary';

// Configure Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key:    process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
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

// Storage configurations per use-case
const certStorage    = makeCloudinaryStorage('certificates', true);
const photoStorage   = makeCloudinaryStorage('photos');
const profileStorage = makeCloudinaryStorage('profiles');
const docStorage     = makeCloudinaryStorage('documents', true);

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

// Multi-field uploader used by submit-result (certificate + photos together)
export const upload = multer({
  storage: new CloudinaryStorage({
    cloudinary,
    params: async (req, file) => ({
      folder: file.fieldname === 'certificate' ? 'eventpass/certificates' : 'eventpass/photos',
      allowed_formats: ['jpg', 'jpeg', 'png', 'gif', 'pdf'],
      resource_type: file.mimetype === 'application/pdf' ? 'raw' : 'image',
      public_id: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
    }),
  }),
  fileFilter,
  limits,
});

// Named single-purpose middlewares
export const uploadDocuments    = multer({ storage: docStorage,     fileFilter, limits }).array('documents', 5);
export const uploadCertificate  = multer({ storage: certStorage,    fileFilter, limits }).single('certificate');
export const uploadPhotos       = multer({ storage: photoStorage,   fileFilter, limits }).array('photos', 10);
export const uploadProfile      = multer({ storage: profileStorage, fileFilter, limits }).single('profile');
export const uploadCheckInPhoto = multer({ storage: photoStorage,   fileFilter, limits }).single('photo');

// Export cloudinary instance for direct use (e.g. delete files)
export { cloudinary };
