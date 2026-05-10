import fs from 'node:fs';

async function checkModels() {
  try {
    const response = await fetch('https://openrouter.ai/api/v1/models');
    if (!response.ok) {
      console.error('Failed to fetch models from OpenRouter');
      return;
    }
    const data = await response.json();
    const openrouterIds = data.data.map((m: any) => m.id);

    // Read our types.ts
    const typesContent = fs.readFileSync('src/types.ts', 'utf8');
    const modelIdMatches = typesContent.matchAll(/id: '(.*?)',/g);
    const ourIds = Array.from(modelIdMatches).map(m => m[1]);

    // Check OpenRouter models specifically
    const ourOpenRouterIds = ourIds.filter(id => {
      // Find the provider in types.ts for this ID
      const providerMatch = typesContent.match(new RegExp(`id: '${id.replace('/', '\\/')}',[\\s\\S]*?provider: '(.*?)'`, 'm'));
      return providerMatch && providerMatch[1] === 'openrouter';
    });

    console.log('--- ALL FREE OPENROUTER MODELS ---');
    const freeModels = data.data.filter((m: any) =>
      m.id.endsWith(':free') ||
      (m.pricing && parseFloat(m.pricing.prompt) === 0 && parseFloat(m.pricing.completion) === 0)
    );
    freeModels.forEach((m: any) => console.log(`${m.id} | ${m.name} | ${m.description?.slice(0, 50)}...`));
  } catch (err) {
    console.error('Error during validation:', err);
  }
}

checkModels();
