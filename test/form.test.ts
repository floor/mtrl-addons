// test/form.test.ts

import { describe, it, expect, beforeEach, afterEach } from "bun:test";
import { JSDOM } from "jsdom";

// Setup DOM environment
let dom: JSDOM;
let document: Document;

beforeEach(() => {
  dom = new JSDOM("<!DOCTYPE html><html><body></body></html>", {
    url: "http://localhost",
  });
  document = dom.window.document;
  global.document = document;
  global.HTMLElement = dom.window.HTMLElement;
  global.HTMLFormElement = dom.window.HTMLFormElement;
});

afterEach(() => {
  dom.window.close();
});

// Import form utilities after DOM setup
import {
  DATA_STATE,
  FORM_EVENTS,
  FORM_DEFAULTS,
  createBaseConfig,
  createInitialState,
  extractFieldName,
  isFieldName,
  isFileName,
  isValueEqual,
  hasDataChanged,
  getModifiedFields,
} from "../src/components/form";

describe("Form Constants", () => {
  it("should export data state constants", () => {
    expect(DATA_STATE.PRISTINE).toBe("pristine");
    expect(DATA_STATE.DIRTY).toBe("dirty");
  });

  it("should export form events", () => {
    expect(FORM_EVENTS.CHANGE).toBe("change");
    expect(FORM_EVENTS.SUBMIT).toBe("submit");
    expect(FORM_EVENTS.STATE_CHANGE).toBe("state:change");
    expect(FORM_EVENTS.DATA_SET).toBe("data:set");
    expect(FORM_EVENTS.DATA_GET).toBe("data:get");
    expect(FORM_EVENTS.FIELD_CHANGE).toBe("field:change");
    expect(FORM_EVENTS.VALIDATION_ERROR).toBe("validation:error");
    expect(FORM_EVENTS.SUBMIT_SUCCESS).toBe("submit:success");
    expect(FORM_EVENTS.SUBMIT_ERROR).toBe("submit:error");
    expect(FORM_EVENTS.RESET).toBe("reset");
  });

  it("should export form defaults", () => {
    expect(FORM_DEFAULTS.prefix).toBe("mtrl");
    expect(FORM_DEFAULTS.componentName).toBe("form");
    expect(FORM_DEFAULTS.useChanges).toBe(true);
    expect(FORM_DEFAULTS.controls).toEqual(["submit", "cancel"]);
  });
});

describe("Form Configuration", () => {
  it("should create base config with defaults", () => {
    const config = createBaseConfig({});

    expect(config.prefix).toBe("mtrl");
    expect(config.componentName).toBe("form");
    expect(config.autocomplete).toBe("off");
    expect(config.useChanges).toBe(true);
    expect(config.controls).toEqual(["submit", "cancel"]);
  });

  it("should override defaults with custom values", () => {
    const config = createBaseConfig({
      prefix: "custom",
      class: "my-form",
      useChanges: false,
      controls: ["submit"],
    });

    expect(config.prefix).toBe("custom");
    expect(config.class).toBe("my-form");
    expect(config.useChanges).toBe(false);
    expect(config.controls).toEqual(["submit"]);
  });

  it("should allow disabling controls with null", () => {
    const config = createBaseConfig({
      controls: null,
    });

    expect(config.controls).toBeNull();
  });

  it("should create initial state", () => {
    const config = createBaseConfig({ data: { username: "john" } });
    const state = createInitialState(config);

    expect(state.modified).toBe(false);
    expect(state.submitting).toBe(false);
    expect(state.disabled).toBe(false);
    expect(state.initialData).toEqual({ username: "john" });
    expect(state.currentData).toEqual({ username: "john" });
  });
});

describe("Field Name Utilities", () => {
  it("should extract field name from prefixed name", () => {
    expect(extractFieldName("info.username")).toBe("username");
    expect(extractFieldName("info.user.name")).toBe("user.name");
    expect(extractFieldName("data.value")).toBe("value");
    expect(extractFieldName("username")).toBe("username");
  });

  it("should identify field names", () => {
    expect(isFieldName("info.username")).toBe(true);
    expect(isFieldName("data.value")).toBe(true);
    expect(isFieldName("username")).toBe(false);
    expect(isFieldName("file.avatar")).toBe(false);
  });

  it("should identify file names", () => {
    expect(isFileName("file.avatar")).toBe(true);
    expect(isFileName("file.document")).toBe(true);
    expect(isFileName("info.avatar")).toBe(false);
    expect(isFileName("avatar")).toBe(false);
  });
});

