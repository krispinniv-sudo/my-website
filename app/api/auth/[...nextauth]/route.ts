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
        async signIn({ user, account, profile }: { user: any, account: any, profile?: any }) {
            console.log("SignIn Callback:", { email: user.email, provider: account?.provider });
            return true;
        },
        async session({ session, user }: { session: any, user: any }) {
            if (session.user) {
                session.user.id = user.id;
                session.user.stars = user.stars || 0;
            }
            return session;
        },
    },
    secret: process.env.NEXTAUTH_SECRET,
    debug: true,
}

const handler = NextAuth(authOptions)

export { handler as GET, handler as POST }
