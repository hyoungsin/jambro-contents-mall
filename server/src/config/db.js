const mongoose = require('mongoose');
const seedCouponCampaigns = require('./seedBenefits');

/**
 * MONGODB_ATLAS(Atlas)를 우선 사용하고, 연결 실패 시 MONGODB_URI(예: 로컬)로 폴백
 */
const connectDB = async () => {
  const atlasUri = (process.env.MONGODB_ATLAS || '').trim();
  const fallbackUri = (process.env.MONGODB_URI || '').trim();

  const connectWith = async (uri, label) => {
    const conn = await mongoose.connect(uri);
    console.log(`MongoDB 연결됨 (${label}): ${conn.connection.host}`);
    return conn;
  };

  try {
    if (atlasUri) {
      try {
        await connectWith(atlasUri, 'Atlas');
      } catch (atlasErr) {
        console.warn(`MongoDB Atlas 연결 실패 — MONGODB_URI로 재시도합니다: ${atlasErr.message}`);
        if (!fallbackUri) {
          console.error('MONGODB_URI가 설정되어 있지 않아 폴백할 수 없습니다.');
          process.exit(1);
        }
        await connectWith(fallbackUri, 'MONGODB_URI');
      }
    } else if (fallbackUri) {
      await connectWith(fallbackUri, 'MONGODB_URI');
    } else {
      console.error('MONGODB_ATLAS 또는 MONGODB_URI 중 하나를 .env에 설정하세요.');
      process.exit(1);
    }

    await seedCouponCampaigns();
  } catch (error) {
    console.error('MongoDB 연결 실패:', error.message);
    process.exit(1);
  }
};

module.exports = connectDB;
