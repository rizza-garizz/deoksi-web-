import { afterEach, describe, expect, test } from 'vitest';

import { buildCloudinaryUploadUrl, getCloudinaryUploadConfig } from '../api/upload.js';

const originalEnv = {
  CLOUDINARY_CLOUD_NAME: process.env.CLOUDINARY_CLOUD_NAME,
  CLOUDINARY_UPLOAD_PRESET: process.env.CLOUDINARY_UPLOAD_PRESET,
  CLOUDINARY_UPLOAD_FOLDER: process.env.CLOUDINARY_UPLOAD_FOLDER,
};

afterEach(() => {
  process.env.CLOUDINARY_CLOUD_NAME = originalEnv.CLOUDINARY_CLOUD_NAME;
  process.env.CLOUDINARY_UPLOAD_PRESET = originalEnv.CLOUDINARY_UPLOAD_PRESET;
  process.env.CLOUDINARY_UPLOAD_FOLDER = originalEnv.CLOUDINARY_UPLOAD_FOLDER;
});

describe('upload config', () => {
  test('reads cloudinary config from env', () => {
    process.env.CLOUDINARY_CLOUD_NAME = 'demo-cloud';
    process.env.CLOUDINARY_UPLOAD_PRESET = 'unsigned-preset';
    process.env.CLOUDINARY_UPLOAD_FOLDER = 'deoksi/uploads';

    expect(getCloudinaryUploadConfig()).toEqual({
      cloudName: 'demo-cloud',
      uploadPreset: 'unsigned-preset',
      folder: 'deoksi/uploads',
    });
  });

  test('builds cloudinary upload URL', () => {
    expect(buildCloudinaryUploadUrl('demo-cloud')).toBe('https://api.cloudinary.com/v1_1/demo-cloud/auto/upload');
  });
});
