import path from "node:path";

import { Format, Platform } from "esbuild";
import { findUpMultiple } from "find-up";
import merge from "lodash.merge";

import { ProxiedPackageJson } from "./PackageJson";

export type Mode = "library";

export interface PartialConfigType {
  mode?: Mode;
  entry?: string;
  output?: string;
  platform?: Platform;
}

export interface LibraryConfigType {
  mode: "library";
  entry: string;
  output: string;
  formats: Format[];
  platform: Platform;
}

export type ConfigType = LibraryConfigType;

export const defaultConfig: Readonly<ConfigType> = {
  mode: "library",
  entry: "",
  output: "dist",
  formats: ["cjs", "esm"],
  platform: "node",
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
    const json = merge(defaultConfig, this.config) as ConfigType;
    if (!json.entry) json.entry = this.packageJson.entry;

    if (json.mode !== "library") {
      throw new Error(`Invalid build mode: ${json.mode}`);
    }

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

  getDistPathFor(filename: string): string {
    return path.join(this.json.output, filename);
  }
}
