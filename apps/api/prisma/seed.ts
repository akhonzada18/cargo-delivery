import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const terminals = [
    {
      name: 'Daewoo Cargo Terminal (Faizabad)',
      city: 'Islamabad / Rawalpindi',
      address: 'Faizabad Interchange, Murree Road',
      lat: 33.6621,
      lng: 73.0819,
    },
    {
      name: 'Daewoo Cargo Terminal (Peshawar Road)',
      city: 'Rawalpindi',
      address: 'Peshawar Road, near Chairing Cross / 26 Number',
      lat: 33.6007,
      lng: 73.0169,
    },
    {
      name: 'Faisal Movers Cargo (Faizabad)',
      city: 'Islamabad / Rawalpindi',
      address: 'Faizabad Terminal, Murree Road',
      lat: 33.6628,
      lng: 73.0844,
    },
    {
      name: 'Niazi Express Cargo (Faizabad)',
      city: 'Islamabad / Rawalpindi',
      address: 'Faizabad Bus Stand, Murree Road',
      lat: 33.6615,
      lng: 73.083,
    },
    {
      name: 'Pirwadhai General Bus & Cargo Adda',
      city: 'Rawalpindi',
      address: 'Pirwadhai General Bus Stand, IJP Road',
      lat: 33.6335,
      lng: 73.0402,
    },
    {
      name: 'I-11 Goods & Cargo Adda',
      city: 'Islamabad',
      address: 'Sector I-11/4, near Sabzi Mandi / IJP Road',
      lat: 33.6494,
      lng: 73.0205,
    },
    {
      name: '26 Number Chungi / Motorway Cargo Hub',
      city: 'Islamabad',
      address: '26 Number Chungi, GT Road / M-1 Link',
      lat: 33.6431,
      lng: 72.9317,
    },
  ];

  let created = 0;
  for (const terminal of terminals) {
    const existing = await prisma.cargoTerminal.findFirst({
      where: { name: terminal.name, city: terminal.city },
    });
    if (!existing) {
      await prisma.cargoTerminal.create({ data: terminal });
      created += 1;
    }
  }

  console.log(`Seeded ${created} new Islamabad/Rawalpindi cargo terminals (${terminals.length} total configured).`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
