const { Telegraf } = require('telegraf');

class TelegramService {
    constructor(token) {
        this.bot = new Telegraf(token);
        this.setupCommands();
        this.bot.launch(); // Enable polling mode
    }

    setupCommands() {
        this.bot.command('settings', (ctx) => {
            ctx.reply('Settings command triggered.');
        });

        this.bot.command('setgold', (ctx) => {
            ctx.reply('Set gold command triggered.');
        });

        this.bot.command('setprice', (ctx) => {
            ctx.reply('Set price command triggered.');
        });

        this.bot.command('setinterval', (ctx) => {
            ctx.reply('Set interval command triggered.');
        });

        this.bot.command('status', (ctx) => {
            ctx.reply('Status command triggered.');
        });

        this.bot.command('help', (ctx) => {
            ctx.reply('Help command triggered.');
        });
    }

    formatPrice(price) {
        // existing method code
    }

    formatDateTime(dateTime) {
        // existing method code
    }

    sendPriceNotification() {
        // existing method code
    }

    buildPriceMessage() {
        // existing method code
    }

    sendPriceDropAlert() {
        // existing method code
    }

    sendMessage() {
        // existing method code
    }
}

module.exports = TelegramService;