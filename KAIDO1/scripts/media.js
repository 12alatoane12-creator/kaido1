const fs=require('node:fs'),path=require('node:path');
const root=path.join(__dirname,'..'),manifest=require('../source/media.json'),cache=new Map();
module.exports=function embedMedia(text){return text.replace(/__KN_MEDIA:([a-f0-9]{12})__/g,(_token,id)=>{if(!manifest[id])throw Error('Unknown media: '+id);if(!cache.has(id))cache.set(id,'data:image/webp;base64,'+fs.readFileSync(path.join(root,manifest[id].file)).toString('base64'));return cache.get(id);});};