describe("Value Comparison", () => {
  it("should compare primitive values", () => {
    expect(isValueEqual("hello", "hello")).toBe(true);
    expect(isValueEqual("hello", "world")).toBe(false);
    expect(isValueEqual(123, 123)).toBe(true);
    expect(isValueEqual(123, 456)).toBe(false);
    expect(isValueEqual(true, true)).toBe(true);
    expect(isValueEqual(true, false)).toBe(false);
  });

  it("should compare null and undefined", () => {
    expect(isValueEqual(null, null)).toBe(true);
    expect(isValueEqual(undefined, undefined)).toBe(true);
    expect(isValueEqual(null, undefined)).toBe(true);
  });

  it("should compare arrays", () => {
    expect(isValueEqual([1, 2, 3], [1, 2, 3])).toBe(true);
    expect(isValueEqual([1, 2, 3], [1, 2, 4])).toBe(false);
    expect(isValueEqual([1, 2], [1, 2, 3])).toBe(false);
  });

  it("should compare objects", () => {
    expect(isValueEqual({ a: 1, b: 2 }, { a: 1, b: 2 })).toBe(true);
    expect(isValueEqual({ a: 1, b: 2 }, { a: 1, b: 3 })).toBe(false);
    expect(isValueEqual({ a: 1 }, { a: 1, b: 2 })).toBe(false);
  });

  it("should handle type coercion for string/number", () => {
    expect(isValueEqual("123", 123)).toBe(true);
    expect(isValueEqual(0, "0")).toBe(true);
  });
});

describe("Change Detection", () => {
  it("should detect when data has changed", () => {
    const initial = { username: "john", email: "john@example.com" };
    const current = { username: "jane", email: "john@example.com" };

    expect(hasDataChanged(initial, current)).toBe(true);
  });

  it("should detect when data has not changed", () => {
    const initial = { username: "john", email: "john@example.com" };
    const current = { username: "john", email: "john@example.com" };

    expect(hasDataChanged(initial, current)).toBe(false);
  });

  it("should detect new fields", () => {
    const initial = { username: "john" };
    const current = { username: "john", email: "john@example.com" };

    expect(hasDataChanged(initial, current)).toBe(true);
  });

  it("should detect removed fields", () => {
    const initial = { username: "john", email: "john@example.com" };
    const current = { username: "john" };

    expect(hasDataChanged(initial, current)).toBe(true);
  });

  it("should get modified fields only", () => {
    const initial = { username: "john", email: "john@example.com", age: 25 };
    const current = { username: "jane", email: "john@example.com", age: 26 };

    const modified = getModifiedFields(initial, current);

    expect(modified).toEqual({ username: "jane", age: 26 });
    expect(modified.email).toBeUndefined();
  });
});

