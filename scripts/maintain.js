#!/usr/bin/env node

import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';

/**
 * Project Maintenance Script
 * 
 * This script automates common tasks like:
 * 1. Cleaning up build artifacts
 * 2. Reinstalling dependencies
 * 3. Running a build test
 */

const ROOT_DIR = process.cwd();

function log(message) {
  console.log(`\x1b[36m[Automation]\x1b[0m ${message}`);
}

function error(message) {
  console.error(`\x1b[31m[Error]\x1b[0m ${message}`);
}

async function run() {
  try {
    log('Starting automated maintenance...');

    // 1. Clean up
    const distPath = path.join(ROOT_DIR, 'dist');
    if (fs.existsSync(distPath)) {
      log('Cleaning up old build artifacts...');
      fs.rmSync(distPath, { recursive: true, force: true });
    }

    // 2. Check for node_modules
    if (!fs.existsSync(path.join(ROOT_DIR, 'node_modules'))) {
      log('node_modules not found. Installing dependencies...');
      execSync('npm install', { stdio: 'inherit' });
    }

    // 3. Run Build
    log('Running production build...');
    execSync('npm run build', { stdio: 'inherit' });

    log('Successfully automated tasks!');
  } catch (err) {
    error(`An error occurred: ${err.message}`);
    process.exit(1);
  }
}

run();
