# material-addons

A form builder, a colour picker, a layout schema and gesture recognition for [material](https://github.com/floor/material), the Material Design 3 component library. Written in TypeScript; its only dependency is `material`, as a peer.

- **Form.** Builds a set of fields from a layout and keeps their data: it reads and sets it, knows when it has changed, validates it and submits it.
- **Colour picker.** An HSV area, a hue slider, swatches, a hex field and an eyedropper; inline, as a dropdown or as a dialog.
- **Layout.** Builds a tree of elements and components from an array, and gives each named component back.
- **Gestures.** Tap, swipe, long press, pan, pinch and rotate, on touch and mouse.

The form and the colour picker have a page with live examples on [md3.io](https://md3.io/docs/components/form/).

## Install

<!-- install -->
```bash
npm install material-addons material@next
```

`material` 3.0.0 is in pre-release, on its `next` tag; this package's peer range is `^3.0.0-next.0`. The 3.0.0 release moves the peer to `^3.0.0`.
<!-- /install -->

Both packages are ESM only. The examples below import stylesheets, so they need a bundler that handles CSS imports, such as Vite.

## Form

The layout is an array of `[factory, name, options]`. A field named `info.<key>` is the data's `<key>`. Buttons named `submit` and `cancel` submit and reset the form; they are enabled once the user has changed a field.

<!-- example: run, shows "Save" -->
```javascript
import 'material/styles';
import 'material-addons/styles';
import { createForm } from 'material-addons';
import { createTextField, createSwitch, createButton } from 'material';

const form = createForm({
  layout: [
    [createTextField, 'info.name', { label: 'Name' }],
    [createTextField, 'info.email', { label: 'Email', type: 'email' }],
    [createSwitch, 'info.newsletter', { label: 'Newsletter' }],
    [createButton, 'cancel', { text: 'Cancel', variant: 'text' }],
    [createButton, 'submit', { text: 'Save', variant: 'filled' }],
  ],
  data: { name: 'Ada', email: 'ada@example.com', newsletter: true },
  onSubmit: async (data) => console.log('Saved', data),
  container: document.body,
});
```

The form's data, state and validation are methods:

<!-- example: continues -->
```javascript
form.setData({ name: 'Grace' });
console.log(form.getData().name, form.isModified()); // 'Grace' true

const { valid, errors } = form.validate();
```

Options, methods and events: [md3.io/docs/components/form](https://md3.io/docs/components/form/).

## Colour picker

<!-- example: run, shows "#6750a4" -->
```javascript
import 'material/styles';
import 'material-addons/styles';
import { createColorPicker } from 'material-addons';

const picker = createColorPicker({
  value: '#6750a4',
  swatches: ['#6750a4', '#625b71', '#7d5260', '#b3261e'],
});

const chosen = document.createElement('p');
chosen.textContent = picker.getValue();
picker.on('change', (color) => { chosen.textContent = String(color); });

document.body.append(picker.element, chosen);
```

Variants, sizes, opacity and the eyedropper: [md3.io/docs/components/colorpicker](https://md3.io/docs/components/colorpicker/).

The colour conversions the picker uses are exported too:

<!-- example: run, shows "#ff0080" -->
```javascript
import { hsvToRgb, rgbToHsv, rgbToHex, hexToRgb, normalizeHex, getContrastColor } from 'material-addons';

const results = [
  hsvToRgb(330, 100, 100),      // { r: 255, g: 0, b: 128 }
  rgbToHsv(255, 0, 128),        // { h: 330, s: 100, v: 100 }
  rgbToHex(255, 0, 128),        // '#ff0080'
  hexToRgb('#ff0080'),          // { r: 255, g: 0, b: 128 }
  normalizeHex('f00'),          // '#ff0000'
  getContrastColor('#ffffff'),  // '#000000'
];

document.body.append(...results.map((result) => {
  const line = document.createElement('p');
  line.textContent = typeof result === 'string' ? result : JSON.stringify(result);
  return line;
}));
```

## Layout

`createLayout` takes an array: a tag or a factory, then a name, then options, then children. It returns the root element and each named component.

<!-- example: run, shows "Send" -->
```javascript
import 'material/styles';
import { createLayout } from 'material-addons/layout';
import { createButton, createTextField } from 'material';

const layout = createLayout([
  'section', { class: 'contact' },
  [createTextField, 'name', { label: 'Name' }],
  [createButton, 'send', { text: 'Send', variant: 'filled' }],
]);

layout.get('send').on('click', () => console.log(layout.get('name').getValue()));

document.body.append(layout.element);
```

## Gestures

<!-- example: run, shows "Tap or swipe me" -->
```javascript
import { createGestureManager } from 'material-addons/gestures';

const card = document.createElement('div');
card.textContent = 'Tap or swipe me';
document.body.append(card);

const gestures = createGestureManager(card);

gestures.on('tap', ({ x, y }) => { card.textContent = `Tapped at ${x}, ${y}`; });
gestures.on('swipe', ({ direction }) => { card.textContent = `Swiped ${direction}`; });
gestures.on('longpress', () => { card.textContent = 'Long press'; });
```

When the element goes away, release the listeners:

<!-- example: continues -->
```javascript
gestures.destroy();
```

The gestures:

| Event | Fires on |
|-------|----------|
| `tap` | A press and release in place |
| `swipe`, and `swipeleft`, `swiperight`, `swipeup`, `swipedown` | A quick move in one direction |
| `longpress` | A press held, 500 ms by default |
| `pan` | A drag |
| `pinch` | Two fingers moving together or apart |
| `rotate` | Two fingers turning |

## Entry points

| Import | From |
|--------|------|
| The form, the colour picker, the colour conversions | `material-addons` |
| The layout | `material-addons/layout` |
| The gestures | `material-addons/gestures` |
| A component's constants | `material-addons/components/form/constants`, `material-addons/components/colorpicker/constants` |
| The stylesheet | `material-addons/styles` |

## Upgrading

The package was published as `mtrl-addons` up to 0.9.x. What each release changed, and what 0.8.0 removed (the virtual list and the viewport), is in the [changelog](CHANGELOG.md).

## Development

```bash
bun install                 # dependencies
bun test                    # the tests
bun run ts:check            # the types
bun run dev                 # build into dist/, and again on each change
bun run build --production  # the build a release ships
bun run check:package       # the packed package: its files, its manifest, its entry points
bun run readme:check        # this file's examples, in Chromium
bun run link:material       # use the material checkout in ../material
```

Three of them need something first:

- `check:package` compares the packed files with the release's list, so it needs the production build.
- `readme:check` needs a build, and Chromium once: `npx playwright install chromium`.
- `link:material` needs `../material` to be built.

## Releasing

Until the trusted publisher is bound, publish by hand:

```bash
npm run release:pack
npm publish material-addons-<version>.tgz --access public --tag next
```

Use `--tag latest` for a stable release.

## Related

- [material](https://github.com/floor/material): the Material Design 3 component library this package extends.
- [md3.io](https://md3.io): the documentation and showcase site.

## License

MIT, see [LICENSE](LICENSE).
