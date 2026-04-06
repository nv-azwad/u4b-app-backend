const multer = require('multer');
const { Storage } = require('@google-cloud/storage');
const path = require('path');

// Initialize GCS
const storage = new Storage();

const bucketName = process.env.GCS_BUCKET_NAME || process.env.CLOUD_STORAGE_BUCKET;
const bucket = storage.bucket(bucketName);

// Configure Multer
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 50 * 1024 * 1024 // 50MB
  },
  fileFilter: (req, file, cb) => {
    const allowedTypes = ['video/webm', 'video/mp4', 'video/quicktime'];
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type. Only video files are allowed.'));
    }
  }
});

// Helper to upload to GCS
const uploadToGCS = (req, res, next) => {
  if (!req.file) return next();

  const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
  const extension = path.extname(req.file.originalname);
  const gcsFileName = `donations/donation-${uniqueSuffix}${extension}`;
  const file = bucket.file(gcsFileName);

  const stream = file.createWriteStream({
    metadata: {
      contentType: req.file.mimetype,
    },
    resumable: false
  });

  stream.on('error', (err) => {
    req.file.cloudStorageError = err;
    next(err);
  });

  stream.on('finish', () => {
    req.file.cloudStorageObject = gcsFileName;
    // Just construct the public URL directly
    req.file.publicUrl = `https://storage.googleapis.com/${bucketName}/${gcsFileName}`;
    next();
  });

  stream.end(req.file.buffer);
};

module.exports = { upload, uploadToGCS };