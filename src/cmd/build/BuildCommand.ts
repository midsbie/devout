import { chmod, writeFile } from "node:fs/promises";

import { generateDtsBundle } from "dts-bundle-generator";
import ora, { Ora } from "ora";

import {
  CommandHandler,
  EsBuildCompiler,
  EsBuildConfigurator,
  GlobalOptions,
  isTypescriptExt,
  logger,
} from "../../lib";

interface Options extends GlobalOptions {
  output: string;
}

export class BuildCommand extends CommandHandler<Options> {
  progress!: Ora;

  async run(): Promise<void> {
    if (this.context.config.formats.length < 1) {
      logger.warn("Nothing to build");
      process.exit(1);
    }

    this.progress = ora("Building...").start();

    await this.compileCode();
    await this.generateTypes();

    this.progress.succeed("Build completed successfully");
  }

  private async compileCode() {
    const cfg = this.context.config;
    const configurator = new EsBuildConfigurator(this.context);
    const compiler = new EsBuildCompiler();

    this.progress.start("Building code...");
    for (const format of cfg.formats) {
      const buildConfig = configurator.configure(format);
      this.progress.start(`Building artifact: ${buildConfig.options.outfile}`);

      try {
        await compiler.build(buildConfig.options);
      } catch (error) {
        this.progress.fail("Build failed");
        logger.error(error);
        process.exit(1);
      }

      if (buildConfig.isBinary) {
        await chmod(buildConfig.options.outfile as string, 0o755);
        this.progress.info(`Binary artifact built: ${buildConfig.options.outfile}`);
      } else {
        this.progress.info(`Artifact built: ${buildConfig.options.outfile}`);
      }
    }

    this.progress.succeed("Code compiled");
  }

  private async generateTypes() {
    const cfg = this.context.config;
    if (!cfg.declaration || !isTypescriptExt(cfg.entry)) return;

    this.progress.start("Generating types...");
    const content = generateDtsBundle([
      {
        filePath: cfg.entry,
        output: {
          exportReferencedTypes: false,
          noBanner: true,
        },
      },
    ]);

    const filename = cfg.getDistPathFor("index.d.ts");
    await writeFile(filename, content[0], "utf8");
    this.progress.succeed(`Types generated: ${filename}`);
  }
}
