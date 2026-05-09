const cloudinary = require('cloudinary').v2;
const { CloudinaryStorage } = require('multer-storage-cloudinary');
const multer = require('multer');
const { cloudinary: cloudConfig } = require('../config/env');

cloudinary.config({
  cloud_name: cloudConfig.cloudName,
  api_key: cloudConfig.apiKey,
  api_secret: cloudConfig.apiSecret
});

const buildCloudinaryStorage = (folder, allowedFormats = ['jpg', 'png', 'jpeg', 'pdf']) => {
  return new CloudinaryStorage({
    cloudinary: cloudinary,
    params: {
      folder: `apex-rentals/${folder}`,
      allowed_formats: allowedFormats,
      resource_type: 'auto' // Important for PDFs
    }
  });
};

const leaseUpload = multer({ storage: buildCloudinaryStorage('leases') });
const repairUpload = multer({ storage: buildCloudinaryStorage('repairs') });
const propertyUpload = multer({ storage: buildCloudinaryStorage('properties') });

/**
 * Extracts public_id from a Cloudinary URL to use for deletion.
 * Example URL: https://res.cloudinary.com/cloudname/image/upload/v12345/apex-rentals/repairs/filename.jpg
 * Result: apex-rentals/repairs/filename
 */
const getPublicIdFromUrl = (url) => {
  if (!url || !url.includes('cloudinary.com')) return null;
  const parts = url.split('/');
  const lastPart = parts.pop(); // filename.jpg
  const folderParts = parts.slice(parts.indexOf('apex-rentals')); 
  const publicIdWithExt = [...folderParts, lastPart].join('/');
  return publicIdWithExt.split('.')[0];
};

const deleteFromCloudinary = async (url) => {
  const publicId = getPublicIdFromUrl(url);
  if (!publicId) return;

  try {
    await cloudinary.uploader.destroy(publicId);
    console.log(`Deleted from Cloudinary: ${publicId}`);
  } catch (error) {
    console.error('Cloudinary Deletion Error:', error.message);
  }
};

module.exports = {
  leaseUpload,
  repairUpload,
  propertyUpload,
  deleteFromCloudinary,
  cloudinary
};
