import { google } from 'googleapis';
import { Readable } from 'stream';

const auth = new google.auth.GoogleAuth({
  credentials: {
    client_email: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
    private_key: process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
  },
  scopes: [
    'https://www.googleapis.com/auth/spreadsheets',
    'https://www.googleapis.com/auth/drive',
  ],
});

export const drive = google.drive({ version: 'v3', auth });
const FOLDER_ID = process.env.GOOGLE_DRIVE_FOLDER_ID;

/**
 * Uploads a file buffer to Google Drive inside the configured folder.
 * Grants read permission to anyone so the file link can be viewed by medical staff.
 */
export async function uploadFileToDrive(
  buffer: Buffer,
  fileName: string,
  mimeType: string
): Promise<string> {
  if (!FOLDER_ID) {
    throw new Error('GOOGLE_DRIVE_FOLDER_ID env variable is not set');
  }

  // Create stream from buffer
  const stream = new Readable();
  stream.push(buffer);
  stream.push(null);

  // Upload file
  const response = await drive.files.create({
    requestBody: {
      name: fileName,
      parents: [FOLDER_ID],
    },
    media: {
      mimeType: mimeType,
      body: stream,
    },
    fields: 'id, webViewLink, webContentLink',
  });

  const fileId = response.data.id;
  if (!fileId) {
    throw new Error('Failed to retrieve uploaded file ID from Google Drive API');
  }

  // Grant read permission to "anyone" so it can be viewed by all users
  try {
    await drive.permissions.create({
      fileId: fileId,
      requestBody: {
        role: 'reader',
        type: 'anyone',
      },
    });
  } catch (permissionError) {
    console.error('Failed to set public view permission for uploaded file:', permissionError);
    // Continue anyway as the file is uploaded
  }

  // Return webViewLink (which opens in browser) or construct custom URL
  return response.data.webViewLink || `https://drive.google.com/file/d/${fileId}/view`;
}
