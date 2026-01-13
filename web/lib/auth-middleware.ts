import { adminAuth, adminDb } from '@/lib/firebase-admin';
import { NextRequest, NextResponse } from 'next/server';

/**
 * Authentication Middleware for API Routes
 * 
 * Verifies Firebase ID tokens and optionally checks for admin role
 */

export interface AuthenticatedRequest extends NextRequest {
    userAuth?: {
        uid: string;
        email?: string;
        role?: string;
    };
}

/**
 * Verify Firebase Authentication Token
 * 
 * @param request - Next.js request object
 * @returns Decoded token or null if invalid
 */
export async function verifyAuthToken(request: NextRequest): Promise<{
    uid: string;
    email?: string;
} | null> {
    try {
        const authHeader = request.headers.get('authorization');

        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return null;
        }

        const token = authHeader.replace('Bearer ', '');
        const decodedToken = await adminAuth.verifyIdToken(token);

        return {
            uid: decodedToken.uid,
            email: decodedToken.email
        };
    } catch (error) {
        console.error('Token verification failed:', error);
        return null;
    }
}

/**
 * Verify user has Admin role
 * 
 * @param uid - User ID
 * @returns User data if admin, null otherwise
 */
export async function verifyAdminRole(uid: string): Promise<{
    uid: string;
    role: string;
    email?: string;
    displayName?: string;
} | null> {
    try {
        const userDoc = await adminDb.collection('users').doc(uid).get();

        if (!userDoc.exists) {
            return null;
        }

        const userData = userDoc.data();

        if (userData?.role !== 'Admin') {
            return null;
        }

        return {
            uid,
            role: userData.role,
            email: userData.email,
            displayName: userData.displayName
        };
    } catch (error) {
        console.error('Role verification failed:', error);
        return null;
    }
}

/**
 * Complete authentication middleware - Verifies token AND admin role
 * 
 * @param request - Next.js request object
 * @returns Response with 401/403 if unauthorized, or user data if authorized
 */
export async function requireAdmin(request: NextRequest): Promise<{
    authorized: true;
    user: {
        uid: string;
        role: string;
        email?: string;
        displayName?: string;
    };
} | {
    authorized: false;
    response: NextResponse;
}> {
    // Verify authentication token
    const authResult = await verifyAuthToken(request);

    if (!authResult) {
        return {
            authorized: false,
            response: NextResponse.json(
                { error: 'Unauthorized - Missing or invalid authorization token' },
                { status: 401 }
            )
        };
    }

    // Verify admin role
    const adminData = await verifyAdminRole(authResult.uid);

    if (!adminData) {
        return {
            authorized: false,
            response: NextResponse.json(
                { error: 'Forbidden - Admin access required' },
                { status: 403 }
            )
        };
    }

    return {
        authorized: true,
        user: adminData
    };
}

/**
 * Authentication middleware - Verifies token only (no role check)
 * 
 * @param request - Next.js request object
 * @returns Response with 401 if unauthorized, or user data if authorized
 */
export async function requireAuth(request: NextRequest): Promise<{
    authorized: true;
    user: {
        uid: string;
        email?: string;
    };
} | {
    authorized: false;
    response: NextResponse;
}> {
    const authResult = await verifyAuthToken(request);

    if (!authResult) {
        return {
            authorized: false,
            response: NextResponse.json(
                { error: 'Unauthorized - Missing or invalid authorization token' },
                { status: 401 }
            )
        };
    }

    return {
        authorized: true,
        user: authResult
    };
}

/**
 * Verify CRON job authentication (for scheduled tasks)
 * 
 * @param request - Next.js request object
 * @returns true if authorized cron job, false otherwise
 */
export function verifyCronAuth(request: NextRequest): boolean {
    const authHeader = request.headers.get('authorization');
    const isVercelCron = request.headers.get('x-vercel-cron') === '1';

    // Allow Vercel Cron or valid CRON_SECRET
    return isVercelCron || authHeader === `Bearer ${process.env.CRON_SECRET}`;
}

/**
 * Example usage in API routes:
 * 
 * ```typescript
 * import { requireAdmin } from '@/lib/auth-middleware';
 * 
 * export async function POST(request: NextRequest) {
 *     const auth = await requireAdmin(request);
 *     
 *     if (!auth.authorized) {
 *         return auth.response; // Returns 401 or 403
 *     }
 *     
 *     // Proceed with authenticated admin user
 *     const { user } = auth;
 *     console.log(`Admin ${user.email} is making a request`);
 *     
 *     // Your API logic here...
 * }
 * ```
 */
