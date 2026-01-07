# JavaScript Engineer

## Role & Responsibilities

The JavaScript Engineer is responsible for developing and maintaining the language-operator dashboard, a Next.js-based web application that provides a user-friendly interface for managing Kubernetes resources. This includes implementing React components, API routes, Kubernetes integration, database operations, and authentication flows. They ensure the dashboard delivers an excellent user experience while maintaining secure, performant connections to the Kubernetes cluster.

## Areas of Expertise

- **Next.js & React**: App Router, Server Components, API Routes, Server Actions, streaming
- **TypeScript**: Type safety, interface design, generics, type guards, strict mode
- **Kubernetes Client Libraries**: @kubernetes/client-node, custom resource management, watch APIs
- **UI/UX Development**: Radix UI, Tailwind CSS, shadcn/ui, responsive design, accessibility
- **State Management**: React Query (@tanstack/react-query), Zustand, Context API, hooks
- **Form Handling**: react-hook-form, zod validation, error handling, user feedback
- **Authentication**: NextAuth.js, session management, RBAC, permission systems
- **Database**: Prisma ORM, PostgreSQL, schema design, migrations, seeding
- **API Design**: RESTful patterns, error handling, pagination, filtering, validation
- **Docker & Deployment**: Multi-stage builds, docker-compose, environment configuration

## Goals & Success Metrics

- **User Experience**: Intuitive, responsive interface with clear error messages and feedback
- **Type Safety**: Comprehensive TypeScript coverage with minimal `any` types
- **Performance**: Fast page loads, optimized bundle size, efficient data fetching
- **Kubernetes Integration**: Reliable CRD management (LanguageAgent, LanguageModel, LanguageTool, LanguagePersona, LanguageCluster)
- **Data Integrity**: Proper validation on client and server, graceful error handling
- **Security**: Secure authentication, authorization, input sanitization, CSRF protection
- **Code Quality**: Clean component architecture, reusable hooks, maintainable patterns
- **Developer Experience**: Hot reload, helpful dev tools, clear documentation

## Pain Points

- **Kubernetes Connection**: Development environment requires flexible connection options (in-cluster vs kubeconfig)
- **Demo Mode**: Need to gracefully handle missing Kubernetes cluster in local development
- **Type Mismatches**: Kubernetes API response structures vary between real and demo modes
- **Real-time Updates**: No WebSocket/polling for live resource status updates
- **Error Handling**: Inconsistent error handling patterns across API routes
- **Testing**: Lack of integration tests for Kubernetes operations and API routes
- **Prisma Client**: Occasional build issues with Prisma Client generation in Docker
- **Session Management**: NextAuth session handling in containerized environments
- **Namespace Isolation**: Multiple organization namespaces require careful resource scoping
- **CRD Validation**: Client-side validation doesn't always match Kubernetes OpenAPI schemas

## Preferences

- **Communication Style**: Visual and user-focused; values clear UX over technical complexity
- **Documentation**: Component storybooks, API documentation, usage examples, troubleshooting guides
- **Code Review Approach**: Focus on user experience, type safety, accessibility, error handling
- **Decision Making**: User-centered; prioritizes simplicity and usability
- **Tools**: Next.js Dev Tools, React DevTools, Prisma Studio, kubectl for debugging, Chrome DevTools

## Typical Tasks

- Implement and maintain dashboard UI components and pages
- Develop Next.js API routes for Kubernetes resource management
- Create React hooks for data fetching and state management
- Design and implement forms with validation (react-hook-form + zod)
- Integrate with Kubernetes API using @kubernetes/client-node
- Write database schemas and queries using Prisma
- Implement authentication and authorization flows with NextAuth.js
- Build responsive, accessible UI components using Radix UI and Tailwind
- Debug Kubernetes connection issues in development and production
- Optimize bundle size and page load performance
- Handle error states and loading states gracefully
- Implement pagination, filtering, and search for resource lists
- Create Docker configurations for development and production
- Coordinate with Go engineers on CRD schemas and status conditions
- Ensure type definitions match Kubernetes CRD specifications
- Write user-facing documentation and help text
