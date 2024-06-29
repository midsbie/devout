import { Config } from "./Config";
import { ConfigBuilder } from "./ConfigBuilder";
import { PackageJson, PackageJsonNotFoundError, ProxiedPackageJson } from "./PackageJson";
import { logger } from "./logger";

export class ProjectContext {
  readonly packageJson: ProxiedPackageJson;
  readonly config: Config;

  static async load(): Promise<ProjectContext> {
    let packageJson: ProxiedPackageJson;

    try {
      packageJson = PackageJson.load();
    } catch (e) {
      if (e instanceof PackageJsonNotFoundError) {
        logger.error(
          "Unable to locate the package.json file. Please ensure it exists in the project root.",
        );
      } else {
        logger.error(
          "Unable to read the package.json file. Please check the file's integrity and permissions.",
        );
      }
      process.exit(1);
    }

    const builder = await ConfigBuilder.load(packageJson);
    const config = await builder.build();
    return new ProjectContext(packageJson, config);
  }

  private constructor(packageJson: ProxiedPackageJson, config: Config) {
    this.packageJson = packageJson;
    this.config = config;
  }
}
