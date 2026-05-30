const OSC = '\u001B]';
const BEL = '\u0007';
const SEP = ';';

/**
 * Create a clickable link in the terminal.
 */
export function terminalLink(text: string, url: string) {
  const openLink = `${OSC}8${SEP}${SEP}${url}${BEL}`;
  const closeLink = `${OSC}8${SEP}${SEP}${BEL}`;
  return openLink + text + closeLink;
}
