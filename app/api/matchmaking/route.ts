import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { prisma } from '@/lib/prisma'

export async function POST(request: Request) {
    try {
        const supabase = await createClient()
        const { data: { session }, error: authError } = await supabase.auth.getSession()

        if (authError || !session) {
            console.error('[Matchmaking API] Auth Error:', authError)
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        const user = session.user
        const { stake } = await request.json()

        if (!stake) {
            return NextResponse.json({ error: 'Stake is required' }, { status: 400 })
        }

        // 1. Ensure User exists in Prisma (Sync from Supabase)
        // This handles cases where the auth callback might have been skipped or failed.
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
                stars: 500,
            }
        }).catch(err => {
            console.error('[Matchmaking API] User Sync Error:', err)
            // We continue as it might just be a transient DB error, but it's risky
        })

        console.log(`[Matchmaking API] User ${user.id} joining queue for stake ${stake}`)

        // 1. Look for an existing WAITING match for the same stake
        const existingMatch = await prisma.matchmakingQueue.findFirst({
            where: {
                stake: Number(stake),
                status: 'WAITING',
                createdAt: { gte: new Date(Date.now() - 60000) } // Increased to 60s for testing
            },
            orderBy: { createdAt: 'asc' }
        }).catch(err => {
            console.error('[Matchmaking API] Prisma findFirst error:', err)
            throw new Error(`Database search failed: ${err.message || JSON.stringify(err)}`)
        })

        if (existingMatch) {
            console.log(`[Matchmaking API] Found match: ${existingMatch.id} for user ${user.id}`)

            // Found a match! Create a DuelSession
            const duel = await prisma.duelSession.create({
                data: {
                    player1Id: existingMatch.userId,
                    player2Id: user.id,
                    stake: Number(stake),
                }
            }).catch(err => {
                console.error('[Matchmaking API] Prisma DuelSession create error:', err)
                throw new Error('Failed to create duel session')
            })

            // Update the matched entries
            await prisma.matchmakingQueue.update({
                where: { id: existingMatch.id },
                data: { status: 'MATCHED', duelId: duel.id }
            })

            // Create a matched entry for the current user too (for state tracking)
            const myEntry = await prisma.matchmakingQueue.create({
                data: {
                    userId: user.id,
                    stake: Number(stake),
                    status: 'MATCHED',
                    duelId: duel.id
                }
            })

            return NextResponse.json({ duelId: duel.id, entryId: myEntry.id })
        }

        // 2. No match found, enter the queue
        const newEntry = await prisma.matchmakingQueue.create({
            data: {
                userId: user.id,
                stake: Number(stake),
                status: 'WAITING'
            }
        }).catch(err => {
            console.error('[Matchmaking API] Prisma Queue create error:', err)
            throw new Error('Failed to join queue')
        })

        console.log(`[Matchmaking API] User ${user.id} added to queue: ${newEntry.id}`)
        return NextResponse.json({ entryId: newEntry.id })

    } catch (err: any) {
        console.error('[Matchmaking API] Global Catch:', err)
        return NextResponse.json({ error: err.message || 'Server error' }, { status: 500 })
    }
}

export async function DELETE(request: Request) {
    try {
        const supabase = await createClient()
        const { data: { session } } = await supabase.auth.getSession()

        if (!session) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        const { entryId } = await request.json()

        if (entryId) {
            await prisma.matchmakingQueue.update({
                where: { id: entryId },
                data: { status: 'CANCELLED' }
            })
        }

        return NextResponse.json({ success: true })
    } catch (err: any) {
        console.error('[Matchmaking API] DELETE Catch:', err)
        return NextResponse.json({ error: 'Failed to cancel' }, { status: 500 })
    }
}
