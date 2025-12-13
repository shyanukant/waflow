// Trial Service - Manages 24-hour trial period for WhatsApp connection
import { db, users } from '../../db/index.js';
import { eq } from 'drizzle-orm';

const TRIAL_DURATION_HOURS = 24;

export interface TrialStatus {
    isTrialActive: boolean;
    isTrialExpired: boolean;
    hoursRemaining: number;
    minutesRemaining: number;
    trialStartedAt: Date | null;
    connectionMode: 'trial' | 'api';
    hasApiKey: boolean;
}

/**
 * Start trial for a user (called on first WhatsApp connection)
 */
export const startTrial = async (userId: string): Promise<void> => {
    await db.update(users)
        .set({
            trialStartedAt: new Date(),
            connectionMode: 'trial',
            updatedAt: new Date(),
        })
        .where(eq(users.id, userId));
};

/**
 * Get trial status for a user
 */
export const getTrialStatus = async (userId: string): Promise<TrialStatus> => {
    const user = await db.query.users.findFirst({
        where: eq(users.id, userId),
    });

    if (!user) {
        throw new Error('User not found');
    }

    const hasApiKey = !!(user.whatsappApiKey && user.whatsappProvider);
    const connectionMode = user.connectionMode as 'trial' | 'api';

    // If using API key, trial doesn't matter
    if (connectionMode === 'api' && hasApiKey) {
        return {
            isTrialActive: false,
            isTrialExpired: false,
            hoursRemaining: 0,
            minutesRemaining: 0,
            trialStartedAt: user.trialStartedAt,
            connectionMode: 'api',
            hasApiKey: true,
        };
    }

    // Calculate trial status
    if (!user.trialStartedAt) {
        // Trial not started yet
        return {
            isTrialActive: false,
            isTrialExpired: false,
            hoursRemaining: TRIAL_DURATION_HOURS,
            minutesRemaining: 0,
            trialStartedAt: null,
            connectionMode: 'trial',
            hasApiKey,
        };
    }

    const now = new Date();
    const trialEnd = new Date(user.trialStartedAt);
    trialEnd.setHours(trialEnd.getHours() + TRIAL_DURATION_HOURS);

    const msRemaining = trialEnd.getTime() - now.getTime();
    const isExpired = msRemaining <= 0;

    const hoursRemaining = Math.max(0, Math.floor(msRemaining / (1000 * 60 * 60)));
    const minutesRemaining = Math.max(0, Math.floor((msRemaining % (1000 * 60 * 60)) / (1000 * 60)));

    return {
        isTrialActive: !isExpired,
        isTrialExpired: isExpired,
        hoursRemaining,
        minutesRemaining,
        trialStartedAt: user.trialStartedAt,
        connectionMode: 'trial',
        hasApiKey,
    };
};

/**
 * Check if user can use WhatsApp (trial active or has API key)
 */
export const canUseWhatsApp = async (userId: string): Promise<{ allowed: boolean; reason?: string }> => {
    const status = await getTrialStatus(userId);

    if (status.connectionMode === 'api' && status.hasApiKey) {
        return { allowed: true };
    }

    if (status.isTrialActive) {
        return { allowed: true };
    }

    if (status.isTrialExpired) {
        return {
            allowed: false,
            reason: 'Your 24-hour trial has expired. Please add your WhatsApp Business API key to continue.',
        };
    }

    // Trial not started - allow (will start on first connection)
    return { allowed: true };
};

/**
 * Save user's WhatsApp API settings
 */
export const saveApiSettings = async (
    userId: string,
    provider: string,
    apiKey: string,
    phoneNumberId?: string
): Promise<void> => {
    await db.update(users)
        .set({
            whatsappProvider: provider,
            whatsappApiKey: apiKey,
            whatsappPhoneNumberId: phoneNumberId || null,
            connectionMode: 'api',
            updatedAt: new Date(),
        })
        .where(eq(users.id, userId));
};

/**
 * Clear API settings and switch back to trial mode
 */
export const clearApiSettings = async (userId: string): Promise<void> => {
    await db.update(users)
        .set({
            whatsappProvider: null,
            whatsappApiKey: null,
            whatsappPhoneNumberId: null,
            connectionMode: 'trial',
            updatedAt: new Date(),
        })
        .where(eq(users.id, userId));
};

/**
 * Get WhatsApp provider documentation links
 */
export const getProviderDocs = () => [
    {
        id: 'meta',
        name: 'Meta Cloud API',
        description: 'Direct WhatsApp Business API from Meta/Facebook',
        docsUrl: 'https://developers.facebook.com/docs/whatsapp/cloud-api/get-started',
        setupUrl: 'https://business.facebook.com/settings/whatsapp-business-accounts',
        free: true,
        fields: ['apiKey', 'phoneNumberId'],
    },
    {
        id: 'twilio',
        name: 'Twilio',
        description: 'Easy-to-use WhatsApp API with good documentation',
        docsUrl: 'https://www.twilio.com/docs/whatsapp/api',
        setupUrl: 'https://console.twilio.com/us1/develop/sms/try-it-out/whatsapp-learn',
        free: false,
        fields: ['apiKey'],
    },
    {
        id: '360dialog',
        name: '360dialog',
        description: 'Popular WhatsApp Business API provider',
        docsUrl: 'https://docs.360dialog.com/',
        setupUrl: 'https://hub.360dialog.com/',
        free: false,
        fields: ['apiKey'],
    },
];
