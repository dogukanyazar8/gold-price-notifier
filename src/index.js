import cron from 'node-cron';
import { config } from './config/config.js';
import { ApiService } from './services/apiService.js';
import { TelegramService } from './services/telegramService.js';
import { NotificationService } from './services/notificationService.js';
import { SettingsManager } from './services/settingsManager.js';
import { DailyPriceService } from './services/dailyPriceService.js';
import { getTurkeyDateString, getTurkeyTimeString } from './utils/dateHelper.js';

class GoldPriceNotifier {
  constructor() {
    this.apiService = new ApiService();
    this.telegramService = new TelegramService();
    this.settingsManager = new SettingsManager();
    this.dailyPriceService = new DailyPriceService();
    this.cronTask = null;
    this.dailySummaryCron = null;
    this.dailyStartPriceCron = null;
    
    this.telegramService.setCommandHandler({
      saveSettings: () => this.settingsManager.saveSettings(),
      restartScheduler: () => this.restartScheduler()
    });
    
    this.notificationService = new NotificationService(
      this.apiService,
      this.telegramService,
      this.dailyPriceService
    );
  }

  restartScheduler() {
    if (this.cronTask) {
      this.cronTask.stop();
      console.log('⏹️  Eski zamanlayıcı durduruldu');
    }

    const cronExpression = `*/${config.app.checkIntervalMinutes} * * * *`;
    
    this.cronTask = cron.schedule(cronExpression, async () => {
      console.log(`\n⏰ Kontrol Zamanı: ${getTurkeyTimeString()} (TR)`);
      
      await this.notificationService.sendRegularNotification(
        config.app.alertGoldTypes
      );

      await this.notificationService.checkPriceDropAlert();
    });

    console.log(`✅ Yeni zamanlayıcı başlatıldı: ${config.app.checkIntervalMinutes} dakika`);
  }

  // YENİ: Günlük özet zamanlayıcısı
  startDailySummaryScheduler() {
    if (!config.app.enableDailySummary) {
      console.log('ℹ️  Günlük özet özelliği devre dışı');
      return;
    }

    const [hour, minute] = config.app.dailySummaryTime.split(':');
    
    // Türkiye saati UTC+3 olduğu için UTC'ye çeviriyoruz
    const utcHour = parseInt(hour) - 3;
    const utcMinute = parseInt(minute);
    
    // Cron expression: dakika saat * * *
    const cronExpression = `${utcMinute} ${utcHour} * * *`;
    
    this.dailySummaryCron = cron.schedule(cronExpression, async () => {
      console.log(`\n📈 Günlük Özet Zamanı: ${getTurkeyTimeString()} (TR)`);
      const currentDate = getTurkeyDateString();
      
      await this.notificationService.sendDailySummary(
        config.app.alertGoldTypes,
        currentDate
      );
    });

    console.log(`✅ Günlük özet zamanlayıcısı başlatıldı: ${config.app.dailySummaryTime} (TR)`);
  }

  // YENİ: Günün başlangıç fiyatını kaydetme zamanlayıcısı
  startDailyStartPriceScheduler() {
    // Her gün saat 00:05'te (Türkiye saati) fiyatları kaydet
    // UTC'de 21:05 (bir gün öncesi)
    const cronExpression = `5 21 * * *`;
    
    this.dailyStartPriceCron = cron.schedule(cronExpression, async () => {
      console.log(`\n💾 Günlük Başlangıç Fiyatı Kaydetme: ${getTurkeyTimeString()} (TR)`);
      const currentDate = getTurkeyDateString();
      
      await this.notificationService.saveDailyStartPrices(
        config.app.alertGoldTypes,
        currentDate
      );
    });

    console.log(`✅ Günlük başlangıç fiyat zamanlayıcısı başlatıldı: 00:05 (TR)`);
  }

  async start() {
    console.log('🚀 Altın Fiyat Bildirimi Uygulaması Başlatılıyor...');
    
    // Railway bilgisi
    if (process.env.RAILWAY_ENVIRONMENT) {
      console.log('🚂 Railway ortamında çalışıyor');
    }
    
    console.log(`⏰ Kontrol Aralığı: ${config.app.checkIntervalMinutes} dakika`);
    console.log(`🌍 Dil: ${config.app.language}`);
    console.log(`📈 Günlük Özet: ${config.app.enableDailySummary ? 'Aktif (' + config.app.dailySummaryTime + ' TR)' : 'Pasif'}`);
    
    console.log('📊 İzlenen Altınlar:');
    config.app.alertGoldTypes.forEach((type, index) => {
      console.log(`   ${index + 1}. ${type} - Eşik: ${config.app.alertThresholdPrices[index]} TL`);
    });
    console.log('');
    console.log('💡 Telegram\'dan /help yazarak komutları görebilirsiniz.\n');

    // Dummy data ekle (ilk çalıştırmada)
    await this.notificationService.initializeDummyData(config.app.alertGoldTypes);

    // Zamanlayıcıları başlat
    this.restartScheduler();
    this.startDailySummaryScheduler();
    this.startDailyStartPriceScheduler();

    // İlk bildirimi gönder
    await this.notificationService.sendRegularNotification(
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
      console.log('✅ Normal zamanlayıcı durduruldu');
    }

    if (this.dailySummaryCron) {
      this.dailySummaryCron.stop();
      console.log('✅ Günlük özet zamanlayıcısı durduruldu');
    }

    if (this.dailyStartPriceCron) {
      this.dailyStartPriceCron.stop();
      console.log('✅ Günlük başlangıç fiyat zamanlayıcısı durduruldu');
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
  console.error('❌ İşlenmeyen Promise Hatası:', error);
});

process.on('uncaughtException', (error) => {
  console.error('❌ Yakalanmayan Hata:', error);
});