import * as assert from "assert";
import * as vscode from "vscode";

import { inferHttpFilename, openVirtualHttpFile } from "../services/editor.service";

suite("Editor Service", () => {
  test("opens virtual http document", async () => {
    const content = "GET https://example.com\\n";

    const doc = await openVirtualHttpFile(content, "request.http", {
      reveal: false,
    });
    assert.ok(doc, "Expected a document");
    assert.strictEqual(doc.uri.scheme, "untitled");
    assert.strictEqual(doc.getText(), content);
  });

  test("includes method in inferred filename when name is provided", () => {
    assert.strictEqual(
      inferHttpFilename({
        name: "Users",
        method: "GET",
        url: "https://example.com/users",
      }),
      "GET-Users.http",
    );
  });

  test("falls back to method + url when name is empty", () => {
    assert.strictEqual(
      inferHttpFilename({
        name: "   ",
        method: "POST",
        url: "https://example.com/users?role=admin",
      }),
      "POST-httpsexample.comusersrole=admin.http",
    );
  });
});
