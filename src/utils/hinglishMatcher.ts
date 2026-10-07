/**
 * Hinglish & Hindi Phonetic Search Engine
 * Translates Devanagari Hindi into phonetic Roman (Hinglish) equivalents
 * and supports fuzzy bilingual autocomplete matching for products and customers.
 */

// Devanagari to Roman Phonetic Map
const HINDI_VOWELS: Record<string, string> = {
  'अ': 'a',
  'आ': 'aa',
  'इ': 'i',
  'ई': 'ee',
  'उ': 'u',
  'ऊ': 'oo',
  'ऋ': 'ri',
  'ए': 'e',
  'ऐ': 'ai',
  'ओ': 'o',
  'औ': 'au',
  'अं': 'an',
  'अः': 'ah',
};

const HINDI_MATRAS: Record<string, string> = {
  'ा': 'a',
  'ि': 'i',
  'ी': 'ee',
  'ु': 'u',
  'ू': 'oo',
  'ृ': 'ri',
  'े': 'e',
  'ै': 'ai',
  'ो': 'o',
  'ौ': 'au',
  'ं': 'n',
  'ँ': 'n',
  'ः': 'h',
  '्': '', // Halant (kills default 'a')
  'ॅ': 'e',
  'ॉ': 'o',
  '़': '', // Nukta
};

const HINDI_CONSONANTS: Record<string, string> = {
  'क': 'k',
  'ख': 'kh',
  'ग': 'g',
  'घ': 'gh',
  'ङ': 'ng',
  'च': 'ch',
  'छ': 'chh',
  'ज': 'j',
  'झ': 'jh',
  'ञ': 'ny',
  'ट': 't',
  'ठ': 'th',
  'ड': 'd',
  'ढ': 'dh',
  'ण': 'n',
  'त': 't',
  'थ': 'th',
  'द': 'd',
  'ध': 'dh',
  'न': 'n',
  'प': 'p',
  'फ': 'ph',
  'ब': 'b',
  'भ': 'bh',
  'म': 'm',
  'य': 'y',
  'र': 'r',
  'ल': 'l',
  'व': 'v',
  'श': 'sh',
  'ष': 'sh',
  'स': 's',
  'ह': 'h',
  'क़': 'q',
  'ख़': 'kh',
  'ग़': 'gh',
  'ज़': 'z',
  'ड़': 'd',
  'ढ़': 'dh',
  'फ़': 'f',
};

// Common Trade / Retail Word Equivalence Map (Hindi <-> English loanwords)
const COMMON_WORD_ALIASES: Record<string, string[]> = {
  'प्रोविजन': ['provision', 'provi', 'kirana', 'general', 'store'],
  'स्टोर': ['store', 'stor', 'shop', 'mart', 'dukan'],
  'मार्ट': ['mart', 'market', 'store'],
  'मेडिकल': ['medical', 'chemist', 'pharmacy'],
  'फैमिली': ['family'],
  'ट्रेडर्स': ['traders', 'trader'],
  'एंटरप्राइजेज': ['enterprises', 'enterprise'],
  'शॉपिंग': ['shopping'],
  'पॉइंट': ['point'],
  'रोड': ['road', 'rd'],
  'गेट': ['gate', 'gt'],
  'बाजार': ['bazar', 'bazaar', 'market'],
  'बाज़ार': ['bazar', 'bazaar', 'market'],
  'चौक': ['chowk', 'chawk', 'chok'],
  'कॉलोनी': ['colony', 'koloni'],
  'नगर': ['nagar'],
  'मंडी': ['mandi'],
  'मोहल्ला': ['mohalla', 'mohlla', 'gali'],
  'विकास': ['vikas', 'vikash'],
  'आवास': ['awas', 'avas'],
  'महादेव': ['mahadev'],
  'खुर्जा': ['khurja'],
  'बहजोई': ['bahjoi'],
  'मुरादाबाद': ['moradabad', 'muradabad'],
  'संभल': ['sambhal'],
  'बिसौली': ['bisauli'],
  'जारई': ['jarai'],
  'नखासा': ['nakhasa'],
  'हुसैनी': ['husaini', 'hussaini'],
  'गोलागंज': ['golaganj'],
  'घास': ['ghas'],
  'फुब्वारा': ['fowara', 'fubwara', 'fawara'],
  'अतुल': ['atul'],
  'दीपक': ['deepak', 'dipak'],
  'गुप्ता': ['gupta'],
  'चिराग': ['chirag'],
  'संजय': ['sanjay'],
  'संजीव': ['sanjeev', 'sanjiv'],
  'गोपाल': ['gopal'],
  'भगवान': ['bhagwan'],
  'भगवती': ['bhagwati'],
  'गणेश': ['ganesh'],
  'हिमांशु': ['himanshu'],
  'बॉबी': ['bobby', 'bobi'],
  'सुदेश': ['sudesh'],
  'अग्रवाल': ['agarwal', 'agrawal', 'aggarwal'],
  'बिन्नी': ['binny', 'binni'],
  'नितिन': ['nitin'],
  'चक्रधारी': ['chakradhari'],
  'विशाल': ['vishal'],
  'लक्ष्मी': ['laxmi', 'lakshmi'],
  'अन्नपूर्णा': ['annapurna'],
  'मोसिम': ['mosim', 'mousim'],
  'मनीश': ['manish'],
  'मनीष': ['manish'],
  'जफर': ['zafar', 'jafar'],
  'राहुल': ['rahul'],
  'सचिन': ['sachin'],
  'यादव': ['yadav'],
  'रोहित': ['rohit'],
  'श्याम': ['shyam'],
};

