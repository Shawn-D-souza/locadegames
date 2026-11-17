import { Config } from "@remotion/cli/config";
import { webpackOverride } from "./webpack-override.mjs";

Config.setVideoImageFormat("png");
Config.setOverwriteOutput(true);
Config.overrideWebpackConfig(webpackOverride);
