import { NextResponse } from "next/server";
import { z } from "zod";
import { entenderPapel } from "@/lib/papel";
import { medir } from "@/lib/tempo";

// Foto (já reduzida no navegador) ou PDF, em data URL. Limite de ~6 MB em base64.
const ARQUIVO = /^data:(image\/(?:jpeg|png|webp|heic|heif)|application\/pdf);base64,([A-Za-z0-9+/=]+)$/;

const Entrada = z.object({
  texto: z.string().max(12000).optional(),
  arquivo: z.string().max(8_000_000).regex(ARQUIVO).optional(),
}).refine((d) => !!d.texto?.trim() || !!d.arquivo);

export async function POST(req: Request) {
  const dados = Entrada.safeParse(await req.json().catch(() => null));
  if (!dados.success) return NextResponse.json({ erro: "Mande a foto, o PDF ou o texto do papel (até 12 mil letras)." }, { status: 400 });
  const m = dados.data.arquivo?.match(ARQUIVO);
  const r = await medir("POST /api/papel (total)", () =>
    entenderPapel({ texto: dados.data.texto, arquivo: m ? { mimeType: m[1], data: m[2] } : undefined }));
  return NextResponse.json(r, { status: "erro" in r ? 422 : 200 });
}
