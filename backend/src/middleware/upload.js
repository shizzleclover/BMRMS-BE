import multer from 'multer';
import path from 'path';
import { AppError } from './errorHandler.js';
import config from '../config/index.js';

// Configure multer for memory storage
const storage = multer.memoryStorage();

// File filter
const fileFilter = (req, file, cb) => {
  const ext = path.extname(file.originalname).toLowerCase().slice(1);
  
  if (config.upload.allowedFileTypes.includes(ext)) {
    cb(null, true);
  } else {
    cb(
      new AppError(
        `File type not allowed. Allowed types: ${config.upload.allowedFileTypes.join(', ')}`,
        400
      ),
      false
    );
  }
};

// Multer upload configuration
export const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: config.upload.maxFileSize,
  },
});

// Single file upload middleware
export const uploadSingle = (fieldName) => {
  return upload.single(fieldName);
};

// Multiple files upload middleware
export const uploadMultiple = (fieldName, maxCount = 5) => {
  return upload.array(fieldName, maxCount);
};
