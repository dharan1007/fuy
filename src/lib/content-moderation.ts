// src/lib/content-moderation.ts
// Comprehensive content moderation utility for blocking prohibited content

// Categories of prohibited content
const DRUG_TERMS = [
    'cocaine', 'heroin', 'methamphetamine', 'meth', 'crack', 'lsd', 'ecstasy', 'mdma',
    'marijuana', 'weed', 'cannabis', 'hash', 'hashish', 'ketamine', 'fentanyl', 'opioid',
    'morphine', 'codeine', 'xanax', 'valium', 'adderall', 'amphetamine', 'psilocybin',
    'mushrooms', 'shrooms', 'dmt', 'pcp', 'ghb', 'rohypnol', 'roofies', 'drug dealer',
    'drug trafficking', 'narcotics', 'getting high', 'get high', 'dope', 'smack',
    'crystal meth', 'ice drug', 'speed drug', 'acid trip', 'trip balls', 'junkie',
    'overdose', 'od', 'needle drugs', 'inject drugs', 'snort', 'smoke weed'
];

const TERRORISM_TERMS = [
    'terrorism', 'terrorist', 'bomb', 'bombing', 'explosion', 'explosive', 'detonate',
    'detonation', 'jihad', 'jihadist', 'extremist', 'radicalization', 'isis', 'isil',
    'al-qaeda', 'al qaeda', 'taliban', 'boko haram', 'hezbollah', 'hamas', 'militia',
    'suicide bomber', 'car bomb', 'ied', 'improvised explosive', 'mass shooting',
    'school shooting', 'massacre', 'attack civilians', 'kill civilians', 'terror attack',
    'biological weapon', 'chemical weapon', 'anthrax', 'ricin', 'sarin', 'nerve agent',
    'dirty bomb', 'nuclear attack', 'radiological', 'assassination', 'assassinate',
    'hostage', 'kidnapping', 'beheading', 'execution video', 'propaganda video'
];

const OFFENSIVE_LANGUAGE = [
    'fuck', 'fucking', 'fucker', 'fucked', 'fck', 'f*ck', 'f**k', 'fuk', 'fuq',
    'shit', 'shitting', 'bullshit', 'sh*t', 'sh1t', 'sht',
    'bitch', 'bitches', 'b*tch', 'b1tch',
    'asshole', 'assh0le', 'a**hole', 'arsehole',
    'bastard', 'b*stard',
    'damn', 'dammit', 'goddamn',
    'cunt', 'c*nt', 'c**t',
    'dick', 'd*ck', 'd1ck', 'dickhead',
    'cock', 'c*ck',
    'pussy', 'p*ssy',
    'whore', 'wh*re', 'slut', 'sl*t',
    'retard', 'retarded', 'r*tard',
    'faggot', 'fag', 'f*g', 'f*ggot',
    'nigger', 'n*gger', 'n1gger', 'nigga', 'n*gga',
    'spic', 'sp*c', 'wetback',
    'chink', 'ch*nk', 'gook',
    'kike', 'k*ke',
    'cracker', 'honky',
    'coon', 'c**n',
    'paki', 'p*ki',
    'tranny', 'tr*nny'
];

const HATE_SPEECH = [
    'nazi', 'hitler', 'heil', 'swastika', 'white power', 'white supremacy', 'white supremacist',
    'kkk', 'ku klux klan', 'aryan', 'aryan nation', 'skinhead', 'neo-nazi', 'neonazi',
    'race war', 'ethnic cleansing', 'genocide', 'holocaust denial', 'gas the',
    'kill all', 'death to', 'hang all', 'burn all', 'exterminate',
    'subhuman', 'untermensch', 'inferior race', 'master race',
    'hate crime', 'lynch', 'lynching'
];

const VIOLENCE_THREATS = [
    'kill you', 'kill yourself', 'kys', 'die', 'hope you die', 'go die',
    'murder', 'murderer', 'i will kill', 'gonna kill', 'going to kill',
    'beat you up', 'punch you', 'hurt you', 'attack you', 'stab you', 'shoot you',
    'rape', 'rapist', 'r*pe', 'sexual assault', 'molest', 'pedophile', 'pedo',
    'child porn', 'cp', 'kiddie porn', 'underage', 'minor porn',
    'self harm', 'cut yourself', 'suicide', 'suicidal', 'hang yourself',
    'slit wrists', 'overdose yourself', 'jump off', 'kill myself'
];

const ILLEGAL_ACTIVITIES = [
    'hack', 'hacking', 'hacker', 'ddos', 'phishing', 'malware', 'ransomware',
    'credit card fraud', 'identity theft', 'steal money', 'stealing', 'robbery',
    'burglary', 'break in', 'pick lock', 'hotwire', 'carjack', 'carjacking',
    'money laundering', 'counterfeit', 'forgery', 'forged documents',
    'fake id', 'fake passport', 'illegal gun', 'gun smuggling', 'arms dealer',
    'human trafficking', 'sex trafficking', 'prostitution', 'escort service',
    'child abuse', 'child exploitation', 'animal abuse', 'animal cruelty',
    'tax evasion', 'tax fraud', 'insider trading', 'pyramid scheme', 'ponzi',
    'bribery', 'corruption', 'blackmail', 'extortion', 'scam', 'scammer'
];

