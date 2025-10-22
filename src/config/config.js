import dotenv from 'dotenv';
dotenv.config();

export const config = {
  telegram: {
    botToken: process.env.TELEGRAM_BOT_TOKEN,
    chatId: process.env.TELEGRAM_CHAT_ID,
  },
  api: {
    url: process.env.API_URL || 'https://cevatkuyumculuk.com/mobile/get',
  },
  app: {
    checkIntervalMinutes: parseInt(process.env.CHECK_INTERVAL_MINUTES) || 5,
    language: process.env.LANGUAGE || 'TR',
    alertGoldType: process.env.ALERT_GOLD_TYPE || '24K Gram',
    alertThresholdPrice: parseFloat(process.env.ALERT_THRESHOLD_PRICE) || 0,
  },
};