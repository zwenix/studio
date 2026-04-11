#!/usr/bin/env tsx
/**
 * EduAI Companion — Firestore → Supabase Migration Script
 * Migrates all collections and subcollections.
 *
 * Run:  npx tsx scripts/migrate-to-supabase.ts
 */

import * as admin  from 'firebase-admin';
import { createClient } from '@supabase/supabase-js';
import * as fs from 'fs';
import * as path from 'path';

// ── Config ────────────────────────────────────────────────────────────────────
const FIREBASE_PROJECT  = process.env.FIREBASE_PROJECT_ID!;
const SUPABASE_URL      = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_KEY      = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const BATCH_SIZE        = 50; // rows per Supabase insert

// ── Init clients ──────────────────────────────────────────────────────────────
const KEY_PATH = path.join(process.cwd(), 'serviceAccountKey.json');

if (!fs.existsSync(KEY_PATH)) {
  console.error('\n❌ serviceAccountKey.json not found!');
  console.error('   Download from Firebase Console → Project Settings → Service Accounts\n');
  process.exit(1);
}

admin.initializeApp({
  credential: admin.credential.cert(JSON.parse(fs.readFileSync(KEY_PATH, 'utf-8'))),
  projectId:  FIREBASE_PROJECT,
});

const firestore = admin.firestore();
const supabase  = createClient(SUPABASE_URL, SUPABASE_KEY);

// ── Helpers ───────────────────────────────────────────────────────────────────
const report: Record<string, { migrated: number; errors: number }> = {};

function tsToDate(val: any): Date | null {
  if (!val) return null;
  if (val._seconds) return new Date(val._seconds * 1000);
  if (val.toDate)   return val.toDate();
  if (val instanceof Date) return val;
  return null;
}

function convertDoc(data: any): any {
  if (!data || typeof data !== 'object') return data;
  if (data._seconds !== undefined) return tsToDate(data);
  if (Array.isArray(data)) return data.map(convertDoc);
  const out: any = {};
  for (const [k, v] of Object.entries(data)) {
    out[k] = convertDoc(v);
  }
  return out;
}

async function insertBatch(table: string, rows: any[]) {
  for (let i = 0; i < rows.length; i += BATCH_SIZE) {
    const batch = rows.slice(i, i + BATCH_SIZE);
    const { error } = await supabase.from(table).upsert(batch, { onConflict: 'id' });
    if (error) {
      console.error(`  ⚠️  ${table} batch error:`, error.message);
      report[table].errors += batch.length;
    } else {
      report[table].migrated += batch.length;
    }
  }
}

function camelToSnake(str: string): string {
  return str.replace(/[A-Z]/g, c => `_${c.toLowerCase()}`);
}

function convertKeys(obj: any): any {
  if (!obj || typeof obj !== 'object' || Array.isArray(obj)) return obj;
  const out: any = {};
  for (const [k, v] of Object.entries(obj)) {
    out[camelToSnake(k)] = typeof v === 'object' && v !== null && !Array.isArray(v) && !(v instanceof Date)
      ? convertKeys(v) : v;
  }
  return out;
}

// ── Migration functions ───────────────────────────────────────────────────────

async function migrateUsers() {
  const table = 'users';
  report[table] = { migrated: 0, errors: 0 };
  console.log('\n  👤 Migrating users...');

  const snap = await firestore.collection('users').get();
  const rows = snap.docs.map(doc => {
    const d = convertDoc(doc.data());
    return {
      id:         doc.id,
      email:      d.email || '',
      first_name: d.firstName || '',
      last_name:  d.lastName  || '',
      role:       d.role || null,
      avatar_url: d.avatarUrl || null,
      phone:      d.phoneNumber || null,
      created_at: tsToDate(d.createdAt) || new Date(),
    };
  });

  await insertBatch(table, rows);
  console.log(`     ✅ ${report[table].migrated} users migrated`);
}

async function migrateTeachers() {
  const table = 'teachers';
  report[table] = { migrated: 0, errors: 0 };
  console.log('\n  🏫 Migrating teachers...');

  const snap = await firestore.collection('teachers').get();
  const rows = snap.docs.map(doc => {
    const d = convertDoc(doc.data());
    return {
      id:                       doc.id,
      subjects:                 d.subjects || [],
      class_ids:                d.classIds  || [],
      school:                   d.school    || null,
      signature_url:            d.signatureUrl || null,
      ai_difficulty_adaptation: d.aiDifficultyAdaptation || false,
      cultural_context:         d.culturalContextIntegration || false,
      parent_notifications:     d.parentNotifications || false,
    };
  });

  await insertBatch(table, rows);
  console.log(`     ✅ ${report[table].migrated} teachers migrated`);
}

