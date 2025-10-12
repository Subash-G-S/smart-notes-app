import { useState, useEffect } from "react";
import axios from "axios";
import "./App.css";

const API_URL = "http://localhost:5000";

export default function App() {
  const [file, setFile] = useState(null);
  const [uploadMsg, setUploadMsg] = useState("");
  const [query, setQuery] = useState("");
  const [result, setResult] = useState(null);
  const [tab, setTab] = useState("upload");
  const [loading, setLoading] = useState(false);
  const [files, setFiles] = useState([]);

  // ✅ Fetch all uploaded files (for Manage tab)
  const fetchFiles = async () => {
    try {
      const res = await axios.get(`${API_URL}/files`);
      const enriched = res.data.map((name) => ({ name }));
      setFiles(enriched);
    } catch (err) {
      console.error(err);
      alert("❌ Failed to fetch files.");
    }
  };

  // 🔁 Auto-fetch when switching to Manage tab
  useEffect(() => {
    if (tab === "manage") fetchFiles();
  }, [tab]);

  // ✅ Upload file
  const uploadFile = async () => {
    if (!file) return alert("Please select a file");
    const formData = new FormData();
    formData.append("file", file);
    setLoading(true);
    setUploadMsg("");
    try {
      const res = await axios.post(`${API_URL}/upload`, formData);
      setUploadMsg(`✅ ${res.data.message}`);
      setFile(null);
      fetchFiles();
    } catch (err) {
      console.error(err);
      setUploadMsg("❌ Upload failed.");
    } finally {
      setLoading(false);
    }
  };

  // ✅ Search query (AI-powered)
  const searchDocs = async () => {
    if (!query.trim()) return;
    setLoading(true);
    setResult(null);
    try {
      const res = await axios.post(`${API_URL}/search`, { query });
      // Ensure result is valid JSON
      if (res.data && typeof res.data === "object") {
        setResult(res.data);
      } else {
        setResult({ error: "Unexpected response from server." });
      }
    } catch (err) {
      console.error(err);
      setResult({
        error: "❌ Search failed. Please check if your backend is running.",
      });
    } finally {
      setLoading(false);
    }
  };

  // ✅ Delete file
  const deleteFile = async (filename) => {
    if (!window.confirm(`Are you sure you want to delete "${filename}"?`)) return;
    setLoading(true);
    try {
      const res = await axios.delete(`${API_URL}/delete/${filename}`);
      alert(res.data.message);
      setFiles((prev) => prev.filter((f) => f.name !== filename));
    } catch (err) {
      console.error(err);
      alert("❌ Failed to delete file.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="app dark">
      <header className="header">
        <h1>📚 Smart Document Search</h1>
        <p className="subtitle">
          Ask questions from your PDFs, TXT, and HTML files — AI answers with context.
        </p>
        <nav>
          <button className={tab === "upload" ? "active" : ""} onClick={() => setTab("upload")}>
            ⬆️ Upload
          </button>
          <button className={tab === "search" ? "active" : ""} onClick={() => setTab("search")}>
            🔍 Search
          </button>
          <button className={tab === "manage" ? "active" : ""} onClick={() => setTab("manage")}>
            🗂️ Manage
          </button>
        </nav>
      </header>

      {/* 🔹 Upload Section */}
      {tab === "upload" && (
        <section className="card">
          <h2>Upload a Document</h2>
          <input type="file" onChange={(e) => setFile(e.target.files[0])} accept=".pdf,.txt,.html,.htm" />
          <button onClick={uploadFile} disabled={loading}>
            {loading ? "Processing..." : "Upload & Index"}
          </button>
          {uploadMsg && <p className="status">{uploadMsg}</p>}
        </section>
      )}

      {/* 🔹 Search Section */}
      {tab === "search" && (
        <section className="card">
          <h2>Search Your Documents</h2>
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Ask a question (e.g., What is a Red-Black Tree?)"
          />
          <button onClick={searchDocs} disabled={loading}>
            {loading ? "Searching..." : "Search"}
          </button>

          {/* ✅ AI Answer */}
          {result?.answer && (
            <div className="ai-answer">
              <h3>🧠 AI Answer</h3>
              <p>{result.answer}</p>
            </div>
          )}

          {/* ✅ References */}
          {Array.isArray(result?.sources) && result.sources.length > 0 && (
            <div className="sources">
              <h4>📎 References</h4>
              <ul>
                {result.sources.map((s, i) => (
                  <li key={i}>
                    <strong>{s.file}</strong> — lines {s.lineStart ?? "?"}–{s.lineEnd ?? "?"}
                    {s.text && (
                      <div className="snippet">“{s.text.slice(0, 200)}...”</div>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* ⚠️ Errors */}
          {result?.error && <p className="error">{result.error}</p>}

          {/* ℹ️ Empty State */}
          {!loading && !result?.answer && !result?.error && (
            <p className="hint">Try uploading and searching documents!</p>
          )}
        </section>
      )}

      {/* 🔹 Manage Section */}
      {tab === "manage" && (
        <section className="card">
          <h2>Manage Uploaded Files</h2>
          {loading && <p>Loading files...</p>}
          {!loading && files.length === 0 && <p>No files found.</p>}
          <ul className="file-list">
            {files.map((f, i) => (
              <li key={i}>
                <strong>{f.name}</strong>
                <button className="delete-btn" onClick={() => deleteFile(f.name)} disabled={loading}>
                  🗑️ Delete
                </button>
              </li>
            ))}
          </ul>
        </section>
      )}

      <footer className="footer">
        <p>Built with ❤️ using OpenAI + Pinecone — Subash</p>
      </footer>
    </div>
  );
}
