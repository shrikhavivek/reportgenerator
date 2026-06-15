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
    'Conclusion',
    'References'
  ];

  sendUpdate({ type: 'status', message: 'Initialising research engine...' });

  const systemPrompt = `You are a senior KPMG India research consultant producing thought leadership reports. Your writing must:

LANGUAGE STYLE:
- Use authoritative, incisive, forward-looking language characteristic of KPMG India publications
- Write in third person, present tense for current facts and future tense for projections
- Use precise, data-anchored sentences with specific statistics and year references
- Avoid passive voice; prefer active declarative statements
- Use British English spelling (organisation, recognise, behaviour, etc.)
- Do not use clichés. Each paragraph must carry distinct analytical weight
- Vary sentence structure — mix short punchy sentences with longer analytical ones
- Do not start consecutive sentences with the same word
- Use industry-specific terminology naturally
- Integrate statistics, percentages, and year-specific data points organically

CONTENT REQUIREMENTS:
- All data and statistics must be from ${currentYear} or late ${currentYear - 1}
- Cite specific organisations, government bodies, industry reports where relevant
- Reference India-specific context alongside global benchmarks
- Include specific named examples, not generic placeholders

FORMAT: Return ONLY valid JSON matching this exact schema (no markdown, no code fences):
{
  "topic": string,
  "subtitle": string,
  "date": string,
  "executiveSummary": string,
  "sections": [
    {
      "number": "01",
      "title": string,
      "content": string,
      "subsections": [
        { "title": string, "content": string }
      ],
      "keyStats": [
        { "value": string, "label": string }
      ]
    }
  ],
  "conclusion": string,
  "references": [
    { "index": number, "citation": string, "source": string, "year": string, "url": string }
  ]
}`;

  const userPrompt = `Produce a comprehensive KPMG India thought leadership report on: "${topic}"

Current date: ${currentDate}

Required sections (in this order):
${sectionPlan.map((s, i) => `${String(i + 1).padStart(2, '0')}. ${s}`).join('\n')}

CRITICAL REQUIREMENTS:
1. Executive Summary: 150-200 words, bold opening sentence, 2-3 headline statistics
2. Each section: 350-450 words with 2-3 subsections (150-200 words each)
3. Include 2-3 key statistics per main section (specific percentages, rupee/dollar values, or counts from ${currentYear})
4. Final section must be REFERENCES with 8-12 properly cited sources from credible bodies (government reports, KPMG publications, RBI, NITI Aayog, industry associations — all from ${currentYear} or late ${currentYear - 1})
5. Language must read as professionally produced human analysis — varied sentence lengths, domain-specific vocabulary
6. Do not repeat phrases across sections
7. Subtitle should be a compelling, specific tagline

Return ONLY the JSON object. No markdown, no code fences, no preamble.`;

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
      temperature: 0.8,
      max_tokens: 8000,
      stream: false
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
    if (jsonStart !== -1 && jsonEnd !== -1) {
      jsonStr = jsonStr.substring(jsonStart, jsonEnd + 1);
    }
    reportData = JSON.parse(jsonStr);
  } catch (parseErr) {
    // Retry with stricter prompt
    sendUpdate({ type: 'status', message: 'Refining report structure...' });
    const fixResponse = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${groqKey}`
      },
      body: JSON.stringify({
        model: 'llama-3.3-70b-versatile',
        messages: [
          { role: 'user', content: `Fix this JSON and return ONLY valid JSON, nothing else, no markdown:\n${rawText}` }
        ],
        temperature: 0.1,
        max_tokens: 8000
      })
    });
    const fixData = await fixResponse.json();
    let fixedText = fixData.choices?.[0]?.message?.content || '';
    fixedText = fixedText.replace(/^```json\s*/i, '').replace(/```\s*$/i, '').trim();
    reportData = JSON.parse(fixedText);
  }

  reportData.generatedAt = new Date().toISOString();
  if (typeof reportData.executiveSummary !== 'string') reportData.executiveSummary = Array.isArray(reportData.executiveSummary) ? reportData.executiveSummary.join(' ') : String(reportData.executiveSummary || '');
  if (typeof reportData.conclusion !== 'string') reportData.conclusion = Array.isArray(reportData.conclusion) ? reportData.conclusion.join(' ') : String(reportData.conclusion || '');
  if (!reportData.date) reportData.date = currentDate;
  if (!reportData.topic) reportData.topic = topic;

  sendUpdate({ type: 'complete', data: reportData });
  return reportData;
}

module.exports = { generateReport };
