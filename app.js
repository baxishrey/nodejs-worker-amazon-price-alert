// REQUIRES
const AWS = require('aws-sdk');
const rp = require('request-promise');
const $ = require('cheerio');

if (process.env.NODE_ENV !== 'production') {
  require('dotenv').config();
}

AWS.config.update({ region: 'us-east-1' });

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

async function checkPrice() {
  // Fetch current price of item
  console.log('Fetching current price...');
  try {
    const html = await rp(url, { gzip: true });
    var price = $('[id=priceblock_ourprice],[id=priceblock_dealprice]', html)
      .text()
      .trim();
    price = price.replace(/[\u20B9]/g, '').trim();
    var currentPrice = parseFloat(price.replace(',', ''));
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
  }
}
checkPrice();
let interval = setInterval(checkPrice, intervalTime);
