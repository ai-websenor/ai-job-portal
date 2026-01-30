#!/usr/bin/env node

/**
 * Environment Switcher Script
 * Usage: node scripts/switch-env.js [local|live]
 *
 * Switches DATABASE_URL between local and live in both:
 * - .env (root)
 * - packages/database/.env
 */

const fs = require('fs');
const path = require('path');

const ENV_CONFIGS = {
  local: {
    DATABASE_URL: 'postgresql://postgres:admin%40123@localhost:5433/ai_job_portal_local',
    label: 'Local PostgreSQL',
  },
  live: {
    DATABASE_URL:
      'postgresql://postgres:xZsb3c91pZrJLmg@ai-job-portal-dev.czemc0204jzt.ap-south-1.rds.amazonaws.com:5432/ai_job_portal_dev?sslmode=no-verify',
    label: 'AWS RDS (Live)',
  },
};

const ENV_FILES = [
  path.join(__dirname, '..', '.env'),
  path.join(__dirname, '..', 'packages', 'database', '.env'),
];

function switchEnv(target) {
  if (!['local', 'live'].includes(target)) {
    console.error('❌ Invalid argument. Use: node scripts/switch-env.js [local|live]');
    console.log('\nExamples:');
    console.log('  node scripts/switch-env.js local   # Switch to local database');
    console.log('  node scripts/switch-env.js live    # Switch to live RDS database');
    process.exit(1);
  }

  const config = ENV_CONFIGS[target];
  console.log(`\n🔄 Switching to ${config.label}...\n`);

  ENV_FILES.forEach((filePath) => {
    if (!fs.existsSync(filePath)) {
      console.log(`⚠️  File not found: ${filePath}`);
      return;
    }

    let content = fs.readFileSync(filePath, 'utf8');

    // Update DATABASE_URL - comment out all DATABASE_URL lines first
    content = content.replace(/^(DATABASE_URL=.*)$/gm, '# $1');

    // Remove double comments
    content = content.replace(/^# # /gm, '# ');

    // Check if the target URL exists (commented), if so uncomment it
    const targetUrlPattern = new RegExp(
      `^# (DATABASE_URL=${escapeRegex(config.DATABASE_URL)})$`,
      'm',
    );

    if (targetUrlPattern.test(content)) {
      // Uncomment the target URL
      content = content.replace(targetUrlPattern, '$1');
    } else {
      // Add the target URL if it doesn't exist
      const dbUrlMatch = content.match(/^# DATABASE_URL=.*$/m);
      if (dbUrlMatch) {
        content = content.replace(
          dbUrlMatch[0],
          `DATABASE_URL=${config.DATABASE_URL}\n${dbUrlMatch[0]}`,
        );
      }
    }

    fs.writeFileSync(filePath, content);
    console.log(`✅ Updated: ${path.relative(process.cwd(), filePath)}`);
  });

  console.log(`\n🎉 Switched to ${target.toUpperCase()} environment!`);
  console.log(`   Database: ${config.label}\n`);
  console.log('⚠️  Remember to restart your services for changes to take effect.\n');
}

function escapeRegex(string) {
  return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

// Get command line argument
const target = process.argv[2];

if (!target) {
  // Show current status
  console.log('\n📊 Current Environment Status:\n');

  ENV_FILES.forEach((filePath) => {
    if (!fs.existsSync(filePath)) return;

    const content = fs.readFileSync(filePath, 'utf8');
    const match = content.match(/^DATABASE_URL=(.*)$/m);

    if (match) {
      const isLive = match[1].includes('rds.amazonaws.com');
      const env = isLive ? '🌐 LIVE (RDS)' : '💻 LOCAL';
      console.log(`  ${path.relative(process.cwd(), filePath)}: ${env}`);
    }
  });

  console.log('\nUsage: node scripts/switch-env.js [local|live]\n');
} else {
  switchEnv(target);
}
