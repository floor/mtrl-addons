# mtrl-addons - Extended Components for mtrl

## Project Overview

mtrl-addons is an extension library for the mtrl Material Design 3 component system, providing specialized elements and extended functionality for modern applications. It maintains the same "less is more" philosophy with zero external dependencies (mtrl as peer dependency only).

**Key Details:**
- License: MIT
- Language: TypeScript (strict mode)
- Runtime: Bun (native TypeScript execution)
- Dependencies: mtrl (peer dependency only)
- Framework: Agnostic - works with any JavaScript framework or vanilla JS

## Architecture

### Package Ecosystem

mtrl-addons is part of the mtrl ecosystem:

```
mtrl ecosystem/
├── mtrl/              # Core Material Design 3 components
├── mtrl-addons/       # Extended components (this package)
└── mtrl-app/          # Documentation hub and showcase
```

**Package Relationships:**
```
mtrl (Foundation)
    ↑
mtrl-addons (Extensions)
    ├── Peer dependency on mtrl
    ├── Virtual scrolling and collections
    ├── Layout schema system
    └── Performance optimizations
```

**Development Environment Recommendation:**
Clone related packages as siblings for easier cross-package development:
```
~/Code/
├── mtrl/              # Core components
├── mtrl-addons/       # This package
└── mtrl-app/          # Documentation
```

### Package Structure

```
mtrl-addons/
├── src/
│   ├── components/           # Extended components
│   │   └── list/            # Advanced list component
│   ├── core/                # Advanced core features
│   │   ├── collection/      # Collection management system
│   │   ├── list-manager/    # Virtual scrolling engine
│   │   ├── layout/          # Layout schema system
│   │   └── compose/         # Composition utilities
│   └── styles/              # Extended component styles
├── test/                    # Bun test suite
│   ├── components/          # Component tests
│   ├── core/                # Core feature tests
│   └── benchmarks/          # Performance benchmarks
├── debugging/               # Temporary debug files (gitignored)
├── dist/                    # Built package (gitignored)
└── package.json
```

## Technology Stack

### Core
- **Language**: TypeScript (strict mode enabled)
- **Runtime**: Bun (native TypeScript execution, built-in test runner)
- **Build Tool**: Bun
- **Test Framework**: Bun's built-in test runner
- **DOM Testing**: JSDOM

### Key Features
- **Virtual Scrolling**: High-performance list rendering for large datasets
- **Collection System**: Advanced data management with caching
- **Layout Schema**: Declarative UI composition system
- **Performance Utilities**: Optimized calculations and range management

## Development Philosophy

### Core Principles

1. **"Less is More"** - Minimalist but complete implementation
2. **Zero Dependencies** - Only mtrl as peer dependency
3. **Performance First** - Optimized for large datasets and smooth scrolling
4. **Functional Composition** - Build on mtrl's composition patterns
5. **Extensibility** - Design for modularity and customization
6. **Integration** - Seamless integration with mtrl core components

### Design Decisions

- **Why Virtual Scrolling?** Handle 100k+ items without performance degradation
- **Why Collection System?** Intelligent data loading and caching strategies
- **Why Layout Schema?** Declarative, composable UI patterns
- **Why Extend mtrl?** Specialized features not needed in base library
- **Why Peer Dependency?** Maintain single source of truth for core components

## Development Setup

### 🚫 CRITICAL - Git Commit and Push Rules

**ABSOLUTE PROHIBITIONS:**
- ❌ **NEVER commit before testing** - Always test changes first
- ❌ **NEVER commit without explicit user permission** - Even if changes are tested
- ❌ **NEVER push to remote without explicit user permission** - Even after committing
- ❌ **NEVER run `git commit` automatically** - Always ask first
- ❌ **NEVER run `git push` automatically** - Always ask first
- ❌ **NEVER assume user wants changes committed** - Testing does not mean committing
- ❌ **NEVER assume user wants changes pushed** - Committing does not mean pushing
- ❌ **NEVER create markdown files without asking first** - No .md files without permission

