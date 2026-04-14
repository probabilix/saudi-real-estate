import { GoogleGenerativeAI } from '@google/generative-ai';

// Base API Key for General AI Tasks
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');

export class AiService {
  /**
   * Translates and enhances a broker's bio or listing description.
   * Uses separate key if provided for cost tracking.
   */
  static async translateAndEnhance(
    text: string, 
    fromLang: 'en' | 'ar', 
    toLang: 'en' | 'ar',
    context: 'bio' | 'listing' | 'title' = 'bio'
  ): Promise<string> {
    try {
      // Use specific translation key if available, otherwise fallback to general key
      const translationApiKey = process.env.GEMINI_API_KEY_TRANSLATION || process.env.GEMINI_API_KEY || '';
      const translationAI = new GoogleGenerativeAI(translationApiKey);
      
      // Upgraded to Gemini 2.5 Flash-Lite as per user request
      const model = translationAI.getGenerativeModel({ model: 'gemini-2.5-flash-lite' });

      const prompt = `
        Task: Translate and transform a real estate ${context === 'title' ? 'professional title/headline' : 'broker bio/description'} for the Saudi Arabian market.
        Source Language: ${fromLang === 'en' ? 'English' : 'Arabic'}
        Target Language: ${toLang === 'en' ? 'English' : 'Arabic'}
        
        Rules:
        1. Maintain a professional, high-end, and trust-building tone.
        2. Ensure technical real estate terms are accurate for the Kingdom of Saudi Arabia.
        3. ${context === 'title' 
            ? 'Keep the result concise (max 60 characters) and catchy. Return ONLY the translated string.' 
            : 'ELABORATE CREATIVELY. Expand the input into a compelling, professional 2-3 sentence description. YOU MUST RETURN A VALID JSON OBJECT with keys "en" and "ar" containing the expanded version in English and Arabic respectively. Ensure both versions reflect the same high-quality professional tone.'
        }
        4. Return ONLY the result (string for title, JSON for bio) without any quotes or explanations.

        Text to process:
        "${text}"
      `;

      const result = await model.generateContent(prompt);
      const response = await result.response;
      return response.text().trim();
    } catch (error) {
      console.error('AI Translation Error:', error);
      throw new Error('Failed to process AI translation');
    }
  }

  /**
   * Generates a professional broker title or headline based on their experience and focus areas.
   */
  static async generateProfessionalTitle(
    languages: string[],
    experience: string,
    areas: string[],
    targetLang: 'en' | 'ar'
  ): Promise<string> {
    try {
      const apiKey = process.env.GEMINI_API_KEY_TRANSLATION || process.env.GEMINI_API_KEY || '';
      const ai = new GoogleGenerativeAI(apiKey);
      const model = ai.getGenerativeModel({ model: 'gemini-2.5-flash-lite' });

      const prompt = `
        Create a professional real estate broker title in ${targetLang === 'en' ? 'English' : 'Arabic'}.
        Broker Details:
        - Experience: ${experience} years
        - Focus Areas: ${areas.join(', ')}
        - Languages: ${languages.join(', ')}

        Requirements:
        1. Keep it under 60 characters.
        2. Focus on authority and local expertise.
        3. Return ONLY the title text.
      `;

      const result = await model.generateContent(prompt);
      const response = await result.response;
      return response.text().trim();
    } catch (error) {
      console.error('AI Title Generation Error:', error);
      return ''; // Fallback to empty if AI fails
    }
  }
}
