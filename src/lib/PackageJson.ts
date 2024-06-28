import findPackageJson from "find-package-json";

export interface ProxiedPackageJson {
  [key: string]: any;
  get isModule(): boolean;
}

export class PackageJson {
  readonly filename: string;
  readonly json: Readonly<Record<string, any>>;

  static load(fromPath?: string): ProxiedPackageJson {
    try {
      const r = findPackageJson(fromPath).next();
      if (!r.value) {
        throw new Error("Failed to determine location of package.json file");
      }

      return new PackageJson(r.filename, r.value);
    } catch (error) {
      throw new Error(
        `Error reading or parsing package.json file: ${(error as any)?.message || "n/a"} `,
      );
    }
  }

  private constructor(filename: string, json: Record<string, any>) {
    this.filename = filename;
    this.json = json;

    return new Proxy(this, {
      get(target, prop) {
        if (prop in target) return (target as any)[prop];
        return target.json[prop as any];
      },
    });
  }

  get isModule(): boolean {
    return this.json.type === "module";
  }

  get entry(): string {
    return this.json.main;
  }
}
