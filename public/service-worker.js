self.addEventListener('install', e => {
    console.log('Service Worker Installed');
    e.waitUntil(
      caches.open('static').then(cache => {
        return cache.addAll([
          '/',
          '/manifest.json',
          '/icons/icon-192.png',
          '/icons/icon-512.png',
          '/icons/favicon.ico',
          '/icons/logo.png',
          '/sound/beep.pm3',
          '/tags',
          '/qrcodes',
          '/bills',
          '/barcodes',
          '/css/abill.css',
          '/css/add-shop.css',
          '/css/allBills.css',
          '/css/assign-user.css',
          '/css/billing.css',
          '/css/delete-account.css',
          '/css/edit-bill.css',
          '/css/edit-product.css',
          '/css/edit-shop.css',
          '/css/footer.css',
          '/css/home.css',
          '/css/login.css',
          '/css/navbar.css',
          '/css/otp.css',
          '/css/printBill.css',
          '/css/product.css',
          '/css/productForm.css',
          '/css/select-shop.css',
          '/css/seller-shop-selector.css',
          '/css/shop-investments.css',
          '/css/shop-list.css',
          '/css/shop-selector.css',
          '/css/signup.css',
          '/css/tag-generator.css',
          '/css/tags.css',
          '/css/verify-otp.css'
        ]);
      })
    );
  });
  
  self.addEventListener('fetch', e => {
    e.respondWith(
      caches.match(e.request).then(response => {
        return response || fetch(e.request);
      })
    );
  });
  