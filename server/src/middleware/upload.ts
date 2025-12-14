import multer from 'multer';
import path from 'path';
import fs from 'fs';

const uploadDir = path.join(__dirname, '../../uploads');

// Ensure upload directory exists
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, uniqueSuffix + '-' + file.originalname);
  }
});

const fileFilter = (req: any, file: Express.Multer.File, cb: multer.FileFilterCallback) => {
  // Define allowed file types with their MIME types
  const allowedMimes = [
    'image/jpeg', 'image/jpg', 'image/png', 'image/gif',
    'application/pdf',
    'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-excel', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'video/mp4', 'video/quicktime', 'video/x-msvideo', 'video/x-matroska',
    'application/zip', 'application/x-zip-compressed'
  ];
  
  const allowedExtensions = /jpeg|jpg|png|gif|pdf|doc|docx|xls|xlsx|mp4|mov|avi|mkv|zip/;
  const extname = allowedExtensions.test(path.extname(file.originalname).toLowerCase());

  if (allowedMimes.includes(file.mimetype) && extname) {
    cb(null, true);
  } else {
    cb(new Error('Invalid file type. Allowed types: images, videos, documents, archives'));
  }
};

export const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: 100 * 1024 * 1024 // 100MB limit
  }
});
