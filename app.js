// REQUIRES
const rp = require('request-promise');
const $ = require('cheerio');

if (process.env.NODE_ENV !== 'production') {
  require('dotenv').config();
}

// CONSTANTS
const intervalTime = 30000;

// Get username (email) and item id from environment variables
const url = process.env.url;
const targetPrice = parseInt(process.env.targetPrice);

if (!url) {
  console.log('URL is required');
  return;
}

if (!targetPrice) {
  console.log('Target price is required');
  return;
}
let retryCount = 0;

async function checkPrice() {
  // Fetch current price of item
  console.log('Fetching current price...');
  try {
    const html = await rp(url, { gzip: true });
    var price = $(
      '[id=priceblock_ourprice],[id=priceblock_dealprice],[id=priceblock_saleprice]',
      html
    )
      .text()
      .trim();
    price = price.replace(/[\u20B9]/g, '').trim();
    var currentPrice = parseFloat(price.replace(',', ''));
    if (isNaN(currentPrice)) {
      console.log('Unable to fetch current price');
      clearInterval(interval);
      return;
    }
    console.log(`Current price is ${currentPrice}`);
    console.log(`Target price is ${targetPrice}`);
    const hasPriceDropped = currentPrice <= targetPrice;
    if (hasPriceDropped) {
      // If price has dropped, send email
      console.log('Price has dropped! Congratulations! Stopping tracking..');
      clearInterval(interval);
    } else {
      console.log(`Trying again in ${intervalTime / 1000} seconds`);
    }
  } catch (err) {
    console.log(err);
    if (retryCount <= 5) {
      retryCount++;
      console.log(
        `Error in fetching current price. Retrying.... ${retryCount} of 5`
      );
      checkPrice();
    }
  }
}
checkPrice();
let interval = setInterval(checkPrice, intervalTime);
