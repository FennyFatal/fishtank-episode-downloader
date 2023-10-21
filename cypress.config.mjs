import { createWriteStream, existsSync } from 'node:fs';
import { pipeline } from 'node:stream';
import { promisify } from 'node:util'
import fetch from 'node-fetch';
import { defineConfig } from "cypress";
import { config } from "dotenv";
config();

export default defineConfig({
  e2e: {
    browser: "chrome",
    testIsolation: false,
    setupNodeEvents(on, config) {
      on("task", {
        /**
         * @param {{
         *    cookies: Cypress.Cookie[],
         *    url: string,
         *    directory: string,
         *    fileName: string,
         *    userAgent: string,
         * }}
         **/ 
        downloadFile: async ({
          url,
          directory,
          cookies,
          fileName,
          userAgent
        }) => {
          if (existsSync(`${directory}/${fileName}`)) return null;
          if (!existsSync(directory)) await mkdir(directory, { recursive: true });
          const response = await fetch(url, {
            headers: {
              // flatten cookie
              cookie: cookies.map((perv) => `${perv.name}=${perv.value};`).join(' '),
              'user-agent': userAgent,
            },
          })
          const streamPipeline = promisify(pipeline);

          if (!response.ok) throw new Error(`unexpected response ${response.statusText}`);

          await streamPipeline(response.body, createWriteStream(`${directory}/${fileName}`));
          return null;
        },
        print(message) {
          console.log(...message);
          return null;
        },
      });
    },
    env: {
      CYPRESS_USERNAME: process.env.CYPRESS_USERNAME,
      CYPRESS_PASSWORD: process.env.CYPRESS_PASSWORD,
    },
  },
});
