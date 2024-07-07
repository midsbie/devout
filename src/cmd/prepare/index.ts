import { Command } from "commander";

import Application from "../../Application";
import { PrepareCommand } from "./PrepareCommand";

Application.get().register(
  PrepareCommand,
  new Command("prepare").description("Prepare the project"),
);
