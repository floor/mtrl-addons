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
│   │   └── vlist/           # Virtual list component
│   ├── core/                # Advanced core features
│   │   ├── viewport/        # Viewport and virtual scrolling
│   │   ├── layout/          # Layout schema system (JSX-like)
│   │   ├── compose/         # Enhanced composition utilities
│   │   └── gestures/        # Touch and gesture handling
│   ├── styles/              # Extended component styles
│   └── types/               # Shared type definitions
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
- **VList Component**: High-performance virtual list with direct viewport integration
- **Viewport System**: Virtual scrolling and positioning engine
- **Layout Schema**: Declarative UI composition system (JSX-like, array-based)
- **Gesture System**: Touch and gesture handling for interactive components
- **Compose Utilities**: Enhanced functional composition patterns

## Development Philosophy

### Core Principles

1. **"Less is More"** - Minimalist but complete implementation
2. **Zero Dependencies** - Only mtrl as peer dependency
3. **Performance First** - Optimized for large datasets and smooth scrolling
4. **Functional Composition** - Build on mtrl's composition patterns
5. **Extensibility** - Design for modularity and customization
6. **Integration** - Seamless integration with mtrl core components

### Design Decisions

- **Why VList?** Handle 100k+ items without performance degradation
- **Why Viewport System?** Flexible virtual scrolling for any component
- **Why Layout Schema?** Declarative, composable UI patterns (JSX-like without JSX)
- **Why Gestures?** Rich interaction patterns for touch devices
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
- ❌ **NEVER repeatedly ask to push after commits** - User will ask when ready
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
9. ✅ **DO NOT ASK to push** - Wait for user to request it
10. ✅ User will say "push" when they want to push to remote
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

### VList Component

**Purpose:** High-performance virtual list with direct viewport integration

**Key Features:**
- Virtual scrolling for massive datasets (100k+ items)
- Direct viewport integration (no abstraction layer)
- Configurable pagination strategies
- Template-based item rendering
- Built-in selection support

**Architecture:**
```
vlist/
├── vlist.ts              # Main component
├── types.ts              # Type definitions
├── config.ts             # Configuration defaults
├── constants.ts          # Constants
├── features.ts           # Feature composition
├── features/
│   ├── viewport/         # Virtual scrolling integration
│   ├── api/              # Public API methods
│   └── selection/        # Item selection handling
└── index.ts
```

**Usage Pattern:**
```typescript
import { createVList } from 'mtrl-addons/components/vlist'

const vlist = createVList({
  container: '#my-list',
  collection: myAdapter,
  rangeSize: 20,
  paginationStrategy: 'page',
  template: (item, index) => [
    { class: 'viewport-item', attributes: { 'data-id': item.id }},
    [{ class: 'viewport-item__name', text: item.name }],
    [{ class: 'viewport-item__value', text: item.value }]
  ]
})

// VList automatically handles:
// - Virtual scrolling
// - Item positioning
// - Data loading
// - Template rendering
```

### Viewport System

**Purpose:** Virtual scrolling and positioning engine

**Key Features:**
- Flexible viewport for any component
- Item size calculation and caching
- Scroll position management
- Range-based rendering
- Orientation support (vertical/horizontal)

**Usage Pattern:**
```typescript
import { withViewport } from 'mtrl-addons/core/viewport'

// Apply viewport to any component
const component = pipe(
  createBaseComponent(config),
  withViewport({
    orientation: 'vertical',
    estimatedItemSize: 60,
    overscan: 5
  })
)
```

### Layout Schema System

**Purpose:** Declarative UI composition system (JSX-like without JSX)

**Key Features:**
- Array-based schema for component composition
- JSX-like syntax without JSX transpilation
- Dynamic HTML generation
- Type-safe component creation
- Responsive layout configurations (stack, row, grid)
- Built-in performance optimizations

**Architecture:**
```
layout/
├── schema.ts             # Main schema processor
├── jsx.ts                # JSX-style API
├── config.ts             # Layout configurations
├── types.ts              # Type definitions
└── index.ts
```

**Usage Pattern:**
```typescript
import { createLayout } from 'mtrl-addons/core/layout'
import { createButton } from 'mtrl/components/button'
import { createText } from 'mtrl/components/text'

// Array-based schema
const layout = createLayout([
  [createButton, { variant: 'filled', text: 'Click me' }],
  [createText, { text: 'Hello World' }],
  ['div', { class: 'container' },
    [createButton, { variant: 'outlined', text: 'Nested' }]
  ]
])

// With layout configuration
const responsiveLayout = createLayout({
  type: 'row',
  gap: 16,
  mobileStack: true,
  children: [
    [createButton, { variant: 'filled', text: 'Button 1' }],
    [createButton, { variant: 'outlined', text: 'Button 2' }]
  ]
})

document.body.appendChild(layout)
```

