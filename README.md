# 🧠 Smart Document Search (RAG App with OpenAI + Pinecone)

This project lets you **upload documents (PDF, TXT, or HTML)**, automatically **index them in Pinecone** using **OpenAI embeddings**, and then **ask natural language questions** about them — all powered by **Retrieval-Augmented Generation (RAG)**.

---

## 🚀 Features

- 📄 Upload PDF, TXT, or HTML documents  
- ✂️ Automatically chunk and process large files  
- 🧠 Convert text into **OpenAI embeddings** (`text-embedding-3-small`)  
- 🗄️ Store and query embeddings using **Pinecone Vector DB**  
- 🔍 Ask AI-powered questions across all your documents  
- 🗑️ Manage (list or delete) uploaded files easily  
- ⚙️ RESTful Express backend, ready for any frontend integration  

---

## 🛠️ Tech Stack

| Component | Technology |
|------------|-------------|
| **Backend** | Node.js + Express |
| **AI Models** | OpenAI `text-embedding-3-small`, `gpt-4o-mini` |
| **Vector Database** | Pinecone |
| **File Handling** | express-fileupload, pdf-parse |
| **Language** | JavaScript (ES Modules) |
| **Environment** | dotenv |

---

## 📂 Folder Structure

```
.
├── server.js             # Main backend file
├── .env                  # Environment variables
├── uploads/              # Uploaded files (auto-created)
├── package.json
└── README.md
```

---

## ⚙️ Setup Instructions

### 1️⃣ Clone the Repository
```bash
git clone https://github.com/yourusername/smart-document-search.git
cd smart-document-search
```

### 2️⃣ Install Dependencies
```bash
npm install
```

### 3️⃣ Create a `.env` File
In your project root, create a file named `.env` with:
```
OPENAI_API_KEY=your_openai_api_key_here
PINECONE_API_KEY=your_pinecone_api_key_here
```
> 🧩 Get your keys from:
> - OpenAI: [https://platform.openai.com/api-keys](https://platform.openai.com/api-keys)  
> - Pinecone: [https://app.pinecone.io](https://app.pinecone.io)

---

### 4️⃣ Create Your Pinecone Index

Run this **once** to create your index:
```bash
node createIndex.mjs
```

Use:
- **Index name:** `notes-search`  
- **Dimension:** `1536` (for `text-embedding-3-small`)  
- **Metric:** `cosine`

Wait 1–2 minutes for the index to show “Ready” in Pinecone.

---

### 5️⃣ Start the Server
```bash
node server.js
```

✅ Your backend will start on:
```
http://localhost:5000
```

---

## 🔗 API Endpoints

| Endpoint | Method | Description |
|-----------|--------|-------------|
| `/upload` | **POST** | Upload a document. Extracts text, chunks it, generates embeddings, and stores in Pinecone. |
| `/search` | **POST** | Search documents with a question → Retrieves context and generates answer. |
| `/files` | **GET** | List uploaded files. |
| `/delete/:filename` | **DELETE** | Delete a file + its namespace. |
| `/check-index` | **GET** | Check Pinecone index stats (debugging). |

---

## 🧠 Example Usage

### 📝 Upload
**POST** `/upload`
```
form-data:
  file: example.pdf
```

**Response:**
```json
{
  "success": true,
  "message": "example.pdf uploaded & indexed successfully.",
  "chunks": 42
}
```

---

### 🔍 Search
**POST** `/search`
```json
{
  "query": "What are the main causes of air pollution?"
}
```

**Response:**
```json
{
  "answer": "Air pollution is mainly caused by emissions from vehicles and industries.",
  "sources": [
    {
      "file": "pollution.pdf",
      "text": "Air pollution is caused by burning fossil fuels..."
    }
  ]
}
```

---

## 🧩 How It Works (RAG Flow)

```
1. File Upload → Text Extraction → Chunking
2. Generate Embeddings (OpenAI)
3. Store Embeddings + Metadata in Pinecone
4. User Query → Query Embedding → Pinecone Similarity Search
5. Retrieve Context → GPT Model → Final Answer
```

---

## 🧰 Troubleshooting

| Issue | Cause | Fix |
|--------|--------|-----|
| ❌ `Cannot read properties of undefined (reading 'text')` | Some Pinecone vectors missing metadata | Use optional chaining `m.metadata?.text` or re-upload |
| ❌ No records in Pinecone | Index not created or wrong API key | Verify `.env`, create index, and reconnect |
| ⚠️ Slow upload for large files | Embeddings done sequentially | Implement batch embedding or parallel upload |

---

## 🧹 Maintenance

Clear a namespace:
```js
await index.namespace("yourfile.txt").deleteAll();
```

List namespaces:
```js
const ns = await index.listNamespaces();
console.log(ns.namespaces);
```

---

## 📸 Example Console Output
```
📂 Uploaded: document.txt
🔹 Embedding for chunk 0: [0.001, -0.002, 0.123, ...]
🍏 Vectors upserted successfully!
🔍 Query results: Found 3 matching chunks.
✅ GPT Answer generated successfully.
```

---

## 💡 Future Enhancements
- ⏱️ Batch embeddings for faster uploads  
- 🔍 Add metadata-based filtering  
- 🌐 Build a React/Next.js UI for frontend search  
- 💾 Add MongoDB/SQLite for tracking file metadata  

---

## 🧑‍💻 Author
**G S Subash Chandra Bose**  
💬 *“Building AI that actually understands your data.”*  
📧 [your-email@example.com]  

---

## 🪪 License
This project is licensed under the **MIT License** — free to use and modify.

---

⭐ **If you like this project, consider giving it a star on GitHub!**
