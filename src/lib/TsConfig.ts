import fs from "node:fs/promises";

import { findUpMultiple } from "find-up";
import stripJsonComments from "strip-json-comments";

import { logger } from "./logger";

export class TsConfig {
  readonly filename: string;
  private readonly json: Record<string, any>;

  static async load(): Promise<TsConfig | null> {
    const matches = await findUpMultiple(["tsconfig.json"]);
    if (!matches || matches.length < 1) return null;

    let sz;
    try {
      sz = (await fs.readFile(matches[0], "utf-8")).toString();
    } catch (e) {
      logger.warn(`failed to read ${matches[0]} file`);
      return null;
    }

    try {
      const json = JSON.parse(stripJsonComments(sz));
      return new TsConfig(matches[0], json);
    } catch (e) {
      logger.warn(`failed to parse contents of ${matches[0]} file`);
    }

    return null;
  }

  private constructor(filename: string, json: Record<string, any>) {
    this.filename = filename;
    this.json = json;
  }

  get compilerOptions(): any {
    return this.json.compilerOptions || {};
  }

  get moduleResolution(): string | undefined {
    return this.compilerOptions.moduleResolution;
  }
}
