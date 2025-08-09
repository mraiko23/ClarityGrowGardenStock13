const axios = require('axios');
const cheerio = require('cheerio');

// Function to fetch stock data from Gamersberg API with retries
async function fetchGamersbergStock() {
  const maxRetries = 3;
  const retryDelay = 2000; // 2 seconds
  
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      console.log(`Fetching stock data from gamersberg.com API (attempt ${attempt}/${maxRetries})...`);
      
      const response = await axios.get('https://www.gamersberg.com/api/grow-a-garden/stock', {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
          'Accept': 'application/json',
          'Accept-Language': 'en-US,en;q=0.9',
          'Accept-Encoding': 'gzip, deflate, br',
          'Connection': 'keep-alive',
          'Referer': 'https://www.gamersberg.com/',
          'Origin': 'https://www.gamersberg.com'
        },
        timeout: 15000
      });

      const responseData = response.data;
      
      // Debug: Log the raw API response
      console.log('Raw API response structure:', {
        success: responseData.success,
        message: responseData.message,
        dataLength: responseData.data ? responseData.data.length : 0,
        hasData: !!responseData.data && responseData.data.length > 0
      });
      
      const stockData = {
        seeds: [],
        gear: [],
        eggs: []
      };

      // Check if we have data
      if (responseData.success && responseData.data && responseData.data.length > 0) {
        const gameData = responseData.data[0]; // Get first data entry
        
        console.log('Processing game data with keys:', Object.keys(gameData));
        
        // Process seeds (object with name: quantity structure)
        if (gameData.seeds && typeof gameData.seeds === 'object') {
          console.log('Processing seeds...');
          Object.entries(gameData.seeds).forEach(([name, quantity]) => {
            const qty = parseInt(quantity);
            if (qty > 0) {
              stockData.seeds.push({
                name: name,
                quantity: qty
              });
            }
          });
        }
        
        // Process gear (object with name: quantity structure)
        if (gameData.gear && typeof gameData.gear === 'object') {
          console.log('Processing gear...');
          Object.entries(gameData.gear).forEach(([name, quantity]) => {
            const qty = parseInt(quantity);
            if (qty > 0) {
              stockData.gear.push({
                name: name,
                quantity: qty
              });
            }
          });
        }
        
        // Process eggs (array with {name, quantity} structure)
        if (gameData.eggs && Array.isArray(gameData.eggs)) {
          console.log('Processing eggs...');
          gameData.eggs.forEach(egg => {
            if (egg.quantity && egg.quantity > 0) {
              stockData.eggs.push({
                name: egg.name,
                quantity: parseInt(egg.quantity)
              });
            }
          });
        }
        
        console.log('Processed data counts:', {
          seeds: stockData.seeds.length,
          gear: stockData.gear.length,
          eggs: stockData.eggs.length
        });
      } else {
        console.log('No valid data found in API response');
      }

      console.log('Gamersberg API scraped data:', stockData);
      return stockData;
      
    } catch (error) {
      console.error(`Error fetching from gamersberg.com API (attempt ${attempt}/${maxRetries}):`, error.message);
      
      if (attempt < maxRetries) {
        console.log(`Retrying in ${retryDelay/1000} seconds...`);
        await new Promise(resolve => setTimeout(resolve, retryDelay));
      } else {
        console.error('All attempts failed. Returning null.');
        return null;
      }
    }
  }
}
// Function to fetch stock data from https://virastisad.ru/stock/
async function fetchVirastisadStock() {
    const maxRetries = 3;
    const retryDelay = 2000;
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
        try {
            console.log(`Fetching stock data from virastisad.ru (attempt ${attempt}/${maxRetries})...`);
            const response = await axios.get('https://virastisad.ru/stock/', {
                headers: {
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
                    'Accept': 'text/html',
                },
                timeout: 15000
            });
            const $ = cheerio.load(response.data);
            const stockData = { seeds: [], gear: [], eggs: [] };

            // Gear
            $("ul:contains('gear stock') > li, ul.list-unstyled:has(img[src*='cleaning_spray.png']) > li").each((i, el) => {
                const name = $(el).find('span').first().contents().filter(function() { return this.type === 'text'; }).text().trim();
                const quantity = parseInt($(el).find('span.text-muted').text().replace(/[^\d]/g, ''));
                if (name && quantity > 0) {
                    stockData.gear.push({ name, quantity });
                }
            });
            // Eggs
            $("ul:contains('egg stock') > li, ul.list-unstyled:has(img[src*='egg']) > li").each((i, el) => {
                const name = $(el).find('span').first().contents().filter(function() { return this.type === 'text'; }).text().trim();
                const quantity = parseInt($(el).find('span.text-muted').text().replace(/[^\d]/g, ''));
                if (name && quantity > 0) {
                    stockData.eggs.push({ name, quantity });
                }
            });
            // Seeds
            $("ul:contains('seeds stock') > li, ul.list-unstyled:has(img[src*='carrot.png']) > li").each((i, el) => {
                const name = $(el).find('span').first().contents().filter(function() { return this.type === 'text'; }).text().trim();
                const quantity = parseInt($(el).find('span.text-muted').text().replace(/[^\d]/g, ''));
                if (name && quantity > 0) {
                    stockData.seeds.push({ name, quantity });
                }
            });
            console.log('virastisad.ru scraped data:', stockData);
            return stockData;
        } catch (error) {
            console.error(`Error fetching from virastisad.ru (attempt ${attempt}/${maxRetries}):`, error.message);
            if (attempt < maxRetries) {
                console.log(`Retrying in ${retryDelay/1000} seconds...`);
                await new Promise(resolve => setTimeout(resolve, retryDelay));
            } else {
                console.error('All attempts failed. Returning null.');
                return null;
            }
        }
    }
}

