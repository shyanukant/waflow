/**
 * Google Calendar Service
 * 
 * Handles calendar operations:
 * - Creating events/meetings
 * - Setting reminders
 * - Managing follow-ups
 * 
 * Requires Google Calendar API credentials from the user.
 */

import { google, calendar_v3 } from 'googleapis';
import { db, users } from '../../db/index.js';
import { eq } from 'drizzle-orm';

// ============================================================================
// TYPES
// ============================================================================

interface CalendarEvent {
    title: string;
    date: string;
    time: string;
    duration_minutes?: number;
    attendee_email?: string;
    description?: string;
    meeting_type?: string;
}

interface Reminder {
    reminder_time: string;
    reminder_message: string;
    reminder_type?: string;
    user_phone?: string;
}

interface FollowUp {
    followup_type: string;
    delay_hours?: number;
    message_template?: string;
    priority?: string;
    user_phone?: string;
}

interface CalendarCredentials {
    access_token: string;
    refresh_token: string;
    expiry_date?: number;
}

// ============================================================================
// OAUTH CONFIGURATION
// ============================================================================

const SCOPES = [
    'https://www.googleapis.com/auth/calendar',
    'https://www.googleapis.com/auth/calendar.events'
];

/**
 * Create OAuth2 client for Google Calendar
 */
const createOAuth2Client = () => {
    const clientId = process.env.GOOGLE_CLIENT_ID;
    const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
    const redirectUri = process.env.GOOGLE_REDIRECT_URI || `${process.env.APP_URL}/api/calendar/callback`;

    if (!clientId || !clientSecret) {
        throw new Error('Google Calendar credentials not configured');
    }

    return new google.auth.OAuth2(clientId, clientSecret, redirectUri);
};

/**
 * Get authorization URL for user to connect Google Calendar
 */
export const getAuthUrl = (userId: string): string => {
    const oauth2Client = createOAuth2Client();

    return oauth2Client.generateAuthUrl({
        access_type: 'offline',
        scope: SCOPES,
        state: userId, // Pass userId to identify user after callback
        prompt: 'consent' // Force consent to get refresh_token
    });
};

/**
 * Exchange authorization code for tokens
 */
export const exchangeCodeForTokens = async (code: string): Promise<CalendarCredentials> => {
    const oauth2Client = createOAuth2Client();
    const { tokens } = await oauth2Client.getToken(code);

    return {
        access_token: tokens.access_token || '',
        refresh_token: tokens.refresh_token || '',
        expiry_date: tokens.expiry_date ?? undefined
    };
};

/**
 * Save calendar credentials for user
 */
export const saveCalendarCredentials = async (
    userId: string,
    credentials: CalendarCredentials
): Promise<void> => {
    // Store in database (you'll need to add these fields to users table)
    await db.update(users)
        .set({
            googleCalendarToken: JSON.stringify(credentials)
        })
        .where(eq(users.id, userId));
};

/**
 * Get authenticated calendar client for user
 */
const getCalendarClient = async (userId: string): Promise<calendar_v3.Calendar | null> => {
    try {
        // Get user's stored credentials
        const user = await db.query.users.findFirst({
            where: eq(users.id, userId)
        });

        if (!user?.googleCalendarToken) {
            console.log('User has not connected Google Calendar');
            return null;
        }

        const credentials: CalendarCredentials = JSON.parse(user.googleCalendarToken as string);
        const oauth2Client = createOAuth2Client();

        oauth2Client.setCredentials({
            access_token: credentials.access_token,
            refresh_token: credentials.refresh_token,
            expiry_date: credentials.expiry_date
        });

        // Handle token refresh
        oauth2Client.on('tokens', async (tokens) => {
            if (tokens.refresh_token) {
                await saveCalendarCredentials(userId, {
                    ...credentials,
                    access_token: tokens.access_token || credentials.access_token,
                    refresh_token: tokens.refresh_token,
                    expiry_date: tokens.expiry_date ?? undefined
                });
            }
        });

        return google.calendar({ version: 'v3', auth: oauth2Client });
    } catch (error) {
        console.error('Error getting calendar client:', error);
        return null;
    }
};

// ============================================================================
// CALENDAR OPERATIONS
// ============================================================================

/**
 * Parse natural language date/time to Date object
 */
const parseDateTime = (date: string, time: string): Date => {
    const now = new Date();
    let targetDate = new Date();

    // Parse date
    const dateLower = date.toLowerCase();
    if (dateLower === 'today') {
        // Keep today
    } else if (dateLower === 'tomorrow') {
        targetDate.setDate(now.getDate() + 1);
    } else if (dateLower.includes('next')) {
        const days = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
        for (let i = 0; i < days.length; i++) {
            if (dateLower.includes(days[i])) {
                const diff = (i + 7 - now.getDay()) % 7 || 7;
                targetDate.setDate(now.getDate() + diff);
                break;
            }
        }
    } else {
        // Try to parse as date string
        const parsed = new Date(date);
        if (!isNaN(parsed.getTime())) {
            targetDate = parsed;
        }
    }

    // Parse time
    const timeLower = time.toLowerCase();
    let hours = 10; // Default 10 AM
    let minutes = 0;

    if (timeLower.includes('morning')) {
        hours = 10;
    } else if (timeLower.includes('afternoon')) {
        hours = 14;
    } else if (timeLower.includes('evening')) {
        hours = 18;
    } else {
        // Parse specific time like "2:30 PM" or "14:00"
        const timeMatch = time.match(/(\d{1,2}):?(\d{2})?\s*(am|pm)?/i);
        if (timeMatch) {
            hours = parseInt(timeMatch[1]);
            minutes = parseInt(timeMatch[2] || '0');
            if (timeMatch[3]?.toLowerCase() === 'pm' && hours !== 12) {
                hours += 12;
            } else if (timeMatch[3]?.toLowerCase() === 'am' && hours === 12) {
                hours = 0;
            }
        }
    }

    targetDate.setHours(hours, minutes, 0, 0);
    return targetDate;
};

