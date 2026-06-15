// src/chatBot.js
async function chatWithBot({ message, reportData, history, groqKey }) {
  const systemContext = reportData
    ? `You are KPMG India's report editing assistant. You have access to the following report:

TOPIC: ${reportData.topic}
SUBTITLE: ${reportData.subtitle || ''}

CURRENT REPORT STRUCTURE:
${JSON.stringify(reportData, null, 2).substring(0, 5000)}

Your role is to help the user make precise edits to this report. When the user requests changes:
1. Identify exactly which section/subsection to modify
2. Apply the change maintaining KPMG's authoritative, data-driven voice
3. Return the COMPLETE updated report JSON alongside your explanation

If returning an updated report, wrap it in: <UPDATED_REPORT>...</UPDATED_REPORT>
Always explain what changes were made before the JSON block.
Maintain British English spelling and KPMG professional tone throughout.`
    : `You are a KPMG India report generation assistant. Help users define their report topic, scope, and requirements.`;

  const messages = [{ role: 'system', content: systemContext }];

  if (history && history.length > 0) {
    history.slice(-8).forEach(msg => {
      messages.push({ role: msg.role === 'assistant' ? 'assistant' : 'user', content: msg.content });
    });
  }

  messages.push({ role: 'user', content: message });

  const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${groqKey}`
    },
    body: JSON.stringify({
      model: 'llama-3.3-70b-versatile',
      messages,
      temperature: 0.7,
      max_tokens: 4000
    })
  });

  if (!response.ok) {
    const err = await response.text();
    throw new Error(`Groq API error: ${response.status} - ${err}`);
  }

  const data = await response.json();
  let text = data.choices?.[0]?.message?.content || 'I could not process that request.';

  let updatedReport = null;
  const reportMatch = text.match(/<UPDATED_REPORT>([\s\S]*?)<\/UPDATED_REPORT>/);
  if (reportMatch) {
    try {
      let jsonStr = reportMatch[1].trim();
      jsonStr = jsonStr.replace(/^```json\s*/i, '').replace(/```\s*$/i, '').trim();
      updatedReport = JSON.parse(jsonStr);
      text = text.replace(/<UPDATED_REPORT>[\s\S]*?<\/UPDATED_REPORT>/, '').trim();
      text += '\n\n✅ Report updated successfully. The preview has been refreshed.';
    } catch (e) {}
  }

  return { message: text, updatedReport };
}

module.exports = { chatWithBot };
