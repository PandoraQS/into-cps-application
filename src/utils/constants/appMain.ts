import * as path from "path";
import { app } from "electron";
import { IS_DEV } from "./appShared";

export const PRELOAD_PATH = IS_DEV
    ? path.resolve(process.cwd(), "dist", "preload.js")
    : path.resolve(app.getAppPath(), "dist/preload.js");

export const ICON_PATH = IS_DEV
    ? path.resolve(process.cwd(), "src", "resources", "into-cps", "appicon", "into-cps-logo.png.ico")
    : path.resolve(app.getAppPath(), "dist/resources/into-cps/appicon/into-cps-logo.png.ico");
