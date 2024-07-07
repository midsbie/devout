import { writeFile } from "node:fs/promises";
import path from "node:path";

import { Format, Platform } from "esbuild";
import inquirer from "inquirer";

import Application from "../../Application";
import {
  BuildType,
  CommandHandler,
  ConfigBuilder,
  ConfigType,
  GlobalOptions,
  fileExists,
  logger,
} from "../../lib";

interface Options extends GlobalOptions {}

async function inquireYesOrNo(question: string): Promise<boolean> {
  const answers = await inquirer.prompt([
    {
      type: "confirm",
      name: "response",
      message: question,
      default: false,
    },
  ]);

  return answers.response;
}

export class InitCommand extends CommandHandler<Options> {
  async run(): Promise<void> {
    const cfg = await new ConfigBuilder(this.context.packageJson, {}).build();

    const filename = path.join(
      path.dirname(this.context.packageJson.filename),
      `${Application.get().packageJson.name}.config.js`,
    );

    if (
      (await fileExists(filename)) &&
      !(await inquireYesOrNo("Configuration file already exists. Overwrite?"))
    ) {
      return;
    }

    const questions = [
      {
        type: "list",
        name: "type",
        message: "Select the build type:",
        choices: ["application", "library"] as BuildType[],
        default: cfg.type,
      },
      {
        type: "list",
        name: "platform",
        message: "Select the target platform:",
        choices: ["browser", "node"] as Platform[],
        default: cfg.platform,
      },
      {
        type: "input",
        name: "entry",
        message: "Enter the entry point (separate multiple entries with commas):",
        default: cfg.entry.join(", "),
      },
      {
        type: "input",
        name: "output",
        message: "Enter the output directory for the build artifacts:",
        default: "dist",
      },
      {
        type: "checkbox",
        name: "formats",
        message: "Select the formats for the build artifacts:",
        choices: ["cjs", "esm"],
        default: this.context.packageJson.isModule ? ["esm"] : ["cjs", "esm"],
        validate: (ans: string[]) => {
          if (ans.length < 1) return "You must choose at least one format.";
          return true;
        },
      },
    ];
    const answers = await inquirer.prompt(questions);

    const config: Partial<ConfigType> = {
      entry: answers.entry.split(",").map((e: string) => e.trim()),
      output: answers.output.trim(),
      platform: answers.platform.trim() as Platform,
      formats: answers.formats.map((e: string) => e.trim()) as Format[],
    };

    await writeFile(
      filename,
      `\
export default ${JSON.stringify(config, null, 2)};
`,
      "utf8",
    );

    logger.info("Configuration file created.");
  }
}
