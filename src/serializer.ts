export type Serializer = (parameter: unknown) => unknown
export type Deserializer = (parameter: unknown) => unknown

export const defaultSerializer: Serializer = (parameter) => {
  if (skipTransform(parameter) || typeof parameter === 'string') {
    return parameter
  } else if (typeof parameter === 'boolean') {
    return '' + parameter
  } else if (parameter instanceof Date) {
    return parameter.toISOString()
  } else {
    try {
      return JSON.stringify(parameter)
    } catch {
      return parameter
    }
  }
}

export const dateRegex = /^\d{4}-\d{2}-\d{2}[T ]\d{2}:\d{2}:\d{2}(?:\.\d+)?Z?$/

export const defaultDeserializer: Deserializer = (parameter) => {
  if (skipTransform(parameter)) {
    return parameter
  }
  if (typeof parameter === 'string') {
    if (parameter === 'true') {
      return true
    } else if (parameter === 'false') {
      return false
    } else if (dateRegex.test(parameter)) {
      return new Date(parameter)
    } else if (maybeJson(parameter)) {
      try {
        return JSON.parse(parameter)
      } catch { }
    }
    return parameter
  }
}

/**
 * Checks if a given string parameter is a JSON-like string.
 *
 * This function determines if the input string starts and ends with
 * curly braces `{}` or square brackets `[]`, which are typical indicators
 * of JSON objects and arrays respectively.
 *
 * @param parameter - The string to be checked.
 * @returns `true` if the string is JSON-like, otherwise `false`.
 */
export function maybeJson(parameter: string): boolean {
  return (parameter.startsWith('{') && parameter.endsWith('}'))
    || (parameter.startsWith('[') && parameter.endsWith(']'))
}

/**
 * Determines whether a given parameter should be skipped during transformation.
 *
 * @param parameter - The parameter to check.
 * @returns `true` if the parameter should be skipped; otherwise, `false`.
 *
 * The parameter will be skipped if it meets any of the following conditions:
 * - It is `undefined`.
 * - It is `null`.
 * - It is of type `bigint`.
 * - It is of type `number`.
 * - It is an object that contains a `buffer` property.
 */
export function skipTransform(parameter: unknown): boolean {
  return parameter === undefined
    || parameter === null
    || typeof parameter === 'bigint'
    || typeof parameter === 'number'
    || (typeof parameter === 'object' && 'buffer' in parameter)
}
