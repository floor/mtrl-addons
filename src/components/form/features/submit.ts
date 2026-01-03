// src/components/form/features/submit.ts

/**
 * Submit feature for Form component
 * Handles form validation and submission
 */

import type {
  FormConfig,
  BaseFormComponent,
  FormData,
  FormState,
  FormFieldRegistry,
  FormValidationRule,
  FormValidationResult,
  FormSubmitOptions,
  FieldValue
} from '../types'
import { FORM_EVENTS, FORM_MODES } from '../constants'

/**
 * Default headers for JSON requests
 */
const DEFAULT_HEADERS: Record<string, string> = {
  'Accept': 'application/json',
  'Content-Type': 'application/json'
}

/**
 * Validates form data against validation rules
 */
const validateData = (
  data: FormData,
  rules: FormValidationRule[]
): FormValidationResult => {
  const errors: Record<string, string> = {}
  let valid = true

  for (const rule of rules) {
    const value = data[rule.field]
    const result = rule.validate(value, data)

    if (result === false) {
      valid = false
      errors[rule.field] = rule.message || `${rule.field} is invalid`
    } else if (typeof result === 'string') {
      valid = false
      errors[rule.field] = result
    }
  }

  return { valid, errors }
}

/**
 * Performs the actual HTTP request
 */
const performRequest = async (
  url: string,
  data: FormData,
  options: FormSubmitOptions
): Promise<unknown> => {
  const method = options.method || 'POST'
  const headers = { ...DEFAULT_HEADERS, ...options.headers }

  const fetchOptions: RequestInit = {
    method,
    headers
  }

  // Add body for non-GET requests
  if (method !== 'GET') {
    fetchOptions.body = JSON.stringify(data)
  }

  const response = await fetch(url, fetchOptions)

  // Parse response
  const contentType = response.headers.get('content-type')
  let result: unknown

  if (contentType && contentType.includes('application/json')) {
    result = await response.json()
  } else {
    result = await response.text()
  }

  // Check for HTTP errors
  if (!response.ok) {
    const error = new Error(`HTTP ${response.status}: ${response.statusText}`)
    ;(error as Error & { response: unknown }).response = result
    throw error
  }

  return result
}

/**
 * withSubmit feature
 * Adds validation and submission capabilities to the form
 */
export const withSubmit = (config: FormConfig) => {
  return <T extends BaseFormComponent & {
    fields: FormFieldRegistry
    state: FormState
    getData: () => FormData
    getModifiedData: () => FormData
    setMode: (mode: string) => void
    disableControls: () => void
    snapshot: () => void
    emit?: (event: string, data?: unknown) => void
  }>(component: T): T & {
    validate: () => FormValidationResult
    submit: (options?: FormSubmitOptions) => Promise<unknown>
    setValidationRules: (rules: FormValidationRule[]) => void
    clearErrors: () => void
    setFieldError: (field: string, error: string) => void
    getFieldError: (field: string) => string | undefined
  } => {
    // Validation rules can be updated at runtime
    let validationRules = config.validation || []

    const enhanced = {
      ...component,

      /**
       * Validate form data against configured rules
       * @returns Validation result with valid flag and errors object
       */
      validate(): FormValidationResult {
        const data = component.getData()
        const result = validateData(data, validationRules)

        // Update state with validation errors
        component.state.errors = result.errors

        // Emit validation event if there are errors
        if (!result.valid) {
          component.emit?.(FORM_EVENTS.VALIDATION_ERROR, result.errors)
        }

        return result
      },

      /**
       * Submit the form
       * @param options - Optional submit configuration
       * @returns Promise resolving to the server response
       */
      async submit(options: FormSubmitOptions = {}): Promise<unknown> {
        // Prevent double submission
        if (component.state.submitting) {
          return Promise.reject(new Error('Form is already submitting'))
        }

        // Validate if requested (default: true)
        if (options.validate !== false && validationRules.length > 0) {
          const validation = this.validate()
          if (!validation.valid) {
            return Promise.reject(new Error('Validation failed'))
          }
        }

        // Mark as submitting
        component.state.submitting = true

        // Add submitting class to element
        if (component.element) {
          component.element.classList.add('mtrl-form--submitting')
        }

        // Emit submit event
        const data = component.getData()
        component.emit?.(FORM_EVENTS.SUBMIT, data)

        try {
          let result: unknown

          // Use custom handler if provided
          if (options.handler) {
            result = await options.handler(data, component as unknown as import('../types').FormComponent)
          } else if (config.action) {
            // Use default fetch
            result = await performRequest(
              config.action,
              data,
              {
                method: options.method || config.method || 'POST',
                headers: options.headers
              }
            )
          } else {
            // No action URL, just return the data
            result = data
          }

          // Success!
          component.state.submitting = false
          component.state.errors = {}

          // Remove submitting class
          if (component.element) {
            component.element.classList.remove('mtrl-form--submitting')
          }

          // Take snapshot of current data as new baseline
          component.snapshot()

          // Switch to read mode
          component.setMode(FORM_MODES.READ)

          // Disable controls
          component.disableControls()

          // Emit success event
          component.emit?.(FORM_EVENTS.SUBMIT_SUCCESS, result)

          return result
        } catch (error) {
          // Error!
          component.state.submitting = false

          // Remove submitting class
          if (component.element) {
            component.element.classList.remove('mtrl-form--submitting')
          }

          // Emit error event
          component.emit?.(FORM_EVENTS.SUBMIT_ERROR, error)

          throw error
        }
      },

      /**
       * Set validation rules at runtime
       */
      setValidationRules(rules: FormValidationRule[]): void {
        validationRules = rules
      },

      /**
       * Clear all validation errors
       */
      clearErrors(): void {
        component.state.errors = {}
      },

      /**
       * Set an error for a specific field
       */
      setFieldError(field: string, error: string): void {
        component.state.errors[field] = error
      },

      /**
       * Get the error for a specific field
       */
      getFieldError(field: string): string | undefined {
        return component.state.errors[field]
      }
    }

    return enhanced
  }
}

export { validateData, performRequest }
export default withSubmit
