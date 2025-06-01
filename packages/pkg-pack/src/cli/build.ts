import type { Command } from "@commander-js/extra-typings";
import { build } from "../build.js";
import { f } from "../helpers/f.js";
import { resolveOutput } from "../helpers/resolve-output.js";
import { loadConfig } from "../load-config.js";
import { getTsErrors, output } from "../output.js";
import type { CompileTarget, OutputFile } from "../types/index.js";
import { COMMON_ARGS } from "./args.js";
import { ExitCode } from "./exit-code.js";
import { writeToStdout } from "./stdout.js";

export function defineBuildCommand(program: Command) {
  program
    .command("build")
    .addOption(COMMON_ARGS.config)
    .action(async ({ config: configPath }) => {
      const userConfig = await loadConfig(configPath);
      let hasErrors = false;
      await build(userConfig, {
        onBuildStart: (target) => {
          const outDir = resolveOutput(target.outDir);
          writeToStdout(
            `${targetPrefix(
              target
            )}Building to "${outDir}" in ${target.format.toUpperCase()} format...`
          );
        },
        onBuildEnd: (result) => {
          const errorOutput = getTsErrors(result);
          if (errorOutput.length > 0) {
            writeToStdout(`${targetPrefix(result.target)}Could not build \n`);
            writeToStdout(errorOutput);
            writeToStdout(`\n`);
          }
          const outDir = resolveOutput(result.target.outDir);
          writeToStdout(
            `${targetPrefix(result.target)}Writing files to "${outDir}":`
          );
          for (const file of result.files.values()) {
            writeToStdout(
              `${targetPrefix(result.target)}  - ${formatFile(outDir, file)}`
            );
          }
          writeToStdout("");
          output(result);
        },
      });
      if (hasErrors) {
        process.exitCode = ExitCode.error;
      }
    });
}

function formatFile(outDir: string, file: OutputFile) {
  const fileName = resolveOutput(outDir, file.distPath);
  if (fileName.match(/\.(m|c)?js$/)) {
    return f.yellow(fileName);
  } else if (fileName.match(/\.d\.(m|c)?ts$/)) {
    return f.cyan(fileName);
  }
  return f.magenta(fileName);
}

function targetPrefix(target: CompileTarget) {
  return `[${f.bold(f.gray(target.name))}] `;
}
