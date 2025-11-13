# App Builder Studio

Visual application builder for creating web applications with drag-and-drop interface. Build full-stack applications without writing code.

## Features

- **Visual Editor**: Drag-and-drop interface for building UIs
- **Component Library**: Pre-built components and templates
- **Data Modeling**: Visual database schema designer
- **API Builder**: Create GraphQL APIs visually
- **Deployment**: One-click deployment to AWS
- **Code Export**: Export generated code for customization
- **Template Gallery**: Pre-built app templates

## Tech Stack

**Frontend:**
- Next.js 15 with React 19 RC
- TypeScript
- Tailwind CSS with NextUI components
- AWS Amplify (GraphQL client)
- Zustand (State management)
- React Query (Data fetching)

**Backend:**
- AWS AppSync (GraphQL API)
- DynamoDB (Application data & schemas)
- AWS Cognito (Authentication)
- AWS Lambda (Code generation & deployment)
- S3 (Asset storage & deployments)
- CloudFront (CDN)

## Prerequisites

- Node.js 18+
- Yarn (package manager)
- AWS Account with credentials
- AWS CLI (installed locally via `./install-aws-cli-local.sh`)

## Setup

### 1. Install Dependencies

```bash
yarn install
```

### 2. Configure AWS Credentials

Copy `.env.example` to `.env` and fill in your AWS credentials:

```bash
AWS_ACCESS_KEY_ID=your_access_key
AWS_SECRET_ACCESS_KEY=your_secret_key
AWS_REGION=ap-southeast-2
AWS_ACCOUNT_ID=your_account_id
```

### 3. Install AWS CLI Locally

```bash
./install-aws-cli-local.sh
```

### 4. Load AWS Credentials

```bash
source ./set-aws-env.sh
```

## Development

### Run Frontend Dev Server

```bash
yarn dev
```

### Type Checking

```bash
yarn tsc
```

### Linting

```bash
yarn lint
```

## Deployment

### Deploy to Development

```bash
yarn deploy:dev
```

This will:
1. Compile AppSync resolvers and Lambda functions
2. Upload code to S3
3. Deploy CloudFormation stacks
4. Set up Cognito user pools
5. Create DynamoDB tables
6. Build and deploy frontend to CloudFront

### Deploy to Production

```bash
yarn deploy:prod
```

### Update Deployment (Without Recreating Resources)

```bash
yarn deploy:dev:update
```

## Project Structure

```
app-builder-studio/
├── frontend/           # Next.js application
│   ├── src/
│   │   ├── app/       # App router pages
│   │   ├── components/
│   │   │   ├── editor/      # Visual editor components
│   │   │   ├── builder/     # Component builder
│   │   │   └── preview/     # Live preview
│   │   ├── hooks/     # Custom React hooks
│   │   ├── stores/    # Zustand stores
│   │   ├── lib/       # API clients & utilities
│   │   └── types/     # TypeScript types
│   └── package.json
├── backend/           # AppSync & Lambda code
│   ├── schema/        # GraphQL schema files
│   ├── resolvers/     # AppSync resolver functions
│   ├── lambda/        # Lambda functions
│   │   ├── codeGenerator/   # Code generation engine
│   │   └── deployer/        # App deployment service
│   └── package.json
├── deploy/            # Deployment infrastructure
│   ├── resources/     # CloudFormation templates
│   └── utils/         # Deployment utilities
└── documents/         # Project documentation
```

## Core Features

### Visual Editor

The visual editor allows users to:
- Drag and drop components onto canvas
- Configure component properties
- Set up data bindings
- Define event handlers
- Preview in real-time

### Data Modeling

Visual database designer for:
- Creating tables and schemas
- Defining relationships
- Setting up indexes
- Configuring access patterns

### API Builder

Create GraphQL APIs by:
- Defining types visually
- Creating queries and mutations
- Setting up resolvers
- Configuring authentication

### Code Generation

The code generator produces:
- React components
- GraphQL schemas
- AppSync resolvers
- DynamoDB table definitions
- CloudFormation templates

### Deployment

One-click deployment:
- Provisions AWS infrastructure
- Deploys backend services
- Builds and uploads frontend
- Configures CDN and domain

## Database Structure

DynamoDB single-table design:

- Projects: `PK: PROJECT#<projectId>`, `SK: METADATA`
- Components: `PK: PROJECT#<projectId>`, `SK: COMPONENT#<componentId>`
- Schemas: `PK: PROJECT#<projectId>`, `SK: SCHEMA#<schemaId>`
- Deployments: `PK: PROJECT#<projectId>`, `SK: DEPLOYMENT#<timestamp>`

## Related Projects

See `CLAUDE.md` for cross-project references:

- **The Story Hub**: Reference for GraphQL patterns and AWS deployment
- **CloudWatch Live**: Reference for event management
- **Card Counting Trainer**: Reference for complex UI state management
- **Lawn Order**: Reference for business application patterns

When implementing code generation features, check other projects for patterns to generate.

## Documentation

See `documents/` folder for setup guides:

- `DOMAIN_SETUP.md` - Custom domain configuration
- `EMAIL_SETUP.md` - AWS SES email setup
- `ARCHITECTURE_FIXES_NEEDED.md` - Known issues

## License

MIT
