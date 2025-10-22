import cron from 'node-cron';
import { config } from './config/config.js';
import { ApiService } from './services/apiService.js';
import { TelegramService } from './services/telegramService.js';
import { NotificationService } from './services/notificationService.js';

class GoldPriceNotifier {
  constructor() {
    this.apiService = new ApiService();
    this.telegramService = new TelegramService();
    this.notificationService = new NotificationService(
      this.apiService,
      this.telegramService
    );
  }

  start() {
    console.log('🚀 Altın Fiyat Bildirimi Uygulaması Başlatılıyor...');
    console.log(`⏰ Kontrol Aralığı: ${config.app.checkIntervalMinutes} dakika`);
    console.log(`🌍 Dil: ${config.app.language}`);
    console.log(`📊 İzlenen Altın: ${config.app.alertGoldType}`);
    console.log(`🎯 Eşik Değer: ${config.app.alertThresholdPrice} TL\n`);

    // Her N dakikada bir fiyat kontrolü
    const cronExpression = `*/${config.app.checkIntervalMinutes} * * * *`;
    
    cron.schedule(cronExpression, async () => {
      console.log(`\n⏰ Kontrol Zamanı: ${new Date().toISOString()}`);
      
      // Düzenli bildirim gönder (istediğiniz altın türlerini belirtin)
      await this.notificationService.sendRegularNotification([
        '24K Gram',
        '22 Ayar Bilezik (Desenli)',
      ]);

      // Fiyat düşüş kontrolü
      await this.notificationService.checkPriceDropAlert();
    });

    // Başlangıçta bir kez çalıştır
    this.notificationService.sendRegularNotification([
      '24K Gram',
      '22 Ayar Bilezik (Desenli)',
    ]);

    console.log('✓ Uygulama başarıyla başlatıldı ve çalışıyor...\n');
  }
}

// Uygulamayı başlat
const app = new GoldPriceNotifier();
app.start();