<a id="readme-top"></a>

[![Contributors][contributors-shield]][contributors-url]
[![Forks][forks-shield]][forks-url]
[![Stargazers][stars-shield]][stars-url]
[![Issues][issues-shield]][issues-url]
[![License][license-shield]][license-url]
[![LinkedIn][linkedin-shield]][linkedin-url]

<br />
<div align="center">
  <h3 align="center">Invora</h3>

  <p align="center">
    An invoicing platform for Moroccan businesses: quotes, invoices, credit notes, payments,
    recurring billing and WhatsApp delivery, built with Next.js, Prisma and SQLite.
    <br />
    <a href="https://github.com/Elouahabi-Naoufal/invoice-platform"><strong>Explore the source »</strong></a>
    <br />
    <br />
    <a href="https://github.com/Elouahabi-Naoufal/invoice-platform/issues/new?labels=bug">Report Bug</a>
    &middot;
    <a href="https://github.com/Elouahabi-Naoufal/invoice-platform/issues/new?labels=enhancement">Request Feature</a>
  </p>
</div>

<details>
  <summary>Table of Contents</summary>
  <ol>
    <li>
      <a href="#about-the-project">About The Project</a>
      <ul>
        <li><a href="#built-with">Built With</a></li>
      </ul>
    </li>
    <li>
      <a href="#getting-started">Getting Started</a>
      <ul>
        <li><a href="#prerequisites">Prerequisites</a></li>
        <li><a href="#installation">Installation</a></li>
      </ul>
    </li>
    <li><a href="#usage">Usage</a></li>
    <li><a href="#roadmap">Roadmap</a></li>
    <li><a href="#contributing">Contributing</a></li>
    <li><a href="#license">License</a></li>
    <li><a href="#contact">Contact</a></li>
    <li><a href="#acknowledgments">Acknowledgments</a></li>
  </ol>
</details>

## About The Project

Invora is a full-stack invoicing application built around Moroccan billing rules. A company
profile holds legal identifiers (ICE, IF, RC, patente, CNSS), bank details, a default currency
and VAT rate. Documents move through a real lifecycle rather than being freely editable rows:

* Drafts are mutable and have no number; finalizing allocates `PREFIX-YYYY-NNNN` per company
  and year.
* Issued invoices are immutable. Corrections are handled as credit notes or rectifying invoices
  linked to the original.
* Sellers, buyers and line items are snapshotted at finalization, so history does not change.
* Amounts are stored in integer minor units, with per-line VAT, discounts and deterministic
  rounding. The same calculation module feeds the web preview and the PDF.
* Partial payments are recorded separately; overpayment is rejected and totals remain derived.
* Quotes (`devis`) can be accepted and converted into invoices.

Additional features include:

* Reusable product/service catalog and client records
* Recurring invoice templates and overdue reminders
* Public, revocable invoice links with view tracking
* PDF generation, CSV/UBL exports and reporting
* WhatsApp PDF delivery through Baileys with QR pairing and a persistent server session
* Team members with owner/admin/viewer roles
* A platform admin hub for registrations, tenants, provisioning and audit logs
* Docker deployment with an entrypoint that applies migrations

The application is designed to be deployed once per business, with its own container, domain,
database, secrets and WhatsApp session.

<p align="right">(<a href="#readme-top">back to top</a>)</p>

### Built With

* [![Next.js][Next.js]][Next-url]
* [![React][React.js]][React-url]
* [![TypeScript][TypeScript]][TypeScript-url]
* [![Prisma][Prisma]][Prisma-url]
* [![SQLite][SQLite]][SQLite-url]
* [![Tailwind CSS][TailwindCSS]][TailwindCSS-url]
* [![Zod][Zod]][Zod-url]
* [![Docker][Docker]][Docker-url]

<p align="right">(<a href="#readme-top">back to top</a>)</p>

## Getting Started

### Prerequisites

* Node.js 20+ and npm
* SQLite (bundled with the application through Prisma)
* Optional: a WhatsApp account for the Baileys delivery flow

### Installation

1. Clone the repository
   ```sh
   git clone https://github.com/Elouahabi-Naoufal/invoice-platform.git
   cd invoice-platform
   ```

2. Create the environment file
   ```sh
   cp .env.example .env
   ```
   Set at least `DATABASE_URL` and a strong `JWT_SECRET`. Review `NEXT_PUBLIC_APP_URL`,
   `DEFAULT_COUNTRY_CODE`, the WhatsApp settings and the SMTP settings if you need email.

3. Install dependencies
   ```sh
   npm install
   ```

4. Apply the Prisma migrations
   ```sh
   npx prisma migrate dev --name init
   ```

5. Run the test suite
   ```sh
   npm run test
   ```

6. Start the development server
   ```sh
   npm run dev
   ```

7. Open <http://localhost:3001>

Docker deployment:
```sh
docker build -t invora .
docker run --env-file .env -p 3007:3007 -v "$PWD/data:/app/data" invora
```

<p align="right">(<a href="#readme-top">back to top</a>)</p>

## Usage

1. Create a company profile under `/companies`, including its legal identifiers and invoice
   prefixes.
2. Add clients and reusable products or services.
3. Create an invoice or quote, add lines, discounts and VAT, then finalize it to allocate a
   number and freeze its snapshots.
4. Download the PDF, share the public link, or send it through the WhatsApp integration.
5. Record payments as they arrive; the invoice status is derived from the payment total.
6. Use recurring templates and reminders for repeat billing and overdue follow-ups.
7. Export data or review reports from the reporting and export screens.
8. Administrators handle registrations, tenants and audit history from `/admin`.

