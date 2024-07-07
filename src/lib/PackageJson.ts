import path from "node:path";

import findPackageJson from "find-package-json";

export interface ProxiedPackageJson {
  [key: string]: any;

  filename: string;
  readonly json: Readonly<Record<string, any>>;
  get isModule(): boolean;
  isBin(filename: string): boolean;
}

export class PackageJson {
  readonly filename: string;
  readonly json: Readonly<Record<string, any>>;

  static load(fromPath?: string): ProxiedPackageJson {
    const r = findPackageJson(fromPath).next();
    if (r.done || !r.value) throw new PackageJsonNotFoundError();

    try {
      return new PackageJson(r.filename, r.value);
    } catch (e) {
      throw new PackageJsonParseError(e);
    }
  }

  private constructor(filename: string, json: Record<string, any>) {
    // Suppressing the __path property added by the find-package-json package.
    if (json.__path) delete json.__path;

    this.filename = filename;
    this.json = json;

    return new Proxy(this, {
      get(target, prop) {
        if (prop in target) return (target as any)[prop];
        return target.json[prop as any];
      },
    });
  }

  pathFor(filename: string): string {
    return path.isAbsolute(filename) ? filename : path.join(path.dirname(this.filename), filename);
  }

  get isModule(): boolean {
    return this.json.type === "module";
  }

  get entry(): string {
    return this.json.main || this.json.module || this.json.entry || this.json.browser;
  }

  isBin(filename: string): boolean {
    if (!this.json.bin) return false;

    filename = this.pathFor(filename);
    return Object.keys(this.json.bin).some((k) => this.pathFor(this.json.bin[k]) === filename);
  }
}

export class PackageJsonNotFoundError extends Error {
  constructor() {
    super("Failed to determine location of package.json file");
  }
}

export class PackageJsonParseError extends Error {
  constructor(cause: unknown) {
    super("Error reading or parsing package.json file", { cause });
  }
}
