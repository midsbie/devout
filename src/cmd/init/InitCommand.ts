import fs from "node:fs/promises";
import path from "node:path";

import { Format, Platform } from "esbuild";
import inquirer from "inquirer";

import Application from "../../Application";
import { CommandHandler, ConfigType, GlobalOptions, fileExists, logger } from "../../lib";

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
        type: "input",
        name: "entry",
        message: "Enter the entry point of your library:",
        default: this.context.packageJson.entry,
      },
      {
        type: "input",
        name: "output",
        message: "Enter the output directory for your library:",
        default: "dist",
      },
      {
        type: "list",
        name: "platform",
        message: "Select the target platform for your library:",
        choices: ["node", "browser"],
        default: "node",
      },
      {
        type: "checkbox",
        name: "formats",
        message: "Select the output formats for your library:",
        choices: ["cjs", "esm"],
        default: this.context.packageJson.isModule ? ["esm"] : ["cjs", "esm"],
        validate: (ans: string[]) => {
          if (ans.length < 1) return "You must choose at least one format.";
          return true;
        },
      },
    ];
    const answers = await inquirer.prompt(questions);

    const config: ConfigType = {
      mode: "library",
      entry: answers.entry,
      output: answers.output,
      platform: answers.platform as Platform,
      formats: answers.formats as Format[],
    };

    await fs.writeFile(
      filename,
      `\
export default ${JSON.stringify(config, null, 2)};
`,
      "utf8",
    );

    logger.info("Configuration file created.");
  }
}
