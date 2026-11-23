const DB_NAME = 'skilearn-cache'
const DB_VERSION = 1

function openDatabase() {
  return new Promise((resolve, reject) => {
    if (!('indexedDB' in window)) {
      reject(new Error('IndexedDB is not available'))
      return
    }
    const request = window.indexedDB.open(DB_NAME, DB_VERSION)
    request.onupgradeneeded = () => {
      const database = request.result
      if (!database.objectStoreNames.contains('key-value')) {
        database.createObjectStore('key-value')
      }
    }
    request.onsuccess = () => resolve(request.result)
    request.onerror = () => reject(request.error)
  })
}

export async function readCache(key) {
  try {
    const database = await openDatabase()
    return await new Promise((resolve, reject) => {
      const transaction = database.transaction('key-value', 'readonly')
      const request = transaction.objectStore('key-value').get(key)
      request.onsuccess = () => resolve(request.result ?? null)
      request.onerror = () => reject(request.error)
    })
  } catch (error) {
    console.warn('Unable to read Skilearn cache:', error)
    return null
  }
}

export async function writeCache(key, value) {
  try {
    const database = await openDatabase()
    await new Promise((resolve, reject) => {
      const transaction = database.transaction('key-value', 'readwrite')
      transaction.objectStore('key-value').put(value, key)
      transaction.oncomplete = () => resolve()
      transaction.onerror = () => reject(transaction.error)
    })
  } catch (error) {
    console.warn('Unable to write Skilearn cache:', error)
  }
}
