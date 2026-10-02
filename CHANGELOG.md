# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [3.0.0-next.0] - 2026-10-02

There is no 1.0.0. material-addons 3.0.0 is this package's continuation
for material 3. It was published as mtrl-addons up to 0.9.x, for mtrl 0.10.x.

### Changed

- The package name is material-addons. The version is 3.0.0-next.0.
- The peer range is material ^3.0.0-next.0 while 3.0.0-next.0 is the
  only release. The 3.0.0 release moves the peer to ^3.0.0.
- The text field's classes are mtrl-text-field… and the tag is
  <m-text-field>. The colour picker's styles select those classes.

For material 3. material-addons is ESM-only, and takes material's
composition core from its subpaths, as material 3 removes it from the
package root.

- ESM only. The CommonJS builds (dist/**/*.cjs) and every require
  condition are removed; main is dist/index.mjs. require('material-addons')
  no longer resolves: use import, or await import('material-addons') from
  CommonJS. material 3 made the same change.
- material 3 removed pipe, createBase, withElement, withEvents,
  withLifecycle, withDisabled, hasEmit, hasLifecycle and their types
  from its root. material-addons imports them from material/core/compose,
  and EventCallback from material/core/state.

### Changed

- Import material-addons with import, not require.
- Upgrade material to 3 alongside it. Code of your own that imported the
  composition core from 'material' moves it to 'material/core/compose'
  (material's migration table lists every name).

### Changed

- null, undefined and "" are equal when the form decides it is modified,
  including the fields getModifiedData returns.

## [0.9.0]

For mtrl 0.10.5, which writes "text field" as two words.

### Changed

- The peer range is mtrl ^0.10.5 (it was ^0.10.0-next.0). mtrl-addons
  now imports createTextField, which mtrl exports from 0.10.5; an
  older mtrl no longer satisfies the range. Upgrade mtrl to 0.10.5.
  mtrl-addons 0.9.x is for mtrl 0.10.x only: the range excludes mtrl
  1.0, which is ESM-only. mtrl 1.0 needs mtrl-addons 1.0.

### Changed

- The colour picker's hex field is made with createTextField, and
  the README's and the form's examples use it. mtrl 0.10.5 deprecates
  createTextfield, and mtrl 1.0 removes it.
- The form's doc example gives its chips a label, not a text: mtrl
  1.0 removes a chip's text.

0.8.0

vlist and the viewport leave the package. mtrl-addons is the layout
schema, the gesture system, the compose utilities, the form builder and
the colour picker.

### Changed

- createVList, VListConfig, VListComponent and the
  mtrl-addons/components/vlist/constants entry are removed, with the
  vlist styles. For virtual lists, use the standalone vlist package.
- createViewport, the viewport feature enhancers (withBase, withVirtual,
  withScrolling, withScrollbar, withRendering, withCollection,
  withPlaceholders, withEvents), the viewport types and constants, and
  the mtrl-addons/viewport entry point are removed. Nothing in the
  package used them once vlist was gone, and no test covered them.
- The list manager, removed earlier, leaves no references behind; the
  orphaned-function script that analysed it is gone.

### Changed

- The form's event handlers and the controller's data state declare
  their real types, so a composed form type-checks against mtrl 0.8,
  whose pipe is typed. The peer range accepts mtrl 0.7 and 0.8.
- README, CLAUDE.md and AI.md describe what the package still contains;
  their examples use the layout system.

## [0.8.0]

### Changed
- chore(build): drop the viewport build entry and the last list-manager mentions
### Added
- feat(viewport)!: remove the viewport and the last list-manager references
### Added
- feat(vlist)!: remove the virtual list component

### Changed
- test: benchmarks stop failing the suite when the machine is busy
### Changed
- chore(ci): pin the runners to bun 1.4, the version we develop on
### Fixed
- fix(build): the stylesheets resolve mtrl as a package, not as a sibling folder
ci: run the tests and the build on every push and pull request
ci: publish from a version tag, as mtrl does
### Fixed
- fix(package): drop the development condition from every export

## [0.7.2] - 2026-09-07

### Added
- feat(form): add blocking-overlay disable that can't re-enable Apply

### Fixed
- fix(stats): use first visible item position (start+1) instead of last (end+1)
### Fixed
- fix(test): remove orphaned collection and selection test files
### Fixed
- fix(test): add 30s timeout to memory pressure stress benchmark

## [0.7.0] - 2026-03-30

### Fixed
- fix(form): sync field value tracker on reset and clear
### Fixed
- fix(form): use per-instance field value tracker instead of shared singleton

### Added
- feat(vlist): add markPendingRemoval method for early pending marking

## [0.6.0] - 2026-02-03

### Changed
- docs: add tree-shaking documentation and comprehensive README
### Added
- feat(components): improve tree-shaking with constants subpath exports

## [0.5.6] - 2026-01-29

### Fixed
- fix(vlist): reset viewport state and prevent scrolling on clear()
### Fixed
- fix(viewport): reset scrolled state on clear and reload
### Fixed
- fix(viewport): force visible range recalculation after data loads
## [0.5.5] - 2026-01-29

### Changed
- perf(viewport): add RAF-based render throttling for scroll events
### Changed
- chore(viewport): remove performance debug logging
### Changed
- perf(vlist): fix scroll blocking caused by duplicate event listeners
### Changed
- perf(viewport): add performance logging that mysteriously fixes scroll blocking
### Changed
- perf(viewport): fix scroll blocking by not awaiting loadMissingRanges
### Fixed
- fix(viewport): correct position display at bottom of large compressed lists
### Added
- feat(viewport): add ResizeObserver to handle container resize
### Fixed
- fix(vlist): show last visible item position in stats footer

## [0.5.4] - 2026-01-28

### Fixed
- fix(viewport): only fetch missing data when visible range has gaps
### Fixed
- fix(vlist): scrolled shadow
### Added
- feat(core): emove debug logs
### Fixed
- fix(vlist): fix scroll restore extra page 1 request
### Added
- feat(vlist): add withStats, withVelocity, withScrollRestore features
### Added
- feat(vlist): auto-inject search/filters to collection adapter

### Fixed
- fix(vlist): prevent scroll reset when using scrollbar
### Fixed
- fix(vlist): fix reloadAt selection not applying --selected class
### Changed
- perf(viewport): optimize sparse array operations for large lists
### Added
- feat(vlist): add withSearch, withFilter, withLayout features

## [0.5.3] - 2026-01-25

### Changed
- chore(deps): update mtrl peer dependency to ^0.6.2
### Changed
- chore(deps): update mtrl peer dependency to ^0.6.0
## [0.5.2] - 2026-01-25

### Fixed
- fix(types): resolve all TypeScript declaration errors
### Fixed
- fix(colorpicker): resolve TypeScript declaration errors
### Fixed
- fix(colorpicker): prevent unintended closing of dropdown/dialog picker
## [0.5.0] - 2026-01-25

### Added
- feat(colorpicker): add compact density, opacity bar, and improved hue bar
### Added
- feat(colorpicker): add pipette feature for pixel color sampling
## [0.4.4] - 2026-01-25

### Changed
- refactor(colorpicker): use mtrl core composition pattern and improve UX
### Added
- feat(colorpicker): add colorpicker component with area, hue slider, swatches, and dropdown variants

## [0.4.3] - 2026-01-24

### Fixed
- fix(form): don't auto-disable controls after custom onSubmit handler
## [0.4.2] - 2026-01-24

### Added
- feat(form): expose snapshot() method in public API
### Fixed
- fix(form): disable buttons during submit and fix protection overlay removal

## [0.4.0] - 2026-01-23

### Added
- feat(vlist): add reload() and clear() methods for efficient list refresh

## [0.3.9] - 2026-01-18

### Fixed
- fix(form): improve protection overlay behavior
### Added
- feat(form): add change protection with blocking overlay

### Added
- feat(vlist): add reload() method for efficient search updates
## [0.3.8] - 2026-01-17

### Added
- feat(vlist): add MD3-compliant keyboard navigation and accessibility

### Fixed
- fix(types): resolve TypeScript declaration errors

### Fixed
- fix(form): show server error message instead of HTTP status
### Added
- feat(form): add automatic field validation with error display
## [0.3.5] - 2026-01-12

### Added
- feat(form): add scroll indicator when body is scrolled
## [0.3.4] - 2026-01-12

### Added
- feat(vlist): add subtle scroll indicator when list is not at top
## [0.3.3] - 2026-01-12

### Fixed
- fix(viewport): priority request handling for slow networks

## [0.3.2] - 2026-01-11

### Added
- feat(viewport): improve momentum scrolling and make it configurable
## [0.3.1] - 2026-01-11

### Added
- feat(viewport): add configurable cache settings and fix eviction bug
### Fixed
- fix(form): trigger dirty state on file input changes
### Fixed
- fix(viewport): add touch scrolling support and fix momentum direction

### Added
- feat(viewport): add maintainDomOrder option for correct CSS selector support
### Added
- feat(vlist): add addItem and addItems API methods

### Fixed
- fix(form): properly handle select components in setFieldValue

## [0.2.6] - 2026-01-06

### Added
- feat(viewport): add stopOnClick option to scrolling config

## [0.2.5] - 2026-01-05

### Fixed
- fix(form): support silent setValue for components without input element
### Fixed
- fix(form): event deduplication, silent setData sync, and textfield --empty class
### Changed
- refactor(form): simplify with DATA_STATE and auto-wire controls
### Added
- feat(form): add functional form component with mtrl composition
### Fixed
- fix: correct package exports to point to dist files
### Changed
- chore: include src/styles in npm package for SCSS imports

### Added
- feat(vlist): add autoSelectFirst option and data-id attribute support

## [0.2.2] - 2025-12-31
### Added
- feat(vlist): add pending removals tracking to prevent race conditions
### Added
- feat(vlist): add silent parameter to selectById to prevent triggering selection events

### Fixed
- fix(viewport): fix memory leak and optimize HTML template rendering
### Changed
- perf(rendering): optimize string template parsing
### Added
- feat(viewport): add cache eviction and memory diagnostics
### Fixed
- fix(viewport): fix memory leaks in collection and rendering features
### Fixed
- fix(vlist): fix multi-item removal causing double decrement and stale data
### Added
- feat(vlist): add selectAtIndex, selectNext, selectPrevious methods
### Fixed
- fix(viewport): fix item removal and empty list handling

### Fixed
- fix(viewport): update items container height on virtual size change
### Added
- feat(vlist): add removeItem and removeItemById methods

### Fixed
- fix(vlist): only merge defined values in updateItemById
### Added
- feat(vlist): add updateItemById for in-place item updates

### Fixed
- fix(collection): emit selectId event when initialScrollIndex is 0
### Fixed
- fix(viewport): correct initialScrollIndex for compressed virtual space
### Changed
- chore(vlist): remove debug logs
### Added
- feat(vlist): add selectId config for auto-selection after initial load

### Changed
- wip(vlist): simplify selection feature - apply on render events
### Changed
- wip(viewport): sync scroll position between virtual and scrolling features

### Added
- feat(viewport): add AbortController support to collection feature

### Fixed
- fix(docs): update CLAUDE.md to reflect actual package structure
### Changed
- docs: consolidate AI assistant documentation into CLAUDE.md

## [0.2.1] - 2025-08-29

### Changed
- chore: fix type declarations and exports/imports
### Changed
- chore: enhance build script

## [0.2.0] - 2025-08-07

## [0.2.0] - 2025-08-07

### Added
- feat(core): add gestures
## [0.1.3] - 2025-08-07

### Added
- feat(styles): enhance styles
### Added
- feat(core): implement rawClass option
### Added
- feat(core): enhance viewport scroll sensitivity

### Added
- feat(components): remove vlist selection feature debug logs
### Added
- feat(core): comment viewport debug logs
### Added
- feat(core): enhance view port items position at the end of the list using proper padding based on styles
### Fixed
- fix(core): viewport last range items position
### Added
- feat(core): implement viewport cursor pagination strategy

### Added
- feat(core): remove collection merging requests for now

### Added
- feat(core): enhance viewport classes
### Added
- feat(core): simplify auto detect item size
### Added
- feat(core): enhance auto detect item size calculation
### Added
- feat(core): normalize item size variable name
### Added
- feat(core): remove config backward compatibility
### Added
- feat(core): enhance viewport and vlist config structure
### Added
- feat(core): use BEM class system and generic names for the viewport items

### Fixed
- fix: view port items rendering on slow network
### Added
- feat(styles): remove unused list styles
### Added
- feat(core): remove debug consoles
### Fixed
- fix(core): prevent too much request when using the scrollbar indicator
### Added
- feat(core): prevent extra request when we start scrolling using the mouse wheel
### Added
- feat(core): enhance scrollbar scrolling using velocity to prevent massive number of requests
### Fixed
- fix(core): scroll to page not showing the placeholder

### Added
- feat(core): optimize view port
### Added
- feat(core): viewpport optimization
### Added
- feat(core): remove unused collection module

### Added
- feat(core). temporary collection bridge
### Changed
- test(core): remove unused tests
### Added
- feat(chore): enhance package.json, build and add bun.lock in .gitignore
### Fixed
- fix(core): viewport collection feature
### Added
- feat(core): add adapter collection feature
### Added
- feat(core): add momentum view port feature
### Added
- feat(core): clean up view port and collection refactoring
### Added
- feat(core): refactor the collection module to use a usual composable pattern

### Added
- feat(core): clean up view port debug logs
### Added
- feat(core): uncoupled viewport scrollbar
### Added
- feat(core): optimize view port scrollbar smoothness
### Fixed
- fix(core): viewport scrollbar
### Fixed
- fix(core): placeholders not replaced
### Added
- feat(core): new api function scrollToPage
### Added
- feat(core): optimize viewport placeholders rendering
### Added
- feat(core): implement the view port placeholders
### Added
- feat(core): optimize viewport loading

### Added
- feat(core): remove viewport deferred cleanup
### Fixed
- fix(core): items position after a fast mouse wheel scrolling session
### Added
- feat(core): reactor view port phase 3

### Added
- feat(core): refactor viewport phase 2
### Added
- feat(core): refactor viewport
### Added
- feat(core): viewport is working with placeholders
### Added
- feat(core): view port first working iteration
### Added
- feat(core): prepare core viewport and vlist

## [0.1.1] - 2025-07-19

### Added
- feat(core): enhance default list manager constants
### Fixed
- fix(core): list manager viewport rendering constants
### Added
- feat(chore): add AI.md
### Added
- feat(scripts): add analyze orphaned functions
### Added
- feat(core): clean list manager viewport constants
### Added
- feat(core): list manager update default constants
### Added
- feat(core): clean list manager constants and console logs
### Added
- feat(core): remove unused constants from list manager
### Added
- feat(styles): enhance list item placeholder
### Added
- feat(core): enhance viewport placeholders

### Added
- feat(core): implement list manager viewport item placeholders
### Added
- feat(core): optimize and clean list manager modules
### Added
- feat(core): prevent massive number of requests during scrolling by using queue
### Fixed
- fix(core): remove transition on scrollbar indicator
### Fixed
- fix(core): list manager viewport scrollbar delay
### Added
- feat(core): update totalItems for static list
### Added
- feat(core): remove debug console
### Added
- feat(core): remove debug logs
### Added
- feat(core): remove all reference to standard scrolling
### Added
- feat(core): list manager viewport to use unified scrolling method
### Fixed
- fix(core): list-manager not showing the last item of the list
### Fixed
- fix(core): fix list not seeing the last items properly
### Added
- feat(core): enhance list manager when scrolling to the very bottom using the scrollbar indicator
### Added
- feat(core): enhance scrolling position after using scrollbar indicator

### Added
- feat(core): handle list-manager scrollbar
### Fixed
- fix(core): fix list manager scrolling mechanism
### Changed
- test(core): add collection and list manager specific tests
### Added
- feat(core): refactor list manager viewport
### Added
- feat(core): remove deferred collection mechanism
### Added
- feat(core): enhance list manager manual scrolling

### Added
- feat(core): enhance list manager manual scrolling with recycled elements

### Added
- feat(core): work on virtual scrolling

### Added
- feat(core): enhance list manager view port organization

### Added
- feat(core): scrollToPage and scrolToIndex functions are proactive, not reactive
### Added
- feat(core): enhance api pagination terms and item-size
### Changed
- chore(rules): add .cursorrules
### Added
- feat(components): enhance list component by using feature list-manager
### Added
- feat(core): add refactored list manager

### Added
- feat(core): list manager pure virtual scrolling management

### Added
- feat(test): add collection test
### Added
- feat(test): add collection, list and compose tests
### Added
- feat(core): modularize collection
### Fixed
- fix(core): scroll and loading synchronisation
### Added
- feat(styles): add list component scss definition
### Added
- feat(core): add compose features
### Added
- feat(components): list initial commit
### Added
- feat(core): list manager initial commit
### Added
- feat(core): collection initial commit
### Fixed
- fix(core): layout style

### Changed
- chore(test): add layout system tests and benchmarks
### Added
- feat(core): add optimized layout system

### Changed
- add build script

initial commit
