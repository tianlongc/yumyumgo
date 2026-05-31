import { z } from 'zod';

const RecommendationSchema = z.array(z.object({
  id: z.string(),
  name: z.string(),
  distance: z.string(),
  tags: z.array(z.string()),
  ai_reasoning: z.string()
})).length(3);

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  const { vibe, budget, distance, locationInfo, timeInfo, weatherInfo, candidates } = req.body;
  const apiKey = process.env.GEMINI_API_KEY;

  if (!apiKey) {
    return res.status(500).json({ error: 'Missing GEMINI_API_KEY' });
  }

  // Construct the prompt
  const systemInstruction = `You are a culinary AI recommender. Your task is to select EXACTLY 3 restaurants from the provided list of candidates that best match the user's requested crave/vibe, budget level, preferred travel distance constraint, current time, and weather conditions.
You MUST return your response as a strict JSON array of objects adhering to the following schema:
[
  {
    "id": "string (Google Place ID of the chosen restaurant)",
    "name": "string (Name of the restaurant)",
    "distance": "string (Estimate distance if location known, else N/A)",
    "tags": ["string", "string"],
    "ai_reasoning": "string (Strictly 1 sentence explaining the fit based on time/weather/vibe/budget/distance)"
  }
]
Do not include markdown backticks like \`\`\`json. Return ONLY the raw JSON array string.`;

  const promptText = `
User Craving/Vibe: ${vibe}
Target Budget Level: ${budget || 'Any budget'}
Preferred Travel Distance constraint: ${distance || 'Near'}
Location Context: ${locationInfo}
Current Time: ${timeInfo}
Current Weather: ${weatherInfo}

Candidates List:
${JSON.stringify(candidates, null, 2)}
`;

  const models = ['gemini-2.5-pro', 'gemini-2.0-flash', 'gemini-2.0-flash-lite', 'gemini-2.5-flash'];
  const maxRetries = 4;
  
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      // Fallback: 2.5-flash -> 3.5-flash -> 2.5-flash-lite
      const model = models[attempt - 1];
      const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;

      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          systemInstruction: {
            parts: [{ text: systemInstruction }]
          },
          contents: [{
            parts: [{ text: promptText }]
          }],
          generationConfig: {
            responseMimeType: "application/json",
            temperature: 0.7
          }
        })
      });

      const data = await response.json();

      if (data.error) {
        throw new Error(data.error.message);
      }

      let responseText = data.candidates[0].content.parts[0].text;

      // Sanitize markdown backticks if Gemini accidentally adds them despite responseMimeType
      responseText = responseText.replace(/^```json\s*/i, '').replace(/\s*```$/i, '').trim();

      const parsedData = JSON.parse(responseText);
      const validatedData = RecommendationSchema.parse(parsedData);

      return res.status(200).json(validatedData);
    } catch (error: any) {
      const errorMsg = error.message || String(error);
      console.error(`Gemini API Error on attempt ${attempt} (${models[attempt - 1]}):`, errorMsg);
      
      // If we hit the free-tier limit for THIS model, we should immediately try the next model in the fallback queue!
      if (errorMsg.includes('Quota exceeded') || errorMsg.includes('429')) {
        if (attempt === maxRetries) {
          return res.status(429).json({ 
            error: "All Gemini models have hit their free-tier rate limits! Please take a breather and try again in about 60 seconds." 
          });
        }
        console.log(`Model ${models[attempt - 1]} hit quota limit. Instantly falling back to next model...`);
        continue; // Skip the delay and instantly try the next model in the array
      }

      if (attempt === maxRetries) {
        return res.status(500).json({ error: 'Failed to generate recommendations after multiple attempts' });
      }
      
      // Exponential backoff for other transient errors: 2s, 4s, etc.
      const delay = Math.pow(2, attempt) * 1000;
      console.log(`Retrying in ${delay}ms...`);
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
}