describe("Form Field Utilities", () => {
  it("should get and set field values", async () => {
    // Import field utilities
    const { getFieldValue, setFieldValue } = await import(
      "../src/components/form/features/fields"
    );

    // Mock field with getValue/setValue
    const mockField = {
      element: document.createElement("input"),
      _value: "initial",
      getValue() {
        return this._value;
      },
      setValue(val: string) {
        this._value = val;
      },
    };

    expect(getFieldValue(mockField)).toBe("initial");

    setFieldValue(mockField, "updated");
    expect(getFieldValue(mockField)).toBe("updated");
  });

  it("should handle switch/checkbox with unified getValue/setValue API", async () => {
    const { getFieldValue, setFieldValue } = await import(
      "../src/components/form/features/fields"
    );

    // Mock switch component with unified API (getValue returns boolean)
    const mockSwitch = {
      element: document.createElement("div"),
      input: Object.assign(document.createElement("input"), {
        type: "checkbox",
      }),
      _checked: false,
      getValue() {
        return this._checked;
      },
      setValue(value: boolean | string) {
        if (typeof value === "boolean") {
          this._checked = value;
        } else {
          this._checked = value === "true" || value === "1";
        }
      },
    };

    expect(getFieldValue(mockSwitch as any)).toBe(false);

    setFieldValue(mockSwitch as any, true);
    expect(getFieldValue(mockSwitch as any)).toBe(true);

    setFieldValue(mockSwitch as any, false);
    expect(getFieldValue(mockSwitch as any)).toBe(false);

    // Test string values
    setFieldValue(mockSwitch as any, "true");
    expect(getFieldValue(mockSwitch as any)).toBe(true);

    setFieldValue(mockSwitch as any, "false");
    expect(getFieldValue(mockSwitch as any)).toBe(false);
  });

  it("should handle silent setValue for checkboxes", async () => {
    const { setFieldValue } = await import(
      "../src/components/form/features/fields"
    );

    // Mock checkbox with input element
    const input = document.createElement("input");
    input.type = "checkbox";
    input.checked = false;

    const element = document.createElement("div");
    element.classList.add("mtrl-checkbox");

    const mockCheckbox = {
      element,
      input,
      getValue() {
        return input.checked;
      },
      setValue(value: boolean) {
        input.checked = value;
      },
    };

    // Silent update should set directly on input
    setFieldValue(mockCheckbox as any, true, true);
    expect(input.checked).toBe(true);
    expect(element.classList.contains("mtrl-checkbox--checked")).toBe(true);

    setFieldValue(mockCheckbox as any, false, true);
    expect(input.checked).toBe(false);
    expect(element.classList.contains("mtrl-checkbox--checked")).toBe(false);
  });

  it("should update textfield --empty class on silent setValue", async () => {
    const { setFieldValue } = await import(
      "../src/components/form/features/fields"
    );

    // Mock textfield with input element
    const input = document.createElement("input");
    input.type = "text";
    input.value = "";

    const element = document.createElement("div");
    element.classList.add("mtrl-textfield");
    element.classList.add("mtrl-textfield--empty");

    const mockTextfield = {
      element,
      input,
      getValue() {
        return input.value;
      },
      setValue(value: string) {
        input.value = value;
      },
    };

    // Silent update should set value and remove --empty class
    setFieldValue(mockTextfield as any, "Hello", true);
    expect(input.value).toBe("Hello");
    expect(element.classList.contains("mtrl-textfield--empty")).toBe(false);

    // Setting empty value should add --empty class back
    setFieldValue(mockTextfield as any, "", true);
    expect(input.value).toBe("");
    expect(element.classList.contains("mtrl-textfield--empty")).toBe(true);
  });
});

describe("Data State", () => {
  it("should start in pristine state", () => {
    const config = createBaseConfig({ data: { username: "john" } });
    const state = createInitialState(config);

    expect(state.modified).toBe(false);
    // Data state would be PRISTINE when not modified
  });

  it("should track modified state", () => {
    const config = createBaseConfig({ data: { username: "john" } });
    const state = createInitialState(config);

    // Simulate modification
    state.currentData = { username: "jane" };
    const isModified = hasDataChanged(state.initialData, state.currentData);

    expect(isModified).toBe(true);
    // Data state would be DIRTY when modified
  });

  it("should return to pristine when reverted", () => {
    const config = createBaseConfig({ data: { username: "john" } });
    const state = createInitialState(config);

    // Simulate modification and revert
    state.currentData = { username: "jane" };
    expect(hasDataChanged(state.initialData, state.currentData)).toBe(true);

    state.currentData = { username: "john" };
    expect(hasDataChanged(state.initialData, state.currentData)).toBe(false);
  });
});

