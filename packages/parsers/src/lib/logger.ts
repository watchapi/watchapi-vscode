/**
 * Simple logger utility for parsers
 * Supports custom output handlers (e.g., VSCode OutputChannel)
 */

export enum LogLevel {
	DEBUG = 0,
	INFO = 1,
	WARN = 2,
	ERROR = 3,
}

/**
 * Interface for custom log output handlers
 * Compatible with VSCode OutputChannel and similar APIs
 */
export interface LogOutput {
	appendLine(message: string): void;
}

/**
 * Logger configuration options
 */
export interface LoggerConfig {
	output?: LogOutput;
	logLevel?: LogLevel;
}

export class Logger {
	private logLevel: LogLevel = LogLevel.INFO;
	private output?: LogOutput;

	constructor(config?: LoggerConfig) {
		if (config?.logLevel !== undefined) {
			this.logLevel = config.logLevel;
		}
		this.output = config?.output;
	}

	setLogLevel(level: LogLevel): void {
		this.logLevel = level;
	}

	setOutput(output: LogOutput | undefined): void {
		this.output = output;
	}

	debug(message: string, data?: unknown): void {
		this.log(LogLevel.DEBUG, message, data);
	}

	info(message: string, data?: unknown): void {
		this.log(LogLevel.INFO, message, data);
	}

	warn(message: string, data?: unknown): void {
		this.log(LogLevel.WARN, message, data);
	}

	error(message: string, error?: unknown): void {
		this.log(LogLevel.ERROR, message, error);
	}

	private log(level: LogLevel, message: string, data?: unknown): void {
		if (level < this.logLevel) {
			return;
		}

		const timestamp = new Date().toISOString();
		const levelStr = LogLevel[level];
		let logMessage = `[${timestamp}] [${levelStr}] ${message}`;

		if (data !== undefined) {
			if (data instanceof Error) {
				logMessage += `\n${data.stack || data.message}`;
			} else {
				try {
					logMessage += `\n${JSON.stringify(data, null, 2)}`;
				} catch {
					logMessage += `\n${String(data)}`;
				}
			}
		}

		// Use custom output if provided, otherwise fall back to console
		if (this.output) {
			this.output.appendLine(logMessage);
		} else {
			const consoleFn =
				level === LogLevel.ERROR
					? console.error
					: level === LogLevel.WARN
						? console.warn
						: level === LogLevel.DEBUG
							? console.debug
							: console.log;

			consoleFn(logMessage);
		}
	}
}

// Export singleton instance for backward compatibility
export const logger = new Logger();
