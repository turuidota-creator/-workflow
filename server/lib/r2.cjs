const { S3Client, PutObjectCommand, DeleteObjectCommand, GetObjectCommand } = require('@aws-sdk/client-s3');
const { getSignedUrl } = require('@aws-sdk/s3-request-presigner');
const fs = require('fs');
const path = require('path');

// Initialize S3 Client for Cloudflare R2
function getR2Client() {
    const accountId = process.env.R2_ACCOUNT_ID;
    const accessKeyId = process.env.R2_ACCESS_KEY_ID;
    const secretAccessKey = process.env.R2_SECRET_ACCESS_KEY;

    if (!accountId || !accessKeyId || !secretAccessKey) {
        console.error('[R2] Missing environment variables for R2 configuration.');
        return null;
    }

    return new S3Client({
        region: 'auto',
        endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
        credentials: {
            accessKeyId,
            secretAccessKey,
        },
    });
}

/**
 * Upload a file to R2
 * @param {string} filePath - Local path to the file
 * @param {string} key - Object key in R2 (e.g. "audio/2026/file.mp3")
 * @returns {Promise<boolean>}
 */
async function uploadFileToR2(filePath, key) {
    const client = getR2Client();
    if (!client) return false;

    const bucket = process.env.R2_BUCKET;
    if (!bucket) {
        console.error('[R2] Missing R2_BUCKET environment variable.');
        return false;
    }

    try {
        if (!fs.existsSync(filePath)) {
            console.error(`[R2] File not found: ${filePath}`);
            return false;
        }

        const fileStream = fs.createReadStream(filePath);
        const command = new PutObjectCommand({
            Bucket: bucket,
            Key: key,
            Body: fileStream,
            ContentType: 'audio/mpeg', // Enforce audio/mpeg for compatibility
        });

        await client.send(command);
        console.log(`[R2] Uploaded successfully: ${key}`);
        return true;
    } catch (error) {
        console.error('[R2] Upload failed:', error);
        return false;
    }
}

/**
 * Generate a signed URL for an object
 * @param {string} key - Object key
 * @returns {Promise<{url: string, expiresIn: number} | null>}
 */
async function getSignedAudioUrl(key) {
    const client = getR2Client();
    if (!client) return null;

    const bucket = process.env.R2_BUCKET;
    if (!bucket) return null;

    try {
        const command = new GetObjectCommand({
            Bucket: bucket,
            Key: key,
        });

        // Expires in 1200 seconds (20 minutes)
        const expiresIn = 1200;
        const url = await getSignedUrl(client, command, { expiresIn });

        return { url, expiresIn };
    } catch (error) {
        console.error('[R2] Signing failed:', error);
        return null;
    }
}

/**
 * Delete a file from R2
 * @param {string} key - Object key
 * @returns {Promise<boolean>}
 */
async function deleteFileFromR2(key) {
    const client = getR2Client();
    if (!client) return false;

    const bucket = process.env.R2_BUCKET;
    if (!bucket) return false;

    try {
        const command = new DeleteObjectCommand({
            Bucket: bucket,
            Key: key,
        });

        await client.send(command);
        console.log(`[R2] Deleted object: ${key}`);
        return true;
    } catch (error) {
        console.error('[R2] Delete failed:', error);
        return false;
    }
}

module.exports = {
    uploadFileToR2,
    getSignedAudioUrl,
    deleteFileFromR2
};
