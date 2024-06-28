import { BuildOptions, BuildResult, build } from "esbuild";

export class EsBuildCompiler {
  async build(options: BuildOptions): Promise<BuildResult> {
    return await build(options);
  }
}
