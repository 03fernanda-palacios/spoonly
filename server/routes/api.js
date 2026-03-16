import { Router } from 'express';

const router = Router();

// ── Helper 1 ──────────────────────────────────────────────────────────────────
function deriveScheduleSummary(calendarEvents) {
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  const tomorrowStr = tomorrow.toISOString().slice(0, 10);

  const events = calendarEvents.filter(e => e?.start?.dateTime?.startsWith(tomorrowStr));

  if (events.length === 0) return 'Tomorrow is completely free.';

  events.sort((a, b) => new Date(a.start.dateTime) - new Date(b.start.dateTime));

  const labels = events.map(e => {
    const start = new Date(e.start.dateTime);
    const end = new Date(e.end.dateTime);
    const fmt = d => d.toTimeString().slice(0, 5);
    return `${e.summary || 'Event'} ${fmt(start)}–${fmt(end)}`;
  });

  const lunchBusy = events.some(e => {
    const startHour = new Date(e.start.dateTime).getHours();
    const endHour = new Date(e.end.dateTime).getHours();
    return startHour < 14 && endHour > 11;
  });

  const lunchNote = lunchBusy ? 'You are busy during lunch.' : 'You have a lunch gap available.';
  return `Tomorrow you have ${events.length} event(s): [${labels.join(', ')}]. ${lunchNote}`;
}

// ── Helper 2 ──────────────────────────────────────────────────────────────────
function deriveSpendingSummary(transactions) {
  const foodKeywords = ['food', 'restaurant', 'dining', 'grocery'];
  const foodTx = transactions.filter(t =>
    foodKeywords.some(kw => t?.category?.toLowerCase().includes(kw))
  );

  if (foodTx.length === 0) return 'No food spending data available.';

  const total = foodTx.reduce((sum, t) => sum + t.amount, 0);
  const avgCost = (total / foodTx.length).toFixed(2);

  const weekAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
  const weeklyTotal = foodTx
    .filter(t => new Date(t.date).getTime() >= weekAgo)
    .reduce((sum, t) => sum + t.amount, 0)
    .toFixed(2);

  return `Your average meal cost is $${avgCost}. You have spent $${weeklyTotal} on food this week.`;
}

// ── Helper 3 ──────────────────────────────────────────────────────────────────
function buildUserSystemPrompt(userProfile, scheduleSummary, spendingSummary) {
  const allergies = userProfile?.allergies?.join(', ') || 'none';
  const goals = userProfile?.goals?.join(', ') || 'none';
  return `You are acting as ${userProfile?.name || 'the user'}, a smart food deal negotiator.

About you:
- Diet: ${userProfile?.diet || 'no restrictions'}
- Allergies: ${allergies}
- Goals: ${goals}

Your schedule: ${scheduleSummary}

Your food spending: ${spendingSummary}

Instructions:
- Evaluate each neighbor's food offer based on your diet, allergies, goals, and budget.
- If your budget is tight (weekly spending is high), push hard for a lower price.
- If you have a lunch gap tomorrow, prioritize offers that fit that slot.
- Negotiate naturally: ask questions, counter-offer, express preferences.
- When you agree to a deal, end your message with exactly: [DEAL CLOSED ✓]
- If the offer is not a good fit after consideration, end your message with exactly: [PASS]
- Keep replies concise (2–4 sentences).`;
}

// ── Helper 4 ──────────────────────────────────────────────────────────────────
function buildNeighborSystemPrompt(neighbor) {
  return `You are ${neighbor.name}, a home cook selling your food to neighbors.

Your offering:
- Food: ${neighbor.food}
- Description: ${neighbor.description}
- Price range: ${neighbor.priceRange}
- Portions available: ${neighbor.portions}

Instructions:
- Enthusiastically pitch your food and engage with the buyer's questions.
- Be willing to negotiate on price within reason.
- Highlight the quality, freshness, and convenience of your food.
- Keep replies concise (2–4 sentences).
- Do not use [DEAL CLOSED ✓] or [PASS] — only the buyer decides the outcome.`;
}

