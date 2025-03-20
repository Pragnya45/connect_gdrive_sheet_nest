# 📝 Google Sheets API with NestJS Backend

Welcome to the **Google Sheets API Integration** project! 🚀 This backend, built with **NestJS**, integrates with Google Sheets API to provide seamless CRUD operations on patient and physician data.

---

## 📚 Features

1. **Fetch Spreadsheet Data** 📊  
   - Fetches all spreadsheet data with pagination.
   - Includes filter functionality to search by:
     - 🧑‍⚕️ Name
     - 🆔 Patient ID
     - 📧 Email

2. **Get Physician Details** 🩺  
   - Retrieves all available physician information from the sheet.

3. **Get Patient by ID** 🔍  
   - Searches the sheet with a given patient ID.
   - Returns the matched row with patient details.

4. **Add New Patient** ➕  
   - Adds a new row with patient details to the Google Sheet.

5. **Edit Patient Details** ✏️  
   - Finds the row using the patient ID.
   - Updates the row with the modified patient information.

6. **Delete Patient** ❌  
   - Removes the selected row from the sheet.

---

## 🛠️ Tech Stack

- **Backend:** NestJS ⚡️
- **Google Sheets API:** For seamless data operations 📄

---

## 🚀 Getting Started

### 1. Clone the Repository
```bash
git clone https://github.com/Pragnya45/connect_gdrive_sheet_nest.git
cd connect_gdrive_sheet_nest

```

### 2. Install Dependencies
```bash
npm install
```
### 3. Configure Google API Credentials
- Set up your Google Cloud Project.
- Enable Google Sheets API.
- Download and place your `credentials.json` file in the project root.

### 4. Run the Application
```bash
npm run start:dev
```

### 🚀 Deploying to Render
- Push your code to GitHub and connect the repo to [Render](https://render.com/).

