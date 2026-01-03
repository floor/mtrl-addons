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
  FORM_MODES,
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
  it("should export form modes", () => {
    expect(FORM_MODES.READ).toBe("read");
    expect(FORM_MODES.CREATE).toBe("create");
    expect(FORM_MODES.UPDATE).toBe("update");
  });

  it("should export form events", () => {
    expect(FORM_EVENTS.CHANGE).toBe("change");
    expect(FORM_EVENTS.SUBMIT).toBe("submit");
    expect(FORM_EVENTS.MODE_CHANGE).toBe("mode:change");
  });

  it("should export form defaults", () => {
    expect(FORM_DEFAULTS.prefix).toBe("mtrl");
    expect(FORM_DEFAULTS.componentName).toBe("form");
    expect(FORM_DEFAULTS.mode).toBe("read");
  });
});

describe("Form Configuration", () => {
  it("should create base config with defaults", () => {
    const config = createBaseConfig({});

    expect(config.prefix).toBe("mtrl");
    expect(config.componentName).toBe("form");
    expect(config.mode).toBe("read");
    expect(config.autocomplete).toBe("off");
  });

  it("should override defaults with custom values", () => {
    const config = createBaseConfig({
      prefix: "custom",
      mode: "create",
      class: "my-form",
    });

    expect(config.prefix).toBe("custom");
    expect(config.mode).toBe("create");
    expect(config.class).toBe("my-form");
  });

  it("should create initial state", () => {
    const config = createBaseConfig({ data: { username: "john" } });
    const state = createInitialState(config);

    expect(state.mode).toBe("read");
    expect(state.modified).toBe(false);
    expect(state.submitting).toBe(false);
    expect(state.initialData).toEqual({ username: "john" });
    expect(state.currentData).toEqual({ username: "john" });
  });
});

describe("Field Name Utilities", () => {
  it("should extract field name from prefixed name", () => {
    expect(extractFieldName("info.username")).toBe("username");
    expect(extractFieldName("info.user.name")).toBe("user.name");
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

  it("should handle legacy get/set methods", async () => {
    const { getFieldValue, setFieldValue } = await import(
      "../src/components/form/features/fields"
    );

    // Mock field with old material API (get/set)
    const mockField = {
      element: document.createElement("input"),
      _value: "initial",
      get() {
        return this._value;
      },
      set(val: string) {
        this._value = val;
      },
    };

    expect(getFieldValue(mockField as any)).toBe("initial");

    setFieldValue(mockField as any, "updated");
    expect(getFieldValue(mockField as any)).toBe("updated");
  });
});
