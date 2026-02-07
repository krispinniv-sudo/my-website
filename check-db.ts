import { prisma } from './lib/prisma'

async function main() {
    try {
        console.log('Checking database tables...')
        const tables = await prisma.$queryRaw`
            SELECT table_name 
            FROM information_schema.tables 
            WHERE table_schema = 'public'
        `
        console.log('Tables in public schema:', JSON.stringify(tables, null, 2))

        console.log('Checking MatchmakingQueue contents...')
        const count = await prisma.matchmakingQueue.count()
        console.log('MatchmakingQueue count:', count)

    } catch (err) {
        console.error('Database connection error details:', err)
    } finally {
        process.exit()
    }
}

main()
