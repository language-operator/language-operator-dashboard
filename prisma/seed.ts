import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

async function main() {
  console.log('🌱 Seeding database...')

  const passwordHash = await bcrypt.hash('password123', 12)

  // Create admin user — access to clusters is governed by K8s RBAC
  const user = await prisma.user.upsert({
    where: { email: 'james@theryans.io' },
    update: {},
    create: {
      email: 'james@theryans.io',
      name: 'James Ryan',
      emailVerified: new Date(),
      password: passwordHash,
    },
  })

  console.log('✅ Created user:', user.email)
  console.log('🎉 Database seeded successfully!')
  console.log('ℹ️  Grant cluster access by creating K8s ClusterRoleBindings for this user\'s email.')
}

main()
  .then(async () => {
    await prisma.$disconnect()
  })
  .catch(async (e) => {
    console.error('❌ Error seeding database:', e)
    await prisma.$disconnect()
    process.exit(1)
  })
