import { NextResponse } from "next/server"

export async function GET() {
  return NextResponse.json({
    tools: [
      {
        name: "web.search",
        description: "Tìm kiếm web và trả về danh sách kết quả (title/url/snippet).",
        inputSchema: {
          type: "object",
          properties: {
            query: { type: "string" },
            num: { type: "number" },
          },
          required: ["query"],
        },
      },
      {
        name: "youtube.search",
        description: "Tìm video YouTube theo query hoặc mood (wellness).",
        inputSchema: {
          type: "object",
          properties: {
            query: { type: "string" },
            mood: { type: "string" },
            maxResults: { type: "number" },
          },
          required: [],
        },
      },
      {
        name: "youtube.video",
        description: "Lấy metadata chi tiết của một video YouTube theo videoId.",
        inputSchema: {
          type: "object",
          properties: {
            videoId: { type: "string" },
          },
          required: ["videoId"],
        },
      },
      {
        name: "youtube.recommend_music",
        description: "Gợi ý danh sách nhạc/âm thanh YouTube theo mood để dùng cho trị liệu âm nhạc.",
        inputSchema: {
          type: "object",
          properties: {
            mood: { type: "string" },
            maxResults: { type: "number" },
          },
          required: [],
        },
      },
      {
        name: "graph.status",
        description: "Kiểm tra trạng thái kết nối Graph (Neo4j/Memgraph) ở CPU server.",
        inputSchema: {
          type: "object",
          properties: {},
          required: [],
        },
      },
      {
        name: "graph.evidence",
        description:
          "Truy vấn evidence subgraph theo query (tìm entity theo tên và lấy edges lân cận kèm provenance).",
        inputSchema: {
          type: "object",
          properties: {
            query: { type: "string" },
            limit: { type: "number" },
            entity_limit: { type: "number" },
            rel_types: { type: "array", items: { type: "string" } },
          },
          required: ["query"],
        },
      },
    ],
    metadata: { protocol: "mcp-lite", ts: new Date().toISOString() },
  })
}

