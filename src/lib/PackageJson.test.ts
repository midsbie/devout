import path from "node:path";

import findPackageJson from "find-package-json";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { PackageJson } from "./PackageJson";

vi.mock("find-package-json");

describe("PackageJson", () => {
  const mockPackageJson = {
    filename: "/path/to/package.json",
    value: {
      name: "test-package",
      version: "1.0.0",
      type: "module",
      main: "index.js",
      bin: {
        test: "bin/test.js",
      },
    },
  };

  beforeEach(() => {
    vi.mocked(findPackageJson).mockReturnValueOnce({
      next: vi.fn().mockReturnValue(mockPackageJson),
    } as any);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it("load should load package.json and return a ProxiedPackageJson", () => {
    const packageJson = PackageJson.load("/path/to");

    expect(packageJson).toBeInstanceOf(PackageJson);
    expect(packageJson.filename).toBe(mockPackageJson.filename);
    expect(packageJson.name).toBe(mockPackageJson.value.name);
  });

  it("isModule should return true if type is 'module'", () => {
    const packageJson = PackageJson.load("/path/to");

    expect(packageJson.isModule).toBe(true);
  });

  it("entry should return the main entry point of the package", () => {
    const packageJson = PackageJson.load("/path/to");

    expect(packageJson.entry).toBe(mockPackageJson.value.main);
  });

  it("pathFor should return absolute path if input is relative", () => {
    const packageJson = PackageJson.load("/path/to");
    const relativePath = "src/index.ts";

    expect(packageJson.pathFor(relativePath)).toBe(
      path.join(path.dirname(mockPackageJson.filename), relativePath),
    );
  });

  it("isBin should return true if the given file is a bin", () => {
    const packageJson = PackageJson.load("/path/to");
    const binFilePath = "bin/test.js";

    expect(packageJson.isBin(binFilePath)).toBe(true);
  });

  it("isBin should return false if the given file is not a bin", () => {
    const packageJson = PackageJson.load("/path/to");
    const nonBinFilePath = "src/index.ts";

    expect(packageJson.isBin(nonBinFilePath)).toBe(false);
  });

  it.each([
    ["name", mockPackageJson.value.name],
    ["version", mockPackageJson.value.version],
    ["type", mockPackageJson.value.type],
  ])("should correctly proxy '%s' property", (property, expected) => {
    const packageJson = PackageJson.load("/path/to");
    expect(packageJson[property]).toBe(expected);
  });
});
