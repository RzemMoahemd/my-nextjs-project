// ======================================================
// UPLOAD D'IMAGES VERS SUPABASE STORAGE
// ======================================================
// Au lieu de stocker les images en dataURL dans la table `settings`
// (ce qui alourdit les requêtes et grossit la BD),
// on upload vers Supabase Storage et on ne stocke que l'URL publique.

import { createAdminClient } from "./supabase-admin";

// Bucket de destination (créer dans Supabase → Storage → Create bucket)
const BUCKET_NAME = "homepage-images";
const MAX_FILE_SIZE = 500 * 1024; // 500 Ko

/**
 * Upload un fichier vers Supabase Storage et retourne l'URL publique.
 * @param file - Le fichier à uploader
 * @param folder - Dossier dans le bucket (ex: "homepage", "categories")
 * @returns L'URL publique de l'image
 */
export async function uploadImageToStorage(file: File, folder: string): Promise<string> {
  if (!file.type.startsWith("image/")) {
    throw new Error("Le fichier doit être une image.");
  }
  if (file.size > MAX_FILE_SIZE) {
    throw new Error(`Image trop lourde (max ${MAX_FILE_SIZE / 1024} Ko).`);
  }

  const adminClient = createAdminClient();

  // Vérifier que le bucket existe
  const { data: buckets } = await adminClient.storage.listBuckets();
  const bucketExists = buckets?.some((b: { name: string }) => b.name === BUCKET_NAME);
  if (!bucketExists) {
    throw new Error(
      `Bucket '${BUCKET_NAME}' introuvable. Créez-le dans Supabase → Storage → Create bucket, puis réessayez.`
    );
  }

  const fileExt = file.name.split(".").pop()?.toLowerCase() || "jpg";
  const fileName = `${folder}/${Date.now()}.${fileExt}`;

  const { error } = await adminClient.storage
    .from(BUCKET_NAME)
    .upload(fileName, file, {
      contentType: file.type,
      upsert: true,
    });

  if (error) {
    console.error("[storage] upload error:", error);
    throw new Error(`Erreur lors de l'upload : ${error.message}`);
  }

  const { data } = adminClient.storage.from(BUCKET_NAME).getPublicUrl(fileName);
  return data.publicUrl;
}
