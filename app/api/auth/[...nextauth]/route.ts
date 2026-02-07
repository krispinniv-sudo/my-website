import NextAuth from "next-auth"
import GoogleProvider from "next-auth/providers/google"
import { PrismaAdapter } from "@next-auth/prisma-adapter"
import { prisma } from "@/lib/prisma"

export const authOptions = {
    adapter: PrismaAdapter(prisma),
    providers: [
        GoogleProvider({
            clientId: process.env.GOOGLE_CLIENT_ID!,
            clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
        }),
    ],
    callbacks: {
        async session({ session, user }: { session: any, user: any }) {
            if (session.user) {
                session.user.id = user.id;
                session.user.stars = user.stars || 0;
            }
            return session;
        },
    },
    secret: process.env.NEXTAUTH_SECRET,
    trustHost: true,
    cookies: {
        sessionToken: {
            name: `__Secure-next-auth.session-token`,
            options: {
                httpOnly: true,
                sameSite: 'lax' as const,
                path: '/',
                secure: true
            }
        },
        callbackUrl: {
            name: `__Secure-next-auth.callback-url`,
            options: {
                sameSite: 'lax' as const,
                path: '/',
                secure: true
            }
        },
        csrfToken: {
            name: `__Host-next-auth.csrf-token`,
            options: {
                sameSite: 'lax' as const,
                path: '/',
                secure: true
            }
        },
        pkceCodeVerifier: {
            name: `__Secure-next-auth.pkce.code_verifier`,
            options: {
                sameSite: 'lax' as const,
                path: '/',
                secure: true
            }
        },
        state: {
            name: `__Secure-next-auth.state`,
            options: {
                sameSite: 'lax' as const,
                path: '/',
                secure: true,
                maxAge: 900
            }
        },
    }
}

const handler = NextAuth(authOptions)

export { handler as GET, handler as POST }
