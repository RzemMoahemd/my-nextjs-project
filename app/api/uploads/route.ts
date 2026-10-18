import { NextRequest, NextResponse } from "next/server";
import { uploadImageToStorage } from "@/lib/storage";

// Dossiers disponibles
export const UPLOAD_FOLDERS = ["homepage", "categories", "assets"] as const;
export type UploadFolder = (typeof UPLOAD_FOLDERS)[number];

// Taille max (5 Mo) = même limite que le client admin
const MAX_FILE_SIZE = 5 * 1024 * 1024;

/**
 * Upload d'une image vers Supabase Storage.
 * Le body attendu : FormData avec "file" (File) et optionnel "folder".
 */
export async function POST(request: NextRequest) {
  try {
    // Récupérer les données (MultiPart)
    const formData = await request.formData();
    const file = formData.get("file") as File | null;
    const folder = (formData.get("folder") as UploadFolder) || "homepage";

    if (!file) {
      return NextResponse.json(
        { error: "Aucun fichier fourni." },
        { status: 400 }
      );
    }

    // Vérifier la taille
    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        { error: `Image trop lourde (max ${MAX_FILE_SIZE / 1024 / 1024} Mo).` },
        { status: 400 }
      );
    }

    // Upload vers Storage
    const url = await uploadImageToStorage(file, folder);

    return NextResponse.json({ url });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Erreur inconnue";
    console.error("[uploads] error:", error);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
