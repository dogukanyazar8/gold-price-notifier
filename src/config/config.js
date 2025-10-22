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
    // Virgülle ayrılmış değerleri array'e çevir
    alertGoldTypes: process.env.ALERT_GOLD_TYPE 
      ? process.env.ALERT_GOLD_TYPE.split(',').map(type => type.trim())
      : ['24K Gram'],
    alertThresholdPrices: process.env.ALERT_THRESHOLD_PRICE
      ? process.env.ALERT_THRESHOLD_PRICE.split(',').map(price => parseFloat(price.trim()))
      : [0],
  },
};