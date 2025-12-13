/**
 * AI Function Tools (Function Calling)
 * 
 * These tools allow the AI to take structured actions like:
 * - Saving lead information
 * - Booking appointments
 * - Escalating to human
 * - Searching products
 */

// ============================================================================
// TOOL DEFINITIONS (OpenAI Function Calling Format)
// ============================================================================

export interface ToolDefinition {
    type: 'function';
    function: {
        name: string;
        description: string;
        parameters: {
            type: 'object';
            properties: Record<string, any>;
            required: string[];
        };
    };
}

/**
 * Available tools for the AI agent
 */
export const AI_TOOLS: ToolDefinition[] = [
    {
        type: 'function',
        function: {
            name: 'save_lead_info',
            description: 'Save or update lead information when user provides their name, email, or shows interest in a product/service',
            parameters: {
                type: 'object',
                properties: {
                    name: {
                        type: 'string',
                        description: 'The name the user provided'
                    },
                    email: {
                        type: 'string',
                        description: 'The email address the user provided'
                    },
                    interest: {
                        type: 'string',
                        description: 'What the user is interested in (product, service, topic)'
                    },
                    intent_level: {
                        type: 'string',
                        enum: ['low', 'medium', 'high'],
                        description: 'How likely they are to convert based on their messages'
                    }
                },
                required: []
            }
        }
    },
    {
        type: 'function',
        function: {
            name: 'request_human_handoff',
            description: 'Request to transfer the conversation to a human agent when you cannot help or user requests it',
            parameters: {
                type: 'object',
                properties: {
                    reason: {
                        type: 'string',
                        description: 'Why handoff is needed (complaint, complex issue, user request, etc.)'
                    },
                    priority: {
                        type: 'string',
                        enum: ['low', 'medium', 'high', 'urgent'],
                        description: 'Urgency of the handoff'
                    },
                    summary: {
                        type: 'string',
                        description: 'Brief summary of the conversation for the human agent'
                    }
                },
                required: ['reason', 'priority']
            }
        }
    },
    {
        type: 'function',
        function: {
            name: 'log_feedback',
            description: 'Log user feedback, complaints, or suggestions',
            parameters: {
                type: 'object',
                properties: {
                    type: {
                        type: 'string',
                        enum: ['positive', 'negative', 'suggestion', 'complaint', 'question'],
                        description: 'Type of feedback'
                    },
                    content: {
                        type: 'string',
                        description: 'The feedback content'
                    }
                },
                required: ['type', 'content']
            }
        }
    },
    {
        type: 'function',
        function: {
            name: 'search_products',
            description: 'Search for products or services in the catalog (use when user asks about specific items)',
            parameters: {
                type: 'object',
                properties: {
                    query: {
                        type: 'string',
                        description: 'Search query for products/services'
                    },
                    category: {
                        type: 'string',
                        description: 'Optional category filter'
                    },
                    price_range: {
                        type: 'string',
                        enum: ['budget', 'mid-range', 'premium'],
                        description: 'Price range preference'
                    }
                },
                required: ['query']
            }
        }
    },
    {
        type: 'function',
        function: {
            name: 'schedule_callback',
            description: 'Schedule a callback or appointment for the user',
            parameters: {
                type: 'object',
                properties: {
                    preferred_time: {
                        type: 'string',
                        description: 'When the user prefers to be contacted (e.g., "tomorrow afternoon", "Monday 10am")'
                    },
                    purpose: {
                        type: 'string',
                        description: 'Purpose of the callback (demo, consultation, support, etc.)'
                    },
                    contact_method: {
                        type: 'string',
                        enum: ['phone', 'whatsapp', 'email', 'video_call'],
                        description: 'How the user prefers to be contacted'
                    }
                },
                required: ['purpose']
            }
        }
    },
    // ================== CALENDAR & REMINDER TOOLS ==================
    {
        type: 'function',
        function: {
            name: 'create_calendar_event',
            description: 'Create a meeting/event in Google Calendar when user wants to schedule a meeting, demo, or appointment',
            parameters: {
                type: 'object',
                properties: {
                    title: {
                        type: 'string',
                        description: 'Title of the meeting (e.g., "Demo with John", "Consultation Call")'
                    },
                    date: {
                        type: 'string',
                        description: 'Date of the meeting (e.g., "2024-12-15", "tomorrow", "next Monday")'
                    },
                    time: {
                        type: 'string',
                        description: 'Time of the meeting (e.g., "10:00 AM", "2:30 PM", "afternoon")'
                    },
                    duration_minutes: {
                        type: 'number',
                        description: 'Duration in minutes (default: 30)'
                    },
                    attendee_email: {
                        type: 'string',
                        description: 'Email of the attendee to invite'
                    },
                    description: {
                        type: 'string',
                        description: 'Optional description or agenda for the meeting'
                    },
                    meeting_type: {
                        type: 'string',
                        enum: ['demo', 'consultation', 'support', 'sales', 'followup', 'other'],
                        description: 'Type of meeting'
                    }
                },
                required: ['title', 'date', 'time']
            }
        }
    },
    {
        type: 'function',
        function: {
            name: 'set_reminder',
            description: 'Set a reminder to follow up with the user at a specific time',
            parameters: {
                type: 'object',
                properties: {
                    reminder_time: {
                        type: 'string',
                        description: 'When to send the reminder (e.g., "tomorrow 9am", "in 2 hours", "next week")'
                    },
                    reminder_message: {
                        type: 'string',
                        description: 'What to remind about'
                    },
                    reminder_type: {
                        type: 'string',
                        enum: ['followup', 'meeting_reminder', 'quote_followup', 'payment_reminder', 'custom'],
                        description: 'Type of reminder'
                    },
                    user_phone: {
                        type: 'string',
                        description: 'Phone number to send reminder to (WhatsApp)'
                    }
                },
                required: ['reminder_time', 'reminder_message']
            }
        }
    },
    {
        type: 'function',
        function: {
            name: 'trigger_followup',
            description: 'Trigger a follow-up action when user shows interest but conversation pauses',
            parameters: {
                type: 'object',
                properties: {
                    followup_type: {
                        type: 'string',
                        enum: ['lead_nurture', 'quote_sent', 'meeting_scheduled', 'demo_completed', 'proposal_sent', 'cold_lead'],
                        description: 'Type of follow-up needed'
                    },
                    delay_hours: {
                        type: 'number',
                        description: 'Hours to wait before follow-up (default: 24)'
                    },
                    message_template: {
                        type: 'string',
                        description: 'Optional custom follow-up message'
                    },
                    priority: {
                        type: 'string',
                        enum: ['low', 'medium', 'high'],
                        description: 'Priority of follow-up'
                    }
                },
                required: ['followup_type']
            }
        }
    }
];

