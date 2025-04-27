import os
import shutil
import sys
import google.auth
from googleapiclient.discovery import build
from googleapiclient.errors import HttpError
from googleapiclient.http import MediaFileUpload, MediaIoBaseDownload
from google.oauth2 import service_account


# Constants
SCOPES = ['https://www.googleapis.com/auth/drive.file']
SERVICE_ACCOUNT_FILE = os.path.join(os.path.dirname(__file__), '../service_account.json')
DRIVE_FOLDER_ID = '1DA3mb8WsgonUNrNSsj1DLjGv06cRdQex'
SESSION_FOLDER_PATH = os.path.join(os.path.dirname(__file__), '../persistent/session')

# Authenticate and create Google Drive client
def authenticate_google_drive():
    creds = service_account.Credentials.from_service_account_file(
        SERVICE_ACCOUNT_FILE, scopes=SCOPES)
    drive_service = build('drive', 'v3', credentials=creds)
    return drive_service

# Clear all files in Drive folder
def clear_drive_folder(drive_service):
    try:
        results = drive_service.files().list(
            q=f"'{DRIVE_FOLDER_ID}' in parents",
            fields="files(id, name)"
        ).execute()
        files = results.get('files', [])
        for file in files:
            drive_service.files().delete(fileId=file['id']).execute()
            print(f"Deleted file: {file['name']}")
    except HttpError as error:
        print(f"Error clearing Drive folder: {error}")

# Upload all session files to Drive
def upload_session_to_drive(drive_service):
    if not os.path.exists(SESSION_FOLDER_PATH):
        print(f"Session folder does not exist: {SESSION_FOLDER_PATH}")
        return

    print("Uploading session files to Drive...")
    for filename in os.listdir(SESSION_FOLDER_PATH):
        file_path = os.path.join(SESSION_FOLDER_PATH, filename)
        if os.path.isfile(file_path):
            file_metadata = {'name': filename, 'parents': [DRIVE_FOLDER_ID]}
            media = MediaFileUpload(file_path, mimetype='application/octet-stream')
            drive_service.files().create(body=file_metadata, media_body=media).execute()
            print(f"Uploaded: {filename}")

# Download all session files from Drive
def download_session_from_drive(drive_service):
    try:
        results = drive_service.files().list(
            q=f"'{DRIVE_FOLDER_ID}' in parents",
            fields="files(id, name)"
        ).execute()
        files = results.get('files', [])

        if not files:
            print("No session files found on Drive.")
            return

        if os.path.exists(SESSION_FOLDER_PATH):
            shutil.rmtree(SESSION_FOLDER_PATH)
        os.makedirs(SESSION_FOLDER_PATH)

        print("Downloading session files from Drive...")
        for file in files:
            request = drive_service.files().get_media(fileId=file['id'])
            file_path = os.path.join(SESSION_FOLDER_PATH, file['name'])
            with open(file_path, 'wb') as f:
                downloader = MediaIoBaseDownload(f, request)
                done = False
                while not done:
                    _, done = downloader.next_chunk()
            print(f"Downloaded: {file['name']}")

    except HttpError as error:
        print(f"Error downloading session files: {error}")

# Main function based on argument
def main():
    if len(sys.argv) < 2:
        print("No action specified. Use 'clear_and_upload_to_drive' or 'download_from_drive'.")
        return

    action = sys.argv[1]
    drive_service = authenticate_google_drive()

    if action == 'clear_and_upload_to_drive':
        clear_drive_folder(drive_service)
        upload_session_to_drive(drive_service)
    elif action == 'download_from_drive':
        download_session_from_drive(drive_service)
    else:
        print(f"Unknown action: {action}")

if __name__ == '__main__':
    main()
