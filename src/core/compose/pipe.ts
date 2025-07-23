/**
 * Pipe utility for functional composition
 *
 * Composes functions from left to right
 */

/**
 * Pipe function that composes multiple functions
 * @param fns Functions to compose
 * @returns Composed function
 */
export function pipe<T>(...fns: Array<(arg: any) => any>) {
  return (value: T) => fns.reduce((acc, fn) => fn(acc), value);
}
