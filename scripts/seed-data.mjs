import { PrismaClient } from "@prisma/client";

const ownerEmail = process.env.SEED_OWNER_EMAIL;
const targetCompanies = Number(process.env.SEED_COMPANIES ?? 3);
const targetCustomers = Number(process.env.SEED_CUSTOMERS ?? 5);

if (!Number.isInteger(targetCompanies) || targetCompanies < 0) {
  throw new Error("SEED_COMPANIES must be a non-negative integer");
}
if (!Number.isInteger(targetCustomers) || targetCustomers < 0) {
  throw new Error("SEED_CUSTOMERS must be a non-negative integer");
}

const prisma = new PrismaClient();

const sampleCompanies = [
  {
    legalName: "Atlas Digital SARL",
    tradeName: "Atlas Digital",
    address: "25, Avenue Anfa",
    city: "Casablanca",
    country: "MA",
    phone: "+212 6 00 00 00 00",
    email: "contact@atlas-digital.ma",
    website: "https://atlas-digital.ma",
    defaultCurrency: "MAD",
    defaultTaxBps: 2000,
    invoicePrefix: "FAC",
    avoirPrefix: "AV",
    devisPrefix: "DEV",
    invoiceLocale: "fr",
    accentColor: "#465FFF",
    taxRegime: "COMMUN",
    legalForm: "SARL",
    capitalSocial: 500000,
    cnss: "00 12345 00000",
    ice: "100000000000044",
    identifiantFiscal: "10101010",
    rc: "RC12345",
    rcCity: "Casablanca",
    patente: "TP12345",
  },
  {
    legalName: "Merzouka Consulting SARL",
    tradeName: "Merzouka Consulting",
    address: "18, Rue Al Massira",
    city: "Marrakech",
    country: "MA",
    phone: "+212 6 00 00 00 01",
    email: "contact@merzouka-consulting.ma",
    website: "https://merzouka-consulting.ma",
    defaultCurrency: "MAD",
    defaultTaxBps: 2000,
    invoicePrefix: "FAC",
    avoirPrefix: "AV",
    devisPrefix: "DEV",
    invoiceLocale: "fr",
    accentColor: "#0F766E",
    taxRegime: "COMMUN",
    legalForm: "SARL",
    capitalSocial: 250000,
    cnss: "00 23456 00000",
    ice: "200000000000088",
    identifiantFiscal: "20202020",
    rc: "RC23456",
    rcCity: "Marrakech",
    patente: "TP23456",
  },
  {
    legalName: "Sahara Logistics SARL",
    tradeName: "Sahara Logistics",
    address: "7, Boulevard Hassan II",
    city: "Agadir",
    country: "MA",
    phone: "+212 6 00 00 00 02",
    email: "contact@sahara-logistics.ma",
    website: "https://sahara-logistics.ma",
    defaultCurrency: "MAD",
    defaultTaxBps: 2000,
    invoicePrefix: "FAC",
    avoirPrefix: "AV",
    devisPrefix: "DEV",
    invoiceLocale: "fr",
    accentColor: "#7C3AED",
    taxRegime: "COMMUN",
    legalForm: "SARL",
    capitalSocial: 300000,
    cnss: "00 34567 00000",
    ice: "300000000000035",
    identifiantFiscal: "30303030",
    rc: "RC34567",
    rcCity: "Agadir",
    patente: "TP34567",
  },
];

