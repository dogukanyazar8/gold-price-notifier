import axios from 'axios';
import { config } from '../config/config.js';

export class ApiService {
  constructor() {
    this.apiUrl = config.api.url;
    this.axiosInstance = axios.create({
      timeout: 10000,
      headers: {
        'Content-Type': 'application/json',
      },
    });
  }

  async fetchGoldPrices() {
    try {
      const response = await this.axiosInstance.get(this.apiUrl);
      
      if (response.data.success && response.data.data) {
        return {
          success: true,
          data: response.data.data,
          base: response.data.base,
          usd: response.data.usd,
          eur: response.data.eur,
        };
      }
      
      return { success: false, error: 'Invalid API response' };
    } catch (error) {
      console.error('API Fetch Error:', error.message);
      return { 
        success: false, 
        error: error.message,
        status: error.response?.status 
      };
    }
  }

  findGoldByName(data, goldName) {
    return data.find(item => item.name === goldName);
  }
}