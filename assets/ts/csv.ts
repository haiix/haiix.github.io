export function parse(src: string): string[][] {
  const re = /("(([^"]|"")*)"|([^,\r\n]*))(,|\r\n|\r|\n|$)/uy;
  const data = [];
  let row = [];
  let result;
  while ((result = re.exec(src)) && result.index < src.length) {
    row.push(result[2]?.replaceAll('""', '"') ?? result[4] ?? '');
    if (result[5] !== ',') {
      data.push(row);
      row = [];
    }
  }
  return data;
}

export function build(data: string[][]): string {
  const NEEDS_QUOTE = /[",\n\r]/u;
  return data
    .map(
      (row) =>
        `${row
          .map((value) =>
            NEEDS_QUOTE.test(value) ?
              `"${value.replaceAll('"', '""')}"`
            : value,
          )
          .join(',')}\n`,
    )
    .join('');
}
