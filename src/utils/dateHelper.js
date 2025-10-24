// Türkiye saatini UTC'den al
export function getTurkeyDate() {
  const now = new Date();
  
  // UTC'den Türkiye saatine çevir (UTC+3)
  const turkeyTime = new Date(now.getTime() + (3 * 60 * 60 * 1000));
  
  return turkeyTime;
}

// YYYY-MM-DD formatında Türkiye tarihini al
export function getTurkeyDateString() {
  const turkeyDate = getTurkeyDate();
  return turkeyDate.toISOString().split('T')[0];
}

// Türkiye saati formatında string al (HH:MM:SS)
export function getTurkeyTimeString() {
  const turkeyDate = getTurkeyDate();
  const hours = String(turkeyDate.getUTCHours()).padStart(2, '0');
  const minutes = String(turkeyDate.getUTCMinutes()).padStart(2, '0');
  const seconds = String(turkeyDate.getUTCSeconds()).padStart(2, '0');
  return `${hours}:${minutes}:${seconds}`;
}

// Türkiye saatinde tarih ve saat formatı
export function getTurkeyDateTimeString() {
  const dateStr = getTurkeyDateString();
  const timeStr = getTurkeyTimeString();
  return `${dateStr} ${timeStr}`;
}