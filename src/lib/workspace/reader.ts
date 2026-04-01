const DEMO_FILES = [
  "child-profile.md",
  "pathway.md",
  "alerts.md",
  "providers.md",
  "programs.md",
  "benefits.md",
  "ontario-system.md",
  "documents.md",
  "messages.md",
];

export interface WorkspaceReader {
  listFiles(): Promise<string[]>;
  readFile(filename: string): Promise<string>;
}

class DemoReader implements WorkspaceReader {
  async listFiles(): Promise<string[]> {
    return DEMO_FILES;
  }

  async readFile(filename: string): Promise<string> {
    const res = await fetch(`/demo-data/${filename}`);
    if (!res.ok) {
      throw new Error(`Failed to load demo file: ${filename}`);
    }
    return res.text();
  }
}

class GatewayReader implements WorkspaceReader {
  private baseUrl: string;

  constructor(baseUrl: string) {
    this.baseUrl = baseUrl;
  }

  async listFiles(): Promise<string[]> {
    const res = await fetch(`${this.baseUrl}/api/workspace`);
    if (!res.ok) throw new Error("Failed to list workspace files");
    return res.json();
  }

  async readFile(filename: string): Promise<string> {
    const res = await fetch(`${this.baseUrl}/api/workspace/${filename}`);
    if (!res.ok) throw new Error(`Failed to read workspace file: ${filename}`);
    return res.text();
  }
}

export function createWorkspaceReader(isDemo: boolean): WorkspaceReader {
  if (isDemo) {
    return new DemoReader();
  }
  return new GatewayReader("");
}
