import { useState } from 'react';
import { Link } from 'react-router-dom';
import './Docs.css';

// Prompt templates for different industries
const PROMPT_TEMPLATES = [
    {
        id: 'ecommerce',
        name: '🛒 E-commerce',
        description: 'For online stores and retail',
        prompt: `You are a friendly e-commerce assistant for our store.

WHAT YOU DO:
- Help customers find products
- Answer questions about shipping, returns, sizing
- Provide product recommendations
- Handle order inquiries

TONE: Friendly, helpful, uses 1-2 emojis

WHEN YOU DON'T KNOW:
Say "I'll check with our team and get back to you! May I have your email?"

EXAMPLE:
Customer: "Do you have this in blue?"
You: "Let me check! 💙 What product are you looking at? I'll check color availability for you."`
    },
    {
        id: 'real_estate',
        name: '🏠 Real Estate',
        description: 'For property listings and agencies',
        prompt: `You are a real estate assistant helping buyers and renters find properties.

WHAT YOU DO:
- Help find suitable properties based on requirements
- Answer location, amenities, pricing questions
- Schedule property viewings
- Qualify leads by budget

TONE: Professional yet warm

IMPORTANT: Always try to schedule a viewing or get contact info.

EXAMPLE:
Customer: "Looking for 2BHK in South Mumbai"
You: "Great choice! 🏠 What's your budget range? I'll find the best matches for you!"`
    },
    {
        id: 'saas',
        name: '💻 SaaS / Software',
        description: 'For software products and B2B services',
        prompt: `You are a product specialist for our software.

WHAT YOU DO:
- Explain features and benefits
- Handle pricing questions
- Offer demos and free trials
- Answer integration questions

TONE: Professional, knowledgeable

FOR PRICING: Share basic info, then offer a call for detailed discussion.

EXAMPLE:
Customer: "Does it integrate with Salesforce?"
You: "Yes! We have native Salesforce integration 🔗 It syncs in real-time. Want me to send the integration guide? Just share your email!"`
    },
    {
        id: 'healthcare',
        name: '🏥 Healthcare',
        description: 'For clinics and hospitals',
        prompt: `You are a healthcare assistant for our clinic.

IMPORTANT RULES:
- NEVER give medical advice or diagnoses
- For emergencies, direct to emergency services (112)
- Help with appointment booking only

WHAT YOU DO:
- Book appointments
- Share clinic hours and location
- Answer insurance questions

EXAMPLE:
Customer: "I need to see a doctor"
You: "I'd be happy to book an appointment! 🏥 What type of consultation - general checkup or specific issue? And your preferred time?"`
    },
    {
        id: 'services',
        name: '💼 Professional Services',
        description: 'For agencies and consultants',
        prompt: `You are a representative for our professional services company.

WHAT YOU DO:
- Understand client requirements
- Explain our services and process
- Provide rough timelines and pricing
- Schedule consultations

FOR PRICING: Ask about project scope first.

EXAMPLE:
Customer: "How much do you charge?"
You: "Our pricing depends on project scope! 💼 Could you share what you're looking to build? A quick 15-min call would help me give you an accurate quote."`
    },
    {
        id: 'lead_capture',
        name: '📋 Lead Capture',
        description: 'Focus on collecting contact info',
        prompt: `You are a friendly assistant focused on capturing leads.

YOUR GOAL: Collect name, email, and interest from every visitor.

HOW TO DO IT:
1. Greet warmly
2. Ask what they're interested in
3. Offer to send details/connect with team
4. Ask for email naturally

EXAMPLE:
You: "Hi! 👋 I'm here to help. What brings you here today?"
Customer: "Looking at your pricing"
You: "Great! I can send you our detailed pricing. What's your email? 📧"`
    },
    {
        id: 'appointment',
        name: '📅 Appointment Booking',
        description: 'Focus on scheduling meetings',
        prompt: `You are an appointment scheduling assistant.

YOUR GOAL: Book meetings/appointments for every interested visitor.

COLLECT:
- Name
- Preferred date and time
- Purpose of meeting
- Email (for calendar invite)

EXAMPLE:
Customer: "I want to discuss a project"
You: "Perfect! Let's schedule a call 📅 When works best for you - this week or next? Morning or afternoon?"`
    },
    {
        id: 'support',
        name: '🎧 Customer Support',
        description: 'For handling support queries',
        prompt: `You are a customer support agent.

WHAT YOU DO:
- Help resolve common issues
- Answer FAQs
- Escalate complex issues to human team

IMPORTANT:
- Be patient and empathetic
- If you can't help, say: "Let me connect you with our specialist team. They'll reach out within 2 hours!"

EXAMPLE:
Customer: "My order hasn't arrived"
You: "I'm sorry to hear that! 😟 Can you share your order number? I'll check the status right away."`
    }
];

