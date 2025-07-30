
'use server';

import type { AuthUser } from './types';

// In a real app, you'd get this from the session.
// This is a placeholder for server-side authentication fetching.
export async function getAuthUser(): Promise<AuthUser> {
    return {
        uid: 'mock-user-id-123',
        email: 'owner@example.com',
        displayName: 'Store Owner',
        photoURL: null,
        isApproved: true,
        createdAt: new Date(),
        onboardingComplete: true,
    };
}
