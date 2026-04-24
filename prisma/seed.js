const { PrismaClient } = require('@prisma/client')
const bcrypt = require('bcryptjs')

const prisma = new PrismaClient()

const seed = async () => {
    try {
        // Check if admin already exists
        const existingAdmin = await prisma.user.findFirst({
            where: { role: 'ADMIN' }
        })

        if (existingAdmin) {
            console.log('Admin already exists — skipping seed')
            return
        }

        // Create default admin
        const hashedPassword = await bcrypt.hash('Admin@123456', 10)

        const admin = await prisma.user.create({
            data: {
                name: 'Super Admin',
                email: 'admin@jobtracker.com',
                password: hashedPassword,
                role: 'ADMIN',
            }
        })

        console.log('✅ Default admin created:')
        console.log(`   Email: ${admin.email}`)
        console.log(`   Password: Admin@123456`)
        console.log('   ⚠️  Change password after first login!')

    } catch (error) {
        console.error('Seed failed:', error)
        process.exit(1)
    } finally {
        await prisma.$disconnect()
    }
}

seed()