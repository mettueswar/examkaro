import { NextRequest } from 'next/server';
import { verifyRequest, unauthorizedResponse, forbiddenResponse } from '@/lib/auth/jwt';
import { successResponse, errorResponse, uploadLimiter, applyRateLimit } from '@/lib/security';
import { adminStorage } from '@/lib/firebase/admin';
import { nanoid } from 'nanoid';

const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
const MAX_SIZE = 5 * 1024 * 1024; // 5MB

// Upload types map to storage paths
const UPLOAD_PATHS: Record<string, string> = {
  question:    'questions',
  news:        'news',
  category:    'categories',
  profile:     'avatars',
  test:        'tests',
};

export async function POST(req: NextRequest) {
  // Rate limit uploads
  const limited = applyRateLimit(req, uploadLimiter);
  if (limited) return limited;

  const auth = await verifyRequest(req);
  if (!auth) return unauthorizedResponse();

  try {
    const formData = await req.formData();
    const file = formData.get('file') as File | null;
    const uploadType = (formData.get('type') as string) || 'question';

    if (!file) return errorResponse('No file provided');
    if (!ALLOWED_TYPES.includes(file.type)) {
      return errorResponse(`Invalid file type. Allowed: ${ALLOWED_TYPES.join(', ')}`);
    }
    if (file.size > MAX_SIZE) {
      return errorResponse('File too large. Maximum size is 5MB');
    }

    // Non-admins can only upload profile pictures
    if (auth.role === 'user' && uploadType !== 'profile') {
      return forbiddenResponse('Only admins can upload this type of file');
    }

    const folder = UPLOAD_PATHS[uploadType] || 'misc';
    const ext = file.type.split('/')[1].replace('jpeg', 'jpg');
    const filename = `${folder}/${nanoid(16)}.${ext}`;

    const buffer = Buffer.from(await file.arrayBuffer());
    const bucket = adminStorage.bucket();
    const fileRef = bucket.file(filename);

    await fileRef.save(buffer, {
      metadata: {
        contentType: file.type,
        metadata: {
          uploadedBy: String(auth.userId),
          originalName: file.name,
        },
      },
    });

    // Make file publicly readable
    await fileRef.makePublic();

    // Return CDN URL
    const cdnBase = process.env.NEXT_PUBLIC_CDN_URL || `https://storage.googleapis.com/${bucket.name}`;
    const url = `${cdnBase}/${filename}`;

    return successResponse({ url, filename });
  } catch (err) {
    console.error('Upload error:', err);
    return errorResponse('Upload failed');
  }
}