**MANDATORY WORKFLOW:**
1. ✅ Make changes to files
2. ✅ Test the changes thoroughly (`bun test`)
3. ✅ Run type checking (`bun run typecheck`)
4. ✅ Build the package (`bun run build`)
5. ✅ Show `git status` and `git diff` to user
6. ✅ **STOP and ASK**: "Should I commit these changes?"
7. ✅ Wait for explicit "yes" or "commit" from user
8. ✅ Only then run `git commit`
9. ✅ **STOP and ASK**: "Should I push to remote?"
10. ✅ Wait for explicit "yes" or "push" from user
11. ✅ Only then run `git push`

### Initial Setup

```bash
# Clone repository
git clone <repository-url> mtrl-addons
cd mtrl-addons

# Install dependencies
bun install

# Link mtrl for local development (if needed)
bun link mtrl

# Build package
bun run build

# Run tests
bun test

# Type check
bun run typecheck
```

### Key Commands

```bash
# Development
bun run dev                # Development mode with watch
bun run build              # Build package for distribution
bun run build:app          # Build for mtrl-app integration
bun run typecheck          # TypeScript type checking

# Testing
bun test                   # Run all tests
bun test --watch          # Watch mode for tests
bun test <pattern>        # Run specific test files
bun run test:perf         # Run performance benchmarks

# Quality
bun run lint              # Check code style
bun run lint:fix          # Fix code style issues
```

## Coding Standards

### TypeScript Best Practices

**Type Safety (CRITICAL):**
- **Strict mode enabled** - All type checking rules active
- **NEVER use `any` type** - Always use proper interfaces or `unknown`
- **Create interfaces** for all data structures
- **Explicit return types** on all functions
- **Type all function parameters**
- **Use generic types** for reusable utilities

**Example:**
```typescript
// ✅ GOOD - Proper types
interface ListManagerConfig {
  orientation: 'vertical' | 'horizontal'
  estimatedItemSize: number
  overscan?: number
}

function createListManager<T>(config: ListManagerConfig): ListManager<T> {
  // typed parameter and generic return
}

// ❌ BAD - Using any
function createListManager(config: any): any {  // NEVER DO THIS
  return config
}
```

### Component Structure

**Standard Component File Structure:**
```typescript
// src/components/advanced-list/advanced-list.ts

// 1. Imports
import { pipe } from 'mtrl/core/compose'
import { createList } from 'mtrl/components/list'
import { createListManager } from '../../core/list-manager'

// 2. Types
interface AdvancedListConfig {
  collection: CollectionConfig
  viewport: ViewportConfig
  scrollbar?: ScrollbarConfig
}

// 3. Constants
const DEFAULTS: Partial<AdvancedListConfig> = {
  viewport: {
    orientation: 'vertical',
    overscan: 5
  }
}

// 4. Features (composable functions)
const withListManager = (config: ListManagerConfig) => (element: HTMLElement): HTMLElement => {
  const manager = createListManager(config)
  // Attach manager to element
  return element
}

// 5. Main creator function
export const createAdvancedList = <T>(config: AdvancedListConfig): HTMLElement => {
  const finalConfig = { ...DEFAULTS, ...config }
  
  return pipe(
    createList({ variant: 'basic' }),
    withListManager(finalConfig),
    withCollection(finalConfig.collection),
    withScrollbar(finalConfig.scrollbar)
  )
}
```

### Functional Composition

**Build on mtrl's Pipe Pattern:**
```typescript
import { pipe } from 'mtrl/core/compose'

// Compose features using pipe
const createEnhancedComponent = <T>(config: Config): HTMLElement => {
  return pipe(
    createBaseComponent(config),
    withVirtualScrolling(config.viewport),
    withDataLoading(config.collection),
    withCustomScrollbar(config.scrollbar)
  )
}
```

### File Management

**Preferences:**
- Prefer editing existing files over creating new ones
- Avoid hyphens in filenames if possible
- Prefer short filenames if clear enough
- Use `debugging/` folder for temporary test files (gitignored)
- No summary .md files for coding sessions

**Component File Organization:**
- Main module: `list-manager.ts`
- Types: `types.ts`
- Constants: `constants.ts`
- API: `api.ts` (special features)
- Features: `features.ts` (or split into `features/` folder if large)
- Index: `index.ts` (exports)

## Core Systems

### List Manager System

**Purpose:** Virtual scrolling engine for handling massive datasets efficiently

