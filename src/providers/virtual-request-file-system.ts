import * as path from "node:path";
import * as vscode from "vscode";
import { buildRequestDocument } from "../documents/request-document";
import { CoreApiService } from "../services/core-api.service";
import { RequestLinkStore } from "../storage/request-link-store";

type VirtualRequestFile = {
  content: Uint8Array;
  mtime: number;
  endpointId?: string;
};

export const WATCHAPI_SCHEME = "watchapi";

export class VirtualRequestFileSystemProvider
  implements vscode.FileSystemProvider
{
  private readonly files = new Map<string, VirtualRequestFile>();
  private readonly emitter = new vscode.EventEmitter<
    vscode.FileChangeEvent[]
  >();

  readonly onDidChangeFile = this.emitter.event;

  constructor(
    private readonly coreApi: CoreApiService,
    private readonly requestLinks: RequestLinkStore,
  ) {}

  toUri(input: { endpointId: string; filename: string }) {
    const filename = input.filename.trim() || "request.http";
    return vscode.Uri.from({
      scheme: WATCHAPI_SCHEME,
      path: path.posix.join("/requests", input.endpointId, filename),
    });
  }

  async upsertFile(
    uri: vscode.Uri,
    content: string,
    endpointId?: string,
  ): Promise<vscode.Uri> {
    const normalized = this.normalizeUri(uri);
    const file: VirtualRequestFile = {
      content: Buffer.from(content, "utf8"),
      mtime: Date.now(),
      endpointId,
    };
    this.files.set(normalized.toString(), file);
    if (endpointId) {
      void this.requestLinks.linkEndpoint(normalized, endpointId);
    }
    this.emitter.fire([
      { type: vscode.FileChangeType.Changed, uri: normalized },
    ]);
    return normalized;
  }

  watch(): vscode.Disposable {
    return new vscode.Disposable(() => {});
  }

  async stat(uri: vscode.Uri): Promise<vscode.FileStat> {
    const file = await this.ensureFile(uri);
    return {
      type: vscode.FileType.File,
      ctime: file.mtime,
      mtime: file.mtime,
      size: file.content.byteLength,
    };
  }

  readDirectory(): [string, vscode.FileType][] {
    return [];
  }

  createDirectory(): void | Thenable<void> {
    throw vscode.FileSystemError.NoPermissions(
      "Directories are not supported for WatchAPI files",
    );
  }

  async readFile(uri: vscode.Uri): Promise<Uint8Array> {
    const file = await this.ensureFile(uri);
    return file.content;
  }

  async writeFile(
    uri: vscode.Uri,
    content: Uint8Array,
    _options: { create: boolean; overwrite: boolean },
  ): Promise<void> {
    const file = await this.ensureFile(uri);
    const normalized = this.normalizeUri(uri);
    file.content = content;
    file.mtime = Date.now();
    this.emitter.fire([
      { type: vscode.FileChangeType.Changed, uri: normalized },
    ]);

    const endpointId = file.endpointId ?? this.requestLinks.getEndpointId(uri);
    if (!endpointId) {
      throw vscode.FileSystemError.Unavailable(
        "Unable to save: missing endpoint link",
      );
    }

    try {
      await this.coreApi.updateEndpointHttpContent({
        id: endpointId,
        httpContent: Buffer.from(content).toString("utf8"),
      });
    } catch (error) {
      console.error(error);
      const message =
        error instanceof Error
          ? `WatchAPI sync failed: ${error.message}`
          : "WatchAPI sync failed";
      vscode.window.showErrorMessage(message);
      throw error;
    }
  }

  delete(uri: vscode.Uri): void | Thenable<void> {
    this.files.delete(this.normalizeUri(uri).toString());
  }

  rename(): void | Thenable<void> {
    throw vscode.FileSystemError.NoPermissions(
      "Renaming WatchAPI files is not supported",
    );
  }

  private normalizeUri(uri: vscode.Uri) {
    if (uri.scheme !== WATCHAPI_SCHEME) {
      return uri.with({ scheme: WATCHAPI_SCHEME });
    }
    return uri;
  }

  private async ensureFile(uri: vscode.Uri): Promise<VirtualRequestFile> {
    const key = this.normalizeUri(uri).toString();
    const cached = this.files.get(key);
    if (cached) {
      return cached;
    }

    const endpointId =
      this.requestLinks.getEndpointId(uri) ??
      this.requestLinks.getEndpointId(this.normalizeUri(uri));
    if (!endpointId) {
      throw vscode.FileSystemError.FileNotFound(uri);
    }

    const endpoint = await this.coreApi.findEndpointById(endpointId);
    if (!endpoint) {
      throw vscode.FileSystemError.FileNotFound(uri);
    }

    const file: VirtualRequestFile = {
      content: Buffer.from(buildRequestDocument(endpoint), "utf8"),
      mtime: Date.now(),
      endpointId,
    };
    this.files.set(key, file);
    return file;
  }
}
