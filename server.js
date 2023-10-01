const puppeteer = require('puppeteer');
const fs = require('fs');
const path = require('path');
const axios = require('axios');

(async () => {
  const browser = await puppeteer.launch({ headless: 'new' });
  const page = await browser.newPage();

  // Navigate to the URL with pet products
  await page.goto('https://www.storeexpress.iq/pet/shop?ps=59');

  // Extract product data
  const productData = await page.evaluate(() => {
    const productTitles = Array.from(document.querySelectorAll('a.listProductName'));
    const productPrices = Array.from(document.querySelectorAll('div.currentPrice'));
    const productImages = Array.from(document.querySelectorAll('img.stImage'));
    const productBrand = Array.from(document.querySelectorAll('a.listProductBrand'));

    // Ensure all arrays have the same length
    if (productTitles.length !== productPrices.length || productTitles.length !== productImages.length || productBrand.length !== productImages.length) {
      throw new Error('Mismatched data: product titles, prices, and images counts differ.');
    }

    // Create an array of objects with title, price, brand, and image URL
    const products = [];
    for (let i = 0; i < productTitles.length; i++) {
      const imageUrl = productImages[i].getAttribute('data-src'); // Extract the data-src attribute for image URL

      products.push({
        title: productTitles[i].textContent.trim(),
        price: productPrices[i].textContent.trim(),
        brand: productBrand[i].textContent.trim(),
        image: imageUrl, // Save the image URL as a relative path
      });
    }

    return products;
  });

  // Convert the productData array to JSON format
  const jsonData = JSON.stringify(productData, null, 2);

  // Save the JSON data to a text file
  fs.writeFileSync('productAllData.txt', jsonData);

  // Create a function to download images in batches
  const downloadDir = 'images';
  fs.mkdirSync(downloadDir, { recursive: true });

  const maxRetries = 3; // Number of times to retry a failed request
  const retryDelay = 2000; // Delay in milliseconds before retrying
  const batchSize = 50; // Batch size for downloading images

  async function downloadImagesInBatches(products) {
    for (let i = 0; i < products.length; i += batchSize) {
      const batch = products.slice(i, i + batchSize);
      await Promise.all(batch.map(async (product) => {
        const imageUrl = product.image;
        const imageFileName = path.join(downloadDir, imageUrl.split('/').pop());
        let retries = 0;

        while (retries < maxRetries) {
          try {
            const response = await axios.get(imageUrl, { responseType: 'stream' });
            response.data.pipe(fs.createWriteStream(imageFileName));

            await new Promise((resolve) => {
              response.data.on('end', resolve);
            });

            console.log(`Image downloaded for ${product.title}`);
            break; // If successful, exit the retry loop
          } catch (error) {
            console.error(`Error downloading image for ${product.title}: ${error.message}`);
            retries++;

            if (retries < maxRetries) {
              console.log(`Retrying in ${retryDelay / 1000} seconds...`);
              await new Promise((resolve) => setTimeout(resolve, retryDelay));
            } else {
              console.error(`Max retries reached for ${product.title}. Skipping.`);
              break; // If max retries reached, exit the retry loop
            }
          }
        }
      }));
    }
  }

  // Call the function to download images in batches
  await downloadImagesInBatches(productData);

  console.log('Product data saved to productAllData.txt');
  console.log('Images downloaded to the "images" directory.');

  await browser.close();
})();
