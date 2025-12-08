import { db, agents, connection } from './index.js';

async function checkAgents() {
    const allAgents = await db.query.agents.findMany({});
    console.log('All agents:');
    allAgents.forEach(a => {
        console.log('---');
        console.log('Name:', a.name);
        console.log('Active:', a.isActive);
        console.log('Prompt (first 300 chars):', a.systemPrompt?.slice(0, 300) || 'NO PROMPT');
    });
    await connection.end();
}

checkAgents();
