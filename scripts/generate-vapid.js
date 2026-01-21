import webpush from 'web-push';
import fs from 'fs';

const vapidKeys = webpush.generateVAPIDKeys();

const content = `Public Key: ${vapidKeys.publicKey}
Private Key: ${vapidKeys.privateKey}`;

fs.writeFileSync('vapid-keys.txt', content);
console.log('Keys written to vapid-keys.txt');
