import { config } from '../config/config.js';

export class NotificationService {
  constructor(apiService, telegramService, dailyPriceService = null) {
    this.apiService = apiService;
    this.telegramService = telegramService;
    this.dailyPriceService = dailyPriceService;
    this.lastNotifiedPrices = {}; // Her altın için ayrı son bildirim fiyatı
  }

  // Yardımcı fonksiyon: USD/EUR değerini parse et
  parseRate(rateData) {
    if (!rateData) return 0;
    
    // Eğer obje ise, alis veya satis değerini kullan (API'den gelen format)
    if (typeof rateData === 'object') {
      // Önce satis (satış) değerini kontrol et
      const value = rateData.satis || rateData.alis || rateData.buy || rateData.sell || rateData.value || 0;
      // String ise parse et
      return typeof value === 'string' ? parseFloat(value) : value;
    }
    
    // Eğer sayı ise direkt döndür
    if (typeof rateData === 'number') {
      return rateData;
    }
    
    // String ise parse et
    return parseFloat(rateData) || 0;
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
      this.parseRate(result.usd),
      this.parseRate(result.eur),
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

  // YENİ: Günlük özet bildirimi
  async sendDailySummary(goldTypes, currentDate) {
    if (!this.dailyPriceService) {
      console.error('❌ DailyPriceService yok, günlük özet gönderilemez');
      return false;
    }

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

    // Her altın için önceki gün fiyatını al ve karşılaştır
    const comparisons = goldItems.map(item => {
      const previousPrice = this.dailyPriceService.getPreviousDayPrice(item.name, currentDate);
      
      return {
        name: item.name,
        currentBuy: item.buy,
        currentSell: item.sell,
        previousBuy: previousPrice?.buy || null,
        previousSell: previousPrice?.sell || null,
        hasPreviousData: previousPrice !== null
      };
    });

    return await this.telegramService.sendDailySummaryNotification(
      comparisons,
      this.parseRate(result.usd),
      this.parseRate(result.eur),
      result.base.date
    );
  }

  // YENİ: Günlük başlangıç fiyatlarını kaydet
  async saveDailyStartPrices(goldTypes, currentDate) {
    if (!this.dailyPriceService) {
      console.error('❌ DailyPriceService yok, fiyatlar kaydedilemez');
      return false;
    }

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

    return this.dailyPriceService.saveDailyStartPrices(goldItems, currentDate);
  }

  // YENİ: Dummy data ile başlat
  async initializeDummyData(goldTypes) {
    if (!this.dailyPriceService) {
      console.error('❌ DailyPriceService yok, dummy data eklenemez');
      return false;
    }

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

    return this.dailyPriceService.initializeDummyData(goldItems);
  }
}
