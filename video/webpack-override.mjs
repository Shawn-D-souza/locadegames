// Remotion's bundler, set up to render the app's real components: Tailwind with the app's theme, one React
// (the app's), the app's sound and haptics players swapped for silent stand-ins (sound is in the music), and the app's
// timers and clock swapped for the video's (src/clock/clock.ts), so its playbacks follow the frames.
// Used by remotion.config.ts (studio, render) and scripts/stills.mjs.
import path from "node:path";
import { webpack } from "@remotion/bundler";
import { enableTailwind } from "@remotion/tailwind-v4";

// Always run from video/ (npm scripts, the Remotion CLI; its config is loaded as CommonJS, so no import.meta here).
const here = process.cwd();
const root = path.resolve(here, "..");
const stubs = path.join(here, "src/stubs");

export function webpackOverride(current) {
  const config = enableTailwind(current);
  return {
    ...config,
    module: {
      ...config.module,
      rules: [...(config.module?.rules ?? []), { test: /\.tsx?$/, include: path.join(root, "src/web"), enforce: "pre", use: path.join(here, "scripts/clockLoader.cjs") }],
    },
    resolve: {
      ...config.resolve,
      alias: {
        ...(config.resolve?.alias ?? {}),
        react: path.join(root, "node_modules/react"),
        "react-dom": path.join(root, "node_modules/react-dom"),
      },
    },
    plugins: [
      ...(config.plugins ?? []),
      new webpack.NormalModuleReplacementPlugin(/services[\\/]soundPlayer(\.ts)?$/, path.join(stubs, "soundPlayer.ts")),
      new webpack.NormalModuleReplacementPlugin(/services[\\/]hapticPlayer(\.ts)?$/, path.join(stubs, "hapticPlayer.ts")),
      new webpack.DefinePlugin({ "import.meta.env": JSON.stringify({ DEV: false, PROD: true, VITE_SERVER_URL: "" }) }),
    ],
  };
}
