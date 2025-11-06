// Debug localStorage to catch what's deleting user data
const originalSetItem = localStorage.setItem;
const originalRemoveItem = localStorage.removeItem;
const originalClear = localStorage.clear;

localStorage.setItem = function(key: string, value: string) {
  console.log(`📦 localStorage.setItem("${key}")`, value.substring(0, 100));
  console.trace('Called from:');
  return originalSetItem.apply(this, [key, value]);
};

localStorage.removeItem = function(key: string) {
  console.error(`🗑️ localStorage.removeItem("${key}")`);
  console.trace('Called from:');
  return originalRemoveItem.apply(this, [key]);
};

localStorage.clear = function() {
  console.error('🗑️ localStorage.clear()');
  console.trace('Called from:');
  return originalClear.apply(this);
};

console.log('🔍 localStorage monitoring enabled');