// Function to normalize and combine stock data
function normalizeStockData(data) {
  const normalizeName = (name) => {
    // Remove prefixes like "Seeds", "Gear", "Egg" from the beginning
    let cleanName = name.trim();
    cleanName = cleanName.replace(/^(Seeds|Gear|Egg)/i, '').trim();
    return cleanName.toLowerCase();
  };
  
  // Remove duplicates and merge quantities
  const normalizeCategory = (items) => {
    const normalized = {};
    
    items.forEach(item => {
      const key = normalizeName(item.name);
      if (normalized[key]) {
        // If same item exists, SUM the quantities (not take maximum)
        // This ensures we get the total quantity from all sources
        normalized[key].quantity += item.quantity;
      } else {
        // Store the clean name (without prefix) but keep original case for display
        const cleanName = item.name.replace(/^(Seeds|Gear|Egg)/i, '').trim();
        normalized[key] = {
          name: cleanName,
          quantity: item.quantity
        };
      }
    });
    
    return Object.values(normalized);
  };
  
  return {
    seeds: normalizeCategory(data.seeds || []),
    gear: normalizeCategory(data.gear || []),
    eggs: normalizeCategory(data.eggs || [])
  };
}

// Main function to get all stock data from Gamersberg API
async function getAllStockData() {
  try {
    const maxTries = 3;
    let attempt = 0;
    let normalizedData = null;
    let prevStockHash = null;
    function getStockHash(data) {
      const cat = ['seeds','gear','eggs'];
      return cat.map(c => (data[c]||[]).map(i => `${i.name}:${i.quantity}`).sort().join('|')).join('#');
    }
    while (attempt < maxTries) {
      attempt++;
      console.log(`Fetching stock data from Gamersberg API (try ${attempt}/${maxTries})...`);
      const virastisadData = await fetchVirastisadStock();
      if (virastisadData) {
        normalizedData = normalizeStockData(virastisadData);
        const totalSeeds = normalizedData.seeds.reduce((sum, item) => sum + item.quantity, 0);
        const totalGear = normalizedData.gear.reduce((sum, item) => sum + item.quantity, 0);
        const totalEggs = normalizedData.eggs.reduce((sum, item) => sum + item.quantity, 0);
        console.log(`Stock counts - Seeds: ${totalSeeds}, Gear: ${totalGear}, Eggs: ${totalEggs}`);
        const currentHash = getStockHash(normalizedData);
        if (prevStockHash !== null && currentHash === prevStockHash) {
          console.log('Stock data identical to previous, reloading page and API, then retrying...');
          try {
            await axios.get('https://virastisad.ru/stock/', { timeout: 10000 });
            console.log('Page reloaded successfully.');
          } catch (reloadErr) {
            console.error('Error reloading page:', reloadErr.message);
          }
          try {
            await axios.get('https://virastisad.ru/stock/', { timeout: 10000 });
            console.log('API reloaded successfully.');
          } catch (apiReloadErr) {
            console.error('Error reloading API:', apiReloadErr.message);
          }
          continue;
        }
        prevStockHash = currentHash;
        if (totalSeeds === 0 && totalGear === 0 && totalEggs === 0) {
          console.log('All stock counts are zero, retrying...');
          continue;
        } else {
          console.log('New stock data detected:', normalizedData);
          return normalizedData;
        }
      } else {
        console.log('No data available from virastisad.ru - retrying...');
        continue;
      }
    }
    // If we reach here, all attempts failed or all were empty or always identical
    console.log('No valid or changed stock data after retries - returning last data or empty');
    return normalizedData || {
      seeds: [],
      gear: [],
      eggs: []
    };
  } catch (error) {
    console.error('Error getting stock data:', error.message);
    return {
      seeds: [],
      gear: [],
      eggs: []
    };
  }
}

module.exports = {
    fetchVirastisadStock,
  getAllStockData
}; 