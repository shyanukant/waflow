#!/usr/bin/env node

/**
 * Auto-generate VITE_ prefixed env vars from existing vars
 * This runs before dev/build to avoid manual duplication in .env
 */

import { readFileSync, writeFileSync } from 'fs';
import { join } from 'path';

const envPath = join(process.cwd(), '.env');

// Read .env file
let envContent = readFileSync(envPath, 'utf-8');

// Variables to expose to client
const varsToExpose = ['SUPABASE_URL', 'SUPABASE_ANON_KEY'];

// Remove any existing VITE_ versions (to avoid duplication)
envContent = envContent
    .split('\n')
    .filter(line => !line.trim().startsWith('VITE_SUPABASE_'))
    .join('\n');

// Extract values and add VITE_ versions
const viteVars = [];
for (const varName of varsToExpose) {
    const match = envContent.match(new RegExp(`^${varName}=(.+)$`, 'm'));
    if (match) {
        const value = match[1];
        viteVars.push(`VITE_${varName}=${value}`);
    }
}

// Append VITE_ vars to .env
if (viteVars.length > 0) {
    // Remove old VITE_ section if exists
    envContent = envContent.replace(/\n*# Auto-generated VITE_ vars[\s\S]*$/, '');

    // Add new section
    envContent = envContent.trim() + '\n\n# Auto-generated VITE_ vars (do not edit manually)\n';
    envContent += viteVars.join('\n') + '\n';

    writeFileSync(envPath, envContent);
    console.log('✅ Auto-generated VITE_ prefixed environment variables');
} else {
    console.log('⚠️  No environment variables found to expose');
}
