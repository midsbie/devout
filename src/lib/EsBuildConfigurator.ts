import { BuildOptions, Format } from "esbuild";

import { ProjectContext } from "./ProjectContext";

const defaultExtension = "js";
const formatExtensionOverrideMapping: Partial<Record<Format, string>> = {};

interface EsBuildConfiguration {
  isBinary: boolean;
  options: BuildOptions;
}

export class EsBuildConfigurator {
  context: ProjectContext;

  constructor(context: ProjectContext) {
    this.context = context;
  }

  configure(format: Format): EsBuildConfiguration {
    const cfg = this.context.config;
    const outfile = cfg.getDistPathFor(`index.${format}.${this.resolveFormatExtension(format)}`);

    const props: Partial<BuildOptions> = {};
    const isBinary = this.context.packageJson.isBin(outfile);
    if (isBinary) {
      props.banner = {
        js: "#!/usr/bin/env node",
      };
    }

    const buildOptions: BuildOptions = {
      ...props,
      entryPoints: [cfg.entry],
      bundle: true,
      format,
      platform: cfg.platform,
      packages: cfg.platform === "node" ? "external" : undefined,
      minify: true,
      outfile,
      sourcemap: true,
    };

    return {
      isBinary,
      options: buildOptions,
    };
  }

  private resolveFormatExtension(format: Format): string {
    return formatExtensionOverrideMapping[format] || defaultExtension;
  }
}