**Key Features:**
- Virtual scrolling with viewport management
- Item size calculation and caching
- Custom scrollbar implementation
- Collection integration for data loading

**Architecture:**
```
list-manager/
├── list-manager.ts       # Main manager
├── types.ts              # Type definitions
├── constants.ts          # Configuration defaults
├── features/
│   ├── viewport/         # Virtual scrolling viewport
│   ├── collection/       # Data loading integration
│   ├── item-size/        # Size calculation & caching
│   └── scrollbar/        # Custom scrollbar
└── index.ts
```

**Usage Pattern:**
```typescript
import { createListManager } from 'mtrl-addons/core/list-manager'

const listManager = createListManager({
  collection: {
    loadData: async (range) => fetchItems(range),
    totalItems: 100000,
    cacheSize: 1000
  },
  viewport: {
    orientation: 'vertical',
    estimatedItemSize: 60,
    overscan: 5
  }
})

// Event handling
listManager.on('range:loaded', (data) => {
  console.log('Loaded items:', data)
})

listManager.on('viewport:changed', (viewport) => {
  console.log('Viewport changed:', viewport)
})
```

### Collection System

**Purpose:** Advanced data management with caching and state

**Key Features:**
- Data loading and caching strategies
- State management for large datasets
- Event-driven architecture
- Intelligent range loading

**Usage Pattern:**
```typescript
import { createCollection } from 'mtrl-addons/core/collection'

const collection = createCollection({
  loadData: async (range) => {
    const response = await fetch(`/api/items?start=${range.start}&end=${range.end}`)
    return response.json()
  },
  totalItems: 100000,
  cacheSize: 1000,
  preloadAhead: 2
})

// Load data
await collection.load({ start: 0, end: 50 })

// Get cached data
const items = collection.get({ start: 10, end: 30 })
```

### Layout Schema System

**Purpose:** Declarative UI composition system

**Key Features:**
- Array-based schema for component composition
- JSX-like syntax without JSX
- Dynamic HTML generation
- Type-safe component creation

**Usage Pattern:**
```typescript
import { createLayout } from 'mtrl-addons/core/layout'
import { createButton } from 'mtrl/components/button'
import { createText } from 'mtrl/components/text'

const layout = createLayout([
  [createButton, { variant: 'filled', text: 'Click me' }],
  [createText, { text: 'Hello World' }],
  ['div', { class: 'container' },
    [createButton, { variant: 'outlined', text: 'Nested' }]
  ]
])

document.body.appendChild(layout)
```

## Testing Strategy

### Test Structure

```typescript
// test/core/list-manager/list-manager.test.ts
import { describe, it, expect, beforeEach } from 'bun:test'
import { JSDOM } from 'jsdom'
import { createListManager } from '../../src/core/list-manager'

describe('ListManager', () => {
  let dom: JSDOM
  
  beforeEach(() => {
    dom = new JSDOM('<!DOCTYPE html><body></body>')
    global.document = dom.window.document as any
    global.HTMLElement = dom.window.HTMLElement as any
  })
  
  it('should handle large datasets efficiently', async () => {
    const manager = createListManager({
      collection: {
        loadData: async (range) => generateMockData(range),
        totalItems: 100000
      },
      viewport: {
        orientation: 'vertical',
        estimatedItemSize: 60
      }
    })
    
    expect(manager).toBeDefined()
    // Performance assertions
  })
  
  it('should load data on demand', async () => {
    let loadCount = 0
    const manager = createListManager({
      collection: {
        loadData: async (range) => {
          loadCount++
          return generateMockData(range)
        },
        totalItems: 1000
      }
    })
    
    await manager.scrollTo(500)
    expect(loadCount).toBeGreaterThan(0)
  })
})
```

### Performance Benchmarks

```typescript
// test/benchmarks/virtual-scrolling.bench.ts
import { describe, it, bench } from 'bun:test'
import { createListManager } from '../../src/core/list-manager'

describe('Virtual Scrolling Performance', () => {
  bench('render 100k items', () => {
    const manager = createListManager({
      collection: {
        loadData: async (range) => generateMockData(range),
        totalItems: 100000
      }
    })
    
    manager.render()
  })
  
  bench('scroll through 100k items', async () => {
    const manager = createListManager({
      collection: {
        loadData: async (range) => generateMockData(range),
        totalItems: 100000
      }
    })
    
    for (let i = 0; i < 100; i++) {
      await manager.scrollTo(i * 1000)
    }
  })
})
```

