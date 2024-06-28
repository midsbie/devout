import { Command } from "commander";

import Application from "../../Application";
import { InitCommand } from "./InitCommand";

Application.get().register(InitCommand, new Command("init").description("Initialize the project"));
