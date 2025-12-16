import { Client, Account, ID } from 'appwrite';

// Initialize Appwrite client
const client = new Client()
    .setEndpoint(import.meta.env.VITE_APPWRITE_ENDPOINT || 'https://cloud.appwrite.io/v1')
    .setProject(import.meta.env.VITE_APPWRITE_PROJECT_ID);

// Initialize Account service
export const account = new Account(client);

// Export client for other services if needed
export { client, ID };

// Types
export interface AppwriteUser {
    $id: string;
    $createdAt: string;
    $updatedAt: string;
    name: string;
    email: string;
    emailVerification: boolean;
    status: boolean;
}

// Auth helper functions
export const auth = {
    /**
     * Create a new user account
     */
    register: async (email: string, password: string, name?: string) => {
        const user = await account.create(ID.unique(), email, password, name);
        // Auto login after registration
        await account.createEmailPasswordSession(email, password);
        return user;
    },

    /**
     * Login with email and password
     */
    login: async (email: string, password: string) => {
        return await account.createEmailPasswordSession(email, password);
    },

    /**
     * Logout current session
     */
    logout: async () => {
        return await account.deleteSession('current');
    },

    /**
     * Get current logged in user
     */
    getUser: async () => {
        try {
            return await account.get();
        } catch {
            return null;
        }
    },

    /**
     * Create JWT for API authentication
     */
    createJWT: async () => {
        return await account.createJWT();
    },

    /**
     * Send email verification
     */
    sendVerification: async (url: string) => {
        return await account.createVerification(url);
    },

    /**
     * Confirm email verification
     */
    confirmVerification: async (userId: string, secret: string) => {
        return await account.updateVerification(userId, secret);
    },

    /**
     * Send password recovery email
     */
    sendPasswordRecovery: async (email: string, url: string) => {
        return await account.createRecovery(email, url);
    },

    /**
     * Confirm password recovery
     */
    confirmPasswordRecovery: async (userId: string, secret: string, password: string) => {
        return await account.updateRecovery(userId, secret, password);
    }
};

export default auth;
