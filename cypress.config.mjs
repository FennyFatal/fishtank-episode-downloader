import { createWriteStream, existsSync, mkdirSync } from 'node:fs';
import { pipeline } from 'node:stream';
import { promisify } from 'node:util'
import fetch from 'node-fetch';
import { defineConfig } from "cypress";
import { config } from "dotenv";
config();

export /**
* @param {{
*    cookies: Cypress.Cookie[],
*    url: string,
*    directory: string,
*    fileName: string,
*    userAgent: string,
* }}
**/ 
const downloadFile = async ({
 url,
 directory,
 cookies,
 fileName,
 userAgent
}) => {
 if (existsSync(`${directory}/${fileName}`)) return null;
 if (!existsSync(directory)) await mkdirSync(directory);
 const response = await fetch(url, {
   headers: {
     // flatten cookie
     cookie: cookies?.map((perv) => `${perv.name}=${perv.value};`).join(' '),
     'user-agent': userAgent,
   },
 })
 const streamPipeline = promisify(pipeline);

 if (!response.ok) throw new Error(`unexpected response ${response.statusText}`);

 await streamPipeline(response.body, createWriteStream(`${directory}/${fileName}`));
 return null;
}

export default defineConfig({
  e2e: {
    browser: "chrome",
    testIsolation: false,
    setupNodeEvents(on, config) {
      on("task", {
        downloadFile,
        print(message) {
          console.log(...message);
          return null;
        },
      });
    },
    userAgent: "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/111.0.0.0 Safari/537.36",
    env: {
      CYPRESS_USERNAME: process.env.CYPRESS_USERNAME,
      CYPRESS_PASSWORD: process.env.CYPRESS_PASSWORD,
    },
  },
});
