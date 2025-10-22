import TelegramBot from 'node-telegram-bot-api';
import { config } from '../config/config.js';
import { translations } from '../config/translations.js';

export class TelegramService {
  constructor() {
    this.bot = new TelegramBot(config.telegram.botToken, { polling: false });
    this.chatId = config.telegram.chatId;
    this.lang = config.app.language;
  }

  get t() {
    return translations[this.lang];
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