import { NextRequest, NextResponse } from 'next/server';
import { adminAuth } from '@/lib/firebase/admin';
import { queryOne, execute } from '@/lib/db';
import { createToken, setAuthCookie } from '@/lib/auth/jwt';
import { applyRateLimit, authLimiter } from '@/lib/security';
import { loginSchema } from '@/lib/validations';
import type { User } from '@/types';

export async function POST(req: NextRequest) {
  // Rate limit
  const limited = applyRateLimit(req, authLimiter);
  if (limited) return limited;

  try {
    const body = await req.json();
    const { idToken } = loginSchema.parse(body);

    // Verify Firebase token
    const decoded = await adminAuth.verifyIdToken(idToken);
    const { uid, email, name, picture } = decoded;

    if (!email) {
      return NextResponse.json({ success: false, error: 'Email required' }, { status: 400 });
    }

    // Upsert user
    let user = await queryOne<User>(
      'SELECT * FROM users WHERE uid = ?',
      [uid]
    );

    if (!user) {
      // New user — create record
      const result = await execute(
        `INSERT INTO users (uid, name, email, avatar, role, plan, last_login)
         VALUES (?, ?, ?, ?, 'user', 'free', NOW())`,
        [uid, name || email.split('@')[0], email, picture || null]
      );
      user = await queryOne<User>('SELECT * FROM users WHERE id = ?', [result.insertId]);
    } else {
      // Update last login
      await execute(
        'UPDATE users SET last_login = NOW(), name = COALESCE(?, name), avatar = COALESCE(?, avatar) WHERE uid = ?',
        [name || null, picture || null, uid]
      );
      user = await queryOne<User>('SELECT * FROM users WHERE uid = ?', [uid]);
    }

    if (!user) throw new Error('User not found after upsert');

    // Create JWT
    const token = await createToken({
      userId: user.id,
      uid: user.uid,
      email: user.email,
      role: user.role,
      plan: user.plan,
    });

    // Set HTTP-only cookie
    await setAuthCookie(token);

    return NextResponse.json({
      success: true,
      data: {
        user: {
          id: user.id,
          uid: user.uid,
          name: user.name,
          email: user.email,
          avatar: user.avatar,
          role: user.role,
          plan: user.plan,
        },
        token,
      },
    });
  } catch (err) {
    console.error('Auth sync error:', err);
    return NextResponse.json({ success: false, error: 'Authentication failed' }, { status: 401 });
  }
}