const sampleCustomers = [
  {
    type: "COMPANY",
    name: "Hajar Trading",
    companyName: "Hajar Trading SARL",
    email: "contact@hajar-trading.ma",
    phone: "+212 6 00 00 00 03",
    address: "12, Avenue Hassan II",
    city: "Casablanca",
    country: "MA",
    ice: "510000000000001",
    isAssujetti: true,
    defaultCurrency: "MAD",
    notes: "Demo customer seeded for invoice testing.",
  },
  {
    type: "COMPANY",
    name: "Casa Food",
    companyName: "Casa Food SARL",
    email: "contact@casa-food.ma",
    phone: "+212 6 00 00 00 04",
    address: "3, Rue Gauthier",
    city: "Casablanca",
    country: "MA",
    ice: "520000000000002",
    isAssujetti: true,
    defaultCurrency: "MAD",
    notes: "Demo customer seeded for invoice testing.",
  },
  {
    type: "PERSON",
    name: "Omar Bennani",
    email: "omar.bennani@example.ma",
    phone: "+212 6 00 00 00 05",
    address: "9, Rue Jabal Tazeka",
    city: "Rabat",
    country: "MA",
    isAssujetti: false,
    defaultCurrency: "MAD",
    notes: "Demo customer seeded for invoice testing.",
  },
  {
    type: "COMPANY",
    name: "Rif Tech",
    companyName: "Rif Tech SARL",
    email: "contact@rif-tech.ma",
    phone: "+212 6 00 00 00 06",
    address: "21, Avenue Mohammed V",
    city: "Tanger",
    country: "MA",
    ice: "530000000000003",
    isAssujetti: true,
    defaultCurrency: "MAD",
    notes: "Demo customer seeded for invoice testing.",
  },
  {
    type: "PERSON",
    name: "Yasmine El Fassi",
    email: "yasmine.el.fassi@example.ma",
    phone: "+212 6 00 00 00 07",
    address: "5, Rue Al Kindi",
    city: "Fes",
    country: "MA",
    isAssujetti: false,
    defaultCurrency: "MAD",
    notes: "Demo customer seeded for invoice testing.",
  },
];

function assertOwner(owner) {
  if (!owner) {
    throw new Error("No user found; set SEED_OWNER_EMAIL to an existing user email");
  }
}

async function main() {
  const where = ownerEmail
    ? { email: ownerEmail.toLowerCase() }
    : { createdAt: { not: new Date("9999-12-31T00:00:00.000Z") } };
  const owner = await prisma.user.findFirst({
    where,
    orderBy: { createdAt: "asc" },
  });
  assertOwner(owner);

  const companies = await prisma.company.findMany({
    where: { ownerId: owner.id, archived: false },
    orderBy: { createdAt: "asc" },
  });
  const customers = await prisma.client.findMany({
    where: { ownerId: owner.id },
    orderBy: { createdAt: "asc" },
  });

  const missingCompanies = sampleCompanies.slice(companies.length, targetCompanies);
  const missingCustomers = sampleCustomers.slice(customers.length, targetCustomers);

  if (companies.length > targetCompanies || customers.length > targetCustomers) {
    throw new Error(
      `Target counts would require deleting existing records: companies=${companies.length}, customers=${customers.length}`
    );
  }

  const createdCompanies = await prisma.$transaction(async (tx) => {
    const created = [];
    for (const data of missingCompanies) {
      created.push(
        await tx.company.create({
          data: {
            ...data,
            ownerId: owner.id,
            archived: false,
          },
        })
      );
    }
    return created;
  });

  const createdCustomers = await prisma.$transaction(async (tx) => {
    const created = [];
    for (const data of missingCustomers) {
      created.push(
        await tx.client.create({
          data: {
            ...data,
            ownerId: owner.id,
          },
        })
      );
    }
    return created;
  });

  const finalCompanies = await prisma.company.count({ where: { ownerId: owner.id, archived: false } });
  const finalCustomers = await prisma.client.count({ where: { ownerId: owner.id } });

  // Repair demo companies that predate legal-identifier seeding: without valid
  // ICE/IF/patente, invoices cannot be finalized (art.145). Only touches
  // companies matching a known sample legalName and only fills empty fields.
  const repairedCompanies = [];
  for (const data of sampleCompanies) {
    const existing = await prisma.company.findFirst({
      where: { ownerId: owner.id, legalName: data.legalName },
    });
    if (existing && (!existing.ice || !existing.identifiantFiscal || !existing.patente)) {
      await prisma.company.update({
        where: { id: existing.id },
        data: {
          ice: existing.ice || data.ice,
          identifiantFiscal: existing.identifiantFiscal || data.identifiantFiscal,
          rc: existing.rc || data.rc,
          rcCity: existing.rcCity || data.rcCity,
          patente: existing.patente || data.patente,
        },
      });
      repairedCompanies.push(existing.id);
    }
  }

  console.log(JSON.stringify({
    ownerEmail: owner.email,
    createdCompanies: createdCompanies.map((record) => record.id),
    createdCustomers: createdCustomers.map((record) => record.id),
    repairedCompanies,
    finalCompanies,
    finalCustomers,
  }, null, 2));

  if (finalCompanies !== targetCompanies || finalCustomers !== targetCustomers) {
    throw new Error(`Seed counts do not match target: companies=${finalCompanies}, customers=${finalCustomers}`);
  }
}

main()
  .catch((error) => {
    console.error(error instanceof Error ? error.message : error);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
