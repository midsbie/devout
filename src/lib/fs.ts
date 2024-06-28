import fs from "node:fs/promises";

export async function fileExists(filename: string): Promise<boolean> {
  try {
    await fs.access(filename);
    return true;
  } catch (e) {
    return false;
  }
}