// Quick tips for creating agents
const QUICK_TIPS = [
    {
        icon: '💡',
        title: 'Be Specific',
        tip: 'Tell the AI exactly what it should do. "Help customers find products" is better than "be helpful".'
    },
    {
        icon: '🎭',
        title: 'Set the Tone',
        tip: 'Describe the personality: friendly, professional, casual, formal. The AI will match it.'
    },
    {
        icon: '❓',
        title: 'Handle Unknowns',
        tip: 'Tell the AI what to do when it doesn\'t know something. "Ask for email and say team will follow up."'
    },
    {
        icon: '💬',
        title: 'Add Examples',
        tip: 'Include 2-3 example conversations. The AI learns best from examples.'
    },
    {
        icon: '📋',
        title: 'Capture Leads',
        tip: 'Tell the AI when to ask for name/email. "After user shows interest, ask for email."'
    },
    {
        icon: '🚫',
        title: 'Set Boundaries',
        tip: 'Define what the AI should NOT do. "Never discuss competitor pricing."'
    }
];

function Docs() {
    const [activeTab, setActiveTab] = useState<'templates' | 'guide' | 'tips'>('templates');
    const [copiedId, setCopiedId] = useState<string | null>(null);

    const copyToClipboard = (text: string, id: string) => {
        navigator.clipboard.writeText(text);
        setCopiedId(id);
        setTimeout(() => setCopiedId(null), 2000);
    };

    return (
        <div className="docs-page">
            <header className="docs-header">
                <div className="docs-header-content">
                    <Link to="/dashboard" className="back-link">← Back to Dashboard</Link>
                    <h1>📚 Quick Docs</h1>
                    <p>Prompt templates and tips to create better AI agents</p>
                </div>
            </header>

            <nav className="docs-tabs">
                <button
                    className={`tab ${activeTab === 'templates' ? 'active' : ''}`}
                    onClick={() => setActiveTab('templates')}
                >
                    📝 Prompt Templates
                </button>
                <button
                    className={`tab ${activeTab === 'guide' ? 'active' : ''}`}
                    onClick={() => setActiveTab('guide')}
                >
                    🚀 Quick Start Guide
                </button>
                <button
                    className={`tab ${activeTab === 'tips' ? 'active' : ''}`}
                    onClick={() => setActiveTab('tips')}
                >
                    💡 Tips & Tricks
                </button>
            </nav>

            <main className="docs-content">
                {/* Prompt Templates Tab */}
                {activeTab === 'templates' && (
                    <div className="templates-section">
                        <div className="section-intro">
                            <h2>Ready-to-Use Prompt Templates</h2>
                            <p>Copy these templates and customize them for your business. Click any template to copy!</p>
                        </div>

                        <div className="templates-grid">
                            {PROMPT_TEMPLATES.map(template => (
                                <div key={template.id} className="template-card">
                                    <div className="template-header">
                                        <h3>{template.name}</h3>
                                        <span className="template-desc">{template.description}</span>
                                    </div>
                                    <pre className="template-prompt">{template.prompt}</pre>
                                    <button
                                        className={`copy-btn ${copiedId === template.id ? 'copied' : ''}`}
                                        onClick={() => copyToClipboard(template.prompt, template.id)}
                                    >
                                        {copiedId === template.id ? '✓ Copied!' : '📋 Copy Template'}
                                    </button>
                                </div>
                            ))}
                        </div>

                        <div className="github-link">
                            <p>Want more templates? Check out our</p>
                            <a href="https://github.com/yourusername/waflow/wiki" target="_blank" rel="noopener noreferrer">
                                📖 Full Documentation on GitHub Wiki →
                            </a>
                        </div>
                    </div>
                )}

                {/* Quick Start Guide Tab */}
                {activeTab === 'guide' && (
                    <div className="guide-section">
                        <h2>🚀 Quick Start Guide</h2>

                        <div className="steps">
                            <div className="step">
                                <div className="step-number">1</div>
                                <div className="step-content">
                                    <h3>Create Your Agent</h3>
                                    <p>Go to <Link to="/agent">Agent Creator</Link> and give your agent a name. This is how it will introduce itself to customers.</p>
                                </div>
                            </div>

                            <div className="step">
                                <div className="step-number">2</div>
                                <div className="step-content">
                                    <h3>Write Your Prompt</h3>
                                    <p>Tell the AI what to do. Use our templates above as a starting point, then customize for your business.</p>
                                    <div className="info-box">
                                        <strong>Include:</strong> What to do, tone/personality, how to handle unknowns, example conversations
                                    </div>
                                </div>
                            </div>

                            <div className="step">
                                <div className="step-number">3</div>
                                <div className="step-content">
                                    <h3>Add Knowledge Base</h3>
                                    <p>Upload documents (PDF, DOCX, TXT) or paste URLs. The AI will use this to answer customer questions accurately.</p>
                                    <div className="info-box">
                                        <strong>Good sources:</strong> FAQ pages, product catalog, pricing sheets, company info
                                    </div>
                                </div>
                            </div>

                            <div className="step">
                                <div className="step-number">4</div>
                                <div className="step-content">
                                    <h3>Connect WhatsApp</h3>
                                    <p>Go to <Link to="/onboarding">Setup</Link> and scan the QR code with WhatsApp. Your agent goes live instantly!</p>
                                </div>
                            </div>

                            <div className="step">
                                <div className="step-number">5</div>
                                <div className="step-content">
                                    <h3>Test & Improve</h3>
                                    <p>Send test messages and see how your agent responds. Refine the prompt based on conversations.</p>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {/* Tips Tab */}
                {activeTab === 'tips' && (
                    <div className="tips-section">
                        <h2>💡 Tips for Better AI Responses</h2>

                        <div className="tips-grid">
                            {QUICK_TIPS.map((tip, index) => (
                                <div key={index} className="tip-card">
                                    <span className="tip-icon">{tip.icon}</span>
                                    <h3>{tip.title}</h3>
                                    <p>{tip.tip}</p>
                                </div>
                            ))}
                        </div>

                        <div className="best-practices">
                            <h3>📌 Best Practices for Knowledge Base</h3>
                            <ul>
                                <li><strong>Be concise:</strong> Short, clear documents work better than long ones</li>
                                <li><strong>Use headings:</strong> Structure with headers helps AI find info faster</li>
                                <li><strong>Update regularly:</strong> Keep pricing and info current</li>
                                <li><strong>Include FAQs:</strong> Common questions = better answers</li>
                            </ul>
                        </div>

                        <div className="prompt-structure">
                            <h3>📝 Ideal Prompt Structure</h3>
                            <pre className="structure-example">{`[WHO YOU ARE]
You are [Agent Name], a [role] for [Company].

[WHAT YOU DO]
- Task 1
- Task 2
- Task 3

[YOUR TONE]
Be [friendly/professional/casual]. Use [0-2] emojis.

[WHEN YOU DON'T KNOW]
Say: "[Your fallback message]"

[EXAMPLE CONVERSATION]
Customer: "[Sample question]"
You: "[Ideal response]"`}</pre>
                        </div>
                    </div>
                )}
            </main>

            <footer className="docs-footer">
                <p>Need help? <a href="mailto:contact@krtrim.com">Contact Support</a></p>
                <p>For detailed documentation, visit our <a href="https://github.com/shyanukant/waflow/wiki/Documentation#waflow-documentation" target="_blank" rel="noopener noreferrer">GitHub Wiki</a></p>
            </footer>
        </div>
    );
}

export default Docs;
