import { Injectable } from '@nestjs/common';
import * as https from 'https';
import * as dotenv from 'dotenv';

dotenv.config();

@Injectable()
export class GoogledriveService {
  private API_KEY = process.env.GOOGLE_API_KEY;
  async getSheetNames(
    spreadsheetId: string,
    accessToken: string,
  ): Promise<string[]> {
    return new Promise((resolve, reject) => {
      const options = {
        hostname: 'sheets.googleapis.com',
        path: `/v4/spreadsheets/${spreadsheetId}?fields=sheets.properties.title`,
        method: 'GET',
        headers: {
          Authorization: accessToken,
        },
      };

      const req = https.request(options, (res) => {
        let data = '';

        res.on('data', (chunk) => {
          data += chunk;
        });

        res.on('end', () => {
          try {
            const jsonData = JSON.parse(data);
            console.log('Sheets JSON:', jsonData);

            // Extract sheet names
            const sheetNames: string[] = jsonData.sheets.map(
              (sheet: any) => sheet.properties.title,
            );
            resolve(sheetNames);
          } catch (error) {
            reject(error);
          }
        });
      });

      req.on('error', (error) => {
        reject(error);
      });

      req.end();
    });
  }

  async fetchSpreadsheetData(
    spreadsheetId: string,
    accessToken: string,
    page: number,
    limit: number,
    name?: string,
  ) {
    return new Promise(async (resolve, reject) => {
      try {
        console.log(accessToken);
        const sheetNames = await this.getSheetNames(spreadsheetId, accessToken);

        if (!sheetNames.length) {
          return reject('No sheets found in the spreadsheet.');
        }

        // 🔹 Find the sheet that contains "patients"
        let sheetName = sheetNames.find((name) =>
          name.toLowerCase().includes('patient'),
        );

        // If no sheet named "patients" found, default to the first sheet
        if (!sheetName) {
          sheetName = sheetNames[0];
        }

        console.log('Using Sheet:', sheetName);

        const options = {
          hostname: 'sheets.googleapis.com',
          path: `/v4/spreadsheets/${spreadsheetId}/values/${encodeURIComponent(sheetName)}!A1:Z1000`, // Use dynamic sheet name
          method: 'GET',
          headers: {
            Authorization: accessToken,
          },
        };

        const req = https.request(options, (res) => {
          let data = '';

          res.on('data', (chunk) => {
            data += chunk;
          });

          res.on('end', () => {
            try {
              const jsonData = JSON.parse(data);
              if (!jsonData.values || jsonData.values.length === 0) {
                return resolve({
                  results: [],
                  totalPages: 0,
                  totalResults: 0,
                  limit: Number(limit),
                  page: Number(page),
                });
              }

              const headers = jsonData.values[0];
              const rows = jsonData.values.slice(1);

              // ✅ Find column indexes
              const firstNameIndex = headers.findIndex((h: any) =>
                h.toLowerCase().includes('first_name'),
              );
              const lastNameIndex = headers.findIndex((h: any) =>
                h.toLowerCase().includes('last_name'),
              );

              if (firstNameIndex === -1 || lastNameIndex === -1) {
                console.error('❌ First Name or Last Name column not found');
                return reject(
                  'First Name or Last Name column not found in the sheet.',
                );
              }

              console.log(
                `✅ First Name Index: ${firstNameIndex}, Last Name Index: ${lastNameIndex}`,
              );

              let filteredRows = rows;
              if (name) {
                const lowerCaseName = name.toLowerCase();
                filteredRows = rows.filter((row: any, index: number) => {
                  const firstName = row[firstNameIndex]?.toLowerCase() || '';
                  const lastName = row[lastNameIndex]?.toLowerCase() || '';
                  const fullName = `${firstName} ${lastName}`;

                  console.log(
                    `🔍 Checking row ${index + 1}: ${firstName} ${lastName}`,
                  );

                  return (
                    firstName.includes(lowerCaseName) ||
                    lastName.includes(lowerCaseName) ||
                    fullName.includes(lowerCaseName)
                  );
                });
              }
              const totalResults = filteredRows.length;
              const totalPages = Math.ceil(totalResults / limit);
              const startIndex = (page - 1) * limit;
              const paginatedResults = filteredRows.slice(
                startIndex,
                startIndex + limit,
              );
              resolve({
                results: name ? paginatedResults : paginatedResults.slice(1),
                totalPages,
                totalResults,
                limit: Number(limit),
                page: Number(page),
              });
            } catch (error) {
              reject(error);
            }
          });
        });

        req.on('error', (error) => {
          reject(error);
        });

        req.end();
      } catch (error) {
        reject(error);
      }
    });
  }
}
