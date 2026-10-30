/**
 * Divide un archivo SQL en sentencias individuales respetando comillas simples,
 * comillas dobles, backticks y comentarios de línea (--), de modo que un punto y coma (;)
 * dentro de una cadena de texto literal nunca rompa la sentencia SQL.
 */
function splitSqlStatementsQuoteAware(sqlContent) {
  const activeLines = sqlContent
    .split(/\r?\n/)
    .filter((line) => !line.trim().startsWith('--'))
    .join('\n');

  const statements = [];
  let current = '';
  let quoteChar = null;

  for (let i = 0; i < activeLines.length; i++) {
    const ch = activeLines[i];
    const prev = i > 0 ? activeLines[i - 1] : '';

    if (quoteChar) {
      current += ch;
      if (ch === quoteChar && prev !== '\\') {
        // Manejar escape de comilla simple duplicada '' en SQL estándar
        if (quoteChar === "'" && activeLines[i + 1] === "'") {
          current += activeLines[i + 1];
          i += 1;
        } else {
          quoteChar = null;
        }
      }
      continue;
    }

    if (ch === "'" || ch === '"' || ch === '`') {
      quoteChar = ch;
      current += ch;
      continue;
    }

    if (ch === ';') {
      const trimmed = current.trim();
      if (trimmed.length > 0 && !/^USE\s+/i.test(trimmed)) {
        statements.push(trimmed);
      }
      current = '';
      continue;
    }

    current += ch;
  }

  const tail = current.trim();
  if (tail.length > 0 && !/^USE\s+/i.test(tail)) {
    statements.push(tail);
  }

  return statements;
}

module.exports = {
  splitSqlStatementsQuoteAware,
};

