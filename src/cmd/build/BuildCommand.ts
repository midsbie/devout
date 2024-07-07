import { chmod, mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

import ora, { Ora } from "ora";
import { initAsyncCompiler as initSassCompiler } from "sass";
import ts, { DiagnosticCategory } from "typescript";

import {
  CommandHandler,
  EsBuildCompiler,
  EsBuildConfigurator,
  GlobalOptions,
  TscConfigurator,
  fileExists,
  logger,
  renameExtension,
} from "../../lib";

interface Options extends GlobalOptions {
  output: string;
}

export class BuildCommand extends CommandHandler<Options> {
  progress!: Ora;

  async run(): Promise<void> {
    if (this.context.config.entry.length < 1) {
      logger.error(`\
Unable to determine the entry source file. Please ensure the 'main', 'module', 'entry', or \
'browser' field is correctly specified in your package.json file.`);
      process.exit(1);
    }

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
          this.progress.fail(`Failed to build artifact from ${entry}`);
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
    const entries = this.context.config.typescriptEntry;
    if (entries.length < 1) {
      this.progress
        .start()
        .warn("No suitable source code entry points found. Skipping declaration type generation.");
      return;
    }

    for (const entry of entries) {
      await this.assertEntryExists(entry);
    }

    this.progress.start("Generating type declarations...");
    const configurator = new TscConfigurator(this.context);
    const buildConfig = configurator.configure();
    const program = ts.createProgram(entries, buildConfig.options);
    const emitResult = program.emit();

    const diags = ts.getPreEmitDiagnostics(program).concat(emitResult.diagnostics);
    if (diags.length > 0) this.progress.stop();

    diags.forEach((diagnostic) => {
      if (!diagnostic.file) {
        logger.error(ts.flattenDiagnosticMessageText(diagnostic.messageText, "\n"));
        return;
      }

      let suffix = "";
      if (diagnostic.start != null) {
        const r = diagnostic.file.getLineAndCharacterOfPosition(diagnostic.start);
        suffix = ` (${r.line + 1},${r.character + 1})`;
      }

      const diag = ts.flattenDiagnosticMessageText(diagnostic.messageText, "\n");
      const msg = `${diagnostic.file.fileName}${suffix}: ${diag}`;
      switch (diagnostic.category) {
        case DiagnosticCategory.Warning:
          logger.warn(msg);
          break;

        case DiagnosticCategory.Error:
          logger.error(msg);
          break;

        case DiagnosticCategory.Suggestion:
        case DiagnosticCategory.Message:
        default:
          logger.info(msg);
          break;
      }
    });

    if (emitResult.emitSkipped) {
      this.progress.fail("Failed to generate type declarations");
      process.exit(1);
    }

    this.progress.succeed("Type declarations generated");
  }

  private async assertEntryExists(filename: string): Promise<void> {
    if (!(await fileExists(filename))) {
      this.progress.fail(`Entry source file not found: ${filename}`);
      process.exit(1);
    }
  }
}
