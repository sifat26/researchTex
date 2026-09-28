import { NextResponse } from "next/server";
import { FileService } from "@/services/file.service";

// Verify internal API key to prevent unauthorized access to this route
function isAuthorized(request: Request) {
  const apiKey = request.headers.get("x-internal-api-key");
  const expectedKey = process.env.INTERNAL_API_KEY || "development_secret_key";
  return apiKey === expectedKey;
}

export async function GET(request: Request) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const projectId = searchParams.get("projectId");
  const path = searchParams.get("path");

  if (!projectId || !path) {
    return NextResponse.json({ error: "Missing projectId or path" }, { status: 400 });
  }

  try {
    const content = await FileService.readFile(projectId, path);
    if (content === null) {
      return NextResponse.json({ error: "File not found" }, { status: 404 });
    }
    return NextResponse.json({ content });
  } catch (err: any) {
    console.error("[Internal API] GET File Error:", err);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { projectId, path, content } = body;

    if (!projectId || !path || typeof content !== "string") {
      return NextResponse.json({ error: "Invalid body" }, { status: 400 });
    }

    // Use default fileType='other' and isBinary=false for collaborative text files
    await FileService.writeFile(projectId, path, content);
    return NextResponse.json({ success: true });
  } catch (err: any) {
    console.error("[Internal API] POST File Error:", err);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
