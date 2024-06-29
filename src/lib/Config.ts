import path from "node:path";

import { Format, Platform } from "esbuild";
import { findUpMultiple } from "find-up";
import merge from "lodash.merge";

import { ProxiedPackageJson } from "./PackageJson";
import { logger } from "./logger";

export interface PartialConfigType {
  entry?: string;
  output?: string;
  platform?: Platform;
  declaration?: boolean;
}

export interface LibraryConfigType {
  entry: string;
  output: string;
  formats: Format[];
  platform: Platform;
  declaration: boolean;
}

export type ConfigType = LibraryConfigType;

// Keeping default formats separate for manual assignment to prevent final config from always
// containing "cjs" and "esm" after merging default and user configs.
const defaultFormats: Format[] = ["cjs", "esm"];

export const defaultConfig: Readonly<ConfigType> = {
  entry: "",
  output: "dist",
  formats: [], // see defaultFormats above
  platform: "node",
  declaration: true,
};

export class ConfigBuilder {
  packageJson: ProxiedPackageJson;
  config: PartialConfigType;

  static async load(packageJson: ProxiedPackageJson): Promise<ConfigBuilder> {
    let partialConfig: PartialConfigType = {};
    const matches = await findUpMultiple([
      `${packageJson.name}.config.js`,
      `${packageJson.name}.config.mjs`,
    ]);
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
    if (!this.config.entry) {
      this.config.entry = this.packageJson.entry;
      if (!this.config.entry) {
        logger.error(
          "Unable to determine an entry source file. Run 'devout init' to create a configuration file.",
        );
        process.exit(1);
      }
    }

    const json = merge(defaultConfig, this.config) as ConfigType;

    if (json.formats?.length > 0) json.formats = [...new Set(json.formats)];
    else json.formats = defaultFormats;

    return new Config(json);
  }
}

export class Config {
  json: ConfigType;

  constructor(json: ConfigType) {
    this.json = json;
  }

  get entry(): string {
    return this.json.entry;
  }

  get output(): string {
    return this.json.output;
  }

  get formats(): Format[] {
    return this.json.formats;
  }

  get platform(): Platform {
    return this.json.platform;
  }

  get declaration(): boolean {
    return this.json.declaration;
  }

  getDistPathFor(filename: string): string {
    return path.join(this.json.output, filename);
  }
}