const EXPLICIT_CONTENT = [
    'porn', 'pornography', 'xxx', 'nsfw', 'nude', 'nudes', 'naked',
    'sex video', 'sex tape', 'hardcore', 'softcore', 'erotic', 'erotica',
    'orgasm', 'masturbate', 'masturbation', 'handjob', 'blowjob', 'oral sex',
    'anal sex', 'gangbang', 'threesome', 'orgy', 'fetish', 'bdsm', 'bondage',
    'hentai', 'rule34', 'rule 34', 'camgirl', 'cam girl', 'onlyfans leak',
    'leaked nudes', 'revenge porn', 'deep fake', 'deepfake porn'
];

// Compile all prohibited terms
const ALL_PROHIBITED_TERMS = [
    ...DRUG_TERMS,
    ...TERRORISM_TERMS,
    ...OFFENSIVE_LANGUAGE,
    ...HATE_SPEECH,
    ...VIOLENCE_THREATS,
    ...ILLEGAL_ACTIVITIES,
    ...EXPLICIT_CONTENT
];

// Create a Set for O(1) lookups (for exact word matching)
const PROHIBITED_SET = new Set(ALL_PROHIBITED_TERMS.map(term => term.toLowerCase()));

// Patterns for more complex detection (regex patterns)
const PROHIBITED_PATTERNS = [
    /\bk+i+l+l?\s*(yo)?u+r?\s*s+e+l+f+\b/gi, // variations of "kill yourself"
    /\bd+i+e+\s*b+i+t+c+h+\b/gi,
    /\bg+o+\s*t+o+\s*h+e+l+l+\b/gi,
    /\bn+[i1]+g+[g3]+[a4e]+[r]?\b/gi, // N-word variations
    /\bf+[u*]+c+k+/gi, // F-word variations
    /\bs+h+[i1]+t+/gi, // S-word variations
];

export interface ModerationResult {
    isClean: boolean;
    flaggedTerms: string[];
    categories: string[];
    message?: string;
}

/**
 * Check if content contains prohibited terms
 * @param content - The text content to check
 * @returns ModerationResult with details about any flagged content
 */
export function moderateContent(content: string): ModerationResult {
    if (!content || typeof content !== 'string') {
        return { isClean: true, flaggedTerms: [], categories: [] };
    }

    const lowerContent = content.toLowerCase();
    const flaggedTerms: string[] = [];
    const categories: Set<string> = new Set();

    // Check for exact word matches (split by non-word characters)
    const words = lowerContent.split(/\W+/).filter(w => w.length > 0);
    for (const word of words) {
        if (PROHIBITED_SET.has(word)) {
            flaggedTerms.push(word);
            // Categorize the flagged term
            if (DRUG_TERMS.includes(word)) categories.add('drugs');
            if (TERRORISM_TERMS.includes(word)) categories.add('terrorism');
            if (OFFENSIVE_LANGUAGE.includes(word)) categories.add('offensive_language');
            if (HATE_SPEECH.includes(word)) categories.add('hate_speech');
            if (VIOLENCE_THREATS.includes(word)) categories.add('violence');
            if (ILLEGAL_ACTIVITIES.includes(word)) categories.add('illegal_activity');
            if (EXPLICIT_CONTENT.includes(word)) categories.add('explicit_content');
        }
    }

    // Check phrase matches (for multi-word terms)
    for (const term of ALL_PROHIBITED_TERMS) {
        if (term.includes(' ') && lowerContent.includes(term)) {
            if (!flaggedTerms.includes(term)) {
                flaggedTerms.push(term);
            }
        }
    }

    // Check regex patterns for evasion attempts
    for (const pattern of PROHIBITED_PATTERNS) {
        const matches = lowerContent.match(pattern);
        if (matches) {
            flaggedTerms.push(...matches.filter(m => !flaggedTerms.includes(m.toLowerCase())));
            categories.add('offensive_language');
        }
    }

    const isClean = flaggedTerms.length === 0;

    return {
        isClean,
        flaggedTerms: [...new Set(flaggedTerms)], // Remove duplicates
        categories: Array.from(categories),
        message: isClean
            ? undefined
            : 'Your message contains prohibited content and cannot be posted. Please remove offensive, violent, or illegal content.'
    };
}

/**
 * Quick check if content is clean (for performance-sensitive contexts)
 * @param content - The text content to check
 * @returns boolean - true if content is clean
 */
export function isContentClean(content: string): boolean {
    return moderateContent(content).isClean;
}

/**
 * Get a user-friendly error message for moderation failure
 */
export function getModerationErrorMessage(result: ModerationResult): string {
    if (result.isClean) return '';

    const categoryMessages: Record<string, string> = {
        'drugs': 'drug-related content',
        'terrorism': 'terrorism-related content',
        'offensive_language': 'offensive language',
        'hate_speech': 'hate speech',
        'violence': 'violent or threatening content',
        'illegal_activity': 'content related to illegal activities',
        'explicit_content': 'explicit or adult content'
    };

    const reasons = result.categories.map(cat => categoryMessages[cat] || cat).join(', ');
    return `Your message contains ${reasons} and cannot be posted.`;
}
