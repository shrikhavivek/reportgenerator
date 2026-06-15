// src/reportGenerator.js
async function generateReport({ topic, sections, groqKey, sendUpdate }) {
  const currentYear = new Date().getFullYear();
  const currentDate = new Date().toLocaleDateString('en-IN', { year: 'numeric', month: 'long' });

  const sectionPlan = sections && sections.length > 0 ? sections : [
    'Executive Summary',
    'Industry Overview & Current Landscape',
    'Key Trends and Developments',
    'Strategic Implications',
    'Opportunities and Challenges',
    'Recommendations',
    'References'
  ];

  // Remove References from main sections — we handle it separately
  const mainSections = sectionPlan.filter(s => !s.toLowerCase().includes('reference'));

  sendUpdate({ type: 'status', message: 'Initialising research engine...' });

  const systemPrompt = `You are a senior KPMG India research consultant producing thought leadership reports.

LANGUAGE STYLE:
- Authoritative, incisive, forward-looking language characteristic of KPMG India publications
- Third person, present tense for facts, future tense for projections
- British English spelling (organisation, recognise, behaviour, programme)
- Vary sentence lengths — mix short punchy sentences with longer analytical ones
- No clichés. Every paragraph must carry distinct analytical weight
- Do not start consecutive sentences with the same word
- Integrate specific statistics, percentages, and INR/USD values naturally

STRICT FORMAT RULES:
- Return ONLY a valid JSON object
- No markdown, no backticks, no code fences, no preamble, no explanation
- Every string field must be a plain string — NOT an object, NOT an array
- executiveSummary must be a single plain string of 150-200 words
- conclusion must be a single plain string of 150 words
- Each section content must be a single plain string (use \\n for paragraph breaks)
- Each subsection content must be a single plain string`;

  const userPrompt = `Produce a KPMG India thought leadership report on: "${topic}"
Date: ${currentDate}

Return this EXACT JSON structure (all values must be plain strings, not objects or arrays):

{
  "topic": "${topic}",
  "subtitle": "a compelling specific subtitle tagline here",
  "date": "${currentDate}",
  "executiveSummary": "Single plain string 150-200 words. First sentence bold-worthy. Include 2-3 specific statistics with INR values or percentages from ${currentYear}.",
  "sections": [
${mainSections.map((s, i) => `    {
      "number": "${String(i + 1).padStart(2, '0')}",
      "title": "${s}",
      "content": "Single plain string 350-450 words about ${s} in context of ${topic}. Use \\\\n between paragraphs. Include India-specific data from ${currentYear}.",
      "subsections": [
        {
          "title": "First subsection title related to ${s}",
          "content": "Single plain string 150-200 words for this subsection."
        },
        {
          "title": "Second subsection title related to ${s}",
          "content": "Single plain string 150-200 words for this subsection."
        }
      ],
      "keyStats": [
        { "value": "specific number or %", "label": "what this stat measures" },
        { "value": "specific INR or USD value", "label": "what this stat measures" },
        { "value": "specific number or %", "label": "what this stat measures" }
      ]
    }`).join(',\n')}
  ],
  "conclusion": "Single plain string 150 words concluding the report on ${topic}.",
  "references": [
    { "index": 1, "citation": "Full citation text for a real ${currentYear} source about ${topic}", "source": "Publisher name e.g. NITI Aayog / RBI / KPMG India / McKinsey", "year": "${currentYear}", "url": "https://realistic-url.gov.in/report" },
    { "index": 2, "citation": "Full citation text for another real ${currentYear} source", "source": "Publisher name", "year": "${currentYear}", "url": "https://realistic-url.org/report" },
    { "index": 3, "citation": "Full citation text for another real ${currentYear} source", "source": "Publisher name", "year": "${currentYear}", "url": "https://realistic-url.com/report" },
    { "index": 4, "citation": "Full citation text for another real ${currentYear} source", "source": "Publisher name", "year": "${currentYear}", "url": "https://realistic-url.com/report" },
    { "index": 5, "citation": "Full citation text for another real ${currentYear} source", "source": "Publisher name", "year": "${currentYear}", "url": "https://realistic-url.com/report" },
    { "index": 6, "citation": "Full citation text for another real ${currentYear} source", "source": "Publisher name", "year": "${currentYear}", "url": "https://realistic-url.com/report" },
    { "index": 7, "citation": "Full citation text for another real ${currentYear} source", "source": "Publisher name", "year": "${currentYear}", "url": "https://realistic-url.com/report" },
    { "index": 8, "citation": "Full citation text for another real ${currentYear} source", "source": "Publisher name", "year": "${currentYear}", "url": "https://realistic-url.com/report" }
  ]
}

CRITICAL: Return ONLY the JSON above. Every value must be a plain string. No nested objects inside string fields. No arrays where strings are expected.`;

  sendUpdate({ type: 'status', message: 'Connecting to Groq LLaMA 3.3...' });

  const groqResponse = await fetch('https://api.groq.com/openai/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${groqKey}`
    },
    body: JSON.stringify({
      model: 'llama-3.3-70b-versatile',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt }
      ],
      temperature: 0.75,
      max_tokens: 8000,
      stream: false,
      response_format: { type: 'json_object' }
    })
  });

  if (!groqResponse.ok) {
    const errText = await groqResponse.text();
    throw new Error(`Groq API error: ${groqResponse.status} - ${errText}`);
  }

  const groqData = await groqResponse.json();
  sendUpdate({ type: 'status', message: 'Processing research findings...' });

  let rawText = groqData.choices?.[0]?.message?.content || '';
  if (!rawText) throw new Error('No content received from Groq');

  sendUpdate({ type: 'status', message: 'Structuring report data...' });

  let reportData;
  try {
    let jsonStr = rawText.trim();
    jsonStr = jsonStr.replace(/^```json\s*/i, '').replace(/^```\s*/i, '').replace(/```\s*$/i, '');
    const jsonStart = jsonStr.indexOf('{');
    const jsonEnd = jsonStr.lastIndexOf('}');
    if (jsonStart !== -1 && jsonEnd !== -1) jsonStr = jsonStr.substring(jsonStart, jsonEnd + 1);
    reportData = JSON.parse(jsonStr);
  } catch (parseErr) {
    sendUpdate({ type: 'status', message: 'Refining report structure...' });
    const fixResponse = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${groqKey}` },
      body: JSON.stringify({
        model: 'llama-3.3-70b-versatile',
        messages: [{ role: 'user', content: `Fix this JSON and return ONLY valid JSON, nothing else:\n${rawText}` }],
        temperature: 0.1,
        max_tokens: 8000,
        response_format: { type: 'json_object' }
      })
    });
    const fixData = await fixResponse.json();
    let fixedText = fixData.choices?.[0]?.message?.content || '';
    fixedText = fixedText.replace(/^```json\s*/i, '').replace(/```\s*$/i, '').trim();
    reportData = JSON.parse(fixedText);
  }

  // Sanitise all string fields — convert any object/array to string
  function toStr(val) {
    if (val === null || val === undefined) return '';
    if (typeof val === 'string') return val;
    if (Array.isArray(val)) return val.map(toStr).join(' ');
    if (typeof val === 'object') return Object.values(val).map(toStr).join(' ');
    return String(val);
  }

  reportData.generatedAt = new Date().toISOString();
  reportData.date = reportData.date || currentDate;
  reportData.topic = reportData.topic || topic;
  reportData.executiveSummary = toStr(reportData.executiveSummary);
  reportData.conclusion = toStr(reportData.conclusion);
  reportData.subtitle = toStr(reportData.subtitle);

  // Sanitise sections
  if (Array.isArray(reportData.sections)) {
    reportData.sections = reportData.sections.map((sec, i) => ({
      number: toStr(sec.number) || String(i + 1).padStart(2, '0'),
      title: toStr(sec.title),
      content: toStr(sec.content),
      keyStats: Array.isArray(sec.keyStats) ? sec.keyStats.map(s => ({
        value: toStr(s.value),
        label: toStr(s.label)
      })) : [],
      subsections: Array.isArray(sec.subsections) ? sec.subsections.map(sub => ({
        title: toStr(sub.title),
        content: toStr(sub.content)
      })) : []
    }));
  }

  // Add References section if not already present
  const hasRefs = sectionPlan.some(s => s.toLowerCase().includes('reference'));
  if (hasRefs && Array.isArray(reportData.references) && reportData.references.length > 0) {
    reportData.sections.push({
      number: String(reportData.sections.length + 1).padStart(2, '0'),
      title: 'References',
      content: '',
      keyStats: [],
      subsections: []
    });
  }

  sendUpdate({ type: 'complete', data: reportData });
  return reportData;
}

module.exports = { generateReport };
