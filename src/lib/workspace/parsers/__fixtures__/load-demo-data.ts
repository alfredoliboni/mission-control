import fs from "fs";
import path from "path";

export function loadDemoData(filename: string): string {
  return fs.readFileSync(
    path.join(__dirname, "demo-data", filename),
    "utf-8"
  );
}
