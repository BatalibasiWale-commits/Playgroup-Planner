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

const CATEGORY_LABELS: Record<ActivityType, string> = {
  'arts-crafts': 'hands-on making, drawing, painting, crafting',
  'sensory': 'touch, smell, texture, messy play, sensory exploration',
  'music-movement': 'songs, rhythm, dance, movement games',
  'storytelling': 'stories, puppets, role-play, books, imaginative play',
  'outdoor': 'garden, nature, physical play, fresh-air activities',
};

const CATEGORY_ORDER: Record<ActivityType, number> = {
  'arts-crafts': 0,
  'sensory': 1,
  'music-movement': 2,
  'storytelling': 3,
  'outdoor': 4,
};

interface SharedParams {
  theme: string;
  ageGroup: string;
  materials: string;
  duration: number;
  weather: string;
  attendance: { count: number; ageNote: string };
  includeNeuroAdaptations: boolean;
  pastActivities: string[];
}

// Fetches a prompt and returns the full response text (handles both SSE and JSON paths)
async function fetchPromptText(prompt: string): Promise<string> {
  let response: Response;
  try {
    response = await fetch('/api/generate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: 'claude-sonnet-4-6',
        max_tokens: 5000,
        stream: true,
        messages: [{ role: 'user', content: prompt }],
      }),
    });
  } catch (err) {
    throw new Error('Could not reach the server. Please check your connection and try again.');
  }

  if (!response.ok) {
    const errorBody = await response.json().catch(() => ({}));
    const msg =
      (errorBody as { error?: { message?: string } }).error?.message ||
      `Server error (${response.status}). Please try again.`;
    throw new Error(msg);
  }

  const contentType = response.headers.get('content-type') ?? '';
  let fullText = '';

  if (contentType.includes('application/json')) {
    const data = await response.json() as Record<string, unknown>;
    if ((data as { error?: { message?: string } }).error?.message) {
      throw new Error((data as { error: { message: string } }).error.message);
    }
    const contentBlocks = (data as { content?: { type: string; text?: string }[] }).content;
    const textBlock = Array.isArray(contentBlocks) ? contentBlocks.find((b) => b.type === 'text') : undefined;
    fullText = textBlock?.text ?? '';
  } else {
    if (!response.body) throw new Error('No response body from server.');

    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let buffer = '';

    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
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
            }
          } catch (parseErr) {
            const pe = parseErr as Error;
            if (!pe.message.startsWith('Unexpected token')) throw parseErr;
          }
        }
      }
    } finally {
      reader.cancel().catch(() => {});
    }
  }

  if (!fullText) throw new Error('Received an empty response from the AI. Please try again.');
  return fullText;
}

