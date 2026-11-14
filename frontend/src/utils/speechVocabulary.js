/**
 * Speech Recognition Naming Words & Vocabulary Enhancement Utility
 * 
 * Provides:
 * 1. Curated list of participant names, project terms, and technical keywords.
 * 2. Phonetic misrecognition correction rules (e.g., 'viswa', 'which were' -> 'Viswaa').
 * 3. Fuzzy Levenshtein matching for custom names and proper nouns.
 * 4. Automatic sentence and proper noun capitalization.
 * 5. JSGF Grammar builder for Web Speech API SpeechGrammarList.
 */

// Default built-in naming words (proper nouns & project terms)
export const DEFAULT_NAMING_WORDS = [
  'Viswaa',
  'Sujith',
  'Nithi',
  'Sukant',
  'Bairavan',
  'Karthik',
  'Aravind',
  'Ravi',
  'Sneha',
  'Rahul',
  'John',
  'Sarah',
  'David',
  'FYZ',
  'MongoDB',
  'FastAPI',
  'WebRTC',
  'Uvicorn',
  'PyMongo',
  'React',
  'Groq',
  'IntenT_loG',
  'Whisper'
];

// Common phonetic replacements for known Indian names and domain terms
const PHONETIC_CORRECTIONS = [
  // Viswaa & variants
  { regex: /\b(viswaa|viswa|vishwa|vishvaa|vishva|visva|wiswa|whisper|which were|which war|this were|this war|with wah)\b/gi, replacement: 'Viswaa' },
  
  // Sujith & variants
  { regex: /\b(sujith|sujit|sujeet|sujeeth)\b/gi, replacement: 'Sujith' },
  { regex: /\b(suggest|subject)\s+(will|can|should|is|to|said|reported|completed|working)\b/gi, replacement: 'Sujith $2' },

  // Sukant & variants
  { regex: /\b(sukant|sukanta|sukanth|so can't|sue cant|sue can)\b/gi, replacement: 'Sukant' },

  // Nithi & variants
  { regex: /\b(nithi|nidhi|neethi|niti|nifty|needy)\b/gi, replacement: 'Nithi' },

  // Bairavan & variants
  { regex: /\b(bairavan|bhairavan|by ravan|byron|by ron|by raven)\b/gi, replacement: 'Bairavan' },

  // Days of week proper capitalization
  { regex: /\b(monday|tuesday|wednesday|thursday|friday|saturday|sunday)\b/gi, replacement: (match) => match.charAt(0).toUpperCase() + match.slice(1).toLowerCase() },

  // Project & Tech Stack Terminology
  { regex: /\b(f\s*y\s*z|fies|fiz)\b/gi, replacement: 'FYZ' },
  { regex: /\b(mongo\s*db|mongo)\b/gi, replacement: 'MongoDB' },
  { regex: /\bfast\s*api\b/gi, replacement: 'FastAPI' },
  { regex: /\bweb\s*rtc\b/gi, replacement: 'WebRTC' },
  { regex: /\buv\s*corn|unicorn\b/gi, replacement: 'Uvicorn' },
  { regex: /\b(pi\s*mongo|pie\s*mongo)\b/gi, replacement: 'PyMongo' },
  { regex: /\bintent\s*log\b/gi, replacement: 'IntenT_loG' }
];

// Common English stop words that should NOT be fuzzy-matched
const COMMON_STOP_WORDS = new Set([
  'the', 'and', 'for', 'are', 'but', 'not', 'you', 'all', 'any', 'can', 'had', 'her', 'was',
  'one', 'our', 'out', 'day', 'get', 'has', 'him', 'his', 'how', 'man', 'new', 'now', 'old',
  'see', 'two', 'way', 'who', 'boy', 'did', 'its', 'let', 'put', 'say', 'she', 'too', 'use',
  'will', 'with', 'have', 'this', 'that', 'from', 'they', 'here', 'there', 'what', 'when',
  'make', 'like', 'time', 'just', 'know', 'take', 'into', 'year', 'your', 'good', 'some',
  'could', 'them', 'than', 'then', 'look', 'only', 'come', 'over', 'think', 'also', 'back',
  'after', 'work', 'first', 'well', 'even', 'want', 'because', 'these', 'give', 'most', 'us'
]);

/**
 * Computes Levenshtein distance between two strings
 */
function levenshteinDistance(a, b) {
  const al = a.length;
  const bl = b.length;
  if (al === 0) return bl;
  if (bl === 0) return al;

  const matrix = Array.from({ length: al + 1 }, () => new Array(bl + 1).fill(0));

  for (let i = 0; i <= al; i++) matrix[i][0] = i;
  for (let j = 0; j <= bl; j++) matrix[0][j] = j;

  for (let i = 1; i <= al; i++) {
    for (let j = 1; j <= bl; j++) {
      const cost = a[i - 1].toLowerCase() === b[j - 1].toLowerCase() ? 0 : 1;
      matrix[i][j] = Math.min(
        matrix[i - 1][j] + 1,
        matrix[i][j - 1] + 1,
        matrix[i - 1][j - 1] + cost
      );
    }
  }
  return matrix[al][bl];
}

/**
 * Escapes regex special characters
 */
function escapeRegex(str) {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * Retrieves all registered naming words including defaults, active participants, and user storage
 */
export function getAllNamingWords(activeParticipants = []) {
  let stored = [];
  try {
    const raw = localStorage.getItem('meeting_custom_naming_words');
    if (raw) {
      stored = JSON.parse(raw);
    }
  } catch (e) {}

  const combined = new Set([
    ...DEFAULT_NAMING_WORDS,
    ...stored,
    ...activeParticipants.filter(p => p && p !== 'Host' && p !== 'Guest' && p !== 'You (Host)')
  ]);

  return Array.from(combined);
}

/**
 * Saves a custom naming word to localStorage
 */
export function saveCustomNamingWord(word) {
  if (!word || !word.trim()) return;
  const trimmed = word.trim();
  try {
    const raw = localStorage.getItem('meeting_custom_naming_words');
    let list = raw ? JSON.parse(raw) : [];
    if (!list.includes(trimmed)) {
      list.push(trimmed);
      localStorage.setItem('meeting_custom_naming_words', JSON.stringify(list));
    }
  } catch (e) {}
}

/**
 * Removes a custom naming word from localStorage
 */
export function removeCustomNamingWord(word) {
  try {
    const raw = localStorage.getItem('meeting_custom_naming_words');
    if (raw) {
      let list = JSON.parse(raw);
      list = list.filter(w => w.toLowerCase() !== word.toLowerCase());
      localStorage.setItem('meeting_custom_naming_words', JSON.stringify(list));
    }
  } catch (e) {}
}

/**
 * Normalizes and enhances speech recognition text:
 * 1. Executes phonetic regex rules.
 * 2. Matches exact case-insensitive target naming words.
 * 3. Applies fuzzy matching for words >= 4 letters not in common stop words.
 * 4. Ensures clean sentence capitalization.
 */
export function normalizeTranscriptNamingWords(text, extraParticipants = []) {
  if (!text || typeof text !== 'string') return text;

  let result = text;

  // 1. Run defined phonetic replacement rules
  for (const rule of PHONETIC_CORRECTIONS) {
    result = result.replace(rule.regex, rule.replacement);
  }

  // 2. Fetch all known naming words
  const allNames = getAllNamingWords(extraParticipants);

  // 3. Exact word boundary replacement for each registered name (case-insensitive to canonical proper case)
  for (const name of allNames) {
    if (!name || name.length < 2) continue;
    const reg = new RegExp(`\\b${escapeRegex(name)}\\b`, 'gi');
    result = result.replace(reg, name);
  }

  // 4. Fuzzy word-level matching for close misspellings (distance <= 1 for 4-6 char names, distance <= 2 for 7+ char names)
  const tokens = result.split(/(\s+|[.,!?;:])/);
  for (let i = 0; i < tokens.length; i++) {
    const token = tokens[i];
    if (!token || /^\s+$/.test(token) || /[.,!?;:]/.test(token)) continue;

    const lowerToken = token.toLowerCase();
    if (COMMON_STOP_WORDS.has(lowerToken)) continue;

    for (const name of allNames) {
      if (name.length < 4) continue;
      const lowerName = name.toLowerCase();

      // Don't replace if it's already an exact match
      if (lowerToken === lowerName) {
        tokens[i] = name;
        break;
      }

      const maxDist = name.length >= 7 ? 2 : 1;
      // Compare lengths before calculating distance to optimize
      if (Math.abs(token.length - name.length) <= maxDist) {
        const dist = levenshteinDistance(token, name);
        if (dist <= maxDist) {
          tokens[i] = name;
          break;
        }
      }
    }
  }
  result = tokens.join('');

  // 5. Clean sentence capitalization
  result = result.replace(/(^\s*|\.\s+)([a-z])/g, (_, prefix, char) => prefix + char.toUpperCase());

  return result;
}

/**
 * Generates JSGF grammar string for SpeechGrammarList
 */
export function buildJsgfGrammar(namesList = []) {
  const all = Array.from(new Set([...DEFAULT_NAMING_WORDS, ...namesList]));
  const safeNames = all
    .map(n => n.replace(/[^a-zA-Z0-9_]/g, ''))
    .filter(n => n.length > 0);

  if (safeNames.length === 0) return '';
  return `#JSGF V1.0; grammar names; public <name> = ${safeNames.join(' | ')} ;`;
}
