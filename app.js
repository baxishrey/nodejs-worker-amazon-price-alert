// REQUIRES
const AWS = require('aws-sdk');
const rp = require('request-promise');
const $ = require('cheerio');

AWS.config.update({ region: 'us-east-1' });
const docClient = new AWS.DynamoDB.DocumentClient({ apiVersion: '2012-08-10' });

// CONSTANTS
const tableName = 'user-price-items';
const intervalTime = 30000;

// Get username (email) and item id from environment variables
const email = process.env.email;
const itemId = process.env.item_id;

if (!email) {
  console.log('Email is required');
  return;
}

if (!itemId) {
  console.log('Item ID is required');
  return;
}

let trackedItem = undefined;

// Get item from DynamoDB using username and item id
console.log('Fetching tracked item...');
getUser(email)
  .then(
    data => {
      console.log('Testing role for ECS');
      const item = data.Item;
      if (!item) {
        console.error(`No items found for username ${email}`);
        return;
      } else {
        const tracked_items = Array.from(item.tracked_items);
        trackedItem = tracked_items.find(ti => ti.id === itemId);

        if (!trackedItem) {
          console.error(
            `User ${email} is not tracking the item with id ${itemId}`
          );
          return;
        } else {
          let interval = setInterval(() => {
            // Fetch current price of item
            console.log('Fetching current price...');
            rp(trackedItem.url, { gzip: true }).then(html => {
              var price = $(
                '[id=priceblock_ourprice],[id=priceblock_dealprice]',
                html
              )
                .text()
                .trim();
              price = price.replace(/[\u20B9]/g, '').trim();
              var currentPrice = parseFloat(price.replace(',', ''));
              console.log(`Current price is ${currentPrice}`);
              console.log(`Target price is ${trackedItem.targetPrice}`);
              const hasPriceDropped = currentPrice <= trackedItem.targetPrice;
              if (hasPriceDropped) {
                // If price has dropped, send email
                console.log(
                  'Price has dropped! Congratulations! Stopping tracking..'
                );
                clearInterval(interval);
              } else {
                console.log(`Trying again in ${intervalTime / 1000} seconds`);
              }
            });
            // Start interval of 1 hour
          }, intervalTime);
        }
      }
    },
    err => {
      throw new Error(err);
    }
  )
  .catch(err => console.error(err));

function getUser(username) {
  const params = {
    TableName: tableName,
    Key: {
      userId: username
    }
  };
  return docClient.get(params).promise();
}
