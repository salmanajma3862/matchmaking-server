import { BlobServiceClient, generateBlobSASQueryParameters, BlobSASPermissions, StorageSharedKeyCredential } from '@azure/storage-blob';
import dotenv from 'dotenv';

dotenv.config();

const AZURE_STORAGE_CONNECTION_STRING = process.env.AZURE_STORAGE_CONNECTION_STRING;
const CONTAINER_NAME = 'chat-media'; // You might want to make this configurable

if (!AZURE_STORAGE_CONNECTION_STRING) {
    console.error('Azure Storage Connection String not found');
}

const blobServiceClient = BlobServiceClient.fromConnectionString(AZURE_STORAGE_CONNECTION_STRING);
const containerClient = blobServiceClient.getContainerClient(CONTAINER_NAME);

// Ensure container exists
const ensureContainerExists = async () => {
    try {
        await containerClient.createIfNotExists({
            access: 'blob' // or 'container' or undefined (private)
        });
    } catch (error) {
        console.error("Error creating container:", error.message);
    }
};

ensureContainerExists();

export const uploadFile = async (buffer, originalName, mimeType) => {
    try {
        const blobName = `${Date.now()}-${originalName}`;
        const blockBlobClient = containerClient.getBlockBlobClient(blobName);

        console.log(`[Azure] Uploading file: ${blobName}, Size: ${buffer.length} bytes`);

        await blockBlobClient.uploadData(buffer, {
            blobHTTPHeaders: { blobContentType: mimeType }
        });

        console.log(`[Azure] File uploaded successfully: ${blobName}`);
        return blobName;
    } catch (error) {
        console.error("[Azure] Error uploading file:", error.message);
        throw error;
    }
};

export const getSASToken = (blobName) => {
    try {
        // We need to parse the connection string to get account name and key for SAS generation
        // Or use the client to generate it if initialized with shared key.
        // Since we used connection string, we can extract the account name and key manually or use a helper if available.
        // However, BlobServiceClient.fromConnectionString doesn't expose the credential directly in a way that generateBlobSASQueryParameters accepts easily if we just pass the client.
        // We need StorageSharedKeyCredential.

        const connectionString = AZURE_STORAGE_CONNECTION_STRING;
        const accountNameMatch = connectionString.match(/AccountName=([^;]+)/);
        const accountKeyMatch = connectionString.match(/AccountKey=([^;]+)/);

        if (!accountNameMatch || !accountKeyMatch) {
            throw new Error("Invalid Connection String");
        }

        const accountName = accountNameMatch[1];
        const accountKey = accountKeyMatch[1];
        const sharedKeyCredential = new StorageSharedKeyCredential(accountName, accountKey);

        const sasOptions = {
            containerName: CONTAINER_NAME,
            blobName: blobName,
            permissions: BlobSASPermissions.parse("r"), // read only
            startsOn: new Date(),
            expiresOn: new Date(new Date().valueOf() + 60 * 60 * 1000), // 60 minutes
        };

        const sasToken = generateBlobSASQueryParameters(sasOptions, sharedKeyCredential).toString();
        console.log(`[Azure] Generated SAS token for: ${blobName}`);
        return sasToken;
    } catch (error) {
        console.error("[Azure] Error generating SAS token:", error);
        return null;
    }
};

export const getFileUrl = (blobName) => {
    const sasToken = getSASToken(blobName);
    if (!sasToken) return null;
    return `${containerClient.getBlockBlobClient(blobName).url}?${sasToken}`;
};
