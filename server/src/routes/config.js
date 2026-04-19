const express = require('express');

const router = express.Router();

/**
 * GET /api/config/cloudinary
 * 클라이언트(업로드 위젯)용 공개 설정 — cloud name / upload preset 만 반환
 * (API Secret 은 절대 포함하지 않음)
 */
router.get('/cloudinary', (req, res) => {
  const cloudName =
    process.env.cloudinaryCloudName ||
    process.env.CLOUDINARY_CLOUD_NAME ||
    '';
  const uploadPreset =
    process.env.cloudinaryUploadPreset ||
    process.env.CLOUDINARY_UPLOAD_PRESET ||
    '';

  if (!cloudName || !uploadPreset) {
    return res.status(503).json({
      error:
        'Cloudinary 설정이 서버에 없습니다. server/.env에 cloudinaryCloudName, cloudinaryUploadPreset을 설정하세요.',
    });
  }

  return res.json({ cloudName, uploadPreset });
});

module.exports = router;
