import fs from 'fs';
import path from 'path';
import { config } from '../config/config.js';

export class SettingsManager {
  constructor() {
    this.envPath = path.join(process.cwd(), '.env');
  }

  async saveSettings() {
    try {
      let envContent = fs.readFileSync(this.envPath, 'utf8');
      
      // ALERT_GOLD_TYPE güncelle
      const goldTypeValue = config.app.alertGoldTypes.join(',');
      envContent = envContent.replace(
        /ALERT_GOLD_TYPE=.*/,
        `ALERT_GOLD_TYPE=${goldTypeValue}`
      );
      
      // ALERT_THRESHOLD_PRICE güncelle
      const thresholdValue = config.app.alertThresholdPrices.join(',');
      envContent = envContent.replace(
        /ALERT_THRESHOLD_PRICE=.*/,
        `ALERT_THRESHOLD_PRICE=${thresholdValue}`
      );
      
      // CHECK_INTERVAL_MINUTES güncelle
      envContent = envContent.replace(
        /CHECK_INTERVAL_MINUTES=.*/,
        `CHECK_INTERVAL_MINUTES=${config.app.checkIntervalMinutes}`
      );
      
      fs.writeFileSync(this.envPath, envContent, 'utf8');
      console.log('✅ Ayarlar .env dosyasına kaydedildi');
      return true;
    } catch (error) {
      console.error('❌ Ayarlar kaydedilirken hata:', error);
      return false;
    }
  }
}