import 'dotenv/config';

async function run() {
  const key = process.env.GEMINI_API_KEY || process.env.GOOGLE_GENAI_API_KEY;
  if(!key) {
    console.error("Error: No API key found in the environment variables (.env file).");
    return;
  }
  
  try {
    const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${key}`);
    const json = await res.json();
    
    if(json.models) {
      console.log("==================================================");
      console.log("Gemini Models currently available on your API key (v1beta endpoint):");
      console.log("==================================================");
      json.models
        .filter(m => m.name.includes('gemini'))
        .forEach(m => console.log(`- ${m.name}`));
      console.log("==================================================");
    } else {
      console.log("Failed to fetch models:", json);
    }
  } catch (e) {
    console.error("Network error:", e);
  }
}

run();