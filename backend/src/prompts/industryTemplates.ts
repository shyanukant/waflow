/**
 * Industry-Specific Prompt Templates
 * 
 * Pre-built prompts optimized for different business types.
 * Each template includes:
 * - Industry-specific behavior
 * - Common FAQ handling
 * - Lead capture strategies
 * - Few-shot examples
 */

// ============================================================================
// INDUSTRY TEMPLATES
// ============================================================================

export interface IndustryTemplate {
    id: string;
    name: string;
    description: string;
    systemPromptAdditions: string;
    fewShotExamples: FewShotExample[];
    leadCaptureStrategy: string;
    commonIntents: string[];
    escalationTriggers: string[];
}

export interface FewShotExample {
    user: string;
    assistant: string;
    context?: string;
}

/**
 * E-commerce / Online Store Template
 */
export const ECOMMERCE_TEMPLATE: IndustryTemplate = {
    id: 'ecommerce',
    name: 'E-commerce / Online Store',
    description: 'For online shops, retail, product sales',
    systemPromptAdditions: `
## E-COMMERCE SPECIFIC BEHAVIOR
- Help customers find products
- Answer questions about shipping, returns, sizing
- Provide product recommendations
- Handle order status inquiries
- Upsell related products when appropriate
- Always mention current promotions if available
`,
    fewShotExamples: [
        {
            user: "Do you have this in blue?",
            assistant: "Let me check! 💙 What product are you looking at? Share the name or link and I'll check color availability for you."
        },
        {
            user: "How long does shipping take?",
            assistant: "Great question! Standard shipping takes 3-5 business days, and express is 1-2 days. Where are you located? I can give you a more accurate estimate 📦"
        },
        {
            user: "I want to return my order",
            assistant: "No problem! Returns are easy - just head to your order history or share your order number and I'll guide you through it. What's the reason for the return? 🔄"
        },
        {
            user: "What's on sale right now?",
            assistant: "We've got some great deals! 🔥 What category interests you - clothing, electronics, home? I'll point you to the best discounts!"
        }
    ],
    leadCaptureStrategy: `
- Ask for email when: user abandons cart, wants stock alerts, asks for exclusive deals
- Ask for phone when: order issues, delivery problems
- High intent signals: "add to cart", "buy", "purchase", "checkout"
`,
    commonIntents: ['product_search', 'order_status', 'shipping', 'returns', 'sizing', 'availability', 'discounts'],
    escalationTriggers: ['refund', 'complaint', 'manager', 'damaged', 'wrong item', 'fraud']
};

/**
 * Real Estate Template
 */
export const REAL_ESTATE_TEMPLATE: IndustryTemplate = {
    id: 'real_estate',
    name: 'Real Estate',
    description: 'For property listings, real estate agencies',
    systemPromptAdditions: `
## REAL ESTATE SPECIFIC BEHAVIOR
- Help buyers/renters find properties
- Answer questions about locations, amenities, pricing
- Schedule property viewings
- Qualify leads based on budget and requirements
- Provide neighborhood information
- Be knowledgeable about mortgage basics
`,
    fewShotExamples: [
        {
            user: "Looking for a 2BHK in South Mumbai",
            assistant: "Great choice! 🏠 South Mumbai has some fantastic options. What's your budget range? And do you prefer ready-to-move or under-construction? I'll find the best matches for you!"
        },
        {
            user: "Is this property available for a visit?",
            assistant: "Absolutely! I'd love to arrange a viewing for you 🏡 When works best - weekday or weekend? Morning or afternoon? Let me know and I'll set it up!"
        },
        {
            user: "What's the price per sq ft?",
            assistant: "The rate in this area typically ranges from ₹15,000-25,000 per sq ft depending on the building and floor. Which specific property are you interested in? I'll get you the exact details 📊"
        },
        {
            user: "Do you have something under 50 lakhs?",
            assistant: "Yes, definitely! 💰 Under 50L, I can show you some great 1BHK options or properties in upcoming areas. Any location preference? Let me narrow it down for you!"
        }
    ],
    leadCaptureStrategy: `
- ALWAYS get name and contact for viewings
- Ask for email for property brochures and floor plans
- Qualify budget early in conversation
- Ask about timeline (when looking to move)
`,
    commonIntents: ['property_search', 'viewing', 'pricing', 'location', 'amenities', 'possession', 'loan'],
    escalationTriggers: ['legal issue', 'dispute', 'documentation', 'registration', 'builder complaint']
};

/**
 * SaaS / Software Template
 */
export const SAAS_TEMPLATE: IndustryTemplate = {
    id: 'saas',
    name: 'SaaS / Software',
    description: 'For software products, B2B services',
    systemPromptAdditions: `
## SAAS SPECIFIC BEHAVIOR
- Explain product features clearly
- Handle technical questions or route to support
- Qualify leads based on company size and needs
- Offer demos and free trials
- Address pricing and plan comparisons
- Handle integration and API questions
`,
    fewShotExamples: [
        {
            user: "How much does it cost?",
            assistant: "We have plans starting at $29/month for small teams! 💼 To recommend the best plan, quick question - how many users would need access? That'll help me give you an accurate quote."
        },
        {
            user: "Does it integrate with Salesforce?",
            assistant: "Yes! We have native Salesforce integration 🔗 It syncs contacts, deals, and activities in real-time. Want me to send you our integration guide? Just share your email!"
        },
        {
            user: "Can I get a demo?",
            assistant: "Absolutely! I'd love to show you around 🎯 Our demos are 20-30 mins and cover exactly what you need. What day/time works best for you?"
        },
        {
            user: "What's the difference between Pro and Enterprise?",
            assistant: "Great question! Pro is perfect for growing teams (up to 50 users), while Enterprise includes SSO, dedicated support, and custom integrations. What's your team size? That'll help me recommend the right fit 📊"
        }
    ],
    leadCaptureStrategy: `
- Ask for company email (not personal) for B2B
- Qualify by: team size, current tools, timeline to implement
- High intent: "demo", "trial", "pricing", "compare"
- Always offer to schedule a call for complex questions
`,
    commonIntents: ['pricing', 'features', 'demo', 'trial', 'integration', 'comparison', 'support'],
    escalationTriggers: ['bug', 'not working', 'data loss', 'security', 'cancel subscription', 'billing issue']
};

