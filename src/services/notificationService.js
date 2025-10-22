import { config } from '../config/config.js';

export class NotificationService {
  constructor(apiService, telegramService) {
    this.apiService = apiService;
    this.telegramService = telegramService;
    this.lastNotifiedPrices = {}; // Her altın için ayrı son bildirim fiyatı
  }

  async sendRegularNotification(goldTypes) {
    const result = await this.apiService.fetchGoldPrices();
    
    if (!result.success) {
      console.error(`API Hatası:`, result.error);
      return false;
    }

    const goldItems = goldTypes
      .map(name => this.apiService.findGoldByName(result.data, name))
      .filter(Boolean);

    if (goldItems.length === 0) {
      console.error('Belirtilen altın türleri bulunamadı');
      return false;
    }

    return await this.telegramService.sendPriceNotification(
      goldItems,
      result.usd,
      result.eur,
      result.base.date
    );
  }

  async checkPriceDropAlert() {
    const goldTypes = config.app.alertGoldTypes;
    const thresholds = config.app.alertThresholdPrices;

    if (!thresholds || thresholds.length === 0) {
      return false;
    }

    const result = await this.apiService.fetchGoldPrices();
    
    if (!result.success) {
      console.error('API Hatası:', result.error);
      return false;
    }

    let alertSent = false;

    // Her bir altın türü için kontrol et
    for (let i = 0; i < goldTypes.length; i++) {
      const goldType = goldTypes[i];
      const threshold = thresholds[i];

      // Eşik değer yoksa veya 0'sa bu altını atla
      if (!threshold || threshold <= 0) {
        continue;
      }

      const goldItem = this.apiService.findGoldByName(result.data, goldType);

      if (!goldItem) {
        console.error(`Altın türü bulunamadı: ${goldType}`);
        continue;
      }

      // Fiyat eşik değerin altına düştüyse ve daha önce bildirim gönderilmediyse
      if (goldItem.sell < threshold && this.lastNotifiedPrices[goldType] !== goldItem.sell) {
        this.lastNotifiedPrices[goldType] = goldItem.sell;
        
        console.log(`🚨 Fiyat düşüş uyarısı: ${goldType} - ${goldItem.sell} TL (Eşik: ${threshold} TL)`);
        
        await this.telegramService.sendPriceDropAlert(
          goldItem,
          threshold,
          result.base.date
        );
        
        alertSent = true;
      }

      // Fiyat eşiğin üzerine çıktıysa, bildirim durumunu sıfırla
      if (goldItem.sell >= threshold) {
        this.lastNotifiedPrices[goldType] = null;
      }
    }

    return alertSent;
  }
}