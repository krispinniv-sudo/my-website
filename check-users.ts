import { prisma } from './lib/prisma'

async function main() {
    try {
        console.log('Fetching users...')
        const users = await prisma.user.findMany({
            take: 10,
            select: { id: true, email: true, name: true, stars: true }
        })
        console.log('Users in DB:', JSON.stringify(users, null, 2))

    } catch (err) {
        console.error('Error fetching users:', err)
    } finally {
        process.exit()
    }
}

main()
