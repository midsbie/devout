import { ProjectContext } from "./ProjectContext";
import { GlobalOptions } from "./typedefs";

export class CommandHandler<O extends GlobalOptions> {
  context: ProjectContext;
  readonly options: O;

  constructor(context: ProjectContext, options: O) {
    this.context = context;
    this.options = options;
  }
}
