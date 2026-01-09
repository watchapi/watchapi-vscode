import * as vscode from "vscode";
import * as path from "path";
import { HttpResponse } from "./http-executor.service";
import hljs from "highlight.js";

type FoldingRange = [number, number];

export class ResponseViewerPanel {
  private panel: vscode.WebviewPanel | undefined;
  private readonly urlRegex = /(https?:\/\/[^\s"'<>\])\\]+)/gi;
  private context: vscode.ExtensionContext;

  constructor(context: vscode.ExtensionContext) {
    this.context = context;
  }

  /**
   * Show the response in a webview panel
   */
  public showResponse(response: HttpResponse): void {
    // Create or reveal panel
    if (this.panel) {
      this.panel.reveal(vscode.ViewColumn.Two, false);
    } else {
      this.panel = vscode.window.createWebviewPanel(
        "watchapiResponse",
        this.getTitle(response),
        { viewColumn: vscode.ViewColumn.Two, preserveFocus: true },
        {
          enableScripts: true,
          retainContextWhenHidden: true,
          enableFindWidget: true,
        },
      );

      // Handle panel disposal
      this.panel.onDidDispose(() => {
        this.panel = undefined;
      });

      // Handle messages from webview
      this.panel.webview.onDidReceiveMessage((message) => {
        switch (message.command) {
          case "copy":
            vscode.env.clipboard.writeText(message.text);
            vscode.window.showInformationMessage("Copied to clipboard");
            break;
        }
      });
    }

    // Update panel title
    this.panel.title = this.getTitle(response);

    // Update panel content
    this.panel.webview.html = this.getHtmlContent(response);
  }

  /**
   * Get title for panel
   */
  private getTitle(response: HttpResponse): string {
    const statusEmoji = this.getStatusEmoji(response);
    return `${statusEmoji} Response (${response.duration}ms)`;
  }

  /**
   * Get emoji icon based on response status
   */
  private getStatusEmoji(response: HttpResponse): string {
    if (response.isError) {
      return "❌";
    } else if (response.status >= 200 && response.status < 300) {
      return "✅";
    } else if (response.status >= 400) {
      return "⚠️";
    }
    return "ℹ️";
  }

  /**
   * Generate HTML content for the webview
   */
  private getHtmlContent(response: HttpResponse): string {
    const nonce = new Date().getTime() + "" + new Date().getMilliseconds();

    // Check if response is an image
    const isImage = this.isBrowserSupportedImage(response.contentType);
    let innerHtml: string;
    let width = 2;

    if (isImage) {
      // Display image
      const base64Body = Buffer.from(response.body).toString("base64");
      innerHtml = `<img src="data:${response.contentType};base64,${base64Body}">`;
    } else {
      // Display formatted code with line numbers
      const code = this.highlightResponse(response);
      width = (code.split(/\r\n|\r|\n/).length + 1).toString().length;
      innerHtml = `<pre><code>${this.addLineNumbers(code)}</code></pre>`;
    }

    // Get file URIs for resources
    const resetCssUri = this.panel!.webview.asWebviewUri(
      vscode.Uri.file(
        path.join(this.context.extensionPath, "styles", "reset.css"),
      ),
    );
    const vscodeCssUri = this.panel!.webview.asWebviewUri(
      vscode.Uri.file(
        path.join(this.context.extensionPath, "styles", "vscode.css"),
      ),
    );
    const restClientCssUri = this.panel!.webview.asWebviewUri(
      vscode.Uri.file(
        path.join(this.context.extensionPath, "styles", "rest-client.css"),
      ),
    );
    const scriptUri = this.panel!.webview.asWebviewUri(
      vscode.Uri.file(
        path.join(this.context.extensionPath, "scripts", "main.js"),
      ),
    );

    // Content Security Policy
    const csp = `<meta http-equiv="Content-Security-Policy" content="default-src 'none'; img-src 'self' http: https: data: vscode-resource: ${this.panel!.webview.cspSource}; script-src 'nonce-${nonce}' ${this.panel!.webview.cspSource}; style-src 'self' 'unsafe-inline' http: https: data: vscode-resource: ${this.panel!.webview.cspSource};">`;

    return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <link rel="stylesheet" type="text/css" href="${resetCssUri}">
  <link rel="stylesheet" type="text/css" href="${vscodeCssUri}">
  <link rel="stylesheet" type="text/css" href="${restClientCssUri}">
  ${this.getSettingsOverrideStyles(width)}
  ${csp}
  <title>Response</title>
  <script nonce="${nonce}">
    document.addEventListener('DOMContentLoaded', function () {
      document.getElementById('scroll-to-top')
        .addEventListener('click', function () { window.scrollTo(0,0); });
    });
  </script>
</head>
<body>
  <div>
    ${this.addUrlLinks(innerHtml)}
    <a id="scroll-to-top" role="button" aria-label="scroll to top" title="Scroll To Top"><span class="icon"></span></a>
  </div>
  <script type="text/javascript" src="${scriptUri}" nonce="${nonce}" charset="UTF-8"></script>
</body>
</html>`;
  }

  /**
   * Get settings override styles for line numbers
   */
  private getSettingsOverrideStyles(width: number): string {
    return `<style>
code .line {
  padding-left: calc(${width}ch + 20px );
}
code .line:before {
  width: ${width}ch;
  margin-left: calc(-${width}ch + -30px );
}
.line .icon {
  left: calc(${width}ch + 3px)
}
.line.collapsed .icon {
  left: calc(${width}ch + 3px)
}
</style>`;
  }

  /**
   * Highlight response with syntax highlighting using highlight.js
   */
  private highlightResponse(response: HttpResponse): string {
    let code = "";

    // Add request details (exchange view)
    const request = response.request;
    const requestNonBodyPart = `${request.method} ${request.url} HTTP/1.1\n${this.formatHeaders(request.headers)}`;
    code += hljs.highlight(requestNonBodyPart + "\r\n", {
      language: "http",
    }).value;

    if (request.body) {
      const requestBodyPart = this.formatBody(
        request.body,
        request.headers["content-type"] || request.headers["Content-Type"],
      );
      const bodyLanguageAlias = this.getHighlightLanguageAlias(
        request.headers["content-type"] || request.headers["Content-Type"],
        request.body,
      );
      if (bodyLanguageAlias) {
        code += hljs.highlight(requestBodyPart, {
          language: bodyLanguageAlias,
        }).value;
      } else {
        code += hljs.highlightAuto(requestBodyPart).value;
      }
      code += "\r\n";
    }

    code += "\r\n".repeat(2);

    // Add response
    if (!response.isError) {
      const responseNonBodyPart = `HTTP/1.1 ${response.status} ${response.statusText}\n${this.formatHeaders(response.headers)}`;
      code += hljs.highlight(responseNonBodyPart + "\r\n", {
        language: "http",
      }).value;

      if (response.body) {
        const responseBodyPart = this.formatBody(
          response.body,
          response.contentType,
        );
        const bodyLanguageAlias = this.getHighlightLanguageAlias(
          response.contentType,
          responseBodyPart,
        );
        if (bodyLanguageAlias) {
          code += hljs.highlight(responseBodyPart, {
            language: bodyLanguageAlias,
          }).value;
        } else {
          code += hljs.highlightAuto(responseBodyPart).value;
        }
      }
    } else {
      code += `<span class="hljs-string">ERROR: ${response.error}</span>\n`;
    }

    return code;
  }

  /**
   * Format headers as string
   */
  private formatHeaders(headers: Record<string, string>): string {
    return Object.entries(headers)
      .map(([key, value]) => `${key}: ${value}`)
      .join("\n");
  }

  /**
   * Format body (prettify JSON if applicable)
   */
  private formatBody(body: string, contentType?: string): string {
    if (this.isJSON(contentType)) {
      try {
        return JSON.stringify(JSON.parse(body), null, 2);
      } catch {
        return body;
      }
    }
    return body;
  }

  /**
   * Get highlight.js language alias for content type
   */
  private getHighlightLanguageAlias(
    contentType: string | undefined,
    content: string | null = null,
  ): string | null {
    if (!contentType) {
      // Try to guess from content
      if (content && this.looksLikeJSON(content)) {
        return "json";
      }
      return null;
    }

    const type = contentType.toLowerCase();
    if (
      type.includes("application/json") ||
      type.includes("application/vnd.api+json") ||
      type.includes("+json")
    ) {
      return "json";
    } else if (
      type.includes("application/javascript") ||
      type.includes("text/javascript")
    ) {
      return "javascript";
    } else if (
      type.includes("application/xml") ||
      type.includes("text/xml") ||
      type.includes("+xml")
    ) {
      return "xml";
    } else if (type.includes("text/html")) {
      return "html";
    } else if (type.includes("text/css")) {
      return "css";
    }

    return null;
  }

  /**
   * Add line numbers to code
   */
  private addLineNumbers(code: string): string {
    // Clean line breaks (move closing spans before newlines)
    code = code.replace(/([\r\n]\s*)(<\/span>)/gi, "$2$1");
    code = this.cleanLineBreaks(code);

    const lines = code.split(/\r\n|\r|\n/);
    const max = (1 + lines.length).toString().length;
    const foldingRanges = this.getFoldingRange(lines);

    return lines
      .map((line, i) => {
        const lineNum = i + 1;
        const range = foldingRanges.has(lineNum)
          ? ` range-start="${foldingRanges.get(lineNum)![0]}" range-end="${foldingRanges.get(lineNum)![1]}"`
          : "";
        const folding = foldingRanges.has(lineNum)
          ? '<span class="icon"></span>'
          : "";
        return `<span class="line width-${max}" start="${lineNum}"${range}>${line}${folding}</span>`;
      })
      .join("\n");
  }

  /**
   * Clean line breaks to preserve syntax highlighting across lines
   */
  private cleanLineBreaks(code: string): string {
    const openSpans: string[] = [];
    const matcher = /<\/?span[^>]*>|\r\n|\r|\n/gi;
    const newline = /\r\n|\r|\n/;
    const closingTag = /^<\//;

    return code.replace(matcher, (match: string) => {
      if (newline.test(match)) {
        if (openSpans.length) {
          return (
            openSpans.map(() => "</span>").join("") + match + openSpans.join("")
          );
        } else {
          return match;
        }
      } else if (closingTag.test(match)) {
        openSpans.pop();
        return match;
      } else {
        openSpans.push(match);
        return match;
      }
    });
  }

  /**
   * Get folding ranges for JSON/XML structures
   */
  private getFoldingRange(lines: string[]): Map<number, FoldingRange> {
    const result = new Map<number, FoldingRange>();
    const stack: [number, number][] = [];

    const leadingSpaceCount = lines
      .map((line, index) => [index, line.search(/\S/)] as [number, number])
      .filter(([, num]) => num !== -1);

    for (const [index, [lineIndex, count]] of leadingSpaceCount.entries()) {
      if (index === 0) {
        continue;
      }

      const [prevLineIndex, prevCount] = leadingSpaceCount[index - 1];
      if (prevCount < count) {
        stack.push([prevLineIndex, prevCount]);
      } else if (prevCount > count) {
        let prev;
        while ((prev = stack.slice(-1)[0]) && prev[1] >= count) {
          stack.pop();
          result.set(prev[0] + 1, [prev[0] + 1, lineIndex]);
        }
      }
    }
    return result;
  }

  /**
   * Add clickable URL links
   */
  private addUrlLinks(innerHtml: string): string {
    return innerHtml.replace(this.urlRegex, (match: string): string => {
      const encodedEndCharacters = ["&lt;", "&gt;", "&quot;", "&apos;"];
      let urlEndPosition = match.length;

      encodedEndCharacters.forEach((char) => {
        const index = match.indexOf(char);
        if (index > -1 && index < urlEndPosition) {
          urlEndPosition = index;
        }
      });

      const url = match.substring(0, urlEndPosition);
      const extraCharacters = match.substring(urlEndPosition);

      return (
        '<a href="' +
        url +
        '" target="_blank" rel="noopener noreferrer">' +
        url +
        "</a>" +
        extraCharacters
      );
    });
  }

  /**
   * Check if content type is JSON
   */
  private isJSON(contentType?: string): boolean {
    if (!contentType) {
      return false;
    }
    return (
      contentType.includes("application/json") ||
      contentType.includes("application/vnd.api+json") ||
      contentType.includes("+json")
    );
  }

  /**
   * Check if content looks like JSON
   */
  private looksLikeJSON(content: string): boolean {
    const trimmed = content.trim();
    return (
      (trimmed.startsWith("{") && trimmed.endsWith("}")) ||
      (trimmed.startsWith("[") && trimmed.endsWith("]"))
    );
  }

  /**
   * Check if content type is a browser-supported image
   */
  private isBrowserSupportedImage(contentType?: string): boolean {
    if (!contentType) {
      return false;
    }
    const type = contentType.toLowerCase();
    return (
      type.includes("image/png") ||
      type.includes("image/jpeg") ||
      type.includes("image/jpg") ||
      type.includes("image/gif") ||
      type.includes("image/bmp") ||
      type.includes("image/webp") ||
      type.includes("image/svg+xml")
    );
  }

  /**
   * Dispose the panel
   */
  public dispose(): void {
    if (this.panel) {
      this.panel.dispose();
      this.panel = undefined;
    }
  }
}
