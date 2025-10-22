import { config } from '../config/config.js';

export class NotificationService {
  constructor(apiService, telegramService) {
    this.apiService = apiService;
    this.telegramService = telegramService;
    this.lastNotifiedPrice = null;
  }

  async sendRegularNotification(goldTypes) {
    const result = await this.apiService.fetchGoldPrices();
    
    if (!result.success) {
      console.error(`${this.telegramService.t.apiError}:`, result.error);
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
    const goldType = config.app.alertGoldType;
    const threshold = config.app.alertThresholdPrice;

    if (!threshold || threshold <= 0) {
      return false;
    }

    const result = await this.apiService.fetchGoldPrices();
    
    if (!result.success) {
      console.error(`${this.telegramService.t.apiError}:`, result.error);
      return false;
    }

    const goldItem = this.apiService.findGoldByName(result.data, goldType);

    if (!goldItem) {
      console.error(`Altın türü bulunamadı: ${goldType}`);
      return false;
    }

    // Fiyat eşik değerin altına düştüyse ve daha önce bildirim gönderilmediyse
    if (goldItem.sell < threshold && this.lastNotifiedPrice !== goldItem.sell) {
      this.lastNotifiedPrice = goldItem.sell;
      return await this.telegramService.sendPriceDropAlert(
        goldItem,
        threshold,
        result.base.date
      );
    }

    // Fiyat eşiğin üzerine çıktıysa, bildirim durumunu sıfırla
    if (goldItem.sell >= threshold) {
      this.lastNotifiedPrice = null;
    }

    return false;
  }
}