# MTRL-ADDONS - AI Assistant Guide

This document provides specific guidance for AI assistants working with the mtrl-addons package - the advanced features extension library for the mtrl ecosystem.

## 🎯 Package Purpose

mtrl-addons extends the main mtrl library with advanced features and performance-optimized components:

- **List Manager**: Virtual scrolling with intelligent data loading
- **Collection System**: Advanced data management with caching and state
- **Layout Schema**: Declarative UI composition system
- **Performance Utilities**: Optimized calculations and range management

## 🏗️ Architecture

### Core Systems

```
src/
├── components/           # Extended components
│   └── list/            # Advanced list component
├── core/                # Advanced core features
│   ├── collection/      # Collection management system
│   ├── list-manager/    # Virtual scrolling engine
│   └── layout/          # Layout schema system
└── styles/             # Extended component styles
```

### Key Features

1. **List Manager** (`src/core/list-manager/`)
   - Virtual scrolling with viewport management
   - Item size calculation and caching
   - Custom scrollbar implementation
   - Collection integration for data loading

2. **Collection System** (`src/core/collection/`)
   - Data loading and caching strategies
   - State management for large datasets
   - Event-driven architecture

3. **Layout Schema** (`src/core/layout/`)
   - Declarative UI composition
   - JSX-like syntax for component creation
   - Array-based schema system

## 🛠️ Development Guidelines

### Dependencies
- **Depends on mtrl main** - Import from `mtrl` package
- **Zero additional dependencies** - Maintain the zero-dependency philosophy
- **TypeScript first** - All features in TypeScript

### Component Enhancement Pattern
```typescript
// Use functional composition to enhance components
import { pipe } from 'mtrl/core/compose';
import { createList } from 'mtrl/components/list';

const enhancedList = pipe(
  createList(config),
  withCollection(collectionConfig),
  withListManager(listManagerConfig),
  withViewport(viewportConfig)
);
```

### Performance Focus
- **Virtual scrolling** - Handle massive datasets efficiently
- **Memory optimization** - Minimize DOM elements and memory usage
- **Intelligent loading** - Load data on-demand based on viewport
- **Caching strategies** - Cache measured sizes and loaded data

## 📋 List Manager System

### Core Components
- **Viewport**: Virtual scrolling and item positioning
- **Collection**: Data loading and state management
- **Item Size Manager**: Dynamic size calculation and caching
- **Scrolling Manager**: Custom scrollbar and scroll handling

### Usage Pattern
```typescript
import { createListManager } from 'mtrl-addons/core/list-manager';

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
});
```

### Event System
- **Data Loading**: `range:loaded`, `items:set`, `total:changed`
- **Viewport Changes**: `viewport:changed`, `range:rendered`
- **Performance**: `estimated-size:changed`, `dimensions:changed`

## 🎨 Styling System

### SCSS Architecture
- **Extends mtrl styles** - Build on core style system
- **BEM naming** - `mtrl-addon-component__element--modifier`
- **Performance CSS** - Optimize for virtual scrolling

### Virtual Scrolling Styles
```scss
.mtrl-list-manager {
  &__viewport {
    overflow: hidden;
    position: relative;
  }
  
  &__items {
    position: absolute;
    top: 0;
    left: 0;
  }
  
  &__scrollbar {
    // Custom scrollbar styles
  }
}
```

## 🧪 Testing Strategy

### Test Focus Areas
- **Performance testing** - Measure virtual scrolling performance
- **Data loading** - Test collection loading strategies
- **Memory usage** - Monitor DOM element creation/destruction
- **Viewport calculations** - Test range calculations and positioning

### Test Structure
```typescript
// test/core/list-manager/list-manager.test.ts
describe('ListManager', () => {
  it('should handle large datasets efficiently', () => {
    // Performance test
  });
  
  it('should load data on demand', () => {
    // Data loading test
  });
});
```

### Mock Strategies
- **Mock data sources** - Simulate large datasets
- **Mock viewport** - Test different container sizes
- **Mock collection** - Test data loading patterns

## 🚀 Common Development Tasks

### Adding New List Manager Features
1. **Create feature module** in `src/core/list-manager/features/`
2. **Follow enhancement pattern** - Use functional composition
3. **Add event handling** - Integrate with event system
4. **Test performance** - Ensure no performance regression

### Extending Collection System
1. **Add to collection features** in `src/core/collection/features/`
2. **Maintain cache efficiency** - Don't break caching strategies
3. **Handle edge cases** - Empty datasets, loading failures
4. **Test data integrity** - Ensure data consistency

### Performance Optimization
1. **Profile virtual scrolling** - Use browser dev tools
2. **Minimize DOM operations** - Batch updates when possible
3. **Optimize calculations** - Cache expensive computations
4. **Monitor memory usage** - Prevent memory leaks

## 📊 Performance Benchmarks

### Target Metrics
- **Initial render**: < 100ms for 1000+ items
- **Scroll performance**: 60 FPS during scrolling
- **Memory usage**: < 50MB for 100k items
- **Data loading**: < 200ms for range requests

### Monitoring Tools
- **Performance tests** in `test/benchmarks/`
- **Memory profiling** with browser dev tools
- **Scroll performance** measurement utilities

## 🔧 Integration with mtrl-app

### Showcases
- **Create showcases** in `mtrl-app/client/content/components/`
- **Use layout schema** - Demonstrate declarative UI
- **Performance demos** - Show large dataset handling
- **Real-world examples** - Practical use cases

### Documentation
- **API documentation** in `mtrl-app/docs/`
- **Performance guides** - Optimization strategies
- **Integration examples** - How to use with mtrl core

## 🐛 Common Issues & Solutions

### Performance Issues
- **Too many DOM elements** - Increase virtual scrolling efficiency
- **Memory leaks** - Check event listener cleanup
- **Slow scrolling** - Optimize item positioning calculations

### Data Loading Issues
- **Loading loops** - Check range calculation logic
- **Missing data** - Verify collection loading strategies
- **Inconsistent state** - Review event handling order

### Integration Issues
- **Component composition** - Ensure proper enhancement order
- **Event conflicts** - Check event listener priorities
- **Style conflicts** - Verify CSS specificity

## 📚 Key Files Reference

### Core Systems
- `src/core/list-manager/list-manager.ts` - Main list manager
- `src/core/collection/collection.ts` - Collection management
- `src/core/layout/schema.ts` - Layout schema system

### Features
- `src/core/list-manager/features/viewport/` - Virtual scrolling
- `src/core/collection/features/` - Collection features
- `src/core/compose/features/` - Composition utilities

### Tests
- `test/core/list-manager/` - List manager tests
- `test/benchmarks/` - Performance benchmarks
- `test/components/` - Component integration tests

---

This guide focuses specifically on mtrl-addons development. For core mtrl development, see `mtrl/CLAUDE.md`. For showcase and documentation, see `mtrl-app/CLAUDE.md`.