### Gesture System

**Purpose:** Touch and gesture handling for interactive components

**Key Features:**
- Touch event abstraction
- Gesture recognition (tap, swipe, pinch, etc.)
- Multi-touch support
- Velocity and momentum calculations
- Integration with scroll and drag behaviors

**Usage Pattern:**
```typescript
import { withGestures } from 'mtrl-addons/core/gestures'

const component = pipe(
  createBaseComponent(config),
  withGestures({
    onSwipe: (direction, velocity) => {
      console.log(`Swiped ${direction} at ${velocity}px/s`)
    },
    onTap: (position) => {
      console.log(`Tapped at`, position)
    }
  })
)
```

### Compose Utilities

**Purpose:** Enhanced functional composition patterns

**Key Features:**
- Extended pipe and compose functions
- Conditional composition helpers
- Feature factory patterns
- Component enhancement utilities

**Usage Pattern:**
```typescript
import { pipe, composeFeatures } from 'mtrl-addons/core/compose'

const component = pipe(
  createBase(config),
  composeFeatures(
    withFeature1(config.feature1),
    config.feature2 && withFeature2(config.feature2),
    withFeature3(config.feature3)
  )
)
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
    const vlist = createVList({
      collection: {
        loadData: async (range) => generateMockData(range),
        totalItems: 100000
      },
      rangeSize: 20,
      template: (item) => [{ text: item.name }]
    })
    
    expect(vlist).toBeDefined()
    // Performance assertions
  })
  
  it('should render visible items only', async () => {
    const vlist = createVList({
      collection: mockAdapter,
      rangeSize: 20,
      template: (item) => [{ text: item.name }]
    })
    
    // Only visible range should be rendered
    const renderedItems = vlist.element.querySelectorAll('.viewport-item')
    expect(renderedItems.length).toBeLessThanOrEqual(20)
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
    const vlist = createVList({
      collection: {
        loadData: async (range) => generateMockData(range),
        totalItems: 100000
      },
      template: (item) => [{ text: item.name }]
    })
    
    // Initial render
    vlist.render()
  })
  
  bench('scroll through 100k items', async () => {
    const vlist = createVList({
      collection: {
        loadData: async (range) => generateMockData(range),
        totalItems: 100000
      },
      template: (item) => [{ text: item.name }]
    })
    
    // Simulate scrolling
    for (let i = 0; i < 100; i++) {
      await vlist.scrollToIndex(i * 100)
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
- VList component: < 12KB gzipped
- Viewport system: < 8KB gzipped
- Layout schema: < 5KB gzipped
- Gesture system: < 4KB gzipped
- Compose utilities: < 2KB gzipped
- Full package: < 30KB gzipped

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

### Adding New Feature to VList

**1. Create feature module:**
```bash
mkdir -p src/components/vlist/features/new-feature
touch src/components/vlist/features/new-feature/new-feature.ts
touch src/components/vlist/features/new-feature/types.ts
touch src/components/vlist/features/new-feature/index.ts
```

**2. Implement feature:**
```typescript
// src/components/vlist/features/new-feature/new-feature.ts
import type { NewFeatureConfig } from './types'

export const withNewFeature = (config: NewFeatureConfig) => (vlist: VListComponent) => {
  // Feature implementation
  return vlist
}
```

**3. Integrate with VList:**
```typescript
// src/components/vlist/vlist.ts
import { withNewFeature } from './features/new-feature'

export const createVList = <T>(config: VListConfig<T>) => {
  return pipe(
    createBase(config),
    withViewport(config),
    withAPI(config),
    config.newFeature && withNewFeature(config.newFeature)
  )
}
```

### Extending Layout Schema

**Add new layout type:**
```typescript
// src/core/layout/types.ts
export interface LayoutConfig {
  type?: 'stack' | 'row' | 'grid' | 'masonry' // Add new type
  // ...
}

// src/core/layout/schema.ts
const createMasonryLayout = (config: LayoutConfig, children: any[]) => {
  // Implement masonry layout logic
}
```

### Adding Gesture Recognition

**Add new gesture:**
```typescript
// src/core/gestures/recognizers/pinch.ts
export const createPinchRecognizer = (config: PinchConfig) => {
  return {
    recognize: (touches: Touch[]) => {
      // Pinch gesture detection
    },
    onPinch: (scale: number) => {
      // Handle pinch gesture
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
- `src/core/viewport/` - Viewport and virtual scrolling engine
- `src/core/layout/` - Layout schema system (JSX-like)
- `src/core/compose/` - Enhanced composition utilities
- `src/core/gestures/` - Touch and gesture handling

### Components
- `src/components/vlist/` - Virtual list component with direct viewport
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