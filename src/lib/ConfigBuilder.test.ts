import findPackageJson from "find-package-json";
import { findUpMultiple } from "find-up";
import { beforeEach, describe, expect, it, vi } from "vitest";

import Application from "../Application";
import { PartialConfigType } from "./Config";
import { ConfigBuilder } from "./ConfigBuilder";
import { PackageJson, ProxiedPackageJson } from "./PackageJson";
import { fileExists } from "./fs";
import { logger } from "./logger";

vi.mock("find-up");
vi.mock("find-package-json");
vi.mock("../Application");
vi.mock("./fs");
vi.mock("./logger");

function mockBasicPackageJson(props = {}) {
  vi.mocked(findPackageJson).mockReturnValue({
    next() {
      return {
        value: {
          name: "test-package",
          version: "1.0.0",
          ...props,
        },
      };
    },
  } as any);
  return PackageJson.load("/path/to/package.json");
}

function mockPackageJson(props = {}) {
  return mockBasicPackageJson({ entry: "src/main.ts", ...props });
}

describe("ConfigBuilder", () => {
  let packageJson: ProxiedPackageJson;

  beforeEach(() => {
    vi.mocked(Application.get).mockReturnValue({ name: "test" } as Application);
    vi.mocked(logger.error).mockClear();
    vi.mocked(findUpMultiple).mockResolvedValue([]);
  });

  describe("load", () => {
    it("should load configuration from config files", async () => {
      const packageJson = mockPackageJson();
      const configModule = { default: { type: "application" } };
      vi.mocked(findUpMultiple).mockResolvedValueOnce(["/path/to/test.config.js"]);
      vi.mock("/path/to/test.config.js", async () => {
        return { default: { type: "application" } };
      });

      const builder = await ConfigBuilder.load(packageJson);
      expect(builder.config).toEqual(configModule.default);
    });

    it("should return an empty partialConfig if no config files found", async () => {
      const builder = await ConfigBuilder.load(packageJson);
      expect(builder.config).toEqual({});
    });
  });

  describe("build", () => {
    it("should merge defaultConfig with partialConfig and packageJson values", async () => {
      const packageJson = mockPackageJson();
      const partialConfig: PartialConfigType = { type: "application", entry: "src/index.js" };
      const builder = new ConfigBuilder(packageJson, partialConfig);
      const config = await builder.build();

      expect(config).toEqual(
        expect.objectContaining({
          type: "application",
          platform: "node",
          entry: ["src/index.js"],
          output: "dist",
          formats: ["cjs", "esm"],
          declaration: true,
          includeDependenciesInBundle: true,
        }),
      );
    });

    it("should guess build type and platform if not specified", async () => {
      const packageJson = mockPackageJson({
        scripts: { start: "webpack serve" },
        dependencies: { react: "^17.0.0" },
      });

      const builder = new ConfigBuilder(packageJson, {});
      const config = await builder.build();

      expect(config.type).toBe("application");
      expect(config.platform).toBe("browser");
    });

    it("should not include dependencies in bundle for libraries", async () => {
      const packageJson = mockPackageJson();
      const partialConfig: PartialConfigType = { type: "library" };
      const builder = new ConfigBuilder(packageJson, partialConfig);
      const config = await builder.build();

      expect(config.includeDependenciesInBundle).toBe(false);
    });

    it.each([["main"], ["module"], ["entry"], ["browser"]])(
      "should determine entry point for %s",
      async (property) => {
        const packageJson = mockBasicPackageJson({ [property]: "src/main.ts" });
        const builder = new ConfigBuilder(packageJson, {});
        const config = await builder.build();

        expect(config.entry).toEqual(["src/main.ts"]);
      },
    );
  });

  describe("guessBuildType", () => {
    it.each([
      [{ scripts: { start: "webpack serve" } }, "application"],
      [{ browser: {} }, "application"],
      [{}, "library"],
    ])("should return correct build type for %o", async (pkgJson, expected) => {
      const packageJson = mockPackageJson({ ...pkgJson });
      const builder = new ConfigBuilder(packageJson, {});
      const config = await builder.build();
      expect(config.type).toBe(expected);
    });
  });

  describe("guessPlatform", () => {
    it.each([
      [{ browser: {} }, "browser"],
      [{ dependencies: { react: "^17.0.0" } }, "browser"],
      [{ devDependencies: { webpack: "^5.0.0" } }, "browser"],
      [{ scripts: { start: "vite serve" } }, "browser"],
      [{}, "node"],
    ])("should return correct platform for %o", async (pkgJson, expected) => {
      const packageJson = mockPackageJson({ ...pkgJson });
      const builder = new ConfigBuilder(packageJson, {});
      const config = await builder.build();
      expect(config.platform).toBe(expected);
    });
  });

  describe("guessEntry", () => {
    it("should return entry from packageJson if specified", async () => {
      const packageJson = mockPackageJson();
      const builder = new ConfigBuilder(packageJson, {});
      const config = await builder.build();
      expect(config.entry).toEqual(["src/main.ts"]);
    });

    it.each([
      ["main.scss"],
      ["main.sass"],
      ["style.scss"],
      ["style.sass"],
      ["styles.scss"],
      ["styles.sass"],
      ["scss/main.scss"],
      ["scss/main.sass"],
      ["scss/style.scss"],
      ["scss/style.sass"],
      ["scss/styles.scss"],
      ["scss/styles.sass"],
      ["styles/main.scss"],
      ["styles/main.sass"],
      ["styles/style.scss"],
      ["styles/style.sass"],
      ["styles/styles.scss"],
      ["styles/styles.sass"],
    ])("should search for known style files in %s", async (filename) => {
      const packageJson = mockBasicPackageJson({ browser: "src/main.ts" });
      vi.mocked(fileExists).mockImplementation(async (filePath) => filePath === filename);
      const builder = new ConfigBuilder(packageJson, {});
      const config = await builder.build();
      expect(config.entry).toEqual(["src/main.ts", filename]);
    });
  });
});
