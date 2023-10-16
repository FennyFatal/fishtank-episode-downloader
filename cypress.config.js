// get dotenv
require("dotenv").config();
// get cypress-downloadfile
const { defineConfig } = require("cypress");
const { downloadFile } = require("cypress-downloadfile/lib/addPlugin");

module.exports = defineConfig({
  e2e: {
    browser: "chrome",
    testIsolation: false,
    setupNodeEvents(on, config) {
      on("task", { downloadFile });
      on("task", {
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