describe("Event Deduplication", () => {
  it("should have valuesEqual utility for deduping", async () => {
    // The valuesEqual function is internal to fields.ts
    // We test it indirectly through field binding behavior
    // This test verifies the isValueEqual export works for similar purposes

    expect(isValueEqual("test", "test")).toBe(true);
    expect(isValueEqual("test", "other")).toBe(false);
    expect(isValueEqual(["a", "b"], ["a", "b"])).toBe(true);
    expect(isValueEqual(["a", "b"], ["a", "c"])).toBe(false);
  });

  it("should deduplicate input and change events for same value", async () => {
    const { withFields } = await import(
      "../src/components/form/features/fields"
    );

    // Track emitted events
    const emittedEvents: Array<{ name: string; value: string }> = [];

    // Create mock field that emits both input and change
    const inputHandlers: Function[] = [];
    const changeHandlers: Function[] = [];

    const mockField = {
      element: document.createElement("input"),
      _value: "initial",
      getValue() {
        return this._value;
      },
      setValue(val: string) {
        this._value = val;
      },
      on(event: string, handler: Function) {
        if (event === "input") inputHandlers.push(handler);
        if (event === "change") changeHandlers.push(handler);
      },
    };

    // Create mock component with emit
    const mockComponent = {
      element: document.createElement("div"),
      ui: { "info.username": mockField },
      emit(event: string, data: any) {
        if (event === "field:change" || event === "change") {
          emittedEvents.push({ name: data.name, value: data.value });
        }
      },
    };

    // Apply withFields feature
    withFields({})(mockComponent as any);

    // Simulate typing "hello" - input event fires
    mockField._value = "hello";
    inputHandlers.forEach((h) => h());

    // Simulate blur - change event fires with same value
    changeHandlers.forEach((h) => h());

    // Should only emit once (deduplicated)
    // We expect 2 events (field:change and change) but NOT 4 (duplicated)
    expect(emittedEvents.length).toBe(2); // field:change + change, not duplicated

    // Now simulate actual value change via change event
    mockField._value = "world";
    changeHandlers.forEach((h) => h());

    // Should emit again since value changed
    expect(emittedEvents.length).toBe(4); // 2 more events
  });

  it("should emit for each unique value change", async () => {
    const { withFields } = await import(
      "../src/components/form/features/fields"
    );

    const emittedValues: string[] = [];
    const inputHandlers: Function[] = [];

    const mockField = {
      element: document.createElement("input"),
      _value: "",
      getValue() {
        return this._value;
      },
      on(event: string, handler: Function) {
        if (event === "input") inputHandlers.push(handler);
      },
    };

    const mockComponent = {
      element: document.createElement("div"),
      ui: { "info.text": mockField },
      emit(event: string, data: any) {
        if (event === "field:change") {
          emittedValues.push(data.value);
        }
      },
    };

    withFields({})(mockComponent as any);

    // Type "abc" one character at a time
    mockField._value = "a";
    inputHandlers.forEach((h) => h());

    mockField._value = "ab";
    inputHandlers.forEach((h) => h());

    mockField._value = "abc";
    inputHandlers.forEach((h) => h());

    // Should emit for each keystroke
    expect(emittedValues).toEqual(["a", "ab", "abc"]);
  });

  it("should sync tracked values after silent setData", async () => {
    const { withFields, syncTrackedFieldValues } = await import(
      "../src/components/form/features/fields"
    );

    const emittedEvents: Array<{ name: string; value: boolean }> = [];
    const changeHandlers: Function[] = [];

    // Mock switch with unified API
    const mockSwitch = {
      element: document.createElement("div"),
      input: Object.assign(document.createElement("input"), {
        type: "checkbox",
      }),
      _checked: false,
      getValue() {
        return this._checked;
      },
      setValue(value: boolean) {
        this._checked = value;
      },
      on(event: string, handler: Function) {
        if (event === "change") changeHandlers.push(handler);
      },
    };

    const mockComponent = {
      element: document.createElement("div"),
      ui: { "info.active": mockSwitch },
      emit(event: string, data: any) {
        if (event === "field:change") {
          emittedEvents.push({ name: data.name, value: data.value });
        }
      },
    };

    // Apply withFields - this binds events and initializes tracker with false
    const enhanced = withFields({})(mockComponent as any);

    // Simulate silent setData - set switch to true
    mockSwitch._checked = true;

    // Sync tracked values (simulates what setData does)
    syncTrackedFieldValues(enhanced.fields);

    // Now toggle switch back to false
    mockSwitch._checked = false;
    changeHandlers.forEach((h) => h());

    // Should emit because value changed from tracked value (true -> false)
    expect(emittedEvents.length).toBe(1);
    expect(emittedEvents[0].value).toBe(false);

    // Toggle to true
    mockSwitch._checked = true;
    changeHandlers.forEach((h) => h());

    // Should emit again (false -> true)
    expect(emittedEvents.length).toBe(2);
    expect(emittedEvents[1].value).toBe(true);
  });

  it("should deduplicate array values (chips/multi-select)", async () => {
    const { withFields } = await import(
      "../src/components/form/features/fields"
    );

    const emittedCount = { count: 0 };
    const changeHandlers: Function[] = [];

    const mockChips = {
      element: document.createElement("div"),
      _value: ["a", "b"],
      getValue() {
        return this._value;
      },
      on(event: string, handler: Function) {
        if (event === "change") changeHandlers.push(handler);
      },
    };

    const mockComponent = {
      element: document.createElement("div"),
      ui: { "info.tags": mockChips },
      emit(event: string) {
        if (event === "field:change") {
          emittedCount.count++;
        }
      },
    };

    withFields({})(mockComponent as any);

    // Emit change with same array value
    changeHandlers.forEach((h) => h());

    // Should not emit (same value as initial)
    expect(emittedCount.count).toBe(0);

    // Change the array
    mockChips._value = ["a", "b", "c"];
    changeHandlers.forEach((h) => h());

    // Should emit now
    expect(emittedCount.count).toBe(1);

    // Emit again with same value
    changeHandlers.forEach((h) => h());

    // Should not emit again
    expect(emittedCount.count).toBe(1);
  });
});
