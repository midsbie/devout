import path from "node:path";

import { Format, Platform } from "esbuild";

import { isCodeExt, isStyleExt, isTypescriptExt } from "./fs";
import { BuildType, ConfigType, PackageJsonTransformerConfig } from "./typedefs";

export class Config {
  json: ConfigType;

  constructor(json: ConfigType) {
    this.json = json;
  }

  get type(): BuildType {
    return this.json.type;
  }

  get platform(): Platform {
    return this.json.platform;
  }

  get entry(): string[] {
    return this.json.entry;
  }

  get codeEntry(): string[] {
    return this.json.entry.filter(isCodeExt);
  }

  get typescriptEntry(): string[] {
    return this.json.entry.filter(isTypescriptExt);
  }

  get styleEntry(): string[] {
    return this.json.entry.filter(isStyleExt);
  }

  get output(): string {
    return this.json.output;
  }

  get formats(): Format[] {
    return this.json.formats;
  }

  get declaration(): boolean {
    return this.json.declaration;
  }

  get includeDependenciesInBundle(): boolean {
    return this.json.includeDependenciesInBundle;
  }

  get packageJsonTransformer(): PackageJsonTransformerConfig {
    return this.json.packageJsonTransformer;
  }

  getDistPathFor(filename: string): string {
    return path.join(this.json.output, filename);
  }
}
