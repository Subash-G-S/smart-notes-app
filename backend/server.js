import express from "express";
import bodyParser from "body-parser";
import cors from "cors";
import fileUpload from "express-fileupload";
import fs from "fs";
import path from "path";
import dotenv from "dotenv";
import { Pinecone } from "@pinecone-database/pinecone";
import OpenAI from "openai";
import { createRequire } from "module";

const require = createRequire(import.meta.url);
const pdfModule = require("pdf-parse");
const pdf = pdfModule.default || pdfModule;

dotenv.config();
console.log("🔑 Pinecone Key:", process.env.PINECONE_API_KEY ? "Loaded ✅" : "❌ Not found");

const app = express();
app.use(cors());
app.use(bodyParser.json());
app.use(fileUpload());
app.use("/uploads", express.static("uploads"));

const uploadDir = path.join(process.cwd(), "uploads");
if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir);

const pc = new Pinecone({ apiKey: process.env.PINECONE_API_KEY });
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
const index = pc.index("notes-search");

// 🔹 Helper: Split into readable chunks
function chunkText(text, chunkSize = 400) {
  const sentences = text.split(/(?<=[.?!])\s+/);
  const chunks = [];
  let current = "";

  for (let sentence of sentences) {
    if ((current + sentence).length > chunkSize) {
      chunks.push(current.trim());
      current = sentence + " ";
    } else {
      current += sentence + " ";
    }
  }
  if (current.trim()) chunks.push(current.trim());
  return chunks;
}

// 🔹 Upload & index file
app.post("/upload", async (req, res) => {
  try {
    if (!req.files?.file) return res.status(400).send("No file uploaded.");

    const file = req.files.file;
    const filePath = path.join(uploadDir, file.name);
    await file.mv(filePath);
    console.log(`📂 Uploaded: ${file.name}`);

    const ext = path.extname(file.name).toLowerCase();
    let text = "";

    if (ext === ".pdf") {
      const dataBuffer = fs.readFileSync(filePath);
      const pdfData = await pdf(dataBuffer);
      text = pdfData.text || "";
    } else if (ext === ".txt") {
      text = fs.readFileSync(filePath, "utf-8");
    } else if (ext === ".html" || ext === ".htm") {
      const raw = fs.readFileSync(filePath, "utf-8");
      text = raw.replace(/<[^>]+>/g, " ");
    } else {
      return res.status(400).json({ error: "Only PDF, TXT, and HTML supported." });
    }

    if (!text.trim()) {
      return res.status(400).json({ error: "No readable text found in file." });
    }

    const chunks = chunkText(text);
    const namespace = index.namespace(file.name);

    for (let i = 0; i < chunks.length; i++) {
      const chunk = chunks[i];
      const emb = await openai.embeddings.create({
        model: "text-embedding-3-small",
        input: chunk,
      });

      // ✅ Assign line numbers consistently
      const lineStart = i * 15 + 1;
      const lineEnd = (i + 1) * 15;
      console.log(`🔹 Embedding for chunk ${i}:`, emb.data[0].embedding.slice(0, 10), "...");
//------------------------------------UPSERT-------------------------------------------------------
      await namespace.upsert([
        {
          id: `${file.name}-${i}`,
          values: emb.data[0].embedding,
          metadata: {
            file: file.name,
            chunkIndex: i,
            lineStart,
            lineEnd,
            text: chunk,
          },
        },
      ]);
    }

    res.json({
      success: true,
      message: `${file.name} uploaded & indexed successfully.`,
      chunks: chunks.length,
    });
  } catch (err) {
    console.error("❌ Upload error:", err);
    res.status(500).json({ error: err.message });
  }
});

// 🔹 Search across all namespaces
app.post("/search", async (req, res) => {
  try {
    const { query } = req.body;
    if (!query?.trim()) return res.status(400).json({ error: "Query required." });

    const q_emb = await openai.embeddings.create({
      model: "text-embedding-3-small",
      input: query,
    });

    // Check all uploaded files
    const namespaces = await index.listNamespaces();
    let allMatches = [];

    for (const ns of namespaces.namespaces || []) {
      const result = await index.namespace(ns.name).query({
        vector: q_emb.data[0].embedding,
        topK: 3,
        includeMetadata: true,
      });

      if (result.matches?.length) {
        allMatches.push(
          ...result.matches.map((m) => ({
            file: ns.name,
            text: m.metadata?.text || "",
            lineStart: m.metadata?.lineStart ?? null,
            lineEnd: m.metadata?.lineEnd ?? null,
          }))
        );
      }
    }

    if (allMatches.length === 0)
      return res.json({
        answer: "I could not find that information in your documents.",
        sources: [],
      });

    const context = allMatches.map((m) => m.text).join("\n\n");

    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content:
            "You are a helpful assistant that answers based only on the provided document text. Be concise and accurate.",
        },
        { role: "user", content: `Question: ${query}\n\nContext:\n${context}` },
      ],
      temperature: 0.03,
    });

    const answer = completion.choices[0].message.content.trim();

    res.json({
      answer,
      sources: allMatches.map((m) => ({
        file: m.file,
        lineStart: m.lineStart,
        lineEnd: m.lineEnd,
        text: m.text,
      })),
    });
  } catch (err) {
    console.error("❌ Search error:", err);
    res.status(500).json({ error: err.message });
  }
});

// 🔹 List uploaded files
app.get("/files", (req, res) => {
  try {
    const files = fs.readdirSync(uploadDir);
    res.json(files);
  } catch (err) {
    console.error("Error listing files:", err);
    res.status(500).json({ error: "Failed to list files." });
  }
});

// 🔹 Delete specific file
app.delete("/delete/:filename", async (req, res) => {
  try {
    const filename = req.params.filename;
    const namespace = index.namespace(filename);

    await namespace.deleteAll();

    const filePath = path.join(uploadDir, filename);
    if (fs.existsSync(filePath)) fs.unlinkSync(filePath);

    res.json({ message: `${filename} deleted successfully.` });
  } catch (err) {
    console.error("❌ Delete error:", err);
    res.status(500).json({ error: err.message });
  }
});

app.listen(5000, () =>
  console.log("🚀 Smart Document Search API running on http://localhost:5000")
);
