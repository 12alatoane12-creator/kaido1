const fs = require('node:fs');
for (const file of ['public/index.html','lib/seed.json',...['login','verify','session','content','logout'].map(x=>`api/${x}.js`)]) {
  if (!fs.existsSync(file) || fs.statSync(file).size === 0) throw new Error(`Missing required file: ${file}`);
}
console.log('KAIDO frontend and five API functions are ready.');
