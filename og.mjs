import cypressConfig, { downloadFile } from "./cypress.config.mjs";
import express from 'express';
import WebSocket from 'ws'
const {
    CYPRESS_USERNAME,
    CYPRESS_PASSWORD
} = cypressConfig.e2e.env;

const toLinks = (html) => {
  return html.filter((x) => x.jwt)
  .map((x, i) => {
    const isEpisode = !!x.title
    const { ep, title } = {...[...(((x.title ?? x.name)?.matchAll(/E?(?<ep>[0-9]+) -? ?(?<title>.+)/g)) ?? [])][0]?.groups ?? {title: x.name, ep: 'LIVE '}};
    const eNum = ep ? 'E' + ep.padStart(2, '0') + '.' : ''
    if (isEpisode) return [
      {
        title: `Fishtank.live.S01${eNum}${title}`,
        download: `https://playback.livepeer.studio/asset/hls/${x.playbackId}/video?jwt=${x.jwt}`,
        stream: `https://playback.livepeer.studio/asset/hls/${x.playbackId}/1080p0/index.m3u8?jwt=${x.jwt}`,
      },
      ...(Array.isArray(x.extras) ? x.extras : [x.extras]).filter(x => x?.jwt).map(
        (x, j) => ({
          title: `Fishtank.live.S00${eNum}Extras`,
          download: `https://playback.livepeer.studio/asset/hls/${x.playbackId}/video?jwt=${x.jwt}`,
          stream: `https://playback.livepeer.studio/asset/hls/${x.playbackId}/1080p0/index.m3u8?jwt=${x.jwt}`,
        }),
      ),
    ]
    // It's a live episode
    return [
      {
        id: x.id,
        title: `${title}`,
        stream: `https://livepeercdn.studio/hls/${x.playbackId}/index.m3u8?jwt=${x.jwt}`
      },
    ]
  })
  .flat();
}

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

let links = [];
let ws = null;

const getTheThings = async () => {
  const episodes = await new Promise((resolve, reject) => {
    ws = new WebSocket('wss://ws.fishtank.live/socket.io/?EIO=4&transport=websocket', {
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
        ws.send('42["live-stream:get"]', function ack(err) {
          if (err) reject(err);
        });
      } else if (data.toString().startsWith('433')) {
        const json = data.toString().replace(/^433/, '')
        ws.close();
        resolve(JSON.parse(json))
      } else if (data.toString().startsWith('42["chat:message",')) {
      } else if (data.toString() === ('2')) {
        ws.send('3', function ack(err) {
          if (err) reject(err);
        });
      } else if (data.toString().startsWith('42["live-stream:get",')) {
        const json = data.toString().replace(/^42/, '')
        const theobj = JSON.parse(json)[1];
        console.log(theobj);
        links = toLinks(theobj);
      } else {
        console.log(data.toString());
      }
    });
    ws.on('error', function error(err) {
      reject(err);
    });
  });
  console.log(JSON.stringify(episodes, null, 2));
  const episodeLinks = toLinks(episodes[0]);
  for (let episode of episodeLinks) {
    const filename = `${episode.title}.mp4`;
    console.log("Downloading", filename);
    await downloadFile({
      url: episode.download,
      directory: "episodes",
      cookies: undefined,
      fileName: filename.replace(/[^a-z 0-9.]/gi, ''),
      userAgent: cypressConfig.e2e.userAgent
    });
  }
}

getTheThings();

const app = express();
app.use('/api/live-streams', (req, res) => {
  res.json(links);
});

app.use('/api/stream/:stream', (req, res) => {
  const stream = req.params.stream;
  const link = links.find(x => x.id === stream);
  if (!link) {
    res.status(404).json({error: 'Stream not found'});
    return;
  }
  res.redirect(307, link.stream);
  // res.json(link);
});

app.use('/api/proxystream/:stream', async (req, res) => {
  const stream = req.params.stream;
  const link = links.find(x => x.id === stream);
  if (!link) {
    res.status(404).json({error: 'Stream not found'});
    return;
  }
  const jwt = /jwt=(.+)/.exec(link.stream)[1]
  res.set('Content-Type', 'application/x-mpegURL')
  // retry this as many as three times
  let body = null;
  let basePath = null;
  for (let i = 0; i < 3; i++) {
    try {
      const request = await fetch(link.stream);
      basePath = /(https:\/\/([^\/?]+[\/]){3})/.exec(request.url)[1]
      body = await request.text();
      if (
        body && body.length > 0
        && body.includes('#EXTM3U')
        && body.includes('#EXT-X-STREAM-INF')
        && request.status === 200
      )
        break;
    } catch (e) {
      console.log(e);
    }
  }
  // streamcatcher
  const newBody = body
  .replaceAll(/\n([0-9]_.+)\r/g, '\n' + basePath + `$1&jwt=${jwt}\r`).replace(/\/r\/n$/, '');
  res.send(newBody);
});

app.use('/api/streamId/:streamId', (req, res) => {
  const streamId = req.params.streamId;
  const link = links[parseInt(streamId ?? 99)];
  if (!link) {
    res.status(404).json({error: 'Stream not found'});
    return;
  }
  res.redirect(307, link.stream);
  // res.json(link);
});

app.listen(3000, () => {
  console.log('listening on http://localhost:3000/');
});