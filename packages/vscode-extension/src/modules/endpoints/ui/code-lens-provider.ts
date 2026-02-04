import * as vscode from "vscode";
import { parseHttpFile } from "@/infrastructure/parsers";

export class HttpFileCodeLensProvider implements vscode.CodeLensProvider {
    private _onDidChangeCodeLenses: vscode.EventEmitter<void> =
        new vscode.EventEmitter<void>();
    public readonly onDidChangeCodeLenses: vscode.Event<void> =
        this._onDidChangeCodeLenses.event;

    provideCodeLenses(
        document: vscode.TextDocument,
    ): vscode.CodeLens[] | Thenable<vscode.CodeLens[]> {
        if (!this.isHttpDocument(document)) return [];

        const text = document.getText();
        const match = text.match(
            /^(GET|POST|PUT|PATCH|DELETE|HEAD|OPTIONS)\s+/im,
        );

        if (!match) return [];

        const lineNumber = text.slice(0, match.index!).split("\n").length - 1;
        const range = new vscode.Range(lineNumber, 0, lineNumber, 0);

        const endpoint = parseHttpFile(document.getText());

        return [
            new vscode.CodeLens(range, {
                title: "▶ Run Request",
                command: "watchapi.executeFromEditor",
                arguments: [endpoint, document.uri],
                tooltip: `Execute ${endpoint.method} ${endpoint.requestPath}`,
            }),
        ];
    }

    public refresh(): void {
        this._onDidChangeCodeLenses.fire();
    }

    private isHttpDocument(document: vscode.TextDocument): boolean {
        const filename = document.fileName.toLowerCase();
        if (document.languageId === "http" || filename.endsWith(".http")) {
            return true;
        }

        return false;
    }
}
