import { db, agents, connection } from './index.js';

async function activateAgents() {
    console.log('Activating all agents...');
    const result = await db.update(agents).set({ isActive: true }).returning();
    console.log('Activated agents:', result.length);
    console.log(result);
    await connection.end();
}

activateAgents();
