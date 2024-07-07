import { Command } from "commander";

import Application from "../../Application";
import { BuildCommand } from "./BuildCommand";

Application.get().register(BuildCommand, new Command("build").description("Build the project"));
