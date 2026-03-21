import OpenAI from 'openai';
import dotenv from 'dotenv';

dotenv.config();

// Cerebras API keys rotation
const apiKeys = [
  process.env.CEREBRAS_API_KEY_1,
  process.env.CEREBRAS_API_KEY_2,
  process.env.CEREBRAS_API_KEY_3,
  process.env.CEREBRAS_API_KEY_4,
  process.env.CEREBRAS_API_KEY_5,
  process.env.CEREBRAS_API_KEY_6,
].filter(Boolean);

console.log(`⚙️ Loaded ${apiKeys.length} Cerebras API keys`);

if (apiKeys.length === 0) {
  console.warn('⚠️ WARNING: No Cerebras API keys found in environment variables!');
  console.warn('AI verification will fallback to safe defaults');
}

let currentKeyIndex = 0;

const getNextApiKey = () => {
  if (apiKeys.length === 0) return null;
  const key = apiKeys[currentKeyIndex];
  currentKeyIndex = (currentKeyIndex + 1) % apiKeys.length;
  return key;
};

const createCerebrasClient = () => {
  const key = getNextApiKey();
  if (!key) {
    throw new Error('No Cerebras API keys available');
  }
  console.log(`🔑 Using API key: ${key.substring(0, 10)}...${key.substring(key.length - 5)}`);
  return new OpenAI({
    baseURL: 'https://api.cerebras.ai/v1',
    apiKey: key,
    timeout: 30000, // 30 second timeout
    maxRetries: 0, // Disable retries to see actual errors
    defaultHeaders: {
      'Accept': 'application/json'
    }
  });
};

/**
 * Verify if an event is real using AI with fallback
 */
export const verifyEventWithAI = async (eventData) => {
  console.log(`🔵 Starting AI verification for event: ${eventData.event_name}`);
  
  const prompt = `You are a college , hackathon , symposium , conference , workshop etc event verification specialist. Analyze if this event is REAL and LEGITIMATE.using the details provide , web search etc

EVENT DETAILS:
- Name: ${eventData.event_name}
- Type: ${eventData.event_type}
- Organizer: ${eventData.organizer_name || 'Unknown'}
- Website: ${eventData.event_website || 'None'}
- Venue: ${eventData.venue}
- City: ${eventData.location_city || 'Unknown'}
- Dates: ${eventData.event_start_date} to ${eventData.event_end_date}

**OUTPUT ONLY THIS JSON (no other text, no markdown, just plain JSON):**

{
  "score": 80,
  "isReal": true,
  "observations": ["Observation 1", "Observation 2"],
  "redFlags": [],
  "recommendations": ["Recommendation 1"],
  "verdict": "LIKELY_REAL",
  "summary": "Event appears legitimate based on details provided"
}

**JSON FIELD RULES:**
- score: Number 0-100. Higher = more likely real. 60+ = probably real.
- isReal: Boolean. true if score >= 60, false if score < 60.
- observations: Array of 2-3 strings. Key details about the event.
- redFlags: Array of strings. Suspicious issues. Empty array if none found.
- recommendations: Array of 1-2 strings. How to verify. Empty if not needed.
- verdict: One of: "LIKELY_REAL", "NEEDS_VERIFICATION", "LIKELY_FAKE"
- summary: 1 sentence summary of your assessment.`;


  // If no API keys, skip to fallback immediately
  if (apiKeys.length === 0) {
    console.warn('⚠️ No API keys available - using safe fallback');
    return {
      score: 65,
      isReal: true,
      observations: ['Event details appear valid based on standard checks'],
      redFlags: [],
      recommendations: ['Manual verification by staff recommended'],
      verdict: 'NEEDS_VERIFICATION',
      summary: 'API keys not configured - using safe fallback',
      aiUnavailable: true
    };
  }

  // Try up to 3 times with different API keys (Cerebras: llama3.1-8b)
  for (let attempt = 0; attempt < Math.min(3, apiKeys.length); attempt++) {
    try {
      console.log(`🟡 AI verification attempt ${attempt + 1}/${Math.min(3, apiKeys.length)}`);
      const client = createCerebrasClient();
      
      const model = 'llama3.1-8b'; // Only correct model from Cerebras docs
      console.log(`📡 Sending request to model: ${model}`);
      
      const response = await client.chat.completions.create({
        model,
        messages: [
          {
            role: 'user',
            content: prompt
          }
        ],
        temperature: 0.2,
        max_tokens: 500
      });

      const content = response.choices[0].message.content;
      console.log(`📝 AI response received (length: ${content.length} chars)`);
      console.log(`📝 Response preview: ${content.substring(0, 150)}...`);
      
      // Try to parse JSON from response
      try {
        const jsonStr = content
          .replace(/```json\n?/g, '')
          .replace(/```\n?/g, '')
          .trim();
        const parsed = JSON.parse(jsonStr);
        console.log(`✅ AI verification successful (attempt ${attempt + 1})`);
        console.log(`   Score: ${parsed.score}, Verdict: ${parsed.verdict}`);
        return parsed;
      } catch (parseError) {
        console.error(`❌ JSON Parse error:`, parseError.message);
        console.error(`   Raw response: ${content.substring(0, 200)}`);
        
        if (attempt === Math.min(3, apiKeys.length) - 1) {
          console.warn('⚠️ All parse attempts failed - returning fallback');
          return {
            score: 65,
            isReal: true,
            observations: ['Event details appear valid'],
            redFlags: [],
            recommendations: ['Manual verification recommended'],
            verdict: 'NEEDS_VERIFICATION',
            summary: 'AI service parsing failed - manual review needed',
            aiUnavailable: true
          };
        }
      }
    } catch (error) {
      const errorInfo = {
        attempt: attempt + 1,
        status: error.status,
        message: error.message,
        type: error.type,
        code: error.code
      };
      console.error(`❌ Request error (attempt ${attempt + 1}):`, errorInfo);
      
      if (error.response?.data) {
        console.error(`   Response data:`, error.response.data);
      }
      
      if (attempt === Math.min(3, apiKeys.length) - 1) {
        // Last attempt - return safe fallback
        console.warn('⚠️ AI verification failed after all attempts - using safe fallback');
        return {
          score: 65,
          isReal: true,
          observations: [
            'Event details appear valid',
            'AI verification service temporarily unavailable'
          ],
          redFlags: [],
          recommendations: [
            'Manual verification by staff recommended',
            'Check event website and organizer details'
          ],
          verdict: 'NEEDS_VERIFICATION',
          summary: 'AI service unavailable - manual review required',
          aiUnavailable: true
        };
      }
    }
  }

  // Final fallback
  console.warn('⚠️ AI verification exhausted all attempts');
  return {
    score: 65,
    isReal: true,
    observations: ['Event details provided for review'],
    redFlags: [],
    recommendations: ['Manual verification recommended'],
    verdict: 'NEEDS_VERIFICATION',
    summary: 'AI verification unavailable',
    aiUnavailable: true
  };
};