### Testing Guidelines

1. **Use Bun test runner** - Native TypeScript support, fast execution
2. **Use JSDOM** - For DOM testing in Node environment
3. **Mock data sources** - Create realistic mock datasets
4. **Test performance** - Use benchmarks for critical paths
5. **Test edge cases** - Empty datasets, loading failures, boundary conditions
6. **Test integration** - Verify mtrl component integration

## Performance Optimization

### Target Metrics

**Virtual Scrolling:**
- Initial render: < 100ms for 1000+ items
- Scroll performance: 60 FPS during scrolling
- Memory usage: < 50MB for 100k items
- Data loading: < 200ms for range requests

**Bundle Size:**
- Core list manager: < 10KB gzipped
- Collection system: < 5KB gzipped
- Layout schema: < 3KB gzipped
- Full package: < 25KB gzipped

### Optimization Strategies

**Virtual Scrolling:**
```typescript
// ✅ Good - Efficient viewport calculations
const calculateVisibleRange = memoize((scrollTop: number, viewportHeight: number, itemHeight: number) => {
  const start = Math.floor(scrollTop / itemHeight)
  const end = Math.ceil((scrollTop + viewportHeight) / itemHeight)
  return { start, end }
})

// ❌ Bad - Recalculating every time
const calculateVisibleRange = (scrollTop: number, viewportHeight: number, itemHeight: number) => {
  // Expensive calculation on every scroll
  return expensiveCalculation(scrollTop, viewportHeight, itemHeight)
}
```

**Memory Management:**
```typescript
// ✅ Good - Reuse DOM elements
const itemPool = new Map<string, HTMLElement>()

const getOrCreateItem = (key: string): HTMLElement => {
  if (itemPool.has(key)) {
    return itemPool.get(key)!
  }
  
  const element = createItem()
  itemPool.set(key, element)
  return element
}

// ❌ Bad - Create new elements every time
const createNewItem = (): HTMLElement => {
  return document.createElement('div') // Memory leak!
}
```

## Showcase & Documentation

### Documentation Location

**❌ Do NOT create documentation in mtrl-addons package**
- No README files for features
- No .md files for components
- No inline documentation beyond JSDoc

**✅ DO create documentation in mtrl-app:**
- `mtrl-app/client/content/addons/` - Component showcases
- `mtrl-app/docs/addons/` - Architecture and usage guides
- Interactive demonstrations with live code examples

### Creating Showcases

**Always use layout schema:**
```typescript
// In mtrl-app, not in mtrl-addons
import { createAdvancedList } from 'mtrl-addons/components/list'

const showcase = [
  [AdvancedList, {
    collection: {
      loadData: async (range) => mockData(range),
      totalItems: 10000
    }
  }]
]
```

## Common Development Tasks

### Adding New Feature to List Manager

**1. Create feature module:**
```bash
mkdir -p src/core/list-manager/features/new-feature
touch src/core/list-manager/features/new-feature/new-feature.ts
touch src/core/list-manager/features/new-feature/types.ts
touch src/core/list-manager/features/new-feature/index.ts
```

**2. Implement feature:**
```typescript
// src/core/list-manager/features/new-feature/new-feature.ts
import type { NewFeatureConfig } from './types'

export const createNewFeature = (config: NewFeatureConfig) => {
  return {
    apply: (manager: ListManager) => {
      // Feature implementation
    },
    destroy: () => {
      // Cleanup
    }
  }
}
```

**3. Integrate with list manager:**
```typescript
// src/core/list-manager/list-manager.ts
import { createNewFeature } from './features/new-feature'

export const createListManager = (config: ListManagerConfig) => {
  const features = []
  
  if (config.newFeature) {
    features.push(createNewFeature(config.newFeature))
  }
  
  // Apply features
  features.forEach(feature => feature.apply(manager))
  
  return manager
}
```

### Extending Collection System

**Add caching strategy:**
```typescript
// src/core/collection/features/caching.ts
export const createCachingStrategy = (strategy: 'lru' | 'fifo' | 'lfu') => {
  const cache = new Map()
  
  return {
    set: (key: string, value: any) => {
      // Strategy-specific caching
    },
    get: (key: string) => {
      return cache.get(key)
    },
    clear: () => {
      cache.clear()
    }
  }
}
```

