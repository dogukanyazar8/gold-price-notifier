# 💰 Gold Price Notifier Bot

Altın fiyatlarını takip eden ve Telegram üzerinden bildirim gönderen bot.

## 🚀 Railway'e Deploy

### 1. Railway Hesabı
[Railway.app](https://railway.app) üzerinden GitHub ile giriş yapın.

### 2. Deploy Butonu (En Kolay)
[![Deploy on Railway](https://railway.app/button.svg)](https://railway.app/new/template?template=https://github.com/dogukanyazar8/gold-price-notifier)

### 3. Manuel Deploy

```bash
# Railway CLI yükleyin
npm install -g @railway/cli

# Login yapın
railway login

# Projeyi başlatın
railway init

# Environment variables ekleyin
railway variables set TELEGRAM_BOT_TOKEN=your_bot_token_here
railway variables set TELEGRAM_CHAT_ID=your_chat_id_here
railway variables set ALERT_GOLD_TYPE="24K Gram,22 Ayar Bilezik (Desenli)"
railway variables set ALERT_THRESHOLD_PRICE="5800,5300"
railway variables set CHECK_INTERVAL_MINUTES=5
railway variables set LANGUAGE=TR
railway variables set API_URL=https://cevatkuyumculuk.com/mobile/get

# Deploy edin
railway up
```

## ⚙️ Environment Variables

Railway Dashboard'dan ekleyin:

```
TELEGRAM_BOT_TOKEN=your_telegram_bot_token
TELEGRAM_CHAT_ID=your_telegram_chat_id
ALERT_GOLD_TYPE=24K Gram,22 Ayar Bilezik (Desenli)
ALERT_THRESHOLD_PRICE=5800,5300
CHECK_INTERVAL_MINUTES=5
LANGUAGE=TR
API_URL=https://cevatkuyumculuk.com/mobile/get
```

## 📱 Telegram Bot Komutları

- `/settings` - Mevcut ayarları göster
- `/setgold <türler>` - Altın türlerini değiştir
- `/setprice <fiyatlar>` - Eşik fiyatları güncelle
- `/setinterval <dakika>` - Kontrol aralığını değiştir
- `/status` - Bot durumunu göster
- `/help` - Yardım mesajı

## 🔧 Lokal Geliştirme

```bash
# Bağımlılıkları yükleyin
npm install

# .env dosyası oluşturun
cp .env.example .env

# Uygulamayı başlatın
npm start
```