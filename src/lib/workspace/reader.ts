export interface WorkspaceReader {
  listFiles(): Promise<string[]>;
  readFile(filename: string): Promise<string>;
}

class GatewayReader implements WorkspaceReader {
  private baseUrl: string;

  constructor(baseUrl: string) {
    this.baseUrl = baseUrl;
  }

  async listFiles(): Promise<string[]> {
    const res = await fetch(`${this.baseUrl}/api/workspace-live`);
    if (!res.ok) throw new Error("Failed to list workspace files");
    return res.json();
  }

  async readFile(filename: string): Promise<string> {
    const res = await fetch(`${this.baseUrl}/api/workspace-live/${filename}`);
    if (!res.ok) throw new Error(`Failed to read workspace file: ${filename}`);
    return res.text();
  }
}

export function createWorkspaceReader(): WorkspaceReader {
  return new GatewayReader("");
}
