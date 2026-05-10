
import fs from 'fs';
const content = fs.readFileSync('src/components/CompareDashboard.tsx', 'utf8');
let depth = 0;
let inString = null;
let inComment = false;
let inRegex = false;

for (let i = 0; i < content.length; i++) {
    const char = content[i];
    const next = content[i+1];

    if (inComment === 'line') {
        if (char === '\n') inComment = false;
        continue;
    }
    if (inComment === 'block') {
        if (char === '*' && next === '/') { inComment = false; i++; }
        continue;
    }
    if (inString) {
        if (char === inString && content[i-1] !== '\\') inString = null;
        continue;
    }
    if (inRegex) {
        if (char === '/' && content[i-1] !== '\\') inRegex = false;
        continue;
    }

    if (char === '/' && next === '/') { inComment = 'line'; i++; continue; }
    if (char === '/' && next === '*') { inComment = 'block'; i++; continue; }
    if (char === '\"' || char === '\'' || char === '`') { inString = char; continue; }
    
    // Minimal regex detection: / followed by non-space, not /= or /*
    if (char === '/' && next !== ' ' && next !== '*' && next !== '=') {
        // Check if it's likely a regex (not division)
        // This is hard, but we'll assume regex for now if it's not preceded by a variable
        inRegex = true;
        continue;
    }

    if (char === '{') depth++;
    if (char === '}') depth--;
}
console.log(`Final depth: ${depth}`);
