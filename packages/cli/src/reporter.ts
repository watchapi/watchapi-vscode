import chalk from "chalk";
import type { CheckResult, Report } from "./types.js";

export class Reporter {
  printResults(report: Report, regressions: string[]): void {
    console.log("\n" + chalk.bold("=".repeat(60)));
    console.log(chalk.bold(`  API Check Results - ${report.environment}`));
    console.log(chalk.bold("=".repeat(60)) + "\n");

    // Summary
    console.log(chalk.bold("Summary:"));
    console.log(`  Total:  ${report.summary.total}`);
    console.log(`  ${chalk.green("✓")} Passed: ${report.summary.passed}`);
    console.log(`  ${chalk.red("✗")} Failed: ${report.summary.failed}`);
    console.log(`  ${chalk.yellow("⚠")} Errors: ${report.summary.errors}`);
    console.log("");

    // Regressions
    if (regressions.length > 0) {
      console.log(chalk.bold.red("⚠ REGRESSIONS DETECTED:"));
      regressions.forEach((regression) => {
        console.log(chalk.red(`  • ${regression}`));
      });
      console.log("");
    }

    // Individual results
    console.log(chalk.bold("Details:"));
    report.results.forEach((result) => {
      this.printResult(result);
    });

    console.log(chalk.bold("=".repeat(60)) + "\n");
  }

  private printResult(result: CheckResult): void {
    const icon =
      result.status === "PASSED"
        ? chalk.green("✓")
        : result.status === "FAILED"
        ? chalk.red("✗")
        : chalk.yellow("⚠");

    console.log(`${icon} Endpoint ${result.endpointId}`);

    if (result.status === "PASSED") {
      console.log(
        `  Status: ${chalk.green(result.actualStatus)} | Response Time: ${this.formatResponseTime(
          result.responseTime
        )}`
      );
    } else if (result.status === "FAILED") {
      console.log(`  ${chalk.red("Failed assertions:")}`);
      if (result.assertions) {
        if (result.assertions.statusCode === false) {
          console.log(
            `    • Status code: expected ${chalk.red("different")}, got ${chalk.red(
              result.actualStatus
            )}`
          );
        }
        if (result.assertions.responseTime === false) {
          console.log(
            `    • Response time: ${chalk.red(result.responseTime + "ms")} (too slow)`
          );
        }
        if (result.assertions.bodyContains === false) {
          console.log(`    • Body does not contain expected content`);
        }
        if (result.assertions.bodySchema === false) {
          console.log(`    • Body does not match expected schema`);
        }
      }
    } else {
      console.log(`  ${chalk.yellow("Error:")} ${result.error}`);
    }

    console.log("");
  }

  private formatResponseTime(ms: number): string {
    if (ms < 100) {
      return chalk.green(`${ms}ms`);
    } else if (ms < 500) {
      return chalk.yellow(`${ms}ms`);
    } else {
      return chalk.red(`${ms}ms`);
    }
  }

  printError(message: string): void {
    console.error(chalk.bold.red("\n✗ Error: ") + message + "\n");
  }
}
