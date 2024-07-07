import { Format, Platform } from "esbuild";

import { ProjectContext } from "./ProjectContext";

export interface GlobalOptions {}

export type BuildType = "library" | "application";

export interface PackageJsonTransformerConfig {
  removeFields: string[];
  addFields: {
    main: boolean;
    types: boolean;
    exports: boolean;
  };
}

export type PackageJsonTransformer = (
  json: Record<string, any>,
  context: ProjectContext,
) => Record<string, any>;

export interface ConfigType {
  type: BuildType;
  platform: Platform;
  entry: string[];
  output: string;
  formats: Format[];
  declaration: boolean;
  includeDependenciesInBundle: boolean;
  packageJsonTransformer: PackageJsonTransformerConfig;
}