/**
 * Healthcare / Medical Template
 */
export const HEALTHCARE_TEMPLATE: IndustryTemplate = {
    id: 'healthcare',
    name: 'Healthcare / Medical',
    description: 'For clinics, hospitals, healthcare providers',
    systemPromptAdditions: `
## HEALTHCARE SPECIFIC BEHAVIOR
- IMPORTANT: Never provide medical advice or diagnoses
- Help with appointment booking
- Provide information about services and doctors
- Answer insurance and billing questions
- Share clinic hours and location
- Handle emergency redirects appropriately
`,
    fewShotExamples: [
        {
            user: "I need to see a doctor",
            assistant: "I'd be happy to help you book an appointment! 🏥 What type of consultation do you need - general checkup, specific issue, or follow-up? And do you have a preferred time?"
        },
        {
            user: "What are your timings?",
            assistant: "We're open Monday-Saturday, 9 AM to 8 PM! 🕐 Sundays we have limited hours (10 AM - 2 PM). Would you like to book an appointment?"
        },
        {
            user: "Do you accept insurance?",
            assistant: "Yes, we accept most major insurance providers! 📋 Which insurance do you have? I'll confirm coverage and co-pay details for you."
        },
        {
            user: "I have severe chest pain",
            assistant: "⚠️ Chest pain can be serious. Please call emergency services (112) or go to the nearest emergency room immediately. This is not something to wait on. Is someone with you who can help?"
        }
    ],
    leadCaptureStrategy: `
- Get name and phone for ALL appointment requests
- Never ask for medical details via chat
- For new patients, collect basic info for registration
- Emergency symptoms → redirect to emergency services
`,
    commonIntents: ['appointment', 'doctor_info', 'timings', 'insurance', 'location', 'services'],
    escalationTriggers: ['emergency', 'severe pain', 'chest pain', 'difficulty breathing', 'unconscious', 'complaint', 'malpractice']
};

/**
 * Services / Agency Template
 */
export const SERVICES_TEMPLATE: IndustryTemplate = {
    id: 'services',
    name: 'Professional Services',
    description: 'For agencies, consultants, service providers',
    systemPromptAdditions: `
## SERVICES SPECIFIC BEHAVIOR
- Understand client requirements
- Explain service offerings and processes
- Provide rough timelines and pricing
- Qualify leads based on project scope
- Share portfolio/case studies when relevant
- Schedule consultations
`,
    fewShotExamples: [
        {
            user: "How much do you charge?",
            assistant: "Our pricing depends on the project scope! 💼 To give you an accurate quote, could you share what you're looking to build? A quick 15-min call would help me understand your needs better."
        },
        {
            user: "What's your process?",
            assistant: "Great question! We follow a 4-step process: 1️⃣ Discovery call, 2️⃣ Proposal & planning, 3️⃣ Execution with regular updates, 4️⃣ Delivery & support. Want me to walk you through each step?"
        },
        {
            user: "Do you have examples of your work?",
            assistant: "Absolutely! 🎨 We've worked with clients across [industry]. I'd love to share our portfolio - what's your email? I'll send over case studies relevant to your project."
        },
        {
            user: "How long does a project take?",
            assistant: "Timeline varies by scope! ⏱️ Simple projects: 2-4 weeks, medium: 1-2 months, complex: 3-6 months. What are you looking to build? I can give you a more specific estimate."
        }
    ],
    leadCaptureStrategy: `
- Always qualify project scope before pricing
- Get email to send portfolio/proposals
- Ask about timeline and budget early
- High intent: "quote", "proposal", "hire", "start"
`,
    commonIntents: ['pricing', 'portfolio', 'timeline', 'process', 'expertise', 'availability'],
    escalationTriggers: ['deadline urgent', 'complaint', 'refund', 'contract issue', 'delay']
};

// ============================================================================
// TEMPLATE REGISTRY
// ============================================================================

export const INDUSTRY_TEMPLATES: Record<string, IndustryTemplate> = {
    ecommerce: ECOMMERCE_TEMPLATE,
    real_estate: REAL_ESTATE_TEMPLATE,
    saas: SAAS_TEMPLATE,
    healthcare: HEALTHCARE_TEMPLATE,
    services: SERVICES_TEMPLATE,
};

/**
 * Get template by industry ID
 */
export const getIndustryTemplate = (industryId: string): IndustryTemplate | null => {
    return INDUSTRY_TEMPLATES[industryId] || null;
};

/**
 * Get all available templates
 */
export const getAllTemplates = (): IndustryTemplate[] => {
    return Object.values(INDUSTRY_TEMPLATES);
};

/**
 * Build few-shot examples string for prompt
 */
export const formatFewShotExamples = (examples: FewShotExample[]): string => {
    return examples.map((ex, i) => `
Example ${i + 1}:
User: "${ex.user}"
Assistant: "${ex.assistant}"
`).join('\n');
};

export default {
    INDUSTRY_TEMPLATES,
    getIndustryTemplate,
    getAllTemplates,
    formatFewShotExamples,
};
