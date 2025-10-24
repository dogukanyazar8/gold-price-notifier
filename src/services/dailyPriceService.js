import fs from 'fs';
import path from 'path';

export class DailyPriceService {
  constructor() {
    this.dataDir = path.join(process.cwd(), 'src', 'data');
    this.dataFile = path.join(this.dataDir, 'daily-prices.json');
    this.ensureDataFileExists();
  }

  ensureDataFileExists() {
    // data klasörünü oluştur
    if (!fs.existsSync(this.dataDir)) {
      fs.mkdirSync(this.dataDir, { recursive: true });
      console.log('📁 Data klasörü oluşturuldu');
    }

    // Dosya yoksa boş obje ile oluştur
    if (!fs.existsSync(this.dataFile)) {
      const initialData = {
        lastUpdateDate: null,
        prices: {}
      };
      fs.writeFileSync(this.dataFile, JSON.stringify(initialData, null, 2));
      console.log('📄 daily-prices.json dosyası oluşturuldu');
    }
  }

  readData() {
    try {
      const data = fs.readFileSync(this.dataFile, 'utf8');
      return JSON.parse(data);
    } catch (error) {
      console.error('❌ Günlük fiyat verisi okunamadı:', error);
      return { lastUpdateDate: null, prices: {} };
    }
  }

  writeData(data) {
    try {
      fs.writeFileSync(this.dataFile, JSON.stringify(data, null, 2));
      return true;
    } catch (error) {
      console.error('❌ Günlük fiyat verisi yazılamadı:', error);
      return false;
    }
  }

  // Günün başlangıç fiyatlarını kaydet (00:00'daki fiyat)
  saveDailyStartPrices(goldItems, date) {
    const data = this.readData();
    
    goldItems.forEach(item => {
      if (!data.prices[item.name]) {
        data.prices[item.name] = [];
      }
      
      data.prices[item.name].push({
        date: date,
        buy: item.buy,
        sell: item.sell,
        timestamp: new Date().toISOString()
      });

      // Son 7 günü tut, eskilerini sil
      if (data.prices[item.name].length > 7) {
        data.prices[item.name] = data.prices[item.name].slice(-7);
      }
    });

    data.lastUpdateDate = date;
    
    if (this.writeData(data)) {
      console.log(`✅ Günlük başlangıç fiyatları kaydedildi: ${date}`);
      return true;
    }
    
    return false;
  }

  // Bir önceki günün başlangıç fiyatını al
  getPreviousDayPrice(goldName, currentDate) {
    const data = this.readData();
    
    if (!data.prices[goldName] || data.prices[goldName].length === 0) {
      return null;
    }

    // Mevcut tarihten önceki son kaydı bul
    const previousPrices = data.prices[goldName]
      .filter(p => p.date < currentDate)
      .sort((a, b) => b.date.localeCompare(a.date));

    return previousPrices.length > 0 ? previousPrices[0] : null;
  }

  // İlk kurulum için dummy data ekle
  initializeDummyData(goldItems) {
    const data = this.readData();
    
    // Eğer zaten veri varsa dummy data ekleme
    if (Object.keys(data.prices).length > 0) {
      console.log('ℹ️  Mevcut veriler var, dummy data eklenmedi');
      return false;
    }

    // Dünün tarihini oluştur (YYYY-MM-DD formatında)
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayStr = yesterday.toISOString().split('T')[0];

    goldItems.forEach(item => {
      data.prices[item.name] = [{
        date: yesterdayStr,
        buy: item.buy * 0.98, // %2 daha düşük fiyat (dummy)
        sell: item.sell * 0.98,
        timestamp: new Date().toISOString()
      }];
    });

    data.lastUpdateDate = yesterdayStr;

    if (this.writeData(data)) {
      console.log(`✅ Dummy data eklendi (dünün tarihi: ${yesterdayStr})`);
      return true;
    }

    return false;
  }

  // Tüm günlük verileri al (debug için)
  getAllData() {
    return this.readData();
  }
}