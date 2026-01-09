import * as vscode from "vscode";

export class HttpCodeLensProvider implements vscode.CodeLensProvider {
  private _onDidChangeCodeLenses: vscode.EventEmitter<void> =
    new vscode.EventEmitter<void>();
  public readonly onDidChangeCodeLenses: vscode.Event<void> =
    this._onDidChangeCodeLenses.event;

  /**
   * Provide CodeLens items for .http files
   */
  provideCodeLenses(
    document: vscode.TextDocument,
  ): vscode.CodeLens[] | Thenable<vscode.CodeLens[]> {
    const codeLenses: vscode.CodeLens[] = [];

    // Only process watchapi:// scheme .http files
    if (document.uri.scheme !== "watchapi" || !document.uri.path.endsWith(".http")) {
      return codeLenses;
    }

    // Extract endpoint ID from URI
    const endpointId = this.extractEndpointId(document.uri);
    if (!endpointId) {
      return codeLenses;
    }

    const text = document.getText();
    const lines = text.split("\n");

    // Regex to match HTTP method lines (GET, POST, etc.)
    const methodRegex = /^(GET|POST|PUT|PATCH|DELETE|HEAD|OPTIONS)\s+/;

    // Find all HTTP method lines
    lines.forEach((line, index) => {
      if (methodRegex.test(line.trim())) {
        const range = new vscode.Range(index, 0, index, line.length);

        // Create CodeLens with Send Request command
        codeLenses.push(
          new vscode.CodeLens(range, {
            title: "▶ Send Request",
            command: "watchapi.sendRequest",
            arguments: [endpointId],
            tooltip: "Execute this HTTP request",
          }),
        );
      }
    });

    return codeLenses;
  }

  /**
   * Extract endpoint ID from document URI
   * URI format: watchapi://endpoints/{id}.http
   */
  private extractEndpointId(uri: vscode.Uri): string | null {
    const match = uri.path.match(/\/endpoints\/([^/]+)\.http$/);
    return match ? match[1] : null;
  }

  /**
   * Refresh CodeLens display
   */
  public refresh(): void {
    this._onDidChangeCodeLenses.fire();
  }
}
