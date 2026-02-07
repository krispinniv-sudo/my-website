import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(request: Request) {
    const { searchParams, origin } = new URL(request.url)
    const code = searchParams.get('code')
    // if "next" is in search params, use it as the redirection URL after successful sign in
    const next = searchParams.get('next') ?? '/'

    if (code) {
        const supabase = await createClient()
        const { data: { session }, error } = await supabase.auth.exchangeCodeForSession(code)
        if (!error && session) {
            const user = session.user
            // Upsert user into Prisma
            const { prisma } = await import('@/lib/prisma')
            await prisma.user.upsert({
                where: { id: user.id },
                update: {
                    email: user.email,
                    name: user.user_metadata?.full_name || user.email?.split('@')[0],
                    image: user.user_metadata?.avatar_url,
                },
                create: {
                    id: user.id,
                    email: user.email,
                    name: user.user_metadata?.full_name || user.email?.split('@')[0],
                    image: user.user_metadata?.avatar_url,
                    stars: 500, // Initial balance
                },
            })

            const forwardedHost = request.headers.get('x-forwarded-host') // i.e. localhost:3000, your-app.vercel.app
            const isLocalEnv = process.env.NODE_ENV === 'development'
            if (isLocalEnv) {
                // we can be sure that origin is http://localhost:3000
                return NextResponse.redirect(`${origin}${next}`)
            } else if (forwardedHost) {
                return NextResponse.redirect(`https://${forwardedHost}${next}`)
            } else {
                return NextResponse.redirect(`${origin}${next}`)
            }
        }
    }

    // return the user to an error page with instructions
    return NextResponse.redirect(`${origin}/auth/auth-error`)
}