// Calendar-related tool indices
const CALENDAR_TOOLS_START = 5; // Index where calendar tools start

/**
 * Get tools for a specific use case
 */
export const getToolsForIndustry = (industry: string): ToolDefinition[] => {
    const baseTools = [AI_TOOLS[0], AI_TOOLS[1], AI_TOOLS[2]]; // save_lead, handoff, feedback
    const calendarTools = AI_TOOLS.slice(CALENDAR_TOOLS_START); // All calendar tools

    switch (industry) {
        case 'ecommerce':
            return [...baseTools, AI_TOOLS[3], ...calendarTools]; // + search_products + calendar
        case 'services':
        case 'real_estate':
        case 'healthcare':
        case 'saas':
            return [...baseTools, AI_TOOLS[4], ...calendarTools]; // + schedule_callback + calendar
        default:
            return [...baseTools, ...calendarTools]; // base + calendar
    }
};

/**
 * Get only calendar-related tools
 */
export const getCalendarTools = (): ToolDefinition[] => {
    return AI_TOOLS.slice(CALENDAR_TOOLS_START);
};

/**
 * Format tools for OpenRouter API (same as OpenAI format)
 */
export const formatToolsForAPI = (tools: ToolDefinition[]) => {
    return tools.map(tool => ({
        type: tool.type,
        function: tool.function
    }));
};

export default {
    AI_TOOLS,
    getToolsForIndustry,
    getCalendarTools,
    formatToolsForAPI,
};
