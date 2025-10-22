import cron from 'node-cron';
import { config } from './config/config.js';
import { ApiService } from './services/apiService.js';
import { TelegramService } from './services/telegramService.js';
import { NotificationService } from './services/notificationService.js';
import { SettingsManager } from './services/settingsManager.js';

class GoldPriceNotifier {
  constructor() {
    this.apiService = new ApiService();
    this.telegramService = new TelegramService();
    this.settingsManager = new SettingsManager();
    this.cronTask = null; // Cron task'ı saklamak için
    
    // Telegram servisine settings manager ve restart fonksiyonunu bağla
    this.telegramService.setCommandHandler({
      saveSettings: () => this.settingsManager.saveSettings(),
      restartScheduler: () => this.restartScheduler()
    });
    
    this.notificationService = new NotificationService(
      this.apiService,
      this.telegramService
    );
  }

  restartScheduler() {
    // Eski cron job'u durdur
    if (this.cronTask) {
      this.cronTask.stop();
      console.log('⏹️  Eski zamanlayıcı durduruldu');
    }

    // Yeni cron job'u başlat
    const cronExpression = `*/${config.app.checkIntervalMinutes} * * * *`;
    
    this.cronTask = cron.schedule(cronExpression, async () => {
      console.log(`\n⏰ Kontrol Zamanı: ${new Date().toISOString()}`);
      
      await this.notificationService.sendRegularNotification(
        config.app.alertGoldTypes
      );

      await this.notificationService.checkPriceDropAlert();
    });

    console.log(`✅ Yeni zamanlayıcı başlatıldı: ${config.app.checkIntervalMinutes} dakika`);
  }

  start() {
    console.log('🚀 Altın Fiyat Bildirimi Uygulaması Başlatılıyor...');
    console.log(`⏰ Kontrol Aralığı: ${config.app.checkIntervalMinutes} dakika`);
    console.log(`🌍 Dil: ${config.app.language}`);
    
    // Çoklu altın türlerini göster
    console.log('📊 İzlenen Altınlar:');
    config.app.alertGoldTypes.forEach((type, index) => {
      console.log(`   ${index + 1}. ${type} - Eşik: ${config.app.alertThresholdPrices[index]} TL`);
    });
    console.log('');
    console.log('💡 Telegram\'dan /help yazarak komutları görebilirsiniz.\n');

    // Zamanlayıcıyı başlat
    this.restartScheduler();

    // Başlangıçta bir kez çalıştır
    this.notificationService.sendRegularNotification(
      config.app.alertGoldTypes
    );

    console.log('✓ Uygulama başarıyla başlatıldı ve çalışıyor...\n');
  }
}

// Uygulamayı başlat
const app = new GoldPriceNotifier();
app.start();