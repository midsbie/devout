import { Format, Platform } from "esbuild";
import { findUpMultiple } from "find-up";
import merge from "lodash.merge";

import Application from "../Application";
import { BuildType, Config, ConfigType, PartialConfigType } from "./Config";
import { ProxiedPackageJson } from "./PackageJson";
import { logger } from "./logger";

const validBuildTypes: Readonly<Set<BuildType>> = new Set(["library", "application"]);

const knownAppPackages = ["react", "vue", "angular"];
const knownBrowserPackages = ["webpack", "vite"];
const knownAppScripts = ["build:app", "dev", "start", "serve"];

// Keeping default formats separate for manual assignment to prevent final config from always
// containing "cjs" and "esm" after merging default and user configs.
const defaultFormats: Readonly<Format[]> = ["cjs", "esm"];

export const defaultConfig: Readonly<ConfigType> = {
  type: "library",
  platform: "node",
  entry: [],
  output: "dist",
  formats: [], // see defaultFormats above
  declaration: true,
  includeDependenciesInBundle: false,
};

export class ConfigBuilder {
  packageJson: ProxiedPackageJson;
  config: PartialConfigType;

  static async load(packageJson: ProxiedPackageJson): Promise<ConfigBuilder> {
    const configName = Application.get().name;
    let partialConfig: PartialConfigType = {};
    const matches = await findUpMultiple([`${configName}.config.js`, `${configName}.config.mjs`]);
    if (matches?.length > 0) {
      const configModule = await import(matches[0]);
      partialConfig = configModule.default || configModule;
    }
    return new ConfigBuilder(packageJson, partialConfig);
  }

  constructor(packageJson: ProxiedPackageJson, partial: PartialConfigType) {
    this.packageJson = packageJson;
    this.config = partial;
  }

  async build(): Promise<Readonly<Config>> {
    if (!this.config.type) this.config.type = this.guessBuildType();
    if (!this.config.platform) this.config.platform = this.guessPlatform();

    if (!this.config.entry) {
      this.config.entry = this.packageJson.entry;
      if (!this.config.entry) {
        logger.error(`\
Unable to determine the entry source file. Please ensure the 'main', 'module', 'entry', or \
'browser' field is correctly specified in your package.json file.`);
        process.exit(1);
      }
    }

    if (typeof this.config.entry === "string") this.config.entry = [this.config.entry];

    const json = merge(defaultConfig, this.config) as ConfigType;

    if (!validBuildTypes.has(json.type)) {
      logger.error(`Invalid build type specified ('${json.type}')`);
      process.exit(1);
    }

    // Browser application builds that do not specify `includeDependenciesInBundle` default to true.
    if (
      json.platform === "browser" &&
      json.type === "application" &&
      this.config.includeDependenciesInBundle == null
    ) {
      json.includeDependenciesInBundle = true;
    }

    if (json.formats?.length > 0) json.formats = [...new Set(json.formats)];
    else json.formats = [...defaultFormats];

    return new Config(json);
  }

  private guessBuildType(): BuildType {
    const { scripts = {}, browser } = this.packageJson;

    if (browser) return "application";
    if (knownAppScripts.some((k) => scripts[k])) return "application";

    return "library";
  }

  private guessPlatform(): Platform {
    const {
      dependencies = {},
      devDependencies = {},
      peerDependencies = {},
      scripts = {},
      browser,
    } = this.packageJson;
    if (browser) return "browser";
    if (knownAppPackages.some((k) => dependencies[k] || peerDependencies[k])) return "browser";
    if (knownBrowserPackages.some((k) => devDependencies[k])) return "browser";

    if (knownBrowserPackages.some((p) => knownAppScripts.some((s) => scripts[s]?.includes(p)))) {
      return "browser";
    }

    return "node";
  }
}
