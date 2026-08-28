import 'server-only'
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3'

let _client: S3Client | null = null

function getClient(): S3Client | null {
  const { R2_ENDPOINT, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY } = process.env
  if (!R2_ENDPOINT || !R2_ACCESS_KEY_ID || !R2_SECRET_ACCESS_KEY) return null
  if (!_client) {
    _client = new S3Client({
      region: 'auto',
      endpoint: R2_ENDPOINT,
      credentials: {
        accessKeyId: R2_ACCESS_KEY_ID,
        secretAccessKey: R2_SECRET_ACCESS_KEY,
      },
    })
  }
  return _client
}

/**
 * Upload a file to Cloudflare R2 (or any S3-compatible store).
 * Returns the public URL if R2_PUBLIC_URL is configured, otherwise the object key.
 * Returns null if storage is not configured — callers treat this as a no-op.
 */
export async function uploadFile(
  key: string,
  body: Buffer | Uint8Array,
  contentType: string,
): Promise<string | null> {
  const client = getClient()
  const bucket = process.env.R2_BUCKET_NAME
  if (!client || !bucket) return null

  await client.send(new PutObjectCommand({ Bucket: bucket, Key: key, Body: body, ContentType: contentType }))

  const publicUrl = process.env.R2_PUBLIC_URL
  return publicUrl ? `${publicUrl}/${key}` : key
}