## Build System

### Package Configuration

**package.json exports:**
```json
{
  "name": "mtrl-addons",
  "type": "module",
  "exports": {
    ".": {
      "import": "./dist/index.js",
      "require": "./dist/index.cjs"
    },
    "./core/*": {
      "import": "./dist/core/*.js",
      "require": "./dist/core/*.cjs"
    },
    "./components/*": {
      "import": "./dist/components/*.js",
      "require": "./dist/components/*.cjs"
    }
  }
}
```

### Build Commands

```bash
# Package build (for distribution)
bun run build

# App build (for mtrl-app integration)
bun run build:app

# Watch mode
bun run dev

# Type checking
bun run typecheck
```

**⚠️ Important:** Use `bun run build:app` when building for mtrl-app, NOT `bun run build`

## Common Issues & Solutions

### Performance Issues

**Issue:** Slow scrolling with large datasets
**Solution:** 
- Check overscan value (don't make it too large)
- Verify item size caching is working
- Profile with browser DevTools

**Issue:** Memory leaks
**Solution:**
- Ensure proper cleanup in destroy methods
- Check event listener removal
- Verify DOM element recycling

### Integration Issues

**Issue:** Components not composing correctly
**Solution:**
- Check import order from mtrl
- Verify peer dependency version matches
- Test in isolation first

**Issue:** TypeScript errors with mtrl types
**Solution:**
- Ensure mtrl types are properly exported
- Check tsconfig.json moduleResolution
- Verify type imports use correct paths

## Related Packages

### mtrl

**Purpose:** Core Material Design 3 component library
- Foundation for all mtrl-addons features
- Provides base components and utilities
- Zero dependencies

**Documentation:** `mtrl/CLAUDE.md`

### mtrl-app

**Purpose:** Documentation hub and interactive showcase
- Component demonstrations
- Usage examples
- API documentation
- Interactive playground

**Documentation:** `mtrl-app/CLAUDE.md`

## Key Files Reference

### Core Systems
- `src/core/list-manager/` - Virtual scrolling engine
- `src/core/collection/` - Collection management
- `src/core/layout/` - Layout schema system
- `src/core/compose/` - Composition utilities

### Components
- `src/components/list/` - Advanced list component
- `src/components/index.ts` - Component exports

### Testing
- `test/core/` - Core feature tests
- `test/benchmarks/` - Performance benchmarks
- `test/components/` - Component tests

## Prohibited Actions

**❌ NEVER do these:**
- Use React or any framework (pure TypeScript/JavaScript only)
- Add external dependencies beyond mtrl peer dependency
- Create markdown documentation files in this package
- Hardcode prefix in TypeScript or SCSS files
- Use `any` type in TypeScript
- Duplicate mtrl core functionality
- Enhance components while fixing bugs (stay focused)
- Run development servers (Bun/Node)
- Use global Window object to store things
- Build using `bun run build` when integrating with mtrl-app (use `bun run build:app`)

**✅ ALWAYS do these:**
- Write tests before implementing features
- Use TypeScript strict mode
- Follow mtrl patterns and conventions
- Optimize for performance (size, memory, speed)
- Ensure mtrl integration works seamlessly
- Ask before creating .md files
- Ask before committing changes
- Ask before pushing to remote

## Contributing

1. Follow all coding standards and guidelines
2. Write comprehensive tests including performance benchmarks
3. Ensure seamless mtrl integration
4. Document in mtrl-app (not here)
5. Run type checking before committing
6. Ask for permission before git operations
7. Follow conventional commit format

## Conventional Commits

```bash
feat(list-manager): add infinite scroll support
fix(collection): correct cache invalidation logic
refactor(viewport): optimize range calculations
perf(scrolling): improve scroll performance by 30%
test(list-manager): add virtual scrolling benchmarks
docs(readme): update installation guide
style(list): fix formatting
chore(deps): update mtrl peer dependency
```

---

**Remember:** This package extends mtrl with advanced features. Every line of code matters. Stay minimal, stay fast, stay integrated with mtrl core. 🚀