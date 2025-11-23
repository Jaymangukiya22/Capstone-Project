#!/usr/bin/env node

/**
 * Fix SQL dump by reordering INSERT statements to respect foreign key constraints
 * Usage: node fix-dump.js < dump.sql > fixed-dump.sql
 */

const fs = require('fs');
const readline = require('readline');

// Define insertion order based on foreign key dependencies
const insertionOrder = [
  'users',
  'categories',
  'question_bank_items',
  'question_bank_options',
  'quizzes',
  'quiz_questions',
  'quiz_attempts',
  'quiz_attempt_answers',
  'matches',
  'match_players',
  'leaderboards'
];

const inserts = {};
let currentContent = '';
let inInsert = false;
let currentTable = '';

// Read from stdin
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
  terminal: false
});

let allLines = [];

rl.on('line', (line) => {
  allLines.push(line);
});

rl.on('close', () => {
  const content = allLines.join('\n');
  
  // Extract all INSERT statements
  const insertRegex = /INSERT INTO "public"\."(\w+)"\s*\((.*?)\)\s*VALUES\s*([\s\S]*?)(?=\n(?:INSERT|ALTER|DROP|CREATE|$))/g;
  
  let match;
  const allInserts = {};
  
  while ((match = insertRegex.exec(content)) !== null) {
    const tableName = match[1];
    const columns = match[2];
    const values = match[3].trim();
    
    if (!allInserts[tableName]) {
      allInserts[tableName] = [];
    }
    
    allInserts[tableName].push({
      columns,
      values
    });
  }
  
  // Output schema (everything before first INSERT)
  const firstInsertIndex = content.indexOf('INSERT INTO');
  if (firstInsertIndex > 0) {
    console.log(content.substring(0, firstInsertIndex));
  }
  
  // Output INSERTs in correct order
  for (const table of insertionOrder) {
    if (allInserts[table]) {
      for (const insert of allInserts[table]) {
        console.log(`INSERT INTO "public"."${table}" (${insert.columns}) VALUES ${insert.values};`);
      }
    }
  }
  
  // Output any remaining content (ALTER TABLE, etc.)
  const lastInsertMatch = content.match(/INSERT INTO[\s\S]*?;/g);
  if (lastInsertMatch) {
    const lastInsertEnd = content.lastIndexOf(lastInsertMatch[lastInsertMatch.length - 1]) + lastInsertMatch[lastInsertMatch.length - 1].length;
    const remaining = content.substring(lastInsertEnd);
    if (remaining.trim()) {
      console.log(remaining);
    }
  }
});