WhatsApp delivery requires pairing the Baileys session from the settings screen and enabling
WhatsApp on the company. The session is stored server-side in `WHATSAPP_SESSION_DIR`.

<p align="right">(<a href="#readme-top">back to top</a>)</p>

## Roadmap

- [x] Company, client, product and invoice management
- [x] Quotes, credit notes and rectifying invoices
- [x] Atomic numbering, immutable issued documents and snapshot history
- [x] Payments, recurring invoices and reminders
- [x] PDF generation, public links and WhatsApp delivery
- [x] Team roles, platform admin hub and tenant provisioning
- [ ] Add in-app notifications for due items
- [ ] Add bulk actions and saved filters on invoice lists
- [ ] Add a full French/Arabic/English string catalog
- [ ] Add optional nightly database backups
- [ ] Prepare structured e-invoicing export for the DGI

See the [open issues](https://github.com/Elouahabi-Naoufal/invoice-platform/issues) for a full
list of proposed features and known issues.

<p align="right">(<a href="#readme-top">back to top</a>)</p>

## Contributing

Contributions are what make the open source community such an amazing place to learn, inspire,
and create. Any contributions you make are **greatly appreciated**.

1. Fork the Project
2. Create your Feature Branch (`git checkout -b feature/AmazingFeature`)
3. Commit your Changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the Branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

### Top contributors:

<a href="https://github.com/Elouahabi-Naoufal/invoice-platform/graphs/contributors">
  <img src="https://contrib.rocks/image?repo=Elouahabi-Naoufal/invoice-platform" alt="contrib.rocks image" />
</a>

<p align="right">(<a href="#readme-top">back to top</a>)</p>

## License

This project is not licensed — all rights reserved.

<p align="right">(<a href="#readme-top">back to top</a>)</p>

## Contact

Naoufal Elouahabi - [LinkedIn](https://www.linkedin.com/in/elouahabi-naoufal/) - elouahabi-naoufal1@gmail.com

Project Link: [https://github.com/Elouahabi-Naoufal/invoice-platform](https://github.com/Elouahabi-Naoufal/invoice-platform)

<p align="right">(<a href="#readme-top">back to top</a>)</p>

## Acknowledgments

* [Prisma](https://www.prisma.io/)
* [@react-pdf/renderer](https://react-pdf.org/)
* [Baileys](https://github.com/WhiskeySockets/Baileys)
* [Best-README-Template](https://github.com/othneildrew/Best-README-Template)
* [Img Shields](https://shields.io)

<p align="right">(<a href="#readme-top">back to top</a>)</p>

[contributors-shield]: https://img.shields.io/github/contributors/Elouahabi-Naoufal/invoice-platform.svg?style=for-the-badge
[contributors-url]: https://github.com/Elouahabi-Naoufal/invoice-platform/graphs/contributors
[forks-shield]: https://img.shields.io/github/forks/Elouahabi-Naoufal/invoice-platform.svg?style=for-the-badge
[forks-url]: https://github.com/Elouahabi-Naoufal/invoice-platform/network/members
[stars-shield]: https://img.shields.io/github/stars/Elouahabi-Naoufal/invoice-platform.svg?style=for-the-badge
[stars-url]: https://github.com/Elouahabi-Naoufal/invoice-platform/stargazers
[issues-shield]: https://img.shields.io/github/issues/Elouahabi-Naoufal/invoice-platform.svg?style=for-the-badge
[issues-url]: https://github.com/Elouahabi-Naoufal/invoice-platform/issues
[license-shield]: https://img.shields.io/badge/license-none-lightgrey?style=for-the-badge
[license-url]: #license
[linkedin-shield]: https://img.shields.io/badge/-LinkedIn-black.svg?style=for-the-badge&logo=linkedin&colorB=555
[linkedin-url]: https://www.linkedin.com/in/elouahabi-naoufal/
[Next.js]: https://img.shields.io/badge/next.js-000000?style=for-the-badge&logo=nextdotjs&logoColor=white
[Next-url]: https://nextjs.org/
[React.js]: https://img.shields.io/badge/React-20232A?style=for-the-badge&logo=react&logoColor=61DAFB
[React-url]: https://react.dev/
[TypeScript]: https://img.shields.io/badge/TypeScript-3178C6?style=for-the-badge&logo=typescript&logoColor=white
[TypeScript-url]: https://www.typescriptlang.org/
[Prisma]: https://img.shields.io/badge/Prisma-2D3748?style=for-the-badge&logo=prisma&logoColor=white
[Prisma-url]: https://www.prisma.io/
[SQLite]: https://img.shields.io/badge/SQLite-003B57?style=for-the-badge&logo=sqlite&logoColor=white
[SQLite-url]: https://www.sqlite.org/
[TailwindCSS]: https://img.shields.io/badge/Tailwind%20CSS-06B6D4?style=for-the-badge&logo=tailwindcss&logoColor=white
[TailwindCSS-url]: https://tailwindcss.com/
[Zod]: https://img.shields.io/badge/Zod-3068B6?style=for-the-badge&logo=zod&logoColor=white
[Zod-url]: https://zod.dev/
[Docker]: https://img.shields.io/badge/Docker-2496ED?style=for-the-badge&logo=docker&logoColor=white
[Docker-url]: https://www.docker.com/
