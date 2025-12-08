// Lead Capture Service
import { db, leads } from '../../db/index.js';
import { eq, and } from 'drizzle-orm';

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
export const getExistingLead = async (userId: string, phoneNumber: string) => {
    try {
        const existingLead = await db.query.leads.findFirst({
            where: and(
                eq(leads.userId, userId),
                eq(leads.phoneNumber, phoneNumber)
            )
        });
        return existingLead;
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
            const updateData: any = { updatedAt: new Date() };
            if (data.name && !existing.name) updateData.name = data.name;
            if (data.email && !existing.email) updateData.email = data.email;
            if (data.interest) updateData.interest = data.interest;
            if (data.notes) {
                updateData.notes = existing.notes
                    ? `${existing.notes}\n---\n${data.notes}`
                    : data.notes;
            }

            await db.update(leads)
                .set(updateData)
                .where(eq(leads.id, existing.id));

            console.log(`📝 Updated lead for ${data.phoneNumber}`);
            return { ...existing, ...updateData };
        } else {
            // Create new lead
            const [newLead] = await db.insert(leads)
                .values({
                    userId: data.userId,
                    agentId: data.agentId,
                    phoneNumber: data.phoneNumber,
                    name: data.name,
                    email: data.email,
                    interest: data.interest,
                    notes: data.notes,
                    source: 'whatsapp',
                    status: 'new'
                })
                .returning();

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
            await db.update(leads)
                .set({ [field]: value, updatedAt: new Date() })
                .where(eq(leads.id, existing.id));
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
        return await db.query.leads.findMany({
            where: eq(leads.userId, userId),
            orderBy: (leads, { desc }) => [desc(leads.createdAt)]
        });
    } catch (error) {
        console.error('Error getting leads:', error);
        return [];
    }
};
