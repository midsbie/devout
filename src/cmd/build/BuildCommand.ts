import { chmod, mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

import { generateDtsBundle } from "dts-bundle-generator";
import ora, { Ora } from "ora";
import { initAsyncCompiler as initSassCompiler } from "sass";

import {
  CommandHandler,
  EsBuildCompiler,
  EsBuildConfigurator,
  GlobalOptions,
  fileExists,
  isTypescriptExt,
  logger,
  renameExtension,
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

    await mkdir(this.context.config.output, { recursive: true });
    await this.compileCode();
    await this.buildStyles();
    await this.generateTypes();

    this.progress.succeed("Build completed successfully");
  }

  private async compileCode() {
    const cfg = this.context.config;
    const entries = cfg.codeEntry;
    if (entries.length < 1) {
      this.progress.start().warn("No code to build");
      return;
    }

    const configurator = new EsBuildConfigurator(this.context);
    const compiler = new EsBuildCompiler();

    this.progress.start("Building code...");
    for (const format of cfg.formats) {
      for (const entry of entries) {
        await this.assertEntryExists(entry);

        const buildConfig = configurator.configure(entry, format);
        this.progress.start(`Building artifact from ${entry}`);

        try {
          await compiler.build(buildConfig.options);
        } catch (error) {
          this.progress.fail("Build failed");
          logger.error(error);
          process.exit(1);
        }

        if (buildConfig.isBinary) {
          await chmod(buildConfig.options.outfile as string, 0o755);
          this.progress.info(`Binary artifact built: ${entry} -> ${buildConfig.options.outfile}`);
        } else {
          this.progress.info(`Artifact built: ${entry} -> ${buildConfig.options.outfile}`);
        }
      }
    }

    this.progress.succeed("Code compiled");
  }

  private async buildStyles() {
    const cfg = this.context.config;
    const entries = cfg.styleEntry;
    if (entries.length < 1) return;

    this.progress.start("Building styles...");
    const compiler = await initSassCompiler();

    for (const entry of entries) {
      await this.assertEntryExists(entry);
      const filename = cfg.getDistPathFor(renameExtension(path.basename(entry), "css"));
      this.progress.start(`Building style artifact from ${entry}`);
      const result = await compiler.compileAsync(entry, { style: "compressed" });
      await writeFile(filename, result.css);
      this.progress.info(`Style artifact built: ${entry} -> ${filename}`);
    }

    this.progress.succeed("Styles built");
  }

  private async generateTypes() {
    const cfg = this.context.config;
    if (!cfg.declaration) return;

    // FIXME: generating type declarations for the first Typescript source file entry.
    const entry = cfg.entry.find(isTypescriptExt);
    if (!entry) return;

    this.progress.start("Generating types...");
    const content = generateDtsBundle([
      {
        filePath: entry,
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

  private async assertEntryExists(filename: string): Promise<void> {
    if (!(await fileExists(filename))) {
      this.progress.fail(`Entry source file not found: ${filename}`);
      process.exit(1);
    }
  }
}
