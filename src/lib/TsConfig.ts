import path from "node:path";

import cloneDeep from "lodash.clonedeep";
import ts from "typescript";

import { logger } from "./logger";

export class TsConfig {
  readonly filename: string;
  private readonly json: Record<string, any>;

  static async load(): Promise<TsConfig | null> {
    let currentDir = process.cwd();
    let filename: string | undefined;

    while (true) {
      filename = ts.findConfigFile(currentDir, ts.sys.fileExists);
      if (filename) break;

      const parentDir = path.resolve(currentDir, "..");
      if (parentDir === currentDir) return null;
      currentDir = parentDir;
    }

    if (!filename) return null;

    const file = ts.readConfigFile(filename, ts.sys.readFile);
    if (file.error) {
      logger.warn(`failed to read ${filename} file`);
      return null;
    }

    return new TsConfig(filename, file.config || {});
  }

  static blank(): TsConfig {
    return new TsConfig(path.join(process.cwd(), "tsconfig.json"), {});
  }

  private constructor(filename: string, json: Record<string, any>) {
    this.filename = filename;
    this.json = json;
  }

  cloneAndOmitCompilerOptions(compilerKeys: string[]): Record<string, any> {
    const json = cloneDeep(this.json);
    if (json.compilerOptions) compilerKeys.forEach((k) => delete json.compilerOptions[k]);
    return json;
  }

  get dirname(): string {
    return path.dirname(this.filename);
  }

  get compilerOptions(): any {
    return this.json.compilerOptions || {};
  }

  get moduleResolution(): string | undefined {
    return this.compilerOptions.moduleResolution;
  }
}
