import { getDemoReply } from './replies.js';

export async function getReply(question, { fetchImpl = fetch, timeoutMs = 15000 } = {}) {
  try {
    const response = await fetchImpl('/api/oracle', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ question }),
      signal: AbortSignal.timeout(timeoutMs),
    });
    if (!response.ok) throw new Error('Oracle unavailable');
    const { answer } = await response.json();
    if (typeof answer !== 'string' || !answer.trim() || answer.length > 160) throw new Error('Invalid reply');
    return answer;
  } catch {
    return getDemoReply(question);
  }
}