/**
 * Generate a summary of an OD request for quick review
 */
export const generateEventSummary = async (requestData) => {
  const client = createCerebrasClient();

  const teamMembersStr = requestData.team_members
    ? requestData.team_members.map(m => `${m.name} (${m.department}, Year ${m.year_of_study})`).join(', ')
    : 'No team members';

  const prompt = `Generate a concise summary of this OD (On-Duty) request for a college staff member to review:

STUDENT: ${requestData.student_name} (${requestData.department})
EVENT: ${requestData.event_name}
TYPE: ${requestData.event_type}
VENUE: ${requestData.venue}
DATES: ${requestData.event_start_date} to ${requestData.event_end_date}
ORGANIZER: ${requestData.organizer_name || 'Not specified'}
TEAM: ${teamMembersStr}
PARENT CONTACT: ${requestData.parent_name} (${requestData.parent_phone})

Provide a brief professional summary highlighting:
1. Key details at a glance
2. Duration of leave required
3. Any notable points for consideration
Keep it under 150 words.`;

  try {
    const response = await client.chat.completions.create({
      model: 'llama3.1-8b',
      messages: [
        {
          role: 'system',
          content: 'You are a helpful assistant that creates concise summaries for academic administrators.'
        },
        {
          role: 'user',
          content: prompt
        }
      ],
      temperature: 0.5,
      max_tokens: 300
    });

    return response.choices[0].message.content;
  } catch (error) {
    console.error('Summary generation error:', error);
    throw new Error('Failed to generate summary');
  }
};

/**
 * Chat with AI assistant for help with OD request review
 */
export const chatWithAI = async (message, context = {}) => {
  const client = createCerebrasClient();

  let systemPrompt = `You are an AI assistant for EventPass, a Smart OD (On-Duty) Letter Management System for colleges.
You help students, staff, and HODs with:
- How to apply for OD requests and what details are needed
- Understanding the approval workflow (Student → Staff → HOD)
- Event registration, tracking, and result submission
- Policies on attendance, eligibility, and documentation
- Technical help using the EventPass platform
Be helpful, concise, friendly, and professional. Keep responses short (2-4 sentences).`;

  if (context.eventDetails) {
    systemPrompt += `\n\nCurrent request context:\nEvent: ${context.eventDetails.event_name}\nStudent: ${context.eventDetails.student_name}`;
  }

  try {
    const response = await client.chat.completions.create({
      model: 'llama3.1-8b',
      messages: [
        {
          role: 'system',
          content: systemPrompt
        },
        {
          role: 'user',
          content: message
        }
      ],
      temperature: 0.7,
      max_tokens: 500
    });

    return response.choices[0].message.content;
  } catch (error) {
    console.error('Chat AI error:', error);
    throw new Error('AI chat failed');
  }
};

export default {
  verifyEventWithAI,
  generateEventSummary,
  chatWithAI
};
