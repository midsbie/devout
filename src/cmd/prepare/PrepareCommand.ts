import fs from "node:fs/promises";
import path from "node:path";

import { Format } from "esbuild";
import ora, { Ora } from "ora";

import {
  CommandHandler,
  EsBuildConfigurator,
  GlobalOptions,
  PackageJsonTransformer,
  ProjectContext,
  isTypescriptExt,
} from "../../lib";

interface Options extends GlobalOptions {
  output: string;
}

const formatToExportType: Map<Partial<Format>, string> = new Map([
  ["cjs", "require"],
  ["esm", "import"],
]);

export const defaultPackageJsonBuilder: PackageJsonTransformer = (
  json: Record<string, any>,
  context: ProjectContext,
): Record<string, any> => {
  const { config } = context;
  const packageJsonConfig = config.packageJsonTransformer;

  if (config.codeEntry.length > 1) {
    throw new Error("Multiple entry files not supported. Provide custom package JSON transformer.");
  }

  const entry = config.codeEntry[0];
  packageJsonConfig.removeFields.forEach((k) => delete json[k]);

  let typingsArtifact;
  if (entry && config.declaration && isTypescriptExt(entry)) {
    typingsArtifact = config.getDistPathFor(path.basename(entry).replace(/\.tsx?$/, ".d.ts"));
  }

  if (entry && packageJsonConfig.addFields.main) {
    json.main = new EsBuildConfigurator(context).configure(
      entry,
      // Favoring esm over cjs
      config.formats.sort().reverse()[0],
    ).options.outfile;
  }

  if (typingsArtifact && packageJsonConfig.addFields.types) json.types = typingsArtifact;
  if (!packageJsonConfig.addFields.exports) return json;

  let exports: Record<string, any> | undefined = {};
  if (entry) {
    exports = config.formats.reduce(
      (e, f) => {
        const t = formatToExportType.get(f);
        if (!t) return e;

        const p = new EsBuildConfigurator(context).configure(entry, f).options.outfile;
        if (p) e[t] = p;
        return e;
      },
      {} as Record<string, any>,
    );
  }

  if (Object.keys(exports).length < 1 && !typingsArtifact) return json;

  json.exports = {
    ".": {
      ...exports,
      ...(typingsArtifact && { types: typingsArtifact }),
    },
  };
  return json;
};

export class PrepareCommand extends CommandHandler<Options> {
  progress!: Ora;

  async run(): Promise<void> {
    this.progress = ora("Preparing package.json file...").start();
    const transformer =
      typeof this.context.config.packageJsonTransformer === "function"
        ? this.context.config.packageJsonTransformer
        : defaultPackageJsonBuilder;
    const contents = transformer(this.context.packageJson.json, this.context);
    await fs.writeFile(this.context.packageJson.filename, JSON.stringify(contents, null, 2));
    this.progress.succeed("File package.json prepared");
  }
}