async function migrateLearners() {
  const table = 'learners';
  report[table] = { migrated: 0, errors: 0 };
  console.log('\n  🎒 Migrating learners...');

  const snap = await firestore.collection('learners').get();
  const rows = snap.docs.map(doc => {
    const d = convertDoc(doc.data());
    return {
      id:                   doc.id,
      grade:                d.grade || '',
      learning_preferences: d.learningPreferences || '',
    };
  });

  await insertBatch(table, rows);
  console.log(`     ✅ ${report[table].migrated} learners migrated`);
}

async function migrateParents() {
  const table = 'parents';
  report[table] = { migrated: 0, errors: 0 };
  console.log('\n  👨‍👩‍👧 Migrating parents...');

  const snap = await firestore.collection('parents').get();
  const rows = snap.docs.map(doc => {
    const d = convertDoc(doc.data());
    return { id: doc.id, child_ids: d.childIds || [] };
  });

  await insertBatch(table, rows);
  console.log(`     ✅ ${report[table].migrated} parents migrated`);
}

async function migrateClasses() {
  const table = 'classes';
  report[table] = { migrated: 0, errors: 0 };
  console.log('\n  🏫 Migrating classes...');

  const snap = await firestore.collection('classes').get();
  const rows = snap.docs.map(doc => {
    const d = convertDoc(doc.data());
    return {
      id:          doc.id,
      name:        d.name       || '',
      grade:       d.grade      || '',
      subject:     d.subject    || '',
      teacher_id:  d.teacherId  || '',
      learner_ids: d.learnerIds || [],
      parent_ids:  d.parentIds  || [],
    };
  });

  await insertBatch(table, rows);
  console.log(`     ✅ ${report[table].migrated} classes migrated`);
}

async function migrateContent() {
  const table = 'content';
  report[table] = { migrated: 0, errors: 0 };
  console.log('\n  📄 Migrating content...');

  const snap = await firestore.collection('content').get();
  const rows = snap.docs.map(doc => {
    const d = convertDoc(doc.data());
    return {
      id:           doc.id,
      teacher_id:   d.teacherId   || '',
      content_type: d.contentType || '',
      grade:        d.grade       || '',
      subject:      d.subject     || '',
      topic:        d.topic       || '',
      content:      d.content     || '',
      memo:         d.memo        || null,
      rubric:       d.rubric      || null,
      file_url:     d.fileUrl     || null,
      file_type:    d.fileType    || null,
      created_at:   tsToDate(d.createdAt) || new Date(),
    };
  });

  await insertBatch(table, rows);
  console.log(`     ✅ ${report[table].migrated} content items migrated`);
}

async function migrateAssignments() {
  const table = 'assignments';
  report[table] = { migrated: 0, errors: 0 };
  console.log('\n  📝 Migrating assignments...');

  const classSnap = await firestore.collection('classes').get();
  const allRows: any[] = [];

  for (const classDoc of classSnap.docs) {
    const aSnap = await classDoc.ref.collection('assignments').get();
    for (const aDoc of aSnap.docs) {
      const d = convertDoc(aDoc.data());
      allRows.push({
        id:                aDoc.id,
        content_id:        d.contentId        || null,
        class_id:          classDoc.id,
        learner_id:        d.learnerId        || '',
        teacher_id:        d.teacherId        || '',
        due_date:          tsToDate(d.dueDate) || new Date(),
        status:            d.status           || 'assigned',
        submission_content: d.submissionContent || null,
        grade_received:    d.gradeReceived    || null,
        feedback:          d.feedback         || null,
        submitted_at:      tsToDate(d.submittedAt) || null,
        created_at:        tsToDate(d.createdAt)   || new Date(),
      });
    }
  }

  await insertBatch(table, allRows);
  console.log(`     ✅ ${report[table].migrated} assignments migrated`);
}

async function migrateConversations() {
  const table = 'conversations';
  const mTable = 'messages';
  report[table]  = { migrated: 0, errors: 0 };
  report[mTable] = { migrated: 0, errors: 0 };
  console.log('\n  💬 Migrating conversations + messages...');

  const snap = await firestore.collection('conversations').get();
  const convRows = snap.docs.map(doc => {
    const d = convertDoc(doc.data());
    return {
      id:               doc.id,
      participant_ids:  d.participantIds  || [],
      participant_info: d.participantInfo || {},
      last_message:     d.lastMessage     || null,
      updated_at:       tsToDate(d.updatedAt) || new Date(),
      created_at:       new Date(),
    };
  });

  await insertBatch(table, convRows);

  // Messages subcollection
  const allMessages: any[] = [];
  for (const convDoc of snap.docs) {
    const mSnap = await convDoc.ref.collection('messages').get();
    for (const mDoc of mSnap.docs) {
      const d = convertDoc(mDoc.data());
      allMessages.push({
        id:              mDoc.id,
        conversation_id: convDoc.id,
        sender_id:       d.senderId || '',
        text:            d.text     || '',
        created_at:      tsToDate(d.createdAt) || new Date(),
      });
    }
  }
  await insertBatch(mTable, allMessages);
  console.log(`     ✅ ${report[table].migrated} conversations, ${report[mTable].migrated} messages`);
}

