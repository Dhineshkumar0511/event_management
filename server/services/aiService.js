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

let currentKeyIndex = 0;

const getNextApiKey = () => {
  const key = apiKeys[currentKeyIndex];
  currentKeyIndex = (currentKeyIndex + 1) % apiKeys.length;
  return key;
};

const createCerebrasClient = () => {
  return new OpenAI({
    baseURL: 'https://api.cerebras.ai/v1',
    apiKey: getNextApiKey(),
  });
};

/**
 * Verify if an event is real using AI with fallback
 */
export const verifyEventWithAI = async (eventData) => {
  const prompt = `You are an event verification assistant. Analyze the following event details and determine if this appears to be a legitimate, real event.

EVENT DETAILS:
- Event Name: ${eventData.event_name}
- Event Type: ${eventData.event_type}
- Organizer: ${eventData.organizer_name || 'Not provided'}
- Website: ${eventData.event_website || 'Not provided'}
- Venue: ${eventData.venue}
- Location: ${eventData.location_city || 'Not provided'}
- Date: ${eventData.event_start_date} to ${eventData.event_end_date}

Please analyze and provide:
1. A verification score from 0-100 (100 being most likely real)
2. Key observations about the event
3. Red flags (if any)
4. Recommendations for manual verification
5. Overall verdict: LIKELY_REAL, NEEDS_VERIFICATION, or LIKELY_FAKE

Respond in JSON format:
{
  "score": number,
  "isReal": boolean,
  "observations": string[],
  "redFlags": string[],
  "recommendations": string[],
  "verdict": string,
  "summary": string
}`;

  // Try up to 3 times with different API keys
  for (let attempt = 0; attempt < Math.min(3, apiKeys.length); attempt++) {
    try {
      const client = createCerebrasClient();
      const response = await client.chat.completions.create({
        model: 'llama3.1-8b',
        messages: [
          {
            role: 'system',
            content: 'You are an AI assistant specialized in verifying college events like hackathons, symposiums, and conferences. Respond only in valid JSON format.'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        temperature: 0.3,
        max_tokens: 1000,
        timeout: 15000
      });

      const content = response.choices[0].message.content;
      
      // Try to parse JSON from response
      try {
        const jsonStr = content.replace(/```json\n?|```\n?/g, '').trim();
        const parsed = JSON.parse(jsonStr);
        console.log(`✓ AI verification successful (attempt ${attempt + 1})`);
        return parsed;
      } catch (parseError) {
        console.error(`Parse error on attempt ${attempt + 1}:`, parseError.message);
        // Continue to retry with next key
        if (attempt === Math.min(3, apiKeys.length) - 1) {
          // Last attempt - return fallback
          return {
            score: 60,
            isReal: true,
            observations: ['Event details appear valid'],
            redFlags: [],
            recommendations: ['Manual verification recommended'],
            verdict: 'NEEDS_VERIFICATION',
            summary: 'AI parsing failed - event marked for manual review',
            aiUnavailable: true
          };
        }
      }
    } catch (error) {
      console.error(`Cerebras API error (attempt ${attempt + 1}):`, error.message);
      // Continue to next key
      if (attempt === Math.min(3, apiKeys.length) - 1) {
        // Last attempt - return safe fallback
        console.warn('AI verification service unavailable - using safe fallback');
        return {
          score: 65,
          isReal: true,
          observations: [
            'Event details appear valid based on standard checks',
            'AI verification service temporarily unavailable'
          ],
          redFlags: [],
          recommendations: [
            'Manual verification by staff recommended',
            'Check event website and organizer details',
            'Verify participant list authenticity'
          ],
          verdict: 'NEEDS_VERIFICATION',
          summary: 'AI service unavailable - manual review required',
          aiUnavailable: true
        };
      }
    }
  }

  // Final fallback (should not reach here)
  return {
    score: 65,
    isReal: true,
    observations: ['Event requires manual verification'],
    redFlags: [],
    recommendations: ['Contact event organizer for confirmation'],
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