// ── Helper 5 ──────────────────────────────────────────────────────────────────
async function callLLM(messages) {
  const response = await fetch('https://integrate.api.nvidia.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${process.env.NVIDIA_API_KEY}`
    },
    body: JSON.stringify({
      model: 'nvidia/llama-3.1-nemotron-ultra-253b-v1',
      messages,
      max_tokens: 500,
      stream: false
    })
  });
  const data = await response.json();
  if (!data.choices) {
    console.error('NVIDIA API unexpected response:', JSON.stringify(data));
    throw new Error(`NVIDIA API error: ${JSON.stringify(data)}`);
  }
  const msg = data.choices[0].message;
  return msg.content ?? msg.reasoning_content;
}

// ── Helper 6 ──────────────────────────────────────────────────────────────────
async function negotiateWithNeighbor(neighbor, userSystemPrompt, res, dealClosedRef) {
  const userMessages = [
    { role: 'system', content: userSystemPrompt },
    { role: 'user', content: 'Begin the negotiation. Introduce yourself briefly and ask about the offer.' }
  ];
  const neighborMessages = [
    { role: 'system', content: buildNeighborSystemPrompt(neighbor) }
  ];

  const writeMessage = (role, text, dealFlag, passFlag) => {
    res.write(JSON.stringify({ type: 'message', neighborId: neighbor.id, role, text, dealFlag, passFlag }) + '\n');
  };

  const writeDone = (outcome) => {
    res.write(JSON.stringify({ type: 'done', neighborId: neighbor.id, outcome }) + '\n');
  };

  for (let turn = 0; turn < 6; turn++) {
    // Check shared deal flag at the start of each turn
    if (dealClosedRef.value === true) {
      writeMessage('user', 'Another deal was already locked in for tomorrow', false, true);
      writeDone('pass');
      return;
    }

    // User agent turn
    const userText = await callLLM(userMessages);
    const dealFlag = userText.includes('[DEAL CLOSED ✓]');
    const passFlag = userText.includes('[PASS]');
    writeMessage('user', userText, dealFlag, passFlag);
    userMessages.push({ role: 'assistant', content: userText });
    neighborMessages.push({ role: 'user', content: userText });

    if (dealFlag) {
      dealClosedRef.value = true;
      writeDone('deal');
      return;
    }
    if (passFlag) {
      writeDone('pass');
      return;
    }

    // Neighbor agent turn
    const neighborText = await callLLM(neighborMessages);
    const nDealFlag = neighborText.includes('[DEAL CLOSED ✓]');
    const nPassFlag = neighborText.includes('[PASS]');
    writeMessage('neighbor', neighborText, nDealFlag, nPassFlag);
    neighborMessages.push({ role: 'assistant', content: neighborText });
    userMessages.push({ role: 'user', content: neighborText });

    if (nDealFlag) {
      dealClosedRef.value = true;
      writeDone('deal');
      return;
    }
    if (nPassFlag) {
      writeDone('pass');
      return;
    }
  }

  writeDone('negotiating');
}

// ── Route ──────────────────────────────────────────────────────────────────────
router.post('/negotiate-all', async (req, res) => {
  const { userProfile, calendarEvents, transactions, neighbors } = req.body;

  const scheduleSummary = deriveScheduleSummary(calendarEvents ?? []);
  const spendingSummary = deriveSpendingSummary(transactions ?? []);
  const userSystemPrompt = buildUserSystemPrompt(userProfile, scheduleSummary, spendingSummary);

  res.setHeader('Content-Type', 'application/x-ndjson');
  res.setHeader('Transfer-Encoding', 'chunked');

  const dealClosedRef = { value: false };

  if (!neighbors || neighbors.length === 0) {
    res.end();
    return;
  }

  try {
    await Promise.all(
      neighbors.map(neighbor =>
        negotiateWithNeighbor(neighbor, userSystemPrompt, res, dealClosedRef)
      )
    );
  } catch (err) {
    console.error('Negotiation error:', err);
    res.write(JSON.stringify({ type: 'error', message: err.message }) + '\n');
  }

  res.end();
});

export default router;
