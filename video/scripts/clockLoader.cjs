// Webpack loader: gives every file of the app (src/web) the video's clock in place of the browser's timers, Date and
// performance (src/clock/clock.ts), on the file's first line so its line numbers stay the same.
const path = require("node:path");

const clock = path.join(__dirname, "../src/clock/clock.ts").split(path.sep).join("/");
const PRELUDE = `import { setTimeout, clearTimeout, setInterval, clearInterval, requestAnimationFrame, cancelAnimationFrame, performance, VideoDate as Date } from ${JSON.stringify(clock)};`;

module.exports = function clockLoader(source) {
  return PRELUDE + source;
};
