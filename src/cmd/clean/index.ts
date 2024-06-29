import { Command } from "commander";

import Application from "../../Application";
import { CleanCommand } from "./CleanCommand";

Application.get().register(CleanCommand, new Command("clean").description("Clean the project"));