function buildCategoryPrompt(category: ActivityType, params: SharedParams): string {
  const { theme, ageGroup, materials, duration, weather, attendance, includeNeuroAdaptations, pastActivities } = params;
  const isAllAges = ageGroup === '0-5';

  const weatherLine = weather ? `Today's Weather: ${WEATHER_LABELS[weather] ?? weather}` : '';
  const weatherNote =
    weather === 'rainy' || weather === 'cold'
      ? 'IMPORTANT: Since it is rainy/cold, if this is an outdoor activity modify it to work indoors — suggest an indoor alternative that captures the spirit of outdoor play.'
      : weather === 'hot'
      ? 'Prioritise water play, shade-based activities, and cooling activities suitable for hot weather.'
      : '';

  const attendanceLine =
    attendance.count > 0
      ? `Expected Attendance: ${attendance.count} children${attendance.ageNote ? ` (${attendance.ageNote})` : ''}. Scale materials and group management for ${attendance.count} children.`
      : '';

  const materialsBlock = materials
    ? `Available Materials: ${materials}\n\nIMPORTANT MATERIALS CONSTRAINT: Only suggest activities using the materials listed above. Every item in the "materials" array must come from this list (or a basic consumable like water, tape, or scissors that any playgroup would have).`
    : 'Available Materials: basic craft supplies, paper, crayons, play dough, blocks';

  const ageGroupLine = isAllAges
    ? 'Age Group: Mixed ages, 0–5 years (babies through preschoolers all attending together)'
    : `Age Group: ${ageGroup} years old`;

  const allAgesInstructions = isAllAges ? `

IMPORTANT — MIXED AGE SESSION: For each activity:
- Set "bestAgeGroup" to the age range it is BEST suited for (e.g. "2–3 yrs")
- Set "ageAdaptations" with brief adaptations for the OTHER age bands only:
  { "0–1 yrs": "...", "1–2 yrs": "...", "3–5 yrs": "..." }
Keep each adaptation to 1–2 sentences — practical and specific.` : '';

  const avoidRepeatSection = pastActivities.length > 0
    ? `\n\nAVOID REPEATING — Do NOT use these previously used titles or create substantially similar activities:\n${pastActivities.map((t) => `- ${t}`).join('\n')}`
    : '';

  const neuroSection = includeNeuroAdaptations ? `

🧠 NEURODIVERSITY-FRIENDLY ADAPTATIONS REQUIRED:
Include a "neuroAdaptations" field with practical adaptations (1–2 sentences each, or null if not applicable):
{
  "sensory": "adjustments for sensory sensitivities",
  "fineMotor": "modifications for limited hand dexterity",
  "attention": "strategies for short attention spans",
  "autism": "predictability and structure supports",
  "adhd": "movement and engagement supports",
  "communication": "AAC and low-verbal options"
}` : '';

  const ageAdaptationsSchema = isAllAges ? `
    "bestAgeGroup": "2–3 yrs",
    "ageAdaptations": { "0–1 yrs": "...", "1–2 yrs": "...", "3–5 yrs": "..." },` : '';

  const neuroSchemaLine = includeNeuroAdaptations ? `
    "neuroAdaptations": { "sensory": "string or null", "fineMotor": "string or null", "attention": "string or null", "autism": "string or null", "adhd": "string or null", "communication": "string or null" },` : '';

  const durationNote = isAllAges
    ? 'For "durationEstimate": provide a realistic time range factoring in mixed-age transitions, e.g. "15–20 mins".'
    : 'For "durationEstimate": provide a realistic time range for this age group. Younger children (0–2) need more setup time. e.g. "10–15 mins".';

  return `You are an experienced early childhood educator. Generate exactly 3 "${category}" activities for a playgroup session.

Weekly Theme: "${theme}"
Activity Type: "${category}" — ${CATEGORY_LABELS[category]}
${ageGroupLine}
${materialsBlock}
Session Duration: ${duration} minutes${weatherLine ? `\n${weatherLine}` : ''}${weatherNote ? `\n${weatherNote}` : ''}${attendanceLine ? `\n${attendanceLine}` : ''}${avoidRepeatSection}${allAgesInstructions}${neuroSection}

Return ONLY a valid JSON array of exactly 3 objects. No markdown, no explanation — just the raw JSON array:
[
  {
    "name": "Activity name",
    "description": "Brief 1-sentence description",
    "activityType": "${category}",
    "ageGroups": ["array of applicable: 0-1, 1-2, 2-3, 3-5"],
    "materials": ["material 1", "material 2"],
    "instructions": ["Step 1: ...", "Step 2: ...", "Step 3: ..."],
    "developmentalBenefits": ["benefit 1", "benefit 2"],
    "durationEstimate": "10–15 mins",${ageAdaptationsSchema}${neuroSchemaLine}
  }
]

${durationNote}
All activities must be themed around "${theme}", safe for children, and suitable for the age group.`;
}

async function fetchCategory(category: ActivityType, params: SharedParams): Promise<Activity[]> {
  const prompt = buildCategoryPrompt(category, params);
  const text = await fetchPromptText(prompt);

  const jsonMatch = text.match(/\[[\s\S]*\]/);
  if (!jsonMatch) {
    throw new Error(`Could not parse ${category} activities from the response.`);
  }

  let parsed: GeneratedActivity[];
  try {
    parsed = JSON.parse(jsonMatch[0]) as GeneratedActivity[];
  } catch {
    throw new Error(`Could not parse ${category} activities from the response.`);
  }

  if (!Array.isArray(parsed)) throw new Error('Invalid response format.');

  return parsed.map((item) => sanitizeActivity(item, params.theme));
}

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
  onPartialResults?: (activities: Activity[]) => void,
): Promise<Activity[]> {
  console.log('1. Starting parallel generation for 5 categories');

  const params: SharedParams = { theme, ageGroup, materials, duration, weather, attendance, includeNeuroAdaptations, pastActivities };
  const accumulated: Activity[] = [];

  const results = await Promise.allSettled(
    VALID_TYPES.map(async (category) => {
      const acts = await fetchCategory(category, params);
      accumulated.push(...acts);
      const sorted = [...accumulated].sort((a, b) => CATEGORY_ORDER[a.activityType] - CATEGORY_ORDER[b.activityType]);
      onPartialResults?.(sorted);
      onStream(`${accumulated.length} of 15 activities ready`);
      console.log(`Category "${category}" done (${acts.length} activities)`);
      return acts;
    }),
  );

  const failures = results.filter((r) => r.status === 'rejected');
  if (failures.length === VALID_TYPES.length) {
    const firstError = (failures[0] as PromiseRejectedResult).reason as Error;
    throw new Error(firstError.message || 'Could not generate activities. Please try again.');
  }

  if (failures.length > 0) {
    console.log(`${failures.length} category/categories failed — showing ${accumulated.length} activities`);
  }

  console.log(`4. Final result: ${accumulated.length} activities`);

  return [...accumulated].sort((a, b) => CATEGORY_ORDER[a.activityType] - CATEGORY_ORDER[b.activityType]);
}
