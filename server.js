const puppeteer = require('puppeteer');
const fs = require('fs');

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
      products.push({
        title: productTitles[i].textContent.trim(),
        price: productPrices[i].textContent.trim(),
        brand: productBrand[i].textContent.trim(),
        image: productImages[i].getAttribute('data-src'), // Extract the data-src attribute for image URL
      });
    }

    return products;
  });

  // Convert the productData array to JSON format
  const jsonData = JSON.stringify(productData, null, 2);

  // Save the JSON data to a text file
  fs.writeFileSync('productAllData.txt', jsonData);

  console.log('Product data saved to productData.txt');

  await browser.close();
})();
