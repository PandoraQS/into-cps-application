import packageJson from '../../../package.json';

export const IS_DEV = (process.env.NODE_ENV ?? "production") === "development";
export const APP_VERSION = packageJson.version;

export const MAIN_START_URL = IS_DEV
  ? "http://localhost:3000"
  : "app://index.html";

export const GRAPH_START_URL = IS_DEV
  ? "http://localhost:3000/#/live-plotting"
  : "app://index.html#/live-plotting";
  
export const ROUTES = {
  Main: "/",
  CoSimulation: "/cosimulation",
  LivePlotting: "/live-plotting",
} as const;