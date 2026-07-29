import { put } from '@vercel/blob';
import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { isSuperAdmin } from '@/lib/roles';
import { resolveBlobReadWriteToken } from '@/lib/blob-token';

const MAX_UPLOAD_BYTES = 25 * 1024 * 1024;
const CONTENT_TYPES: Record<string, string> = {
  pdf: 'application/pdf',
  png: 'image/png',
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  webp: 'image/webp',
  gif: 'image/gif',
  zip: 'application/zip',
};

function sanitizeUploadPath(filename: string): string | null {
  const segments = filename
    .split(/[\\/]+/)
    .filter(Boolean)
    .map((segment) => segment.replace(/[^a-zA-Z0-9._-]/g, '_').slice(0, 160))
    .filter((segment) => segment !== '.' && segment !== '..' && segment.length > 0);

  if (segments.length === 0) return null;
  return segments.slice(-4).join('/');
}

function hasPdfSignature(bytes: Uint8Array): boolean {
  const sample = new TextDecoder('latin1').decode(bytes.slice(0, 1024));
  return sample.includes('%PDF-');
}

export async function POST(request: Request): Promise<NextResponse> {
  const session = await getServerSession(authOptions);
  
  if (!session || !isSuperAdmin((session.user as { role?: string }).role)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const token = resolveBlobReadWriteToken();
  if (!token) {
    return NextResponse.json(
      {
        error:
          'Blob storage is not configured. Set BLOB_READ_WRITE_TOKEN (from your public Blob store) or PUBLIC_BLOB_READ_WRITE_TOKEN.',
      },
      { status: 503 }
    );
  }

  const { searchParams } = new URL(request.url);
  const requestedFilename = searchParams.get('filename') || 'file.pdf';
  const filename = sanitizeUploadPath(requestedFilename);

  if (!filename) {
    return NextResponse.json({ error: 'Invalid filename' }, { status: 400 });
  }

  const ext = filename.split('.').pop()?.toLowerCase();
  const contentType = CONTENT_TYPES[ext || ''];
  if (!contentType) {
    return NextResponse.json(
      { error: 'Unsupported file type. Use PDF, PNG, JPG, WEBP, GIF, or ZIP.' },
      { status: 415 }
    );
  }

  const declaredLength = Number(request.headers.get('content-length'));
  if (Number.isFinite(declaredLength) && declaredLength > MAX_UPLOAD_BYTES) {
    return NextResponse.json(
      { error: 'File is too large. Maximum upload size is 25 MB.' },
      { status: 413 }
    );
  }

  try {
    const body = await request.arrayBuffer();
    if (body.byteLength === 0) {
      return NextResponse.json({ error: 'No file content provided' }, { status: 400 });
    }
    if (body.byteLength > MAX_UPLOAD_BYTES) {
      return NextResponse.json(
        { error: 'File is too large. Maximum upload size is 25 MB.' },
        { status: 413 }
      );
    }
    if (ext === 'pdf' && !hasPdfSignature(new Uint8Array(body))) {
      return NextResponse.json(
        { error: 'The uploaded file is not a valid PDF.' },
        { status: 415 }
      );
    }

    const blob = await put(filename, body, {
      access: 'public',
      token,
      addRandomSuffix: true,
      allowOverwrite: false,
      contentType,
    });

    return NextResponse.json(blob);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Upload failed';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