/**
 * Transliterates Devanagari Hindi text to Roman phonetic Hinglish
 * e.g. "अतुल प्रोविजन स्टोर" => "atul provijan store"
 */
export function hindiToHinglish(hindiText?: string): string {
  if (!hindiText || typeof hindiText !== 'string') return '';

  const chars = Array.from(hindiText);
  let result = '';
  let extraAliases: string[] = [];

  // Check for common word aliases first
  for (const [hindiWord, aliases] of Object.entries(COMMON_WORD_ALIASES)) {
    if (hindiText.includes(hindiWord)) {
      extraAliases.push(...aliases);
    }
  }

  for (let i = 0; i < chars.length; i++) {
    const ch = chars[i];
    const nextCh = i + 1 < chars.length ? chars[i + 1] : '';

    if (HINDI_VOWELS[ch]) {
      result += HINDI_VOWELS[ch];
    } else if (HINDI_CONSONANTS[ch]) {
      const romanConsonant = HINDI_CONSONANTS[ch];
      if (nextCh && HINDI_MATRAS[nextCh] !== undefined) {
        // Has matra, append consonant only; next iteration will append vowel
        result += romanConsonant;
      } else if (nextCh === '्') {
        // Halant following, no 'a'
        result += romanConsonant;
        i++; // Skip halant
      } else if (nextCh && HINDI_CONSONANTS[nextCh] && i + 1 < chars.length - 1) {
        // Default inherent 'a' in middle of word
        result += romanConsonant + 'a';
      } else {
        result += romanConsonant;
      }
    } else if (HINDI_MATRAS[ch] !== undefined) {
      result += HINDI_MATRAS[ch];
    } else {
      result += ch;
    }
  }

  const baseHinglish = result.toLowerCase().trim();
  const aliasStr = extraAliases.join(' ');
  return `${baseHinglish} ${aliasStr} ${hindiText.toLowerCase()}`;
}

/**
 * Normalizes query string for loose comparison (removes punctuation, collapses doubles)
 * e.g. "deepak" -> "dipak", "ee" -> "i", "oo" -> "u", "v" <-> "w", "sh" <-> "s", "z" <-> "j"
 */
export function normalizeHinglish(str: string): string {
  if (!str) return '';
  return str
    .toLowerCase()
    .replace(/[^a-z0-9\u0900-\u097F\s]/gi, ' ')
    .replace(/\bee\b/g, 'i')
    .replace(/ee/g, 'i')
    .replace(/oo/g, 'u')
    .replace(/aa/g, 'a')
    .replace(/w/g, 'v')
    .replace(/z/g, 'j')
    .replace(/ph/g, 'f')
    .replace(/sh/g, 's')
    .replace(/c(?=[eiy])/g, 's')
    .replace(/c(?=[aou])/g, 'k')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Checks if a target string (which may be Hindi or English) matches a search query
 * Supports:
 * 1. Direct Hindi substring match
 * 2. Direct English substring match
 * 3. Hinglish typed -> Hindi item match (e.g. typing "atul" matches "अतुल प्रोविजन स्टोर")
 * 4. Multi-token partial word matching
 */
export function matchHinglish(
  targetText?: string,
  query?: string,
  secondaryTarget?: string
): boolean {
  if (!query || query.trim() === '') return true;
  if (!targetText && !secondaryTarget) return false;

  const rawQuery = query.trim().toLowerCase();
  const combinedRawTarget = `${targetText || ''} ${secondaryTarget || ''}`.toLowerCase();

  // 1. Direct raw substring match (Fastest)
  if (combinedRawTarget.includes(rawQuery)) {
    return true;
  }

  // 2. Transliterated Hinglish match
  const hinglishTarget1 = targetText ? hindiToHinglish(targetText) : '';
  const hinglishTarget2 = secondaryTarget ? hindiToHinglish(secondaryTarget) : '';
  const combinedHinglish = `${hinglishTarget1} ${hinglishTarget2}`.toLowerCase();

  if (combinedHinglish.includes(rawQuery)) {
    return true;
  }

  // 3. Normalized phonetic comparison
  const normalizedTarget = normalizeHinglish(combinedHinglish);
  const normalizedQuery = normalizeHinglish(rawQuery);

  if (normalizedQuery && normalizedTarget.includes(normalizedQuery)) {
    return true;
  }

  // 4. Token-based matching (All words in query must match target)
  const queryTokens = rawQuery.split(/\s+/).filter(Boolean);
  if (queryTokens.length > 1) {
    const allTokensMatch = queryTokens.every((token) => {
      const normToken = normalizeHinglish(token);
      return combinedHinglish.includes(token) || (normToken && normalizedTarget.includes(normToken));
    });
    if (allTokensMatch) return true;
  }

  return false;
}
