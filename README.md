# mtrl-addons

> Extended components and utilities for the [mtrl](https://github.com/nicholasgriffintn/mtrl) Material Design 3 component library

mtrl-addons provides high-performance, specialized components and core systems that extend mtrl's capabilities for building modern web applications. Built with the same functional composition philosophy and zero external dependencies (except mtrl as a peer dependency).

## Features

- 🚀 **Virtual Scrolling** - Handle millions of items with smooth 60fps scrolling
- 📝 **Form Builder** - Declarative form creation with validation and state management
- 🎨 **Color Picker** - Full-featured HSV picker with swatches, pipette, and variants
- 📐 **Layout System** - Flexible array-based layout schemas with JSX support
- 👆 **Gesture Recognition** - Touch and mouse gesture detection (tap, swipe, pinch, etc.)
- 🎯 **Viewport System** - Composable virtual scrolling foundation
- 🌳 **Tree-Shaking Optimized** - Import only what you need

## Installation

```bash
# npm
npm install mtrl-addons mtrl

# yarn
yarn add mtrl-addons mtrl

# bun
bun add mtrl-addons mtrl
```

## Quick Start

```javascript
import { createVList, createForm, createColorPicker } from 'mtrl-addons';
```

## Tree-Shaking Optimized Imports

mtrl-addons is optimized for tree-shaking. Constants are exported separately from component creators to minimize bundle size.

### Import Patterns

| Import Type | Path |
|-------------|------|
| Component creators | `import { createColorPicker } from 'mtrl-addons'` |
| ColorPicker constants | `import { COLORPICKER_EVENTS } from 'mtrl-addons/components/colorpicker/constants'` |
| Form constants | `import { FORM_EVENTS, DATA_STATE } from 'mtrl-addons/components/form/constants'` |
| VList constants | `import { VLIST_CLASSES } from 'mtrl-addons/components/vlist/constants'` |
| Color utilities | `import { hsvToRgb, rgbToHex } from 'mtrl-addons'` |
| Layout system | `import { createLayout } from 'mtrl-addons/layout'` |
| Viewport system | `import { createViewport } from 'mtrl-addons/viewport'` |
| Gestures | `import { createGestureManager } from 'mtrl-addons/gestures'` |

---

## Components

### VList (Virtual List)

High-performance virtual scrolling list for large datasets. Renders only visible items while maintaining smooth scrolling with millions of rows.

#### Features
- 📊 Handles 100,000+ items efficiently
- 🔍 Built-in search with debouncing
- 🎛️ Filter panel integration
- ⌨️ Keyboard navigation
- 📍 Scroll position restoration
- 🎯 Item selection (single/multi)
- 📈 Stats tracking (render time, visible items)
- ⚡ Velocity-based scroll optimization

#### Basic Usage

```javascript
import { createVList } from 'mtrl-addons';

const vlist = createVList({
  container: '#my-list',
  template: (item) => ({
    class: 'list-item',
    children: [
      { tag: 'span', class: 'name', text: item.name },
      { tag: 'span', class: 'email', text: item.email }
    ]
  }),
  collection: {
    adapter: {
      read: async ({ page, limit }) => {
        const response = await fetch(`/api/users?page=${page}&limit=${limit}`);
        return response.json();
      }
    }
  }
});
```

#### With Layout, Search & Filters

```javascript
import { createVList } from 'mtrl-addons';
import { createIconButton, createSearch, createSelect } from 'mtrl';

const vlist = createVList({
  container: '#users-list',
  class: 'users',
  
  // Layout schema - declarative UI structure
  layout: [
    ['head', { class: 'list-head' },
      [createIconButton, 'searchBtn', { icon: iconSearch, toggle: true }],
      [createIconButton, 'filterBtn', { icon: iconFilter, toggle: true }]
    ],
    ['filter-panel', { class: 'filter-panel' },
      [createSelect, 'country', { label: 'Country', options: countries }],
      [createSelect, 'role', { label: 'Role', options: roles }]
    ],
    [createSearch, 'searchBar', { placeholder: 'Search users...' }],
    ['viewport'], // Virtual scrolling area
    ['foot', { class: 'list-foot' },
      ['stats', { text: 'Loading...' }]
    ]
  ],
  
  // Search configuration
  search: {
    toggleButton: 'searchBtn',
    searchBar: 'searchBar',
    debounce: 300
  },
  
  // Filter configuration
  filter: {
    toggleButton: 'filterBtn',
    panel: 'filter-panel',
    controls: {
      country: 'country',
      role: 'role'
    }
  },
  
  // Stats display
  stats: {
    element: 'stats',
    format: ({ total, rendered }) => `${rendered} of ${total} users`
  },
  
  template: userTemplate,
  collection: {
    adapter: {
      read: async ({ page, limit, search, filters }) => {
        // search and filters are automatically populated
        return fetchUsers({ page, limit, search, ...filters });
      }
    }
  }
});

// Events
vlist.on('search:change', ({ query }) => console.log('Search:', query));
vlist.on('filter:change', ({ filters }) => console.log('Filters:', filters));
vlist.on('item:select', ({ item }) => console.log('Selected:', item));

// API
vlist.search('john');
vlist.setFilter('country', 'US');
vlist.scrollToIndex(50);
vlist.refresh();
```

---

### Form

Functional form builder with declarative field configuration, validation, and state management.

#### Features
- 📋 Declarative field definitions
- ✅ Built-in validation rules
- 🔄 Dirty/pristine state tracking
- 🛡️ Unsaved changes protection
- 📤 Submit handling with loading states
- 🎯 Field-level error handling

#### Basic Usage

```javascript
import { createForm } from 'mtrl-addons';
import { FORM_EVENTS, DATA_STATE } from 'mtrl-addons/components/form/constants';

const form = createForm({
  fields: [
    { name: 'email', type: 'email', label: 'Email', required: true },
    { name: 'password', type: 'password', label: 'Password', required: true },
    { name: 'remember', type: 'checkbox', label: 'Remember me' }
  ],
  
  // Protect unsaved changes
  protectChanges: {
    beforeUnload: true,      // Warn on page close
    onDataOverwrite: true    // Emit event when setData() called with changes
  },
  
  onSubmit: async (data) => {
    await api.login(data);
  }
});

// Mount to container
document.getElementById('login-form').appendChild(form.element);

// Events
form.on(FORM_EVENTS.CHANGE, ({ field, value }) => {
  console.log(`${field} changed to:`, value);
});

form.on(FORM_EVENTS.STATE_CHANGE, ({ state }) => {
  if (state === DATA_STATE.DIRTY) {
    console.log('Form has unsaved changes');
  }
});

form.on(FORM_EVENTS.SUBMIT, (data) => {
  console.log('Form submitted:', data);
});

form.on(FORM_EVENTS.DATA_CONFLICT, ({ currentData, newData, cancel, proceed }) => {
  if (confirm('Discard unsaved changes?')) {
    proceed();
  } else {
    cancel();
  }
});

// API
form.setData({ email: 'user@example.com' });
const data = form.getData();
const isValid = form.validate();
form.reset();
form.disable();
form.enable();
```

---

### ColorPicker

Full-featured color picker with HSV color area, hue slider, swatches, and multiple display variants.

#### Features
- 🎨 HSV color area with saturation/brightness
- 📊 Hue slider
- 🔲 Opacity/alpha slider (optional)
- 💎 Color swatches with add/remove
- 💉 Pipette/eyedropper (native API or canvas sampling)
- 📝 Hex input field
- 🖼️ Multiple variants: inline, dropdown, dialog
- 📱 Compact density mode

#### Basic Usage

```javascript
import { createColorPicker } from 'mtrl-addons';
import { COLORPICKER_EVENTS, COLORPICKER_VARIANTS } from 'mtrl-addons/components/colorpicker/constants';

// Inline picker (always visible)
const picker = createColorPicker({
  value: '#6200ee',
  showSwatches: true,
  swatches: ['#ff0000', '#00ff00', '#0000ff', '#ffff00', '#ff00ff', '#00ffff']
});

document.getElementById('color-picker').appendChild(picker.element);

// Events
picker.on(COLORPICKER_EVENTS.CHANGE, ({ value }) => {
  console.log('Color selected:', value);
});

picker.on(COLORPICKER_EVENTS.INPUT, ({ value }) => {
  // Live preview during drag
  document.body.style.backgroundColor = value;
});

// API
picker.setValue('#ff5722');
const hex = picker.getValue();        // '#ff5722'
const hsv = picker.getHSV();          // { h: 14, s: 86, v: 100 }
const rgb = picker.getRGB();          // { r: 255, g: 87, b: 34 }

picker.addSwatch('#9c27b0', 'Purple');
picker.setOpacity(0.5);
```

#### Dropdown Variant

```javascript
const trigger = document.getElementById('color-button');

const picker = createColorPicker({
  value: '#6200ee',
  variant: COLORPICKER_VARIANTS.DROPDOWN,
  trigger: trigger,
  closeOnSelect: true
});

// Toggle programmatically
picker.open();
picker.close();
picker.toggle();
```

#### With Pipette (Color Sampling)

```javascript
const picker = createColorPicker({
  value: '#ffffff',
  showPipette: true,
  // Optional: provide image for canvas-based sampling
  imageSource: document.getElementById('my-image'),
  
  onPipetteStart: () => console.log('Sampling started'),
  onPipetteEnd: (color) => console.log('Picked:', color)
});

// Trigger programmatically
const pickedColor = await picker.pickColor();
```

---

## Core Systems

### Layout System

Flexible array-based layout schemas for declarative UI construction. Supports mtrl components, HTML elements, and nested structures.

```javascript
import { createLayout } from 'mtrl-addons/layout';
import { createButton, createTextField } from 'mtrl';

// Array-based schema
const layout = createLayout([
  'div', { class: 'form-container' },
  [
    ['header', { class: 'form-header' },
      ['h2', { text: 'Contact Form' }]
    ],
    ['main', { class: 'form-body' },
      [createTextField, 'name', { label: 'Name' }],
      [createTextField, 'email', { label: 'Email', type: 'email' }],
      [createTextField, 'message', { label: 'Message', multiline: true }]
    ],
    ['footer', { class: 'form-footer' },
      [createButton, 'submit', { text: 'Send', variant: 'filled' }],
      [createButton, 'cancel', { text: 'Cancel', variant: 'outlined' }]
    ]
  ]
]);

// Access named components
layout.name.setValue('John Doe');
layout.submit.on('click', handleSubmit);

// Append to DOM
document.body.appendChild(layout.element);
```

#### Convenience Functions

```javascript
import { layout, row, stack, grid } from 'mtrl-addons/layout';

// Vertical stack
const stackLayout = stack({ gap: '1rem' });

// Horizontal row (mobile-stacks automatically)
const rowLayout = row({ gap: '1rem', mobileStack: true });

// Responsive grid
const gridLayout = grid('auto-fit', { gap: '1rem' });
```

---

### Viewport System

Low-level composable virtual scrolling foundation. Used internally by VList but available for custom implementations.

```javascript
import { createViewport } from 'mtrl-addons/viewport';

const viewport = createViewport({
  container: document.getElementById('scroll-container'),
  itemCount: 100000,
  estimatedItemSize: 48,
  overscan: 5, // Extra items to render outside viewport
  
  renderItem: (index) => {
    const div = document.createElement('div');
    div.textContent = `Item ${index}`;
    return div;
  },
  
  onRangeChange: ({ start, end }) => {
    console.log(`Rendering items ${start} to ${end}`);
  }
});

// API
viewport.scrollToIndex(500);
viewport.refresh();
viewport.destroy();
```

#### Feature Composition

```javascript
import { 
  withBase, 
  withVirtual, 
  withScrolling, 
  withRendering 
} from 'mtrl-addons/viewport';

// Build custom viewport with specific features
const customViewport = pipe(
  withBase,
  withVirtual,
  withScrolling,
  withRendering
)(config);
```

---

### Gesture System

Touch and mouse gesture recognition with support for tap, swipe, long-press, pinch, rotate, and pan.

```javascript
import { createGestureManager } from 'mtrl-addons/gestures';

const gestures = createGestureManager(element, {
  // Tap detection
  onTap: ({ x, y, target }) => {
    console.log('Tapped at', x, y);
  },
  
  // Swipe detection
  onSwipe: ({ direction, velocity, distance }) => {
    console.log(`Swiped ${direction} with velocity ${velocity}`);
  },
  
  // Long press
  onLongPress: ({ x, y, duration }) => {
    console.log('Long pressed for', duration, 'ms');
  },
  
  // Pinch (zoom)
  onPinch: ({ scale, center }) => {
    element.style.transform = `scale(${scale})`;
  },
  
  // Rotation
  onRotate: ({ angle, center }) => {
    element.style.transform = `rotate(${angle}deg)`;
  },
  
  // Pan (drag)
  onPan: ({ deltaX, deltaY, state }) => {
    if (state === 'move') {
      element.style.transform = `translate(${deltaX}px, ${deltaY}px)`;
    }
  }
});

// Configuration
const gestures = createGestureManager(element, {
  tap: { maxDuration: 300 },
  swipe: { minDistance: 50, minVelocity: 0.3 },
  longPress: { duration: 500 },
  pinch: { minScale: 0.5, maxScale: 3 }
});

// Cleanup
gestures.destroy();
```

#### Individual Gesture Detectors

```javascript
import { detectTap, detectSwipe, detectPinch } from 'mtrl-addons/gestures';

// Use specific detectors for lighter bundles
const tapDetector = detectTap(element, { onTap: handleTap });
const swipeDetector = detectSwipe(element, { onSwipe: handleSwipe });
```

---

## Color Utilities

Pure functions for color conversion (tree-shakeable, included in main bundle).

```javascript
import {
  hsvToRgb,
  rgbToHsv,
  hsvToHex,
  hexToHsv,
  rgbToHex,
  hexToRgb,
  isValidHex,
  normalizeHex,
  getContrastColor
} from 'mtrl-addons';

// HSV ↔ RGB
const rgb = hsvToRgb({ h: 200, s: 80, v: 90 }); // { r: 46, g: 184, b: 230 }
const hsv = rgbToHsv({ r: 255, g: 128, b: 0 }); // { h: 30, s: 100, v: 100 }

// Hex conversions
const hex = rgbToHex({ r: 255, g: 0, b: 128 }); // '#ff0080'
const rgb2 = hexToRgb('#ff0080'); // { r: 255, g: 0, b: 128 }

// Validation & normalization
isValidHex('#ff0080');      // true
isValidHex('ff0080');       // true
normalizeHex('f00');        // '#ff0000'
normalizeHex('#F00');       // '#ff0000'

// Contrast color (for text on colored backgrounds)
getContrastColor('#ffffff'); // '#000000'
getContrastColor('#000000'); // '#ffffff'
```

---

## Development

```bash
# Install dependencies
bun install

# Build package (for distribution)
bun run build

# Build for mtrl-app integration
bun run build:app

# Run tests
bun test

# Watch mode
bun run dev

# Link mtrl for local development
bun run link:mtrl
```

## Browser Support

mtrl-addons supports modern browsers:

- Chrome (latest)
- Firefox (latest)
- Safari (latest)
- Edge (latest)

## Peer Dependencies

- `mtrl` ^0.6.2 - Core Material Design 3 component library

## Related Packages

- [mtrl](https://github.com/floor/mtrl) - Core Material Design 3 component library
- [mtrl-app](https://github.com/floor/mtrl-app) - Documentation and showcase application

## License

MIT

## Contributing

Contributions are welcome! Please follow the existing code style and include tests for new features.

```bash
# Run tests before submitting
bun test

# Build to verify no errors
bun run build
```
