// Lead Capture Service
import { databases, DATABASE_ID, COLLECTIONS, Query, ID } from '../../db/index.js';
import type { LeadDocument } from '../../db/collections.js';

interface LeadData {
    userId: string;
    agentId?: string;
    phoneNumber: string;
    name?: string;
    email?: string;
    interest?: string;
    notes?: string;
}

/**
 * Check if a lead already exists for this phone number
 */
export const getExistingLead = async (userId: string, phoneNumber: string): Promise<LeadDocument | null> => {
    try {
        const result = await databases.listDocuments(
            DATABASE_ID,
            COLLECTIONS.LEADS,
            [
                Query.equal('userId', userId),
                Query.equal('phoneNumber', phoneNumber)
            ]
        );
        return (result.documents[0] as unknown as LeadDocument) || null;
    } catch (error) {
        console.error('Error checking existing lead:', error);
        return null;
    }
};

/**
 * Create or update a lead
 */
export const saveLead = async (data: LeadData) => {
    try {
        // Check if lead already exists
        const existing = await getExistingLead(data.userId, data.phoneNumber);

        if (existing) {
            // Update existing lead with new info
            const updateData: Record<string, any> = {};
            if (data.name && !existing.name) updateData.name = data.name;
            if (data.email && !existing.email) updateData.email = data.email;
            if (data.interest) updateData.interest = data.interest;
            if (data.notes) {
                updateData.notes = existing.notes
                    ? `${existing.notes}\n---\n${data.notes}`
                    : data.notes;
            }

            if (Object.keys(updateData).length > 0) {
                await databases.updateDocument(
                    DATABASE_ID,
                    COLLECTIONS.LEADS,
                    existing.$id,
                    updateData
                );
            }

            console.log(`📝 Updated lead for ${data.phoneNumber}`);
            return { ...existing, ...updateData };
        } else {
            // Create new lead
            const newLead = await databases.createDocument(
                DATABASE_ID,
                COLLECTIONS.LEADS,
                ID.unique(),
                {
                    userId: data.userId,
                    agentId: data.agentId || null,
                    phoneNumber: data.phoneNumber,
                    name: data.name || null,
                    email: data.email || null,
                    interest: data.interest || null,
                    notes: data.notes || null,
                    source: 'whatsapp',
                    status: 'new'
                }
            );

            console.log(`✅ Created new lead for ${data.phoneNumber}`);
            return newLead;
        }
    } catch (error) {
        console.error('Error saving lead:', error);
        return null;
    }
};

/**
 * Update lead with collected info (name/email)
 */
export const updateLeadInfo = async (
    userId: string,
    phoneNumber: string,
    field: 'name' | 'email',
    value: string
) => {
    try {
        const existing = await getExistingLead(userId, phoneNumber);
        if (existing) {
            await databases.updateDocument(
                DATABASE_ID,
                COLLECTIONS.LEADS,
                existing.$id,
                { [field]: value }
            );
            console.log(`📝 Updated lead ${field}: ${value}`);
            return true;
        }
        return false;
    } catch (error) {
        console.error('Error updating lead info:', error);
        return false;
    }
};

/**
 * Get all leads for a user
 */
export const getLeads = async (userId: string) => {
    try {
        const result = await databases.listDocuments(
            DATABASE_ID,
            COLLECTIONS.LEADS,
            [
                Query.equal('userId', userId),
                Query.orderDesc('$createdAt')
            ]
        );
        return result.documents;
    } catch (error) {
        console.error('Error getting leads:', error);
        return [];
    }
};
