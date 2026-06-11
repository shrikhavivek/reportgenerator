// src/reportGenerator.js
async function generateReport({ topic, sections, geminiKey, sendUpdate }) {
  const currentYear = new Date().getFullYear();
  const currentDate = new Date().toLocaleDateString('en-IN', { year: 'numeric', month: 'long' });

  const sectionPlan = sections && sections.length > 0 ? sections : [
    'Executive Summary',
    'Industry Overview & Current Landscape',
    'Key Trends and Developments',
    'Strategic Implications',
    'Opportunities and Challenges',
    'Recommendations',
    'Conclusion',
    'References'
  ];

  sendUpdate({ type: 'status', message: 'Initialising research engine...' });

  // Build a strong KPMG-style system prompt
  const systemPrompt = `You are a senior KPMG India research consultant with deep expertise in producing thought leadership reports. Your writing must:

LANGUAGE STYLE:
- Use authoritative, incisive, forward-looking language characteristic of KPMG India publications
- Write in third person, present tense for current facts and future tense for projections
- Use precise, data-anchored sentences. Every quantitative claim must have a plausible source attribution
- Avoid passive voice where possible; prefer active, declarative statements
- Use British English spelling (e.g., "organisation" not "organization", "recognise" not "recognize")
- Do not use clichés. Each paragraph must carry distinct analytical weight
- Vary sentence structure to avoid detection as AI-generated content
- Do not start consecutive sentences with the same word
- Use industry-specific terminology naturally without over-explaining
- Integrate statistics, percentages, and year-specific data points organically
- Each section must flow into the next with logical transitions

CONTENT REQUIREMENTS:
- All data and statistics must be from ${currentYear} or late ${currentYear - 1}
- Cite specific organisations, government bodies, industry reports where relevant
- Reference India-specific context wherever applicable alongside global benchmarks
- Include specific named examples, not generic placeholders

FORMAT: Return ONLY valid JSON matching this exact schema:
{
  "topic": string,
  "subtitle": string,
  "date": string,
  "executiveSummary": string (150-200 words, punchy, data-rich),
  "sections": [
    {
      "number": "01",
      "title": string,
      "content": string (350-450 words per section),
      "subsections": [
        {
          "title": string,
          "content": string (150-200 words)
        }
      ],
      "keyStats": [
        { "value": string, "label": string }
      ]
    }
  ],
  "conclusion": string (150-180 words),
  "references": [
    {
      "index": number,
      "citation": string,
      "source": string,
      "year": string,
      "url": string
    }
  ]
}`;

  const userPrompt = `Produce a comprehensive KPMG India thought leadership report on: "${topic}"

Current date for context: ${currentDate}

Required sections (in this order):
${sectionPlan.map((s, i) => `${String(i + 1).padStart(2, '0')}. ${s}`).join('\n')}

CRITICAL REQUIREMENTS:
1. Executive Summary: 150-200 words, bold opening sentence, 2-3 headline statistics
2. Each section: 350-450 words with 2-3 subsections (150-200 words each)
3. Include 2-3 key statistics per main section (specific percentages, rupee values, or counts from ${currentYear})
4. Final section must be REFERENCES with 8-12 properly cited sources (government reports, KPMG publications, RBI, NITI Aayog, industry bodies, credible news outlets — all from ${currentYear} or late ${currentYear - 1})
5. Language must read as professionally produced human analysis — use varied sentence lengths, rhetorical questions sparingly, and domain-specific vocabulary
6. Do not repeat phrases across sections. Each section must introduce new concepts and angles
7. Subtitle should be a compelling, specific tagline (not generic)

Return ONLY the JSON object. No markdown code fences, no preamble.`;

  sendUpdate({ type: 'status', message: 'Connecting to Gemini with web grounding...' });

  // Call Gemini 2.0 Flash with Google Search grounding
  const geminiResponse = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${geminiKey}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [
          {
            role: 'user',
            parts: [
              { text: systemPrompt + '\n\n' + userPrompt }
            ]
          }
        ],
        tools: [{ googleSearch: {} }],
        generationConfig: {
          temperature: 0.85,
          topK: 40,
          topP: 0.95,
          maxOutputTokens: 8192,
          responseMimeType: 'text/plain'
        }
      })
    }
  );

  if (!geminiResponse.ok) {
    const errText = await geminiResponse.text();
    throw new Error(`Gemini API error: ${geminiResponse.status} - ${errText}`);
  }

  const geminiData = await geminiResponse.json();

  sendUpdate({ type: 'status', message: 'Processing research findings...' });

  // Extract text from Gemini response
  let rawText = '';
  if (geminiData.candidates && geminiData.candidates[0]) {
    const candidate = geminiData.candidates[0];
    if (candidate.content && candidate.content.parts) {
      rawText = candidate.content.parts
        .filter(p => p.text)
        .map(p => p.text)
        .join('');
    }
  }

  if (!rawText) throw new Error('No content received from Gemini');

  // Extract grounding sources if available
  let groundingSources = [];
  if (geminiData.candidates?.[0]?.groundingMetadata?.searchEntryPoint) {
    groundingSources = geminiData.candidates[0].groundingMetadata.groundingChunks || [];
  }

  sendUpdate({ type: 'status', message: 'Structuring report data...' });

  // Parse JSON from response
  let reportData;
  try {
    // Clean up common JSON issues
    let jsonStr = rawText.trim();
    jsonStr = jsonStr.replace(/^```json\s*/i, '').replace(/^```\s*/i, '').replace(/```\s*$/i, '');
    // Find JSON boundaries
    const jsonStart = jsonStr.indexOf('{');
    const jsonEnd = jsonStr.lastIndexOf('}');
    if (jsonStart !== -1 && jsonEnd !== -1) {
      jsonStr = jsonStr.substring(jsonStart, jsonEnd + 1);
    }
    reportData = JSON.parse(jsonStr);
  } catch (parseErr) {
    // Fallback: try second Gemini call to fix JSON
    sendUpdate({ type: 'status', message: 'Refining report structure...' });
    const fixResponse = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${geminiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{
            role: 'user',
            parts: [{ text: `Fix this JSON and return ONLY valid JSON, nothing else:\n${rawText}` }]
          }],
          generationConfig: { temperature: 0.1, maxOutputTokens: 8192 }
        })
      }
    );
    const fixData = await fixResponse.json();
    let fixedText = fixData.candidates?.[0]?.content?.parts?.[0]?.text || '';
    fixedText = fixedText.replace(/^```json\s*/i, '').replace(/```\s*$/i, '').trim();
    reportData = JSON.parse(fixedText);
  }

  // Enrich with metadata
  reportData.generatedAt = new Date().toISOString();
  reportData.groundingSources = groundingSources;
  if (!reportData.date) reportData.date = currentDate;
  if (!reportData.topic) reportData.topic = topic;

  sendUpdate({ type: 'complete', data: reportData });
  return reportData;
}

module.exports = { generateReport };
