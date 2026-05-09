import { NextRequest, NextResponse } from 'next/server';
import { promises as fs } from 'fs';
import path from 'path';
import { Session } from '@/lib/types';

const DATA_FILE = path.join(process.cwd(), 'data', 'sessions.json');

// Ensure the data directory and file exist
async function ensureDataFile() {
  try {
    await fs.access(DATA_FILE);
  } catch {
    const dir = path.dirname(DATA_FILE);
    await fs.mkdir(dir, { recursive: true });
    await fs.writeFile(DATA_FILE, '[]', 'utf-8');
  }
}

async function readSessions(): Promise<Session[]> {
  await ensureDataFile();
  const data = await fs.readFile(DATA_FILE, 'utf-8');
  return JSON.parse(data);
}

async function writeSessions(sessions: Session[]): Promise<void> {
  await ensureDataFile();
  await fs.writeFile(DATA_FILE, JSON.stringify(sessions, null, 2), 'utf-8');
}

// CORS headers for extension cross-origin requests
function corsHeaders() {
  return {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
  };
}

// Preflight
export async function OPTIONS() {
  return NextResponse.json(null, { headers: corsHeaders() });
}

// GET /api/sessions — list all sessions, optional ?search= filter
export async function GET(request: NextRequest) {
  try {
    const sessions = await readSessions();
    const search = request.nextUrl.searchParams.get('search')?.toLowerCase();

    let filtered = sessions;
    if (search) {
      filtered = sessions.filter(
        (s) =>
          s.title.toLowerCase().includes(search) ||
          s.platform.toLowerCase().includes(search) ||
          s.messages.some((m) => m.text.toLowerCase().includes(search))
      );
    }

    // Sort newest first
    filtered.sort((a, b) => new Date(b.capturedAt).getTime() - new Date(a.capturedAt).getTime());

    return NextResponse.json(filtered, { headers: corsHeaders() });
  } catch (error) {
    console.error('GET /api/sessions error:', error);
    return NextResponse.json({ error: 'Failed to read sessions' }, { status: 500, headers: corsHeaders() });
  }
}

// POST /api/sessions — create/update a session
export async function POST(request: NextRequest) {
  try {
    const session: Session = await request.json();

    if (!session.id || !session.platform || !session.messages) {
      return NextResponse.json(
        { error: 'Missing required fields: id, platform, messages' },
        { status: 400, headers: corsHeaders() }
      );
    }

    const sessions = await readSessions();
    const existingIndex = sessions.findIndex((s) => s.id === session.id);

    if (existingIndex >= 0) {
      sessions[existingIndex] = session;
    } else {
      sessions.unshift(session);
    }

    await writeSessions(sessions);
    return NextResponse.json(session, { status: 201, headers: corsHeaders() });
  } catch (error) {
    console.error('POST /api/sessions error:', error);
    return NextResponse.json({ error: 'Failed to save session' }, { status: 500, headers: corsHeaders() });
  }
}

// DELETE /api/sessions — delete a session by id (sent as JSON body or query param)
export async function DELETE(request: NextRequest) {
  try {
    let sessionId: string | null = request.nextUrl.searchParams.get('id');

    if (!sessionId) {
      const body = await request.json().catch(() => null);
      sessionId = body?.id;
    }

    if (!sessionId) {
      return NextResponse.json(
        { error: 'Missing session id' },
        { status: 400, headers: corsHeaders() }
      );
    }

    const sessions = await readSessions();
    const filtered = sessions.filter((s) => s.id !== sessionId);

    if (filtered.length === sessions.length) {
      return NextResponse.json(
        { error: 'Session not found' },
        { status: 404, headers: corsHeaders() }
      );
    }

    await writeSessions(filtered);
    return NextResponse.json({ success: true }, { headers: corsHeaders() });
  } catch (error) {
    console.error('DELETE /api/sessions error:', error);
    return NextResponse.json({ error: 'Failed to delete session' }, { status: 500, headers: corsHeaders() });
  }
}
