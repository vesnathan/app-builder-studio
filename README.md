# App Builder Studio

Marketing website for App Builder Studio - a custom web and mobile app development service.

## Architecture

This is a **marketing/landing page** with a simple serverless backend for form submissions.

### Frontend

- **Framework**: Next.js 15 with React 19 RC
- **Styling**: Tailwind CSS with NextUI components
- **Animations**: Framer Motion
- **Icons**: Iconify React
- **Carousel**: Swiper.js

### Backend

- **Form Handling**: AWS Lambda (contact/quote form submissions)
- **Email**: Amazon SES
- **Hosting**: Amazon S3 + CloudFront

## Project Structure

```
app-builder-studio/
├── frontend/               # Next.js frontend application
│   ├── src/
│   │   ├── app/           # Next.js App Router pages
│   │   ├── components/    # React components
│   │   └── config/        # Configuration files
│   ├── package.json
│   ├── next.config.js
│   ├── tailwind.config.ts
│   └── tsconfig.json
│
├── backend/               # Lambda functions
│   └── lambda/           # Contact/quote form handler
│
├── deploy/               # Deployment scripts
│   └── cfn-template.yaml # CloudFormation template
│
└── documents/            # Project documentation
```

## Pages

- **Home** (`/`) - Main landing page with services overview
- **Contact** (`/contact`) - Contact form for inquiries
- **Quote** (`/quote`) - Request a quote form

## Development

### Prerequisites

- Node.js 18+
- Yarn (package manager)

### Getting Started

1. **Install dependencies**

   ```bash
   yarn install
   ```

2. **Run frontend locally**

   ```bash
   yarn dev
   ```

   The app will run on http://localhost:3004

### Type Checking

```bash
yarn tsc
```

### Linting

```bash
yarn lint
```

## Tech Stack

### Frontend Dependencies

- `next`: ^15.0.2
- `react`: 19.0.0-rc
- `tailwindcss`: ^3.4.14
- `@nextui-org/react`: 2.4.6
- `framer-motion`: ^11.0.0
- `@iconify/react`: ^5.0.2
- `swiper`: ^11.0.5

## Deployment

The project uses AWS CloudFormation for infrastructure deployment.

### Deploy to Development

```bash
yarn deploy:dev
```

### Deploy to Production

```bash
yarn deploy:prod
```

## Documentation

See `documents/` folder for setup guides:

- `DOMAIN_SETUP.md` - Custom domain configuration
- `EMAIL_SETUP.md` - AWS SES email setup

## License

Copyright 2024. All rights reserved.
