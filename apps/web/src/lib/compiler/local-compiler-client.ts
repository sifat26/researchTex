import { getProjectSnapshot } from "@/actions/compiler.actions";
import type { 
  CompilerClient, 
  AgentHealthStatus, 
  CompileRequest, 
  CompileResult,
  CompileLogEntry
} from "@researchtex/types";

const getAgentUrl = () => {
  const url = process.env.NEXT_PUBLIC_COMPILER_AGENT_URL;
  if (!url) {
    throw new Error("NEXT_PUBLIC_COMPILER_AGENT_URL is not set");
  }
  return url;
};

export class LocalCompilerClient implements CompilerClient {
  private projectId: string;

  constructor(projectId: string) {
    this.projectId = projectId;
  }

  async health(): Promise<AgentHealthStatus> {
    try {
      const res = await fetch(`${getAgentUrl()}/health`, {
        cache: "no-store",
      });
      if (!res.ok) {
        throw new Error(`Health check failed with status ${res.status}`);
      }
      const data = await res.json();
      return {
        isRunning: data.status === "ok",
        version: data.version || "unknown",
        availableEngines: data.available_engines || [],
      } as AgentHealthStatus;
    } catch (err) {
      console.error("Health check error:", err);
      return {
        isRunning: false,
        version: "unknown",
        availableEngines: [],
      };
    }
  }

  async compile(request: CompileRequest): Promise<CompileResult> {
    try {
      // 1. Fetch complete project snapshot from Next.js server as ZIP
      const snapshotRes = await fetch(`/api/projects/${this.projectId}/compile-snapshot`);
      if (!snapshotRes.ok) {
        let errMessage = `Failed to fetch project snapshot (${snapshotRes.status})`;
        try {
          const errData = await snapshotRes.json();
          errMessage = errData.error || errMessage;
        } catch {}
        throw new Error(errMessage);
      }
      
      const zipBlob = await snapshotRes.blob();

      // 2. Build multipart/form-data request for Rust server
      const formData = new FormData();
      formData.append("job_id", request.jobId);
      formData.append("root_file", request.rootFile);
      formData.append("engine", request.engine);
      formData.append("run_bib", request.runBib.toString());
      formData.append("project_zip", zipBlob, "project.zip");

      // 3. Post directly to the local compiler agent
      const res = await fetch(`${getAgentUrl()}/compile`, {
        method: "POST",
        body: formData,
        cache: "no-store",
      });

      if (!res.ok) {
        const errorData = await res.json().catch(() => null);
        throw new Error(errorData?.error || `Agent returned ${res.status}`);
      }

      const data = await res.json();
      
      const logEntries: CompileLogEntry[] = data.log_entries || [];
      
      // If there are no structured logs but there's raw output, fallback to raw
      if (logEntries.length === 0 && data.stdout) {
        logEntries.push({ level: "info", message: data.stdout });
      }
      if (logEntries.length === 0 && data.stderr) {
        logEntries.push({ level: "error", message: data.stderr });
      }
      if (data.error) {
        logEntries.push({ level: "error", message: data.error });
      }

      return {
        jobId: data.job_id || request.jobId,
        status: data.success ? "success" : "error",
        durationMs: data.duration_ms || 0,
        pdfBase64: data.pdf_base64 || undefined,
        logEntries,
      };
    } catch (err: any) {
      return {
        jobId: request.jobId,
        status: "error",
        durationMs: 0,
        logEntries: [
          { level: "error", message: err.message || "Failed to communicate with local compiler agent" }
        ],
      };
    }
  }

  async cancel(jobId: string): Promise<void> {
    try {
      await fetch(`${getAgentUrl()}/compile/${jobId}/cancel`, {
        method: "POST",
      });
    } catch (err) {
      console.error("Failed to cancel job", err);
    }
  }
}
