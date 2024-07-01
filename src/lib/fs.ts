import fs from "node:fs/promises";

export async function fileExists(filename: string): Promise<boolean> {
  try {
    await fs.access(filename);
    return true;
  } catch (_e) {
    return false;
  }
}

export function isTypescriptExt(filename: string): boolean {
  return /\.tsx?$/.test(filename);
}

export function isJavascriptExt(filename: string): boolean {
  return /\.(mjs|jsx?)$/.test(filename);
}

export function isCodeExt(filename: string): boolean {
  return isTypescriptExt(filename) || isJavascriptExt(filename);
}

export function isStyleExt(filename: string): boolean {
  return /\.scss$/.test(filename);
}

export function renameExtension(filename: string, newExt: string): string {
  const baseName = filename.replace(/\.[^/.]+$/, "");
  const formattedExt = newExt.startsWith(".") ? newExt : "." + newExt;
  return baseName + formattedExt;
}
