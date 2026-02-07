import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { prisma } from '@/lib/prisma'

export async function POST(request: Request) {
    const supabase = await createClient()
    const { data: { session } } = await supabase.auth.getSession()

    if (!session) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const user = session.user
    const { stake } = await request.json()

    if (!stake) {
        return NextResponse.json({ error: 'Stake is required' }, { status: 400 })
    }

    // 1. Look for an existing WAITING match for the same stake (not by the same user)
    const existingMatch = await prisma.matchmakingQueue.findFirst({
        where: {
            stake: Number(stake),
            status: 'WAITING',
            userId: { not: user.id },
            createdAt: { gte: new Date(Date.now() - 30000) } // Within last 30s
        },
        orderBy: { createdAt: 'asc' }
    })

    if (existingMatch) {
        // Found a match! Create a DuelSession
        const duel = await prisma.duelSession.create({
            data: {
                player1Id: existingMatch.userId,
                player2Id: user.id,
                stake: Number(stake),
            }
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
    })

    return NextResponse.json({ entryId: newEntry.id })
}

export async function DELETE(request: Request) {
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
}
