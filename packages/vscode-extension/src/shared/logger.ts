/**
 * Logger utility using VS Code Output Channel
 * Provides structured logging with different levels
 */

import * as vscode from 'vscode';
import { Logger as ParserLogger, type LogOutput } from '@watchapi/parsers';
import { EXTENSION_NAME } from './constants';

export enum LogLevel {
	DEBUG = 0,
	INFO = 1,
	WARN = 2,
	ERROR = 3,
}

class Logger {
	private outputChannel: vscode.OutputChannel;
	private logLevel: LogLevel = LogLevel.INFO;

	constructor() {
		this.outputChannel = vscode.window.createOutputChannel(EXTENSION_NAME);
	}

	setLogLevel(level: LogLevel): void {
		this.logLevel = level;
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

	show(): void {
		this.outputChannel.show();
	}

	dispose(): void {
		this.outputChannel.dispose();
	}

	/**
	 * Create a parser-compatible logger that outputs to the same channel
	 * Use this when calling @watchapi/parsers functions
	 */
	createParserLogger(): ParserLogger {
		const output: LogOutput = {
			appendLine: (message: string) => this.outputChannel.appendLine(message),
		};
		return new ParserLogger({ output, logLevel: this.logLevel });
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

		this.outputChannel.appendLine(logMessage);

		// Also log errors to console for development
		if (level === LogLevel.ERROR && data instanceof Error) {
			console.error(message, data);
		}
	}
}

// Export singleton instance
export const logger = new Logger();
