import type { Activity, ActivityType, AgeGroup, NeuroAdaptations } from '../types';

interface GeneratedActivity {
  name: string;
  description: string;
  activityType: ActivityType;
  ageGroups: AgeGroup[];
  materials: string[];
  instructions: string[];
  developmentalBenefits: string[];
  durationEstimate: string;
  bestAgeGroup?: string;
  ageAdaptations?: Record<string, string>;
  neuroAdaptations?: NeuroAdaptations;
}

const VALID_TYPES: ActivityType[] = [
  'arts-crafts',
  'sensory',
  'music-movement',
  'storytelling',
  'outdoor',
];
const VALID_AGE_GROUPS: AgeGroup[] = ['0-1', '1-2', '2-3', '3-5'];

function sanitizeActivity(raw: GeneratedActivity, theme: string): Activity {
  const actType = VALID_TYPES.includes(raw.activityType) ? raw.activityType : 'arts-crafts';
  const ageGroups = Array.isArray(raw.ageGroups)
    ? (raw.ageGroups.filter((a) => VALID_AGE_GROUPS.includes(a as AgeGroup)) as AgeGroup[])
    : ['0-1' as AgeGroup];

  const ageAdaptations =
    raw.ageAdaptations && typeof raw.ageAdaptations === 'object' && !Array.isArray(raw.ageAdaptations)
      ? Object.fromEntries(Object.entries(raw.ageAdaptations).map(([k, v]) => [String(k), String(v)]))
      : undefined;

  let neuroAdaptations: NeuroAdaptations | undefined;
  if (raw.neuroAdaptations && typeof raw.neuroAdaptations === 'object' && !Array.isArray(raw.neuroAdaptations)) {
    const n = raw.neuroAdaptations as Record<string, unknown>;
    neuroAdaptations = {
      sensory: n.sensory ? String(n.sensory) : null,
      fineMotor: n.fineMotor ? String(n.fineMotor) : null,
      attention: n.attention ? String(n.attention) : null,
      autism: n.autism ? String(n.autism) : null,
      adhd: n.adhd ? String(n.adhd) : null,
      communication: n.communication ? String(n.communication) : null,
    };
    // Only keep if at least one category is non-null
    if (!Object.values(neuroAdaptations).some(Boolean)) neuroAdaptations = undefined;
  }

  return {
    id: `act_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
    name: String(raw.name || 'Unnamed Activity'),
    description: String(raw.description || ''),
    instructions: Array.isArray(raw.instructions) ? raw.instructions.map(String) : [],
    materials: Array.isArray(raw.materials) ? raw.materials.map(String) : [],
    ageGroups: ageGroups.length > 0 ? ageGroups : ['0-1'],
    activityType: actType,
    developmentalBenefits: Array.isArray(raw.developmentalBenefits)
      ? raw.developmentalBenefits.map(String)
      : [],
    durationEstimate: raw.durationEstimate ? String(raw.durationEstimate) : undefined,
    theme,
    createdAt: new Date().toISOString(),
    bestAgeGroup: raw.bestAgeGroup ? String(raw.bestAgeGroup) : undefined,
    ageAdaptations,
    neuroAdaptations,
  };
}

const WEATHER_LABELS: Record<string, string> = {
  sunny: 'Sunny ☀️',
  cloudy: 'Cloudy ⛅',
  rainy: 'Rainy 🌧️',
  hot: 'Hot 🔥',
  cold: 'Cold ❄️',
};

export async function generateActivities(
  theme: string,
  ageGroup: string,
  materials: string,
  duration: number,
  onStream: (text: string) => void,
  weather = '',
  attendance = { count: 0, ageNote: '' },
  includeNeuroAdaptations = false,
  pastActivities: string[] = [],
): Promise<Activity[]> {
  const isAllAges = ageGroup === '0-5';

  const weatherLine = weather
    ? `Today's Weather: ${WEATHER_LABELS[weather] ?? weather}`
    : '';
  const weatherNote =
    weather === 'rainy' || weather === 'cold'
      ? 'IMPORTANT: Since it is rainy/cold, the outdoor section activities must be modified to work indoors — suggest indoor alternatives that capture the spirit of outdoor play.'
      : weather === 'hot'
      ? 'For the outdoor section, prioritise water play, shade-based activities, and cooling activities suitable for hot weather.'
      : '';
  const attendanceLine =
    attendance.count > 0
      ? `Expected Attendance: ${attendance.count} children${attendance.ageNote ? ` (${attendance.ageNote})` : ''}. Scale materials and group management suggestions for ${attendance.count} children.`
      : '';

  const materialsBlock = materials
    ? `Available Materials: ${materials}

IMPORTANT MATERIALS CONSTRAINT: Only suggest activities that can be made using the materials listed above. Do not suggest any activity that requires materials not on this list. Every item in each activity's "materials" array must be something from the Available Materials list (or a basic consumable like water, tape, or scissors that any playgroup would have).`
    : 'Available Materials: basic craft supplies, paper, crayons, play dough, blocks';

  const ageGroupLine = isAllAges
    ? 'Age Group: Mixed ages, 0–5 years (babies through preschoolers all attending together)'
    : `Age Group: ${ageGroup} years old`;

  const allAgesInstructions = isAllAges ? `
IMPORTANT — MIXED AGE SESSION: This session includes children from 0–5 years old together. For each activity you must:
1. Choose the age range the activity is BEST suited for as its primary audience (e.g. "2–3 yrs" or "3–5 yrs")
2. Provide brief, practical adaptations for the OTHER age groups so every child can participate

For each activity include:
- "bestAgeGroup": a short string like "2–3 yrs" indicating the primary target age
- "ageAdaptations": an object with keys for each OTHER age band (not the bestAgeGroup), e.g.:
  {
    "0–1 yrs": "Let babies explore materials through sensory touch rather than completing the craft",
    "1–2 yrs": "Pre-cut all shapes so toddlers can focus on sticking only",
    "3–5 yrs": "Challenge older kids to design freely and cut their own shapes"
  }
Only include the age bands that are NOT the bestAgeGroup. Keep each adaptation to 1–2 sentences — practical and specific.` : '';

  const jsonSchemaExample = isAllAges ? `[
  {
    "name": "Fun activity name",
    "description": "Brief 1-2 sentence description of the activity",
    "activityType": "arts-crafts",
    "ageGroups": ["1-2", "2-3", "3-5"],
    "materials": ["material 1", "material 2"],
    "instructions": ["Step 1: ...", "Step 2: ...", "Step 3: ..."],
    "developmentalBenefits": ["benefit 1", "benefit 2"],
    "durationEstimate": "15–20 mins",
    "bestAgeGroup": "2–3 yrs",
    "ageAdaptations": {
      "0–1 yrs": "Adaptation for babies",
      "1–2 yrs": "Adaptation for young toddlers",
      "3–5 yrs": "Adaptation for preschoolers"
    }
  }
]` : `[
  {
    "name": "Fun activity name",
    "description": "Brief 1-2 sentence description of the activity",
    "activityType": "arts-crafts",
    "ageGroups": ["array of applicable: 0-1, 1-2, 2-3, 3-5"],
    "materials": ["material 1", "material 2"],
    "instructions": ["Step 1: ...", "Step 2: ...", "Step 3: ..."],
    "developmentalBenefits": ["benefit 1", "benefit 2"],
    "durationEstimate": "10–15 mins"
  }
]`;

  const durationNote = isAllAges
    ? 'For "durationEstimate": provide a realistic time range for running this activity, factoring in the mixed-age group — transitions take longer with babies present. e.g. "10–15 mins", "20–25 mins".'
    : 'For "durationEstimate": provide a realistic time range for running this activity with the given age group, e.g. "5–10 mins", "15–20 mins", "20–30 mins". Younger children (0–2 yrs) generally need more time for setup/transitions and have shorter attention spans, so factor that in. The estimate should reflect actual engaged activity time.';

  const neuroSection = includeNeuroAdaptations ? `

🧠 NEURODIVERSITY-FRIENDLY ADAPTATIONS REQUIRED:
For EVERY activity, include a "neuroAdaptations" field with practical, specific adaptations to support children with diverse needs. Each sub-field should be 1–2 sentences (or null if genuinely not applicable to this specific activity). Focus on what the facilitator actually does differently — be concrete, not vague.

"neuroAdaptations": {
  "sensory": "👋 Sensory — adjustments for sensory sensitivities (e.g. offer gloves for messy textures, reduce background noise, dim lighting for overstimulating activities)",
  "fineMotor": "✂️ Fine Motor — modifications for children with limited hand dexterity (e.g. pre-cut shapes, use larger tools, tape materials to the table)",
  "attention": "⏱ Attention — strategies for short attention spans (e.g. break into 2-minute micro-steps, use a visual timer, provide a clear 'all done' signal)",
  "autism": "🔄 Autism — predictability and structure supports (e.g. show a visual sequence card before starting, warn before transitions, offer a 'helper' role)",
  "adhd": "⚡ ADHD — movement and engagement supports (e.g. let children stand or use a wobble seat, build in a movement break halfway, offer a fidget item during listening parts)",
  "communication": "💬 Communication — AAC and low-verbal options (e.g. use gesture + single words, provide picture choice cards, accept pointing or nodding as valid responses)"
}

Set a category to null only if it truly has no bearing on this specific activity.` : '';

  const neuroSchemaLine = includeNeuroAdaptations ? `
    "neuroAdaptations": {
      "sensory": "string or null",
      "fineMotor": "string or null",
      "attention": "string or null",
      "autism": "string or null",
      "adhd": "string or null",
      "communication": "string or null"
    }` : '';

  const avoidRepeatSection = pastActivities.length > 0
    ? `\n\nAVOID REPEATING — The following activity titles have already been used for this theme in previous sessions. Do NOT use these titles or create activities that are substantially similar to them:\n${pastActivities.map((t) => `- ${t}`).join('\n')}`
    : '';

  const prompt = `You are an experienced early childhood educator. Generate exactly 15 engaging, developmentally appropriate activities for a playgroup session — exactly 3 activities for each of the 5 activity types listed below.

Weekly Theme: "${theme}"
${ageGroupLine}
${materialsBlock}
Session Duration: ${duration} minutes${weatherLine ? `\n${weatherLine}` : ''}${weatherNote ? `\n${weatherNote}` : ''}${attendanceLine ? `\n${attendanceLine}` : ''}${avoidRepeatSection}${allAgesInstructions}${neuroSection}

You MUST produce exactly 3 activities for EACH of these types (15 activities total):
- "arts-crafts"      → hands-on making, drawing, painting, crafting
- "sensory"          → touch, smell, texture, messy play, sensory exploration
- "music-movement"   → songs, rhythm, dance, movement games
- "storytelling"     → stories, puppets, role-play, books, imaginative play
- "outdoor"          → garden, nature, physical play, fresh-air activities

Return ONLY a valid JSON array of exactly 15 objects. No markdown, no explanation — just the raw JSON array:
${jsonSchemaExample.replace(/^\]/m, `${neuroSchemaLine}\n]`)}

${durationNote}

All activities must be themed around "${theme}", safe for children, and suitable for the age group.
Group the 15 activities in order: 3 arts-crafts, then 3 sensory, then 3 music-movement, then 3 storytelling, then 3 outdoor.`;

  console.log('1. Starting generation request');

  // No client-side timeout — the edge function / Vite middleware control the server-side
  // timeout. Removing the AbortController avoids the client killing a slow but valid response.
  let response: Response;
  try {
    response = await fetch('/api/generate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: 'claude-opus-4-6',
        max_tokens: 16000,
        stream: true,
        messages: [{ role: 'user', content: prompt }],
      }),
    });
  } catch (err) {
    const error = err as Error;
    console.log('ERROR (fetch threw):', error.message);
    throw new Error('Could not reach the server. Please check your connection and try again.');
  }

  console.log('2. Response status:', response.status, '| content-type:', response.headers.get('content-type'));

  if (!response.ok) {
    const errorBody = await response.json().catch(() => ({}));
    const msg =
      (errorBody as { error?: { message?: string } }).error?.message ||
      `Server error (${response.status}). Please try again.`;
    console.log('ERROR (non-ok response):', msg);
    throw new Error(msg);
  }

  const contentType = response.headers.get('content-type') ?? '';
  let fullText = '';

  if (contentType.includes('application/json')) {
    // Edge function path: non-streaming, full JSON in one shot
    let data: Record<string, unknown>;
    try {
      data = await response.json();
    } catch (jsonErr) {
      console.log('ERROR: failed to parse response JSON:', (jsonErr as Error).message);
      throw new Error('Could not parse server response. Please try again.');
    }

    console.log('3. Anthropic stop_reason:', (data as { stop_reason?: string }).stop_reason ?? 'unknown');

    if ((data as { error?: { message?: string } }).error?.message) {
      const msg = (data as { error: { message: string } }).error.message;
      console.log('ERROR (Anthropic error in body):', msg);
      throw new Error(msg);
    }

    const contentBlocks = (data as { content?: { type: string; text?: string }[] }).content;
    const textBlock = Array.isArray(contentBlocks)
      ? contentBlocks.find((b) => b.type === 'text')
      : undefined;
    fullText = textBlock?.text ?? '';

    if (!fullText) {
      console.log('ERROR: no text in JSON response. data keys:', Object.keys(data));
      throw new Error('Received an empty response from the AI. Please try again.');
    }

    onStream(fullText);
  } else {
    // Vite dev path: SSE streaming
    if (!response.body) {
      console.log('ERROR: no response body');
      throw new Error('No response body from server.');
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let buffer = '';
    let chunkCount = 0;

    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) {
          console.log('Stream done. Total text length:', fullText.length);
          break;
        }

        chunkCount++;
        const rawChunk = decoder.decode(value, { stream: true });
        if (chunkCount <= 3) {
          console.log(`3. Raw chunk #${chunkCount}:`, JSON.stringify(rawChunk.slice(0, 200)));
        }

        buffer += rawChunk;
        const lines = buffer.split('\n');
        buffer = lines.pop() ?? '';

        for (const line of lines) {
          if (!line.startsWith('data: ')) continue;
          const data = line.slice(6).trim();
          if (data === '[DONE]') continue;
          try {
            const parsed = JSON.parse(data) as {
              type: string;
              delta?: { type: string; text?: string };
              error?: { message?: string };
            };
            if (parsed.type === 'error' && parsed.error?.message) {
              throw new Error(parsed.error.message);
            }
            if (
              parsed.type === 'content_block_delta' &&
              parsed.delta?.type === 'text_delta' &&
              parsed.delta.text
            ) {
              fullText += parsed.delta.text;
              onStream(fullText);
            }
          } catch (parseErr) {
            const pe = parseErr as Error;
            if (!pe.message.startsWith('Unexpected token')) {
              console.log('ERROR (SSE parse):', pe.message);
              throw parseErr;
            }
          }
        }
      }
    } finally {
      reader.cancel().catch(() => {});
    }

    if (!fullText) {
      console.log('ERROR: empty SSE stream');
      throw new Error('Received an empty response from the AI. Please try again.');
    }
  }

  // Extract JSON array from the response text (both paths)
  const jsonMatch = fullText.match(/\[[\s\S]*\]/);
  if (!jsonMatch) {
    console.log('ERROR: no JSON array found. First 500 chars:', fullText.slice(0, 500));
    throw new Error('Could not parse activities from the response. Please try again.');
  }

  let parsed: GeneratedActivity[];
  try {
    parsed = JSON.parse(jsonMatch[0]) as GeneratedActivity[];
  } catch (jsonErr) {
    console.log('ERROR: JSON.parse failed:', (jsonErr as Error).message, '| snippet:', jsonMatch[0].slice(0, 200));
    throw new Error('Could not parse activities from the response. Please try again.');
  }

  if (!Array.isArray(parsed)) throw new Error('Invalid response format.');

  console.log('4. Final parsed result:', parsed.length, 'activities');

  return parsed.map((item) => sanitizeActivity(item, theme));
}

