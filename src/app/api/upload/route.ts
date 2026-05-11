import { put } from '@vercel/blob';
import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { isAdminRole } from '@/lib/roles';
import { resolveBlobReadWriteToken } from '@/lib/blob-token';

export async function POST(request: Request): Promise<NextResponse> {
  const session = await getServerSession(authOptions);
  
  if (!session || !isAdminRole((session.user as { role?: string }).role)) {
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
  const filename = searchParams.get('filename') || 'file.pdf';

  if (!request.body) {
    return NextResponse.json({ error: 'No body provided' }, { status: 400 });
  }

  try {
    const blob = await put(filename, request.body, {
      access: 'public',
      token,
    });

    return NextResponse.json(blob);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Upload failed';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
