# KPMG India Report Intelligence Platform

A full-stack autonomous report generation system that produces publication-ready KPMG India thought leadership reports with:
- Real-time web research via Gemini 2.0 Flash + Google Search grounding
- KPMG brand-compliant formatting (KPMG Blue #00338D, Arial font)
- Downloadable and editable Word (.docx) output
- AI-powered chatbot for report editing (Gemini-powered)
- Original, plagiarism-resistant language generation
- Current-year cited references

---

## Quick Start

### 1. Install dependencies
```bash
npm install
```

### 2. Start the server
```bash
npm start
```

### 3. Open in browser
```
http://localhost:3000
```

### 4. Get a Gemini API Key
- Visit: https://aistudio.google.com
- Create a free API key
- Paste it into the "Gemini API Key" field in the UI

---

## Project Structure

```
kpmg-report-gen/
├── server.js               # Express backend (3 API routes)
├── package.json
├── src/
│   ├── reportGenerator.js  # Gemini + Google Search research engine
│   ├── docxGenerator.js    # KPMG-branded Word document builder
│   └── chatBot.js          # Report editing chatbot (Gemini)
└── public/
    └── index.html          # Full frontend SPA
```

---

## Features

### Report Generation
- Uses Gemini 2.0 Flash with Google Search grounding for live web research
- All statistics and data from the current year
- 8–12 cited references from credible sources (government reports, KPMG, industry bodies)
- Language specifically engineered to vary sentence structure and avoid AI-detection patterns
- British English spelling throughout (KPMG India standard)

### KPMG Brand Compliance
- **Primary blue**: #00338D
- **Secondary blue**: #005EB8  
- **Cobalt accent**: #0091DA
- **Font**: Arial throughout (KPMG brand standard)
- Cover page, headers/footers, stat boxes, section dividers all match KPMG format
- Page numbering, copyright disclaimer, "KPMG. Make the Difference." tagline

### Report Structure
Default sections (all configurable):
1. Executive Summary (with bold opening, 2–3 headline stats)
2. Industry Overview & Current Landscape
3. Key Trends and Developments
4. Strategic Implications
5. Opportunities and Challenges
6. Policy and Regulatory Environment
7. Recommendations
8. References (8–12 cited sources)

Each section includes:
- 350–450 words of analytical content
- 2–3 subsections (150–200 words each)
- 2–3 key statistics in visual stat cards

### Word Document Output
- Full KPMG visual branding in .docx format
- Editable in Microsoft Word, LibreOffice, Google Docs
- Proper heading hierarchy for navigation
- Numbered references list
- Header + footer on every page
- Cover page with KPMG branding elements

### AI Chatbot Editor
- Powered by Gemini 2.0 Flash
- Also uses Google Search for researching edits
- Can: expand sections, add stats, rewrite content, change tone
- When changes are approved, report preview updates live
- Quick suggestion chips for common edits

### Inline Editing
- Toggle "Edit Mode" to directly edit any text in the browser
- Changes sync to report data for correct DOCX download

---

## API Routes

| Route | Method | Purpose |
|-------|--------|---------|
| `/api/generate-report` | POST | SSE stream: generates full report via Gemini |
| `/api/download-docx` | POST | Returns KPMG-branded .docx file |
| `/api/chat` | POST | Chatbot for report editing |

### Request examples

**Generate report:**
```json
POST /api/generate-report
{
  "topic": "Digital Banking Transformation in India",
  "sections": ["Executive Summary", "Industry Overview", "References"],
  "geminiKey": "AIza..."
}
```

**Download DOCX:**
```json
POST /api/download-docx
{
  "reportData": { ...full report JSON... }
}
```

**Chat edit:**
```json
POST /api/chat
{
  "message": "Add more statistics to the Executive Summary",
  "reportData": { ...report JSON... },
  "history": [...previous messages...],
  "geminiKey": "AIza..."
}
```

---

## Deployment Options

### Local (development)
```bash
npm start
# Runs on http://localhost:3000
```

### Production (e.g. Render, Railway, Fly.io)
```bash
# Set PORT environment variable if needed
PORT=8080 npm start
```

### Docker
```dockerfile
FROM node:20-slim
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
EXPOSE 3000
CMD ["node", "server.js"]
```

---

## Security Notes

- API keys are **never stored** on the server — passed per-request only
- Keys transmitted only over HTTPS in production
- Consider adding rate limiting (e.g. `express-rate-limit`) for production use
- Gemini API calls are made server-side (key not exposed in browser network tab)

---

## Customisation

### Changing report sections
Edit `sectionPlan` defaults in `src/reportGenerator.js`

### Adjusting KPMG colours
Edit colour constants at the top of `src/docxGenerator.js`

### Modifying the prompt style
Edit `systemPrompt` and `userPrompt` in `src/reportGenerator.js`

### Adding new quick topics
Edit the chip list in `public/index.html` under `id="topicChips"`

---

## Requirements
- Node.js 18+
- Gemini API key (free tier works for testing)
- Internet connection (for Google Search grounding)
