import ts from "typescript";

import { Configurator } from "./Configurator";
import { TsConfig } from "./TsConfig";

interface TscConfiguration {
  options: ts.CompilerOptions;
}

export class TscConfigurator extends Configurator {
  configure(): TscConfiguration {
    const tsconfig = this.context.tsconfig || TsConfig.blank();

    // Uncomment to print unparsed contents of TS config file:
    // console.log(configFile.config);

    // We delete these TS compiler options as a measure to prevent a number of errors when
    // generating declaration types. This aims to reproduce the conditions when executing `tsc` in
    // the terminal, as given in the following example:
    //
    // $ tsc --emitDeclarationOnly --esModuleInterop --declaration --jsx react \
    //       --outFile index.d.ts --lib ... path/to/source.ts
    //
    const unparsedConfig = tsconfig.cloneAndOmitCompilerOptions([
      "baseUrl",
      "declarationDir",
      "incremental",
      "module",
      "moduleResolution",
      "outDir",
      "paths",
      "pathsBasePath",
      "sourceMap",
      "target",
      "tsBuildInfoFile",
      "paths",
    ]);

    const configParseResult = ts.parseJsonConfigFileContent(
      unparsedConfig,
      ts.sys,
      tsconfig.dirname,
    );

    // Uncomment to print the source files automatically identified by Typescript:
    // console.log(configParseResult.fileNames, configParseResult.options);

    return {
      options: {
        ...configParseResult.options,
        declaration: true,
        emitDeclarationOnly: true,
        // Specifying `outFile` creates a bundle of all type declarations where each module's
        // declarations are wrapped by a `declare module` clause. Unfortunately this bundled form
        // causes tsc to produce the following error when the package is imported:
        //
        //   error TS2306: File '/path/to/dist/index.d.ts' is not a module.
        //
        // Current workaround is to generate type declarations for each module using `outDir`.
        //
        // outFile: "dist/index.d.ts",
        outDir: this.context.config.output,
      },
    };
  }
}
