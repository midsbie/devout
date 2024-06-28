import { Config, ConfigBuilder } from "./Config";
import { PackageJson, ProxiedPackageJson } from "./PackageJson";

export class ProjectContext {
  readonly packageJson: ProxiedPackageJson;
  readonly config: Config;

  static async load(): Promise<ProjectContext> {
    const packageJson = PackageJson.load();
    const builder = await ConfigBuilder.load(packageJson);
    const config = await builder.build();
    return new ProjectContext(packageJson, config);
  }

  private constructor(packageJson: ProxiedPackageJson, config: Config) {
    this.packageJson = packageJson;
    this.config = config;
  }
}
