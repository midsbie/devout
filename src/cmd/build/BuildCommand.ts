import { chmod } from "node:fs/promises";

import {
  CommandHandler,
  EsBuildCompiler,
  EsBuildConfigurator,
  GlobalOptions,
  logger,
} from "../../lib";

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

    const configurator = new EsBuildConfigurator(this.context);
    const compiler = new EsBuildCompiler();

    for (const format of cfg.formats) {
      const buildConfig = configurator.configure(format);
      try {
        await compiler.build(buildConfig.options);
      } catch (error) {
        logger.error("Build failed:", error);
        process.exit(1);
      }

      if (buildConfig.isBinary) {
        await chmod(buildConfig.options.outfile as string, 755);
        logger.info(`Binary artifact ${buildConfig.options.outfile} built`);
      } else {
        logger.info(`Artifact ${buildConfig.options.outfile} built`);
      }
    }

    logger.info("Build completed successfully");
  }
}
