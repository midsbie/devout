import path from "node:path";

import { Format, Platform } from "esbuild";
import { findUpMultiple } from "find-up";
import merge from "lodash.merge";

import Application from "../Application";
import { Config } from "./Config";
import { ProxiedPackageJson } from "./PackageJson";
import { fileExists } from "./fs";
import { logger } from "./logger";
import {
  BuildType,
  ConfigType,
  PackageJsonTransformer,
  PackageJsonTransformerConfig,
} from "./typedefs";

export type PackageJsonTransformerPreset = "none" | "default";

export interface ClientPackageJsonConfig {
  removeFields?: string[];
  addFields?: {
    main?: boolean;
    types?: boolean;
    exports?: boolean;
  };
}

export interface ClientConfig {
  type?: BuildType;
  platform?: Platform;
  entry?: string | string[];
  output?: string;
  formats?: Format[];
  declaration?: boolean;
  includeDependenciesInBundle?: boolean;
  packageJsonTransformer?:
    | boolean
    | PackageJsonTransformer
    | PackageJsonTransformerPreset
    | PackageJsonTransformerConfig;
}

const validBuildTypes: Readonly<Set<BuildType>> = new Set(["library", "application"]);

const knownAppPackages = ["react", "vue", "angular"];
const knownBrowserPackages = ["webpack", "vite"];
const knownAppScripts = ["build:app", "dev", "start", "serve"];

// Not including src/* because these are assumed to be imported by the code.
const knownStyleDirs = ["", "scss", "styles" /*, "src", "src/styles", "src/scss" */];
const knownStyleNames = ["style", "styles", "main"];
const knownStyleExts = ["scss", "sass"];

// Keeping default formats separate for manual assignment to prevent final config from always
// containing "cjs" and "esm" after merging default and user configs.
const defaultFormats: Readonly<Format[]> = ["cjs", "esm"];

export const packageJsonConfigPresets: Record<
  PackageJsonTransformerPreset,
  PackageJsonTransformerConfig
> = {
  none: {
    removeFields: [],
    addFields: {
      main: false,
      types: false,
      exports: false,
    },
  },
  default: {
    removeFields: ["devDependencies", "scripts"],
    addFields: {
      main: true,
      types: true,
      exports: true,
    },
  },
};

export const defaultConfig: Readonly<ConfigType> = {
  type: "library",
  platform: "node",
  entry: [],
  output: "dist",
  formats: [], // see defaultFormats above
  declaration: true,
  includeDependenciesInBundle: false,
  packageJsonTransformer: null as any,
};

export class ConfigBuilder {
  packageJson: ProxiedPackageJson;
  config: ClientConfig;

  static async load(packageJson: ProxiedPackageJson): Promise<ConfigBuilder> {
    const configName = Application.get().name;
    let partialConfig: ClientConfig = {};
    const matches = await findUpMultiple([`${configName}.config.js`, `${configName}.config.mjs`]);
    if (matches?.length > 0) {
      const configModule = await import(matches[0]);
      partialConfig = configModule.default || configModule;
    }
    return new ConfigBuilder(packageJson, partialConfig);
  }

  constructor(packageJson: ProxiedPackageJson, partial: ClientConfig) {
    this.packageJson = packageJson;
    this.config = partial;
  }

  async build(): Promise<Readonly<Config>> {
    if (!this.config.type) this.config.type = this.guessBuildType();
    if (!this.config.platform) this.config.platform = this.guessPlatform();

    if (this.config.includeDependenciesInBundle == null) {
      this.config.includeDependenciesInBundle = this.config.type === "application";
    }

    if (!this.config.entry) {
      this.config.entry = await this.guessEntry();
    }

    if (typeof this.config.entry === "string") this.config.entry = [this.config.entry];

    // Translate packageJson boolean value to preset
    if (typeof this.config.packageJsonTransformer === "boolean") {
      this.config.packageJsonTransformer = this.config.packageJsonTransformer ? "default" : "none";
    }

    // Translate packageJson preset to actual configuration or use default if none given.
    if (typeof this.config.packageJsonTransformer === "string") {
      const preset = packageJsonConfigPresets[this.config.packageJsonTransformer];
      if (!preset) {
        logger.error(
          `Invalid package JSON configuration preset specified \
('${this.config.packageJsonTransformer}')`,
        );
        process.exit(1);
      }

      this.config.packageJsonTransformer = preset;
    } else if (!this.config.packageJsonTransformer) {
      this.config.packageJsonTransformer = packageJsonConfigPresets.default;
    }

    // At this point, the packageJson configuration can be either null, an object or a function.
    if (
      typeof this.config.packageJsonTransformer !== "object" &&
      typeof this.config.packageJsonTransformer !== "function"
    ) {
      logger.error("Invalid package JSON configuration specified");
      process.exit(1);
    }

    const json = merge({}, defaultConfig, this.config) as ConfigType;

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

  private async guessEntry(): Promise<string[]> {
    const entry: string[] = [];
    if (this.packageJson.entry) entry.push(this.packageJson.entry);
    if (this.config.platform !== "browser") return entry;

    for (const dir of knownStyleDirs) {
      for (const name of knownStyleNames) {
        for (const ext of knownStyleExts) {
          const filePath = path.join(dir, `${name}.${ext}`);
          if (await fileExists(filePath)) {
            entry.push(filePath);
            return entry;
          }
        }
      }
    }

    return entry;
  }
}
