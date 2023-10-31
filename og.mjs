import cypressConfig, { downloadFile } from "./cypress.config.mjs";
import WebSocket from 'ws'
const {
    CYPRESS_USERNAME,
    CYPRESS_PASSWORD
} = cypressConfig.e2e.env;

const fireToken = await fetch("https://wcsaaupukpdmqdjcgaoo.supabase.co/auth/v1/token?grant_type=password", {
  "headers": {
    "accept": "*/*",
    "accept-language": "en-US,en;q=0.9",
    "apikey": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Indjc2FhdXB1a3BkbXFkamNnYW9vIiwicm9sZSI6ImFub24iLCJpYXQiOjE2ODkxMDM4NDEsImV4cCI6MjAwNDY3OTg0MX0.xlZdK9HhTCF_fZgq8k5DCPhxJ2vhMCW1q9du4f0ZtWE",
    "authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Indjc2FhdXB1a3BkbXFkamNnYW9vIiwicm9sZSI6ImFub24iLCJpYXQiOjE2ODkxMDM4NDEsImV4cCI6MjAwNDY3OTg0MX0.xlZdK9HhTCF_fZgq8k5DCPhxJ2vhMCW1q9du4f0ZtWE",
    "content-type": "application/json;charset=UTF-8",
    "sec-ch-ua": "\"Chromium\";v=\"118\", \"Google Chrome\";v=\"118\", \"Not=A?Brand\";v=\"99\"",
    "sec-ch-ua-mobile": "?0",
    "sec-ch-ua-platform": "\"Windows\"",
    "sec-fetch-dest": "empty",
    "sec-fetch-mode": "cors",
    "sec-fetch-site": "cross-site",
    "x-client-info": "@supabase/auth-helpers-nextjs@0.7.4",
    "Referer": "https://www.fishtank.live/",
    "Referrer-Policy": "strict-origin-when-cross-origin"
  },
  "body": `{\"email\":\"${CYPRESS_USERNAME}\",\"password\":\"${CYPRESS_PASSWORD}\",\"gotrue_meta_security\":{}}`,
  "method": "POST"
});

const [_tokenName, ...bits] = fireToken.headers.get('set-cookie').split(';')[0].split('=')
const firebaseToken = bits.join('=');
const episodes = await new Promise((resolve, reject) => {
  const ws = new WebSocket('wss://ws.fishtank.live/socket.io/?EIO=4&transport=websocket', {
    "headers": {
      "accept-language": "en-US,en;q=0.9",
      "cache-control": "no-cache",
      "pragma": "no-cache",
      "sec-websocket-extensions": "permessage-deflate; client_max_window_bits",
      "sec-websocket-key": "Kv0WU9v2W7A9/SjeLNy4/A==",
      "sec-websocket-version": "13",
      'Origin': 'https://www.fishtank.live'
    }
  });

  ws.on('message', function incoming(data) {
    if (data.toString().startsWith('0')) {
      ws.send('40'+JSON.stringify({token: firebaseToken}), function reject(err) {
        if (err) console.log(err);
      });
    } else if (data.toString().startsWith('40')) {
      ws.send('421["episodes:get"]', function ack(err) {
        if (err) reject(err);
      });
    } else if (data.toString().startsWith('431')) {
      const json = data.toString().replace(/^431/, '')
      ws.close();
      resolve(JSON.parse(json))
    }
  });
  ws.on('error', function error(err) {
    reject(err);
  });
});
const episodeLinks = episodes[0].filter((x) => x.jwt)
.map((x, i) => {
  const [eNum, title] = x.title.split(' | ');
  return [
    {
      title: `Fishtank.live.S01${eNum}.${title}`,
      download: `https://playback.livepeer.studio/asset/hls/${x.playbackId}/video?jwt=${x.jwt}`,
      stream: `https://playback.livepeer.studio/asset/hls/${x.playbackId}/1080p0/index.m3u8?jwt=${x.jwt}`,
    },
    ...(Array.isArray(x.extras) ? x.extras : [x.extras]).filter(x => x?.jwt).map(
      (x, j) => ({
        title: `Fishtank.live.S00${eNum}.Extras`,
        download: `https://playback.livepeer.studio/asset/hls/${x.playbackId}/video?jwt=${x.jwt}`,
        stream: `https://playback.livepeer.studio/asset/hls/${x.playbackId}/1080p0/index.m3u8?jwt=${x.jwt}`,
      }),
    ),
  ]
})
.flat();
for (let episode of episodeLinks) {
    const filename = `${episode.title}.mp4`;
    console.log("Downloading", filename);
    await downloadFile({
        url: episode.download,
        directory: "episodes",
        cookies: undefined,
        fileName: filename,
        userAgent: cypressConfig.e2e.userAgent
    });
}