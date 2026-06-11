// src/chatBot.js
async function chatWithBot({ message, reportData, history, geminiKey }) {
  const systemContext = reportData
    ? `You are KPMG India's report editing assistant. You have access to the following report:

TOPIC: ${reportData.topic}
SUBTITLE: ${reportData.subtitle || ''}

CURRENT REPORT STRUCTURE:
${JSON.stringify(reportData, null, 2).substring(0, 6000)}

Your role is to help the user make precise edits to this report. When the user requests changes, you must:
1. Identify exactly which section/subsection to modify
2. Apply the change maintaining KPMG's authoritative, data-driven voice
3. Return the COMPLETE updated report JSON alongside your explanation

If returning an updated report, wrap it in: <UPDATED_REPORT>...</UPDATED_REPORT>
Always explain what changes were made before the JSON block.
Maintain British English spelling and KPMG professional tone throughout.`
    : `You are a KPMG India report generation assistant. Help users define their report topic, scope, and requirements.`;

  // Build conversation history for Gemini
  const conversationHistory = [];
  if (history && history.length > 0) {
    history.forEach(msg => {
      conversationHistory.push({
        role: msg.role === 'assistant' ? 'model' : 'user',
        parts: [{ text: msg.content }]
      });
    });
  }

  conversationHistory.push({
    role: 'user',
    parts: [{ text: message }]
  });

  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${geminiKey}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        system_instruction: { parts: [{ text: systemContext }] },
        contents: conversationHistory,
        tools: [{ googleSearch: {} }],
        generationConfig: {
          temperature: 0.7,
          maxOutputTokens: 4096
        }
      })
    }
  );

  if (!response.ok) {
    const err = await response.text();
    throw new Error(`Gemini API error: ${response.status} - ${err}`);
  }

  const data = await response.json();
  let text = data.candidates?.[0]?.content?.parts?.[0]?.text || 'I could not process that request.';

  // Check if there's an updated report in the response
  let updatedReport = null;
  const reportMatch = text.match(/<UPDATED_REPORT>([\s\S]*?)<\/UPDATED_REPORT>/);
  if (reportMatch) {
    try {
      let jsonStr = reportMatch[1].trim();
      jsonStr = jsonStr.replace(/^```json\s*/i, '').replace(/```\s*$/i, '').trim();
      updatedReport = JSON.parse(jsonStr);
      // Remove the JSON block from the display text
      text = text.replace(/<UPDATED_REPORT>[\s\S]*?<\/UPDATED_REPORT>/, '').trim();
      text += '\n\n✅ Report updated successfully. The preview has been refreshed.';
    } catch (e) {
      // JSON parse failed, no update
    }
  }

  return {
    message: text,
    updatedReport
  };
}

module.exports = { chatWithBot };
