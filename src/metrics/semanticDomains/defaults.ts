import type { DomainDefinition } from "./types"

/**
 * Built-in semantic domain definitions with sensible defaults
 * for common programming patterns across multiple languages.
 */
export const DEFAULT_DOMAINS: Record<string, DomainDefinition> = {
  Database: {
    name: "Database",
    color: "#ff6b6b",
    keywords: [
      // SQL keywords
      "SELECT",
      "INSERT",
      "UPDATE",
      "DELETE",
      "WHERE",
      "JOIN",
      "INNER",
      "LEFT",
      "RIGHT",
      "OUTER",
      "FROM",
      "GROUP BY",
      "ORDER BY",
      // Database operations
      "query",
      "transaction",
      "commit",
      "rollback",
      "schema",
      "migration",
      "migrate",
      // ORM patterns
      "findMany",
      "findOne",
      "findFirst",
      "findUnique",
      "create",
      "update",
      "upsert",
      "delete",
      "Model",
      "Schema",
      "Entity",
      "Table",
      "Column",
      "Relation"
    ],
    imports: [
      // Node.js/TypeScript
      "pg",
      "mysql",
      "mysql2",
      "sqlite3",
      "better-sqlite3",
      "@prisma/client",
      "prisma",
      "sequelize",
      "typeorm",
      "drizzle-orm",
      "knex",
      "mongoose",
      // Python
      "sqlalchemy",
      "django.db",
      "psycopg2",
      "pymongo",
      "peewee",
      // Go
      "database/sql",
      "gorm.io/gorm",
      "github.com/jmoiron/sqlx",
      // Rust
      "sqlx",
      "diesel",
      "sea-orm"
    ],
    pathPatterns: [
      "**/migrations/**",
      "**/models/**",
      "**/entities/**",
      "**/schemas/**",
      "*.sql",
      "**/db/**",
      "**/database/**",
      "**/prisma/**"
    ],
    weights: {
      keyword: 1,
      import: 5,
      path: 10
    }
  },

  UI: {
    name: "UI",
    color: "#4ecdc4",
    keywords: [
      // React patterns
      "render",
      "component",
      "Component",
      "props",
      "state",
      "useState",
      "useEffect",
      "useContext",
      "useMemo",
      "useCallback",
      "useRef",
      // DOM/styling
      "className",
      "style",
      "css",
      "styled",
      // Events
      "onClick",
      "onChange",
      "onSubmit",
      "onInput",
      "onFocus",
      "onBlur",
      // Vue patterns
      "template",
      "directive",
      "reactive",
      "ref",
      "computed",
      // Angular
      "@Component",
      "@Input",
      "@Output",
      // General UI
      "button",
      "input",
      "form",
      "modal",
      "dialog"
    ],
    imports: [
      // React ecosystem
      "react",
      "react-dom",
      "react/jsx-runtime",
      "preact",
      "styled-components",
      "@emotion/react",
      "@emotion/styled",
      "@mui/material",
      "@chakra-ui",
      "@radix-ui",
      // Vue
      "vue",
      "@vue",
      "nuxt",
      // Other frameworks
      "svelte",
      "@angular/core",
      "solid-js",
      "@solidjs/router"
    ],
    pathPatterns: [
      "**/components/**",
      "**/views/**",
      "**/pages/**",
      "*.tsx",
      "*.jsx",
      "*.vue",
      "*.svelte",
      "**/ui/**",
      "**/widgets/**"
    ],
    weights: {
      keyword: 1,
      import: 5,
      path: 10
    }
  },

  API: {
    name: "API",
    color: "#45b7d1",
    keywords: [
      // Route patterns
      "router",
      "route",
      "Router",
      "endpoint",
      "handler",
      "Handler",
      // HTTP verbs
      "GET",
      "POST",
      "PUT",
      "PATCH",
      "DELETE",
      "OPTIONS",
      // Request/Response
      "request",
      "response",
      "req",
      "res",
      "ctx",
      "context",
      // Middleware
      "middleware",
      "Middleware",
      "next",
      // Controllers
      "controller",
      "Controller",
      "service",
      "Service",
      // Status codes
      "json",
      "send",
      "status",
      "redirect"
    ],
    imports: [
      // Node.js
      "express",
      "fastify",
      "koa",
      "hono",
      "@hono/node-server",
      "@remix-run/node",
      "@remix-run/server-runtime",
      "next",
      "@nestjs/common",
      "@nestjs/core",
      "@trpc/server",
      // Python
      "flask",
      "django",
      "fastapi",
      "starlette",
      // Go
      "net/http",
      "github.com/gin-gonic/gin",
      "github.com/gorilla/mux",
      "github.com/labstack/echo",
      // Rust
      "actix-web",
      "axum",
      "rocket"
    ],
    pathPatterns: [
      "**/routes/**",
      "**/api/**",
      "**/controllers/**",
      "**/handlers/**",
      "**/endpoints/**",
      "**/server/**"
    ],
    weights: {
      keyword: 1,
      import: 5,
      path: 10
    }
  },

  Testing: {
    name: "Testing",
    color: "#95e1d3",
    keywords: [
      // Test declarations
      "test",
      "describe",
      "it",
      "suite",
      "should",
      // Assertions
      "expect",
      "assert",
      "toBe",
      "toEqual",
      "toHaveBeenCalled",
      // Mocking
      "mock",
      "Mock",
      "spy",
      "Spy",
      "stub",
      "Stub",
      "fixture",
      // Lifecycle
      "beforeEach",
      "afterEach",
      "beforeAll",
      "afterAll",
      "setUp",
      "tearDown",
      "setup",
      "cleanup"
    ],
    imports: [
      // JavaScript/TypeScript
      "jest",
      "vitest",
      "@testing-library/react",
      "@testing-library/vue",
      "@testing-library/svelte",
      "mocha",
      "chai",
      "sinon",
      "@jest/globals",
      // Python
      "pytest",
      "unittest",
      "mock",
      // Go
      "testing",
      "github.com/stretchr/testify",
      // Rust
      "mockall"
    ],
    pathPatterns: [
      "**/*.test.*",
      "**/*.spec.*",
      "**/tests/**",
      "**/__tests__/**",
      "**/test/**",
      "**/*_test.*"
    ],
    weights: {
      keyword: 1,
      import: 5,
      path: 15 // Strong signal for test files
    }
  },

  Config: {
    name: "Config",
    color: "#f38181",
    keywords: [
      "config",
      "Config",
      "configuration",
      "Configuration",
      "settings",
      "Settings",
      "options",
      "Options",
      "defaults",
      "env",
      "ENV",
      "environment",
      "constants",
      "CONSTANTS"
    ],
    imports: [
      "dotenv",
      "config",
      "@config",
      "rc",
      "cosmiconfig",
      "pydantic",
      "environ",
      "viper" // Go
    ],
    pathPatterns: [
      "*.config.*",
      "*.conf.*",
      "**/config/**",
      "**/configs/**",
      ".env*",
      "*.yaml",
      "*.yml",
      "*.toml",
      "*.ini",
      "**/settings/**"
    ],
    weights: {
      keyword: 1,
      import: 3,
      path: 15 // Config files often obvious from path
    }
  },

  ExternalAPI: {
    name: "External API",
    color: "#fdcb6e",
    keywords: [
      // HTTP clients
      "fetch",
      "axios",
      "request",
      "get",
      "post",
      "put",
      "delete",
      // Python requests
      "requests.get",
      "requests.post",
      "urllib.request",
      "httpx",
      // Node.js
      "http.request",
      "https.request",
      "XMLHttpRequest",
      // API patterns
      "api_call",
      "external_api",
      "http_client",
      "rest_client",
      "endpoint",
      "url"
    ],
    imports: [
      // JavaScript/TypeScript
      "axios",
      "node-fetch",
      "got",
      "superagent",
      "request",
      // Python
      "requests",
      "urllib",
      "httpx",
      "aiohttp",
      // Go
      "net/http",
      // Rust
      "reqwest"
    ],
    pathPatterns: [
      "**/api/**",
      "**/client/**",
      "**/http/**",
      "**/requests/**"
    ],
    weights: {
      keyword: 1.5,
      import: 7,
      path: 8
    }
  },

  Auth: {
    name: "Auth",
    color: "#a8e6cf",
    keywords: [
      // Auth concepts
      "auth",
      "Auth",
      "authentication",
      "Authentication",
      "authorization",
      "Authorization",
      // User flows
      "login",
      "Login",
      "logout",
      "Logout",
      "signin",
      "signIn",
      "signup",
      "signUp",
      "register",
      "Register",
      // Security
      "token",
      "Token",
      "jwt",
      "JWT",
      "session",
      "Session",
      "password",
      "Password",
      "hash",
      "salt",
      // Access control
      "permissions",
      "Permissions",
      "roles",
      "Roles",
      "acl",
      "ACL",
      "authorize",
      "authenticate"
    ],
    imports: [
      // Node.js
      "passport",
      "next-auth",
      "@auth/core",
      "@clerk/nextjs",
      "jsonwebtoken",
      "bcrypt",
      "bcryptjs",
      "argon2",
      "@lucia-auth/adapter",
      // Python
      "django.contrib.auth",
      "flask-login",
      "flask-jwt-extended",
      "authlib",
      // Go
      "github.com/golang-jwt/jwt",
      "golang.org/x/crypto/bcrypt"
    ],
    pathPatterns: [
      "**/auth/**",
      "**/authentication/**",
      "**/authorization/**",
      "**/login/**",
      "**/security/**",
      "**/middleware/auth*"
    ],
    weights: {
      keyword: 1.5,
      import: 7,
      path: 10
    }
  }
}
