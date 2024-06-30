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

  configure(entry: string, format: Format): EsBuildConfiguration {
    const cfg = this.context.config;
    const outfile = cfg.getDistPathFor(`index.${format}.${this.resolveFormatExtension(format)}`);

    const props: Partial<BuildOptions> = {};
    const isBinary = this.context.packageJson.isBin(outfile);
    if (isBinary) {
      props.banner = {
        js: "#!/usr/bin/env -S node --enable-source-maps",
      };
    }

    const buildOptions: BuildOptions = {
      ...props,
      entryPoints: [entry],
      bundle: true,
      format,
      platform: cfg.platform,
      packages: cfg.includeDependenciesInBundle ? undefined : "external",
      minify: true,
      outfile,
      sourcemap: true,
    };

    // Pass a custom tsconfig object without the `paths` field to ensure that packages are treated
    // as external in a workspaces repository. This prevents esbuild from bundling workspace
    // dependencies together, maintaining them as external references instead.
    if (!cfg.includeDependenciesInBundle && this.context.tsconfig) {
      buildOptions.tsconfigRaw = this.context.tsconfig.cloneAndOmitCompilerOptions(["paths"]);
    }

    return {
      isBinary,
      options: buildOptions,
    };
  }

  private resolveFormatExtension(format: Format): string {
    return formatExtensionOverrideMapping[format] || defaultExtension;
  }
}
