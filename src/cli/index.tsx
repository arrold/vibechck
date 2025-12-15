#!/usr/bin/env node

import React from 'react';
import { render } from 'ink';
import { Command } from 'commander';
import chalk from 'chalk';
import { ConfigLoader } from '../core/ConfigLoader.js';
import { DEFAULT_CONFIG } from '../types/defaultConfig.js';
import { VibechckConfig, AlertSeverity, AnalysisModuleName } from '../types/index.js';
import { VibechckRunner } from '../ui/Runner.js';

// Initialize CLI
const program = new Command();

// Configure CLI options
program
  .name('vibechck')
  .description(
    `${chalk.bold('vibechck')} - AI Coding Assistant Criticism Scanner\n` +
    'Detects and reports anti-patterns in AI-generated code such as:\n' +
    '  • Hallucinated dependencies (phantom, newborn, typosquatting)\n' +
    '  • Lazy coding patterns (placeholders, TODOs, empty implementations)\n' +
    '  • Security vulnerabilities (secrets, unsafe deserialization)\n' +
    '  • Architectural issues (god functions, naming inconsistencies)'
  )
  .version('1.0.1', '-v, --version', 'Show version information')
  .helpOption('-h, --help', 'Display help for command')
  .configureHelp({
    sortSubcommands: true,
    sortOptions: true,
    showGlobalOptions: true,
  })
  .showHelpAfterError('(add --help for additional information)')
  .addHelpText(
    'after',
    '\nExamples:\n' +
    '  $ vibechck ./src                      # Scan a directory\n' +
    '  $ vibechck --severity=critical,high  # Only show critical and high severity issues\n' +
    '  $ vibechck --module=security         # Only run security checks\n' +
    '  $ vibechck --json > report.json      # Output results as JSON\n' +
    '  $ vibechck --no-color                # Disable colored output'
  )
  .argument('[directory]', 'Directory to scan (default: current directory)', '.')
  .option(
    '-c, --config <path>',
    'Path to configuration file (.vibechck.json or .vibechck.yaml)'
  )
  .option('-f, --format <format>', 'Output format (text, json, sarif)', 'text')
  .option('-j, --json', 'Output results in JSON format (deprecated, use --format=json)', false)
  .option(
    '-s, --severity <levels>',
    'Filter by severity levels (comma-separated list of: critical, high, medium, low)',
    'critical,high,medium,low'
  )
  .option(
    '-m, --module <modules>',
    'Enable specific modules (comma-separated list of: hallucination, laziness, security, architecture)',
    'hallucination,laziness,security,architecture'
  )
  .option(
    '--no-color',
    'Disable colored output (useful for CI environments)',
    process.env.CI === undefined
  )
  .option('--verbose', 'Show all issues including low severity ones', false)
  .action(async (directory: string, options) => {
    try {
      // Initialize configuration
      const configLoader = new ConfigLoader();
      let config: VibechckConfig;

      try {
        config = await configLoader.load(options.config);
      } catch (error) {
        console.error(chalk.red(`Error loading configuration: ${(error as Error).message}`));
        if (options.debug) {
          console.error(chalk.gray((error as Error).stack));
        }
        process.exit(2);
      }

      // Apply CLI overrides to config
      if (options.severity) {
        const severities = options.severity
          .split(',')
          .map((s: string) => s.trim().toUpperCase() as AlertSeverity)
          .filter((s: AlertSeverity) => Object.values(AlertSeverity).includes(s));

        if (severities.length > 0) {
          config.severity = [...new Set(severities as AlertSeverity[])];
        }
      }

      // Enable/disable modules based on CLI options
      if (options.module) {
        const enabledModules = new Set(
          options.module.split(',').map((m: string) => m.trim().toLowerCase())
        );

        config.modules = {
          hallucination: enabledModules.has('hallucination'),
          laziness: enabledModules.has('laziness'),
          security: enabledModules.has('security'),
          architecture: enabledModules.has('architecture'),
          cost: enabledModules.has('cost'),
        };
      }

      // Determine output format
      const format = options.json ? 'json' : options.format;

      // In fix mode, force analysis engine to run first
      if (options.fix || format === 'json' || format === 'sarif') {
        const { AnalysisEngine } = await import('../core/AnalysisEngine.js');
        const { ExitCodeHandler } = await import('../core/ExitCodeHandler.js');

        const analysisEngine = new AnalysisEngine();
        const report = await analysisEngine.analyze(directory, config);

        // Handle Auto-Fix
        if (options.fix) {
          const { FixOrchestrator } = await import('../core/FixOrchestrator.js');
          const orchestrator = new FixOrchestrator();
          await orchestrator.applyFixes(report);
          // Re-run analysis or just exit?
          // Ideally we report what was fixed.
          // For now, let's just exit or print a summary.
        }

        const exitCodeHandler = new ExitCodeHandler();

        if (format === 'json') {
          const { ReportGenerator } = await import('../core/ReportGenerator.js');
          const reportGenerator = new ReportGenerator();
          console.log(reportGenerator.generateJsonReport(report));
        } else if (format === 'sarif') {
          const { SarifFormatter } = await import('../core/SarifFormatter.js');
          const sarifFormatter = new SarifFormatter();
          console.log(sarifFormatter.generateSarifReport(report));
        }

        process.exit(exitCodeHandler.determineExitCode(report));
      } else {
        // TUI Mode via Ink (default for 'text')
        // TUI doesn't support fix yet in this branch of logic, but options.fix is handled above.
        // If user runs `vibechck --fix`, format is text by default.
        // The above block catches options.fix.
        // So this else block is only for TUI without fix.
        render(<VibechckRunner directory={directory} config={config} verbose={options.verbose} onComplete={(code) => process.exit(code)} />);
      }

    } catch (error) {
      console.error(chalk.red('Error:'), error instanceof Error ? error.message : String(error));
      process.exit(1);
    }
  });

program.parse();
