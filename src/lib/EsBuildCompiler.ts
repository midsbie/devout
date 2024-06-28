import { Format, build } from "esbuild";

import { Config } from "./Config";

const defaultExtension = "js";
const formatExtensionOverrideMapping: Partial<Record<Format, string>> = {};

export class EsBuildCompiler {
  config: Config;

  constructor(config: Config) {
    this.config = config;
  }

  async build(format: Format): Promise<void> {
    await build({
      entryPoints: [this.config.entry],
      bundle: true,
      format,
      platform: this.config.platform,
      packages: "external",
      minify: true,
      outfile: this.config.getDistPathFor(`index.${format}.${this.resolveFormatExtension(format)}`),
      sourcemap: true,
    });
  }

  private resolveFormatExtension(format: Format): string {
    return formatExtensionOverrideMapping[format] || defaultExtension;
  }
}
