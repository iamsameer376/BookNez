import fs from 'fs';
import https from 'https';

const file = fs.createWriteStream("public/notification.mp3");
const request = https.get("https://raw.githubusercontent.com/sdras/vue-sample-sounds/master/src/assets/glimmer.mp3", function (response) {
    response.pipe(file);

    file.on('finish', () => {
        file.close();
        console.log("Download completed.");
    });
}).on('error', (err) => {
    fs.unlink("public/notification.mp3", () => { });
    console.error("Error downloading file:", err.message);
});
