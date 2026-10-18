// ======================================================
// UPLOAD D'IMAGES VERS SUPABASE STORAGE
// ======================================================
// Au lieu de stocker les images en dataURL dans la table `settings`
// (ce qui alourdit les requêtes et grossit la BD),
// on upload vers Supabase Storage et on ne stocke que l'URL publique.

import { createAdminClient } from "./supabase-admin";

// Bucket de destination (créer dans Supabase → Storage → Create bucket)
const BUCKET_NAME = "homepage-images";
const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5 Mo

// Cache pour éviter de vérifier l'existence du bucket à chaque upload
let bucketChecked = false;

/**
 * Upload un fichier vers Supabase Storage et retourne l'URL publique.
 * @param file - Le fichier à uploader
 * @param folder - Dossier dans le bucket (ex: "homepage", "categories")
 * @returns L'URL publique de l'image
 */
const ALLOWED_IMAGE_TYPES = [
  "image/jpeg",
  "image/jpg",
  "image/png",
  "image/gif",
  "image/webp",
  "image/bmp",
  "image/svg+xml",
  "image/tiff",
  "image/x-icon",
];

export async function uploadImageToStorage(file: File, folder: string): Promise<string> {
  // Vérifier le type MIME (accepte aussi les types génériques ou non reconnus si l'extension est une image)
  const isImageByType = file.type.startsWith("image/") || ALLOWED_IMAGE_TYPES.includes(file.type);
  const fileExt = file.name.split(".").pop()?.toLowerCase() || "";
  const isImageByExt = ["jpg", "jpeg", "png", "gif", "webp", "bmp", "svg", "tiff", "ico"].includes(fileExt);

  if (!isImageByType && !isImageByExt) {
    throw new Error(`Le fichier doit être une image (type détecté : ${file.type || "non reconnu"}).`);
  }

  if (file.size > MAX_FILE_SIZE) {
    throw new Error(`Image trop lourde (max ${MAX_FILE_SIZE / 1024 / 1024} Mo).`);
  }

  const adminClient = createAdminClient();

  // Vérifier que le bucket existe (une seule fois, puis mis en cache)
  if (!bucketChecked) {
    const { data: buckets } = await adminClient.storage.listBuckets();
    const bucketExists = buckets?.some((b: { name: string }) => b.name === BUCKET_NAME);
    if (!bucketExists) {
      throw new Error(
        `Bucket '${BUCKET_NAME}' introuvable. Créez-le dans Supabase → Storage → Create bucket, puis réessayez.`
      );
    }
    bucketChecked = true;
  }

  const safeExt = fileExt || "jpg";
  const fileName = `${folder}/${Date.now()}.${safeExt}`;

  const { error } = await adminClient.storage
    .from(BUCKET_NAME)
    .upload(fileName, file, {
      contentType: file.type || "application/octet-stream",
      upsert: true,
    });

  if (error) {
    console.error("[storage] upload error:", error);
    throw new Error(`Erreur lors de l'upload : ${error.message}`);
  }

  const { data } = adminClient.storage.from(BUCKET_NAME).getPublicUrl(fileName);
  return data.publicUrl;
}
