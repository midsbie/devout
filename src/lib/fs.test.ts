import { access } from "node:fs/promises";

import { describe, expect, it, vi } from "vitest";

import {
  fileExists,
  isCodeExt,
  isJavascriptExt,
  isStyleExt,
  isTypescriptExt,
  renameExtension,
} from "./fs";

vi.mock("node:fs/promises");

describe("Utility Functions Module", () => {
  describe("fileExists", () => {
    it("should return true if file exists", async () => {
      vi.mocked(access).mockResolvedValueOnce();
      const result = await fileExists("existingFile.txt");
      expect(result).toBe(true);
    });

    it("should return false if file does not exist", async () => {
      vi.mocked(access).mockRejectedValueOnce(new Error("File not found"));
      const result = await fileExists("nonExistingFile.txt");
      expect(result).toBe(false);
    });
  });

  describe("isTypescriptExt", () => {
    it("should return true for .ts extension", () => {
      expect(isTypescriptExt("file.ts")).toBe(true);
    });

    it("should return true for .tsx extension", () => {
      expect(isTypescriptExt("file.tsx")).toBe(true);
    });

    it("should return false for other extensions", () => {
      expect(isTypescriptExt("file.js")).toBe(false);
      expect(isTypescriptExt("file.jsx")).toBe(false);
      expect(isTypescriptExt("file.css")).toBe(false);
    });
  });

  describe("isJavascriptExt", () => {
    it("should return true for .js extension", () => {
      expect(isJavascriptExt("file.js")).toBe(true);
    });

    it("should return true for .jsx extension", () => {
      expect(isJavascriptExt("file.jsx")).toBe(true);
    });

    it("should return true for .mjs extension", () => {
      expect(isJavascriptExt("file.mjs")).toBe(true);
    });

    it("should return false for other extensions", () => {
      expect(isJavascriptExt("file.ts")).toBe(false);
      expect(isJavascriptExt("file.tsx")).toBe(false);
      expect(isJavascriptExt("file.css")).toBe(false);
    });
  });

  describe("isCodeExt", () => {
    it("should return true for JavaScript extensions", () => {
      expect(isCodeExt("file.js")).toBe(true);
      expect(isCodeExt("file.jsx")).toBe(true);
      expect(isCodeExt("file.mjs")).toBe(true);
    });

    it("should return true for TypeScript extensions", () => {
      expect(isCodeExt("file.ts")).toBe(true);
      expect(isCodeExt("file.tsx")).toBe(true);
    });

    it("should return false for other extensions", () => {
      expect(isCodeExt("file.css")).toBe(false);
      expect(isCodeExt("file.html")).toBe(false);
    });
  });

  describe("isStyleExt", () => {
    it("should return true for .scss extension", () => {
      expect(isStyleExt("file.scss")).toBe(true);
    });

    it("should return false for other extensions", () => {
      expect(isStyleExt("file.css")).toBe(false);
      expect(isStyleExt("file.js")).toBe(false);
      expect(isStyleExt("file.ts")).toBe(false);
    });
  });

  describe("renameExtension", () => {
    it("should rename extension correctly", () => {
      expect(renameExtension("file.js", "ts")).toBe("file.ts");
      expect(renameExtension("file.test.jsx", ".tsx")).toBe("file.test.tsx");
    });

    it("should handle files without extension", () => {
      expect(renameExtension("file", "js")).toBe("file.js");
    });

    it("should handle new extension with dot correctly", () => {
      expect(renameExtension("file.css", ".scss")).toBe("file.scss");
    });

    it("should handle new extension without dot correctly", () => {
      expect(renameExtension("file.html", "css")).toBe("file.css");
    });
  });
});
