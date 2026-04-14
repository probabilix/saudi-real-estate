export declare class AiService {
    /**
     * Translates and enhances a broker's bio or listing description.
     * Uses separate key if provided for cost tracking.
     */
    static translateAndEnhance(text: string, fromLang: 'en' | 'ar', toLang: 'en' | 'ar', context?: 'bio' | 'listing' | 'title'): Promise<string>;
    /**
     * Generates a professional broker title or headline based on their experience and focus areas.
     */
    static generateProfessionalTitle(languages: string[], experience: string, areas: string[], targetLang: 'en' | 'ar'): Promise<string>;
}
//# sourceMappingURL=ai.service.d.ts.map