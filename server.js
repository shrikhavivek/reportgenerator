const express = require('express');
const cors = require('cors');
const path = require('path');
const { generateReport } = require('./src/reportGenerator');
const { generateDocx } = require('./src/docxGenerator');
const { chatWithBot } = require('./src/chatBot');

const app = express();
app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.static(path.join(__dirname, 'public')));

// Generate report content via web search + Gemini
app.post('/api/generate-report', async (req, res) => {
  try {
    const { topic, sections, geminiKey } = req.body;
    if (!topic) return res.status(400).json({ error: 'Topic is required' });
    if (!geminiKey) return res.status(400).json({ error: 'Gemini API key is required' });

    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');

    const sendUpdate = (data) => {
      res.write(`data: ${JSON.stringify(data)}\n\n`);
    };

    await generateReport({ topic, sections, geminiKey, sendUpdate });
    res.write('data: [DONE]\n\n');
    res.end();
  } catch (err) {
    console.error(err);
    res.write(`data: ${JSON.stringify({ error: err.message })}\n\n`);
    res.end();
  }
});

// Generate DOCX download
app.post('/api/download-docx', async (req, res) => {
  try {
    const { reportData } = req.body;
    if (!reportData) return res.status(400).json({ error: 'Report data is required' });

    const buffer = await generateDocx(reportData);
    const filename = `KPMG_Report_${reportData.topic.replace(/[^a-zA-Z0-9]/g, '_')}_${new Date().getFullYear()}.docx`;

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.send(buffer);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

// Chatbot endpoint for report editing
app.post('/api/chat', async (req, res) => {
  try {
    const { message, reportData, history, geminiKey } = req.body;
    if (!geminiKey) return res.status(400).json({ error: 'Gemini API key is required' });

    const result = await chatWithBot({ message, reportData, history, geminiKey });
    res.json(result);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`KPMG Report Generator running on http://localhost:${PORT}`));
