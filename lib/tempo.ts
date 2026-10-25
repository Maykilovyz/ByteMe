// Medição de tempo para achar o que deixa o sistema lento. Escreve no terminal do `npm run dev`, uma linha por etapa.
// Nunca imprime chave, URL completa ou texto do cidadão. Desligue com LOG_TEMPOS=0.
export async function medir<T>(etapa: string, fn: () => Promise<T>): Promise<T> {
  if (process.env.LOG_TEMPOS === "0") return fn();
  const t0 = Date.now();
  try {
    return await fn();
  } finally {
    const ms = Date.now() - t0;
    console.log(`[tempo] ${etapa}: ${ms} ms${ms > 2000 ? "  <-- LENTO" : ""}`);
  }
}
