import { fileURLToPath } from "node:url";

import { Command } from "commander";

import { logger } from "./lib";
import { PackageJson, ProxiedPackageJson } from "./lib/PackageJson";
import { ProjectContext } from "./lib/ProjectContext";

interface CommandHandler {
  new (ctx: ProjectContext, options: any): any;
}

class Application {
  private static instance: Application;
  packageJson: ProxiedPackageJson;
  private rootCommand: Command;
  context!: ProjectContext;

  public static get(): Application {
    if (!Application.instance) {
      Application.instance = new Application();
    }

    return Application.instance;
  }

  private constructor() {
    try {
      this.packageJson = PackageJson.load(fileURLToPath(import.meta.url));
    } catch (e: any) {
      logger.error("Unable to load package JSON:", e?.message || "unknown error");
      process.exit(1);
    }

    this.rootCommand = new Command();
    this.rootCommand
      .name(this.packageJson.name)
      .description(this.packageJson.description)
      .version(this.packageJson.version)
      .option("-h, --help", "display help for command");
  }

  async run() {
    this.context = await ProjectContext.load();
    this.rootCommand.parse(process.argv);
  }

  register(HandlerClass: CommandHandler, cmd: Command) {
    cmd.action(async (options) => {
      const cmd = new HandlerClass(this.context, options);
      await cmd.run();
    });

    this.rootCommand.addCommand(cmd);
  }
}

export default Application;
