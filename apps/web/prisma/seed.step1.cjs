/* CommonJS seed para Prisma */
const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

async function main () {
  // ---- EJEMPLOS DE SEED BÁSICO (ajustá si ya tenés modelos distintos)
  // Bloques de prueba
  await prisma.block?.createMany?.({
    data: [
      { title: 'Focus',  date: '2025-11-05', start: '09:00', end: '11:00', minutes: 120, tag: 'Trabajo' },
      { title: 'Gym',    date: '2025-11-05', start: '18:30', end: '19:30', minutes: 60,  tag: 'Salud'   },
    ],
    skipDuplicates: true
  }).catch(() => {})

  // Métricas de prueba
  await prisma.metric?.createMany?.({
    data: [
      { key: 'sleep_hours', value: 7.2, date: new Date().toISOString() },
      { key: 'coffee',      value: 1.0, date: new Date().toISOString() }
    ],
    skipDuplicates: true
  }).catch(() => {})
}

main()
  .then(async () => { await prisma.$disconnect() })
  .catch(async (e) => {
    console.error(e)
    await prisma.$disconnect()
    process.exit(1)
  })
