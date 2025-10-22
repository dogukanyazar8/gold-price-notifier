import TelegramBot from 'node-telegram-bot-api';
import { config } from '../config/config.js';
import { translations } from '../config/translations.js';

export class TelegramService {
  constructor() {
    this.bot = new TelegramBot(config.telegram.botToken, { polling: true });
    this.chatId = config.telegram.chatId;
    this.lang = config.app.language;
    this.commandHandler = null;
    this.setupCommands();
  }

  get t() {
    return translations[this.lang];
  }

  setCommandHandler(handler) {
    this.commandHandler = handler;
  }

  setupCommands() {
    this.bot.onText(/\/settings/, async (msg) => {
      if (msg.chat.id.toString() !== this.chatId) return;
      
      const settings = `⚙️ <b>Mevcut Ayarlar</b>\n\n` +
        `📊 <b>Altın Türleri:</b>\n${config.app.alertGoldTypes.map((t, i) => `   ${i + 1}. ${t}`).join('\n')}\n\n` +
        `💰 <b>Eşik Fiyatları:</b>\n${config.app.alertThresholdPrices.map((p, i) => `   ${i + 1}. ${this.formatPrice(p)} TL`).join('\n')}\n\n` +
        `⏰ <b>Kontrol Aralığı:</b> ${config.app.checkIntervalMinutes} dakika\n` +
        `🌍 <b>Dil:</b> ${config.app.language}`;
      
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
      
      if (interval < 1 || interval > 60) {
        this.bot.sendMessage(msg.chat.id, '❌ Aralık 1-60 dakika arasında olmalıdır.');
        return;
      }
      
      config.app.checkIntervalMinutes = interval;
      
      this.bot.sendMessage(msg.chat.id, `✅ Kontrol aralığı ${interval} dakika olarak güncellendi.\n\n⚠️ Değişikliğin etkili olması için uygulamayı yeniden başlatmanız gerekiyor.`);
      
      if (this.commandHandler && this.commandHandler.saveSettings) {
        await this.commandHandler.saveSettings();
      }
    });

    this.bot.onText(/\/status/, async (msg) => {
      if (msg.chat.id.toString() !== this.chatId) return;
      
      const uptime = process.uptime();
      const hours = Math.floor(uptime / 3600);
      const minutes = Math.floor((uptime % 3600) / 60);
      
      const status = `📊 <b>Uygulama Durumu</b>\n\n` +
        `✅ Çalışıyor\n` +
        `⏱️ Çalışma Süresi: ${hours}s ${minutes}d\n` +
        `📈 Bellek Kullanımı: ${Math.round(process.memoryUsage().heapUsed / 1024 / 1024)}MB\n` +
        `🔄 Node Versiyonu: ${process.version}`;
      
      this.bot.sendMessage(msg.chat.id, status, { parse_mode: 'HTML' });
    });

    this.bot.onText(/\/help/, async (msg) => {
      if (msg.chat.id.toString() !== this.chatId) return;
      
      const help = `🤖 <b>Kullanılabilir Komutlar</b>\n\n` +
        `<b>/settings</b> - Mevcut ayarları göster\n\n` +
        `<b>/setgold</b> &lt;türler&gt; - Altın türlerini değiştir\n` +
        `   Örnek: /setgold 24K Gram,22 Ayar\n\n` +
        `<b>/setprice</b> &lt;fiyatlar&gt; - Eşik fiyatları değiştir\n` +
        `   Örnek: /setprice 6000,5500\n\n` +
        `<b>/setinterval</b> &lt;dakika&gt; - Kontrol aralığını değiştir\n` +
        `   Örnek: /setinterval 10\n\n` +
        `<b>/status</b> - Uygulama durumunu göster\n\n` +
        `<b>/help</b> - Bu yardım mesajını göster`;
      
      this.bot.sendMessage(msg.chat.id, help, { parse_mode: 'HTML' });
    });
  }

  formatPrice(price) {
    return new Intl.NumberFormat('tr-TR', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(price);
  }

  formatDateTime(timestamp) {
    const date = new Date(timestamp);
    return date.toLocaleString(this.lang === 'TR' ? 'tr-TR' : 'en-US');
  }

  async sendPriceNotification(goldItems, usd, eur, baseTimestamp) {
    const message = this.buildPriceMessage(goldItems, usd, eur, baseTimestamp);
    return await this.sendMessage(message);
  }

  buildPriceMessage(goldItems, usd, eur, baseTimestamp) {
    let message = `${this.t.priceNotification}\n\n`;

    goldItems.forEach(item => {
      message += `💰 ${item.name}: ${this.formatPrice(item.sell)} TL\n`;
    });

    if (usd) {
      message += `\n💵 ${this.t.usdRate}: ${usd.satis}`;
    }
    if (eur) {
      message += `\n💶 ${this.t.eurRate}: ${eur.satis}`;
    }
    
    return message;
  }

  async sendPriceDropAlert(goldItem, threshold) {
    let message = `${this.t.priceDropAlert}\n`;
    message += `⚠️ ${goldItem.name} ${this.t.droppedBelow}\n\n`;
    message += `📉 ${this.t.currentPrice}: ${this.formatPrice(goldItem.sell)} TL\n`;
    message += `🎯 ${this.t.threshold}: ${this.formatPrice(threshold)} TL\n\n`;

    return await this.sendMessage(message);
  }

  async sendMessage(text) {
    try {
      await this.bot.sendMessage(this.chatId, text, {
        parse_mode: 'HTML',
      });
      console.log(`✓ ${this.t.notificationSent}: ${new Date().toISOString()}`);
      return true;
    } catch (error) {
      console.error('Telegram Error:', error.message);
      return false;
    }
  }
}
