import { prisma } from './lib/prisma'

async function main() {
    try {
        console.log('Checking prisma models...')
        const keys = Object.keys(prisma)
        console.log('Available models/properties:', keys.filter(k => !k.startsWith('_')))

        if ('matchmakingQueue' in prisma) {
            console.log('matchmakingQueue exists!')
        } else {
            console.error('matchmakingQueue DOES NOT exist on prisma client!')
        }
    } catch (err) {
        console.error('Error checking prisma:', err)
    } finally {
        process.exit()
    }
}

main()
