import { Storage } from "@google-cloud/storage";
import { existsSync } from "node:fs";
import path from "node:path";
import type { QuestionAsset } from "./types";

let storage: Storage | null = null;

function getStorage(): Storage {
  storage ??= new Storage({ projectId: process.env.GOOGLE_CLOUD_PROJECT });
  return storage;
}

export async function resolveAssetUrl(asset?: QuestionAsset): Promise<string | undefined> {
  if (!asset) {
    return undefined;
  }

  if (asset.publicUrl) {
    return asset.publicUrl;
  }

  const localPublicPath = path.join(process.cwd(), "public", "media", asset.storagePath);
  if (existsSync(localPublicPath)) {
    return `/media/${asset.storagePath}`;
  }

  const bucketName = process.env.MEDIA_BUCKET;
  if (!bucketName) {
    return undefined;
  }

  const [url] = await getStorage()
    .bucket(bucketName)
    .file(asset.storagePath)
    .getSignedUrl({
      action: "read",
      expires: Date.now() + 1000 * 60 * 30,
    });

  return url;
}
