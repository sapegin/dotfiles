/**
 * Strips comments in a JSON file.
 */
export function stripJsonComments(json: string) {
  let result = '';
  let index = 0;
  let isInString = false;
  let isEscaped = false;

  while (index < json.length) {
    const char = json[index];
    const nextChar = json[index + 1];

    if (isInString) {
      result += char;

      if (isEscaped) {
        isEscaped = false;
      } else if (char === '\\') {
        isEscaped = true;
      } else if (char === '"') {
        isInString = false;
      }

      index++;
      continue;
    }

    if (char === '"') {
      isInString = true;
      result += char;
      index++;
      continue;
    }

    if (char === '/' && nextChar === '/') {
      index += 2;

      while (index < json.length && json[index] !== '\n') {
        index++;
      }

      continue;
    }

    if (char === '/' && nextChar === '*') {
      index += 2;

      while (index < json.length) {
        if (json[index] === '*' && json[index + 1] === '/') {
          index += 2;
          break;
        }

        index++;
      }

      continue;
    }

    result += char;
    index++;
  }

  return result;
}
