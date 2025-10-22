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
    this.cronTask = null;
    
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
    if (this.cronTask) {
      this.cronTask.stop();
      console.log('⏹️  Eski zamanlayıcı durduruldu');
    }

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
    
    // Railway bilgisi
    if (process.env.RAILWAY_ENVIRONMENT) {
      console.log('🚂 Railway ortamında çalışıyor');
    }
    
    console.log(`⏰ Kontrol Aralığı: ${config.app.checkIntervalMinutes} dakika`);
    console.log(`🌍 Dil: ${config.app.language}`);
    
    console.log('📊 İzlenen Altınlar:');
    config.app.alertGoldTypes.forEach((type, index) => {
      console.log(`   ${index + 1}. ${type} - Eşik: ${config.app.alertThresholdPrices[index]} TL`);
    });
    console.log('');
    console.log('💡 Telegram\'dan /help yazarak komutları görebilirsiniz.\n');

    this.restartScheduler();

    this.notificationService.sendRegularNotification(
      config.app.alertGoldTypes
    );

    console.log('✓ Uygulama başarıyla başlatıldı ve çalışıyor...\n');
  }

  async shutdown() {
    console.log('\n🛑 Uygulama kapatılıyor...');
    
    if (this.telegramService) {
      await this.telegramService.stopPolling();
    }
    
    if (this.cronTask) {
      this.cronTask.stop();
      console.log('✅ Zamanlayıcı durduruldu');
    }
    
    console.log('✅ Uygulama temiz şekilde kapatıldı');
  }
}

const app = new GoldPriceNotifier();
app.start();

// Graceful shutdown
process.on('SIGINT', async () => {
  await app.shutdown();
  process.exit(0);
});

process.on('SIGTERM', async () => {
  await app.shutdown();
  process.exit(0);
});

// Hata yakalama
process.on('unhandledRejection', (error) => {
  console.error('❌ Yakalanmayan hata:', error);
});