import TelegramBot from 'node-telegram-bot-api';
import { config } from '../config/config.js';
import { translations } from '../config/translations.js';

export class TelegramService {
  constructor() {
    // Railway'de her zaman polling kullan (webhook'a gerek yok)
    console.log('🔄 Polling modunda başlatılıyor...');
    this.bot = new TelegramBot(config.telegram.botToken, { 
      polling: {
        interval: 300,
        autoStart: true,
        params: {
          timeout: 10
        }
      }
    });
    
    this.chatId = config.telegram.chatId;
    this.lang = config.app.language;
    this.commandHandler = null;
    this.setupCommands();
  }

  async stopPolling() {
    try {
      if (this.bot && this.bot.isPolling()) {
        await this.bot.stopPolling();
        console.log('✅ Polling durduruldu');
      }
    } catch (error) {
      console.error('Polling durdurma hatası:', error.message);
    }
  }

  get t() {
    return translations[this.lang];
  }

  setCommandHandler(handler) {
    this.commandHandler = handler;
  }

  formatPrice(price) {
    return new Intl.NumberFormat('tr-TR', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(price);
  }

  formatDate(dateInput) {
    try {
      if (typeof dateInput === 'number') {
        const date = new Date(dateInput);
        return date.toLocaleString('tr-TR', {
          day: '2-digit',
          month: '2-digit',
          hour: '2-digit',
          minute: '2-digit'
        });
      }
      return dateInput;
    } catch (error) {
      console.error('Tarih formatlama hatası:', error);
      return dateInput;
    }
  }

  setupCommands() {
    this.bot.onText(/\/settings/, async (msg) => {
      if (msg.chat.id.toString() !== this.chatId) return;
      
      const settings = `⚙️ <b>Mevcut Ayarlar</b>\n\n` +
        `📊 <b>Altın Türleri:</b>\n${config.app.alertGoldTypes.map((t, i) => `   ${i + 1}. ${t}`).join('\n')}\n\n` +
        `💰 <b>Eşik Fiyatları:</b>\n${config.app.alertThresholdPrices.map((p, i) => `   ${i + 1}. ${this.formatPrice(p)} TL`).join('\n')}\n\n` +
        `⏰ <b>Kontrol Aralığı:</b> ${config.app.checkIntervalMinutes} dakika\n` +
        `🌍 <b>Dil:</b> ${config.app.language}\n` +
        `📈 <b>Günlük Özet:</b> ${config.app.enableDailySummary ? 'Aktif' : 'Pasif'}\n` +
        `🕐 <b>Özet Saati:</b> ${config.app.dailySummaryTime}`;
      
      this.bot.sendMessage(msg.chat.id, settings, { parse_mode: 'HTML' });
    });

    this.bot.onText(/\/setgold (.+)/, async (msg, match) => {
      if (msg.chat.id.toString() !== this.chatId) return;
      
      const goldTypes = match[1].split(',').map(t => t.trim());
      config.app.alertGoldTypes = goldTypes;
      
      while (config.app.alertThresholdPrices.length < goldTypes.length) {
        config.app.alertThresholdPrices.push(0);
      }
      
      this.bot.sendMessage(
        msg.chat.id,
        `✅ Altın türleri güncellendi:\n${goldTypes.map((t, i) => `${i + 1}. ${t}`).join('\n')}`,
        { parse_mode: 'HTML' }
      );
      
      if (this.commandHandler && this.commandHandler.saveSettings) {
        await this.commandHandler.saveSettings();
      }
    });

    this.bot.onText(/\/setprice (.+)/, async (msg, match) => {
      if (msg.chat.id.toString() !== this.chatId) return;
      
      const prices = match[1].split(',').map(p => parseFloat(p.trim()));
      
      if (prices.some(isNaN)) {
        this.bot.sendMessage(msg.chat.id, '❌ Geçersiz fiyat formatı. Örnek: /setprice 6000,5500');
        return;
      }
      
      config.app.alertThresholdPrices = prices;
      
      this.bot.sendMessage(
        msg.chat.id,
        `✅ Eşik fiyatları güncellendi:\n${prices.map((p, i) => `${i + 1}. ${this.formatPrice(p)} TL`).join('\n')}`,
        { parse_mode: 'HTML' }
      );
      
      if (this.commandHandler && this.commandHandler.saveSettings) {
        await this.commandHandler.saveSettings();
      }
    });

    this.bot.onText(/\/setinterval (\d+)/, async (msg, match) => {
      if (msg.chat.id.toString() !== this.chatId) return;
      
      const interval = parseInt(match[1]);
      
      if (interval < 1) {
        this.bot.sendMessage(msg.chat.id, '❌ Interval 1 dakikadan az olamaz');
        return;
      }
      
      config.app.checkIntervalMinutes = interval;
      
      this.bot.sendMessage(
        msg.chat.id,
        `✅ Kontrol aralığı güncellendi: ${interval} dakika`,
        { parse_mode: 'HTML' }
      );
      
      if (this.commandHandler && this.commandHandler.saveSettings) {
        await this.commandHandler.saveSettings();
      }
      
      if (this.commandHandler && this.commandHandler.restartScheduler) {
        this.commandHandler.restartScheduler();
      }
    });

    this.bot.onText(/\/help/, async (msg) => {
      if (msg.chat.id.toString() !== this.chatId) return;
      
      const help = `📚 <b>Kullanılabilir Komutlar</b>\n\n` +
        `<b>/settings</b> - Mevcut ayarları göster\n` +
        `<b>/setgold</b> [türler] - Altın türlerini ayarla\n` +
        `   Örnek: /setgold 24K Gram, 22K Gram\n\n` +
        `<b>/setprice</b> [fiyatlar] - Eşik fiyatlarını ayarla\n` +
        `   Örnek: /setprice 6000,5500\n\n` +
        `<b>/setinterval</b> [dakika] - Kontrol aralığını ayarla\n` +
        `   Örnek: /setinterval 10\n\n` +
        `<b>/help</b> - Bu yardım mesajını göster`;
      
      this.bot.sendMessage(msg.chat.id, help, { parse_mode: 'HTML' });
    });
  }

  // BASİTLEŞTİRİLMİŞ NORMAL BİLDİRİM (Sadece Satış Fiyatı, Zaman Yok)
  async sendPriceNotification(goldItems, usdRate, eurRate, date) {
    try {
      let message = `📊 <b>Altın Fiyatları</b>\n\n`;

      goldItems.forEach((item) => {
        message += `💰 <b>${item.name}:</b> ${this.formatPrice(item.sell)} ₺\n`;
      });

      message += `\n💵 USD: ${this.formatPrice(usdRate)} ₺\n`;
      message += `💶 EUR: ${this.formatPrice(eurRate)} ₺`;

      await this.bot.sendMessage(this.chatId, message, { parse_mode: 'HTML' });
      console.log(`✅ ${this.t.notificationSent}`);
      return true;
    } catch (error) {
      console.error('Telegram mesaj hatası:', error);
      return false;
    }
  }

  // BASİTLEŞTİRİLMİŞ DÜŞÜŞ UYARISI (Zaman Yok)
  async sendPriceDropAlert(goldItem, threshold, date) {
    try {
      let message = `🔔 <b>Fiyat Düşüş Uyarısı!</b>\n\n`;
      message += `💰 <b>${item.name}</b>\n`;
      message += `   Güncel: ${this.formatPrice(goldItem.sell)} ₺\n`;
      message += `   Eşik: ${this.formatPrice(threshold)} ₺`;

      await this.bot.sendMessage(this.chatId, message, { parse_mode: 'HTML' });
      console.log(`✅ Düşüş bildirimi gönderildi: ${goldItem.name}`);
      return true;
    } catch (error) {
      console.error('Telegram düşüş bildirimi hatası:', error);
      return false;
    }
  }

  // BASİTLEŞTİRİLMİŞ GÜNLÜK ÖZET (Zaman Yok)
  async sendDailySummaryNotification(comparisons, usdRate, eurRate, date) {
    try {
      let message = `📈 <b>Günlük Özet</b>\n\n`;

      comparisons.forEach((comp) => {
        message += `💰 <b>${comp.name}</b>\n`;
        
        if (!comp.hasPreviousData) {
          message += `   Güncel: ${this.formatPrice(comp.currentSell)} ₺\n`;
          message += `   <i>Karşılaştırma verisi yok</i>\n\n`;
        } else {
          const diff = comp.currentSell - comp.previousSell;
          const percent = ((diff / comp.previousSell) * 100).toFixed(2);
          
          let emoji = '➡️';
          if (diff > 0) emoji = '📈';
          else if (diff < 0) emoji = '📉';
          
          message += `   Dün: ${this.formatPrice(comp.previousSell)} ₺\n`;
          message += `   Bugün: ${this.formatPrice(comp.currentSell)} ₺\n`;
          message += `   ${emoji} ${diff > 0 ? '+' : ''}${this.formatPrice(diff)} ₺ (${percent > 0 ? '+' : ''}${percent}%)\n\n`;
        }
      });

      message += `💵 USD: ${this.formatPrice(usdRate)} ₺\n`;
      message += `💶 EUR: ${this.formatPrice(eurRate)} ₺`;

      await this.bot.sendMessage(this.chatId, message, { parse_mode: 'HTML' });
      console.log(`✅ Günlük özet bildirimi gönderildi`);
      return true;
    } catch (error) {
      console.error('Telegram günlük özet hatası:', error);
      return false;
    }
  }
}
