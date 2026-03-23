const fs = require('fs');
const path = require('path');
const multer = require('multer');
const { rootDir, uploadsRoot } = require('../config/env');

const sanitizeFilename = (filename) => filename.replace(/\s+/g, '-');

const ensureUploadDir = (folder) => {
  const target = path.join(uploadsRoot, folder);
  fs.mkdirSync(target, { recursive: true });
  return target;
};

const buildStorage = (folder) => multer.diskStorage({
  destination: (req, file, cb) => cb(null, ensureUploadDir(folder)),
  filename: (req, file, cb) => cb(null, `${Date.now()}-${sanitizeFilename(file.originalname)}`)
});

const createFileFilter = (allowedPattern) => (req, file, cb) => {
  if (!allowedPattern) {
    cb(null, true);
    return;
  }

  const extension = path.extname(file.originalname).toLowerCase();
  const isMimeAllowed = allowedPattern.test(file.mimetype);
  const isExtensionAllowed = allowedPattern.test(extension);

  if (isMimeAllowed || isExtensionAllowed) {
    cb(null, true);
    return;
  }

  cb(new Error(`Unsupported file type for ${file.originalname}`));
};

const createUpload = (folder, allowedPattern) => multer({
  storage: buildStorage(folder),
  fileFilter: createFileFilter(allowedPattern)
});

const leaseUpload = createUpload('leases', /pdf|doc|docx|jpg|jpeg|png/);
const repairUpload = createUpload('repairs');

const toStoredUploadPath = (absolutePath) => path.relative(rootDir, absolutePath).replace(/\\/g, '/');

module.exports = {
  leaseUpload,
  repairUpload,
  toStoredUploadPath
};