/**
 * Create a calendar event
 */
export const createCalendarEvent = async (
    userId: string,
    event: CalendarEvent
): Promise<{ success: boolean; eventId?: string; error?: string; link?: string }> => {
    try {
        const calendar = await getCalendarClient(userId);

        if (!calendar) {
            return {
                success: false,
                error: 'Google Calendar not connected. Please connect your calendar in Settings.'
            };
        }

        const startTime = parseDateTime(event.date, event.time);
        const endTime = new Date(startTime.getTime() + (event.duration_minutes || 30) * 60000);

        const calendarEvent: calendar_v3.Schema$Event = {
            summary: event.title,
            description: event.description || `Meeting type: ${event.meeting_type || 'general'}`,
            start: {
                dateTime: startTime.toISOString(),
                timeZone: 'Asia/Kolkata' // Default to IST
            },
            end: {
                dateTime: endTime.toISOString(),
                timeZone: 'Asia/Kolkata'
            },
            reminders: {
                useDefault: false,
                overrides: [
                    { method: 'popup', minutes: 30 },
                    { method: 'email', minutes: 60 }
                ]
            }
        };

        // Add attendee if provided
        if (event.attendee_email) {
            calendarEvent.attendees = [{ email: event.attendee_email }];
            calendarEvent.conferenceData = {
                createRequest: {
                    requestId: `waflow-${Date.now()}`,
                    conferenceSolutionKey: { type: 'hangoutsMeet' }
                }
            };
        }

        const response = await calendar.events.insert({
            calendarId: 'primary',
            requestBody: calendarEvent,
            conferenceDataVersion: event.attendee_email ? 1 : 0,
            sendUpdates: 'all'
        });

        console.log(`✅ Calendar event created: ${response.data.id}`);

        return {
            success: true,
            eventId: response.data.id || undefined,
            link: response.data.htmlLink || undefined
        };
    } catch (error: any) {
        console.error('Error creating calendar event:', error);
        return { success: false, error: error.message };
    }
};

/**
 * Store reminder in database (will be processed by cron job)
 */
export const setReminder = async (
    userId: string,
    reminder: Reminder
): Promise<{ success: boolean; error?: string }> => {
    try {
        // Parse reminder time
        const reminderTime = parseDateTime(reminder.reminder_time, '9:00 AM');

        // Store in database (you'll need a reminders table)
        // For now, log it
        console.log(`📅 Reminder set for ${reminderTime.toISOString()}`);
        console.log(`   Message: ${reminder.reminder_message}`);
        console.log(`   Type: ${reminder.reminder_type}`);
        console.log(`   Phone: ${reminder.user_phone}`);

        // TODO: Insert into reminders table
        // await db.insert(reminders).values({
        //     userId,
        //     scheduledAt: reminderTime,
        //     message: reminder.reminder_message,
        //     type: reminder.reminder_type,
        //     phone: reminder.user_phone,
        //     status: 'pending'
        // });

        return { success: true };
    } catch (error: any) {
        console.error('Error setting reminder:', error);
        return { success: false, error: error.message };
    }
};

/**
 * Trigger a follow-up sequence
 */
export const triggerFollowup = async (
    userId: string,
    followup: FollowUp
): Promise<{ success: boolean; error?: string }> => {
    try {
        const delayHours = followup.delay_hours || 24;
        const followupTime = new Date(Date.now() + delayHours * 60 * 60 * 1000);

        console.log(`🔄 Follow-up scheduled for ${followupTime.toISOString()}`);
        console.log(`   Type: ${followup.followup_type}`);
        console.log(`   Priority: ${followup.priority}`);
        console.log(`   Phone: ${followup.user_phone}`);

        // TODO: Insert into followups table
        // await db.insert(followups).values({
        //     userId,
        //     scheduledAt: followupTime,
        //     type: followup.followup_type,
        //     message: followup.message_template,
        //     priority: followup.priority,
        //     phone: followup.user_phone,
        //     status: 'pending'
        // });

        return { success: true };
    } catch (error: any) {
        console.error('Error triggering follow-up:', error);
        return { success: false, error: error.message };
    }
};

/**
 * Check if user has Google Calendar connected
 */
export const isCalendarConnected = async (userId: string): Promise<boolean> => {
    try {
        const user = await db.query.users.findFirst({
            where: eq(users.id, userId)
        });
        return !!user?.googleCalendarToken;
    } catch {
        return false;
    }
};

export default {
    getAuthUrl,
    exchangeCodeForTokens,
    saveCalendarCredentials,
    createCalendarEvent,
    setReminder,
    triggerFollowup,
    isCalendarConnected
};
