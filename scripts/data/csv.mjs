// Leitura em streaming dos CSVs de dados abertos do TSE (latin1, ";" e aspas).
import { spawn } from 'node:child_process';
import readline from 'node:readline';

export function parseLine(line) {
  const out = [];
  let i = 0;
  const n = line.length;
  while (i <= n) {
    if (line.charCodeAt(i) === 34) { // aspas
      let s = '';
      i++;
      for (;;) {
        const j = line.indexOf('"', i);
        if (j < 0) { s += line.slice(i); i = n; break; }
        s += line.slice(i, j);
        if (line.charCodeAt(j + 1) === 34) { s += '"'; i = j + 2; continue; }
        i = j + 1;
        break;
      }
      out.push(s);
      i++; // pula ';'
    } else {
      let j = line.indexOf(';', i);
      if (j < 0) j = n;
      out.push(line.slice(i, j));
      i = j + 1;
    }
  }
  return out;
}

/** Lista os arquivos dentro de um zip (usa `unzip -Z1`). */
export function listZip(zipPath) {
  return new Promise((resolve, reject) => {
    const p = spawn('unzip', ['-Z1', zipPath]);
    let out = '';
    p.stdout.on('data', d => (out += d));
    p.on('close', code => (code === 0 ? resolve(out.split(/\r?\n/).filter(Boolean)) : reject(new Error(`unzip -Z1 ${zipPath} -> ${code}`))));
  });
}

/**
 * Itera as linhas de um CSV dentro de um zip, chamando onRow(cols, H) para cada registro,
 * onde H mapeia o nome da coluna (do cabeçalho do próprio arquivo) para o índice em cols.
 */
export async function forEachRow(zipPath, inner, onRow) {
  const p = spawn('unzip', ['-p', zipPath, inner]);
  p.stdout.setEncoding('latin1');
  const rl = readline.createInterface({ input: p.stdout, crlfDelay: Infinity });
  let header = null;
  let H = null;
  let count = 0;
  for await (const line of rl) {
    if (!line) continue;
    const cols = parseLine(line);
    if (!header) {
      header = cols;
      H = Object.fromEntries(header.map((h, k) => [h, k]));
      continue;
    }
    if (cols.length !== header.length) throw new Error(`${inner}: linha com ${cols.length} colunas (esperado ${header.length}): ${line.slice(0, 200)}`);
    onRow(cols, H);
    count++;
  }
  const code = await new Promise(r => (p.exitCode !== null ? r(p.exitCode) : p.on('close', r)));
  if (code !== 0) throw new Error(`unzip -p ${zipPath} ${inner} terminou com código ${code}`);
  return count;
}
