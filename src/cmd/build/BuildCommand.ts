import { CommandHandler, EsBuildCompiler, GlobalOptions, logger } from "../../lib";

interface Options extends GlobalOptions {
  output: string;
}

export class BuildCommand extends CommandHandler<Options> {
  async run(): Promise<void> {
    const cfg = this.context.config;

    if (cfg.formats.length < 1) {
      logger.warn("Nothing to build");
      process.exit(1);
    }

    const compiler = new EsBuildCompiler(cfg);

    for (const format of cfg.formats) {
      try {
        await compiler.build(format);
      } catch (error) {
        logger.error("Build failed:", error);
        process.exit(1);
      }
    }

    logger.info("Build completed successfully");
  }
}
