const dbName = 'WebhookTesterDb';
const dbVersion = 1;
const storeName = 'webhooksDb';

let db;

const openDB = () => {
    return new Promise((resolve, reject) => {
        const request = indexedDB.open(dbName, dbVersion);

        request.onerror = (event) => reject("IndexedDB error: " + event.target.error);

        request.onsuccess = (event) => {
            db = event.target.result;
            resolve(db);
        };

        request.onupgradeneeded = (event) => {
            db = event.target.result;
            db.createObjectStore(storeName, { keyPath: 'slug' });
        };
    });
};

const saveWebhooksInDb = (webhooks) => {
    return new Promise((resolve, reject) => {
        const transaction = db.transaction([storeName], 'readwrite');
        const store = transaction.objectStore(storeName);

        webhooks.forEach(webhook => {
            store.put(webhook);
        });

        transaction.oncomplete = () => resolve();
        transaction.onerror = (event) => reject(event.target.error);
    });
};

const getWebhooksFromDb = () => {
    return new Promise((resolve, reject) => {
        const transaction = db.transaction([storeName], 'readonly');
        const store = transaction.objectStore(storeName);
        const request = store.getAll();

        request.onsuccess = () => resolve(request.result);
        request.onerror = (event) => reject(event.target.error);
    });
};

const removeWebhookFromDb = (slug) => {
    return new Promise((resolve, reject) => {
        const transaction = db.transaction([storeName], 'readwrite');
        const store = transaction.objectStore(storeName);
        const request = store.delete(slug);

        request.onsuccess = () => resolve();
        request.onerror = (event) => reject(event.target.error);
    });
};

export { openDB, saveWebhooksInDb, getWebhooksFromDb, removeWebhookFromDb };