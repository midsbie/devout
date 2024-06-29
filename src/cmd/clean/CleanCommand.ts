import { rm } from "node:fs/promises";

import ora, { Ora } from "ora";

import { CommandHandler, GlobalOptions } from "../../lib";

interface Options extends GlobalOptions {
  output: string;
}

export class CleanCommand extends CommandHandler<Options> {
  progress!: Ora;

  async run(): Promise<void> {
    this.progress = ora("Cleaning project...").start();
    await rm(this.context.config.output, { force: true, recursive: true });
    this.progress.succeed("Project cleaned");
  }
}