async function migrateGeneratedContent() {
  const table = 'generated_content';
  report[table] = { migrated: 0, errors: 0 };
  console.log('\n  🤖 Migrating generated content (teacher archive)...');

  const teacherSnap = await firestore.collection('teachers').get();
  const allRows: any[] = [];

  for (const teacherDoc of teacherSnap.docs) {
    const gcSnap = await teacherDoc.ref.collection('generatedContent').get();
    for (const gcDoc of gcSnap.docs) {
      const d = convertDoc(gcDoc.data());
      allRows.push({
        id:           gcDoc.id,
        teacher_id:   teacherDoc.id,
        content_type: d.contentType || '',
        grade:        d.grade       || '',
        subject:      d.subject     || '',
        topic:        d.topic       || '',
        content:      d.content     || '',
        memo:         d.memo        || null,
        rubric:       d.rubric      || null,
        created_at:   tsToDate(d.createdAt) || new Date(),
      });
    }
  }

  await insertBatch(table, allRows);
  console.log(`     ✅ ${report[table].migrated} generated content items`);
}

async function migrateAiChat() {
  const table = 'ai_chat_messages';
  report[table] = { migrated: 0, errors: 0 };
  console.log('\n  🧠 Migrating AI chat history...');

  const userSnap = await firestore.collection('users').get();
  const allRows: any[] = [];

  for (const userDoc of userSnap.docs) {
    const chatSnap = await userDoc.ref.collection('aiChatMessages').get();
    for (const cDoc of chatSnap.docs) {
      const d = convertDoc(cDoc.data());
      allRows.push({
        id:         cDoc.id,
        user_id:    userDoc.id,
        role:       d.role === 'model' ? 'model' : 'user',
        text:       d.text || '',
        created_at: tsToDate(d.createdAt) || new Date(),
      });
    }
  }

  await insertBatch(table, allRows);
  console.log(`     ✅ ${report[table].migrated} chat messages`);
}

async function migrateOcrUploads() {
  const table = 'ocr_uploads';
  report[table] = { migrated: 0, errors: 0 };
  console.log('\n  📷 Migrating OCR uploads...');

  const userSnap = await firestore.collection('users').get();
  const allRows: any[] = [];

  for (const userDoc of userSnap.docs) {
    const ocrSnap = await userDoc.ref.collection('ocrUploads').get();
    for (const oDoc of ocrSnap.docs) {
      const d = convertDoc(oDoc.data());
      allRows.push({
        id:           oDoc.id,
        user_id:      userDoc.id,
        content_type: d.contentType || '',
        text:         d.text        || '',
        created_at:   tsToDate(d.createdAt) || new Date(),
      });
    }
  }

  await insertBatch(table, allRows);
  console.log(`     ✅ ${report[table].migrated} OCR uploads`);
}

// ── Main ──────────────────────────────────────────────────────────────────────
async function main() {
  console.log('\n🚀 EduAI Companion — Firestore → Supabase Migration\n');
  console.log(`  Firebase:  ${FIREBASE_PROJECT}`);
  console.log(`  Supabase:  ${SUPABASE_URL}\n`);

  const start = Date.now();

  await migrateUsers();
  await migrateTeachers();
  await migrateLearners();
  await migrateParents();
  await migrateClasses();
  await migrateContent();
  await migrateAssignments();
  await migrateConversations();
  await migrateGeneratedContent();
  await migrateAiChat();
  await migrateOcrUploads();

  const elapsed = ((Date.now() - start) / 1000).toFixed(1);

  console.log('\n\n📊 Migration Report');
  console.log('══════════════════════════════════════════');
  console.log('  Table                    Migrated  Errors');
  console.log('  ─────────────────────────────────────────');
  for (const [tbl, stats] of Object.entries(report)) {
    const status = stats.errors > 0 ? `⚠️  ${stats.errors} errors` : '✅';
    console.log(`  ${tbl.padEnd(25)} ${String(stats.migrated).padStart(6)}   ${status}`);
  }
  console.log('══════════════════════════════════════════');
  console.log(`\n  ✅ Complete in ${elapsed}s\n`);

  process.exit(0);
}

main().catch(e => {
  console.error('\n❌ Migration failed:', e.message);
  process.exit(1);
});
