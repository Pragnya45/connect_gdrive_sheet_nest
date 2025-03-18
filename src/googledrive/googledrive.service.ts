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
                results: paginatedResults,
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
  async fetchSpreadsheetHeaders(
    headersPath: string,
    accessToken: string,
  ): Promise<string[]> {
    return new Promise((resolve, reject) => {
      const options = {
        hostname: 'sheets.googleapis.com',
        path: headersPath,
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
            const headers = jsonData.values ? jsonData.values[0] : [];
            resolve(headers);
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

  async addPatientsData(
    spreadsheetId: string,
    accessToken: string,
    patientData: any,
  ) {
    console.log('Received request with data:', patientData);
    return new Promise(async (resolve, reject) => {
      try {
        console.log('Fetching sheet names...');
        const sheetNames = await this.getSheetNames(spreadsheetId, accessToken);
        if (!sheetNames.length) {
          console.log(sheetNames);
          return reject('No sheets found in the spreadsheet.');
        }

        let sheetName = sheetNames.find((name) =>
          name.toLowerCase().includes('patient'),
        );
        if (!sheetName) sheetName = sheetNames[0];

        const headersPath = `/v4/spreadsheets/${spreadsheetId}/values/${encodeURIComponent(sheetName)}!A1:Z1`;
        const appendPath = `/v4/spreadsheets/${spreadsheetId}/values/${encodeURIComponent(sheetName)}:append?valueInputOption=RAW`;

        const headers = await this.fetchSpreadsheetHeaders(
          headersPath,
          accessToken,
        );
        console.log('headers', headers);

        const normalizedPatientData: any = Object.keys(patientData).reduce(
          (acc, key) => {
            acc[key.trim().toLowerCase()] = patientData[key]; // Trim + lowercase
            return acc;
          },
          {},
        );
        console.log(
          normalizedPatientData,
          normalizedPatientData?.['first_name'],
          normalizedPatientData?.first_name,
        );
        // Map headers to values
        const rowData = headers.map((col) => {
          const key = col.trim().toLowerCase();
          console.log(key, normalizedPatientData[key]);
          // Special case for physician_name (combines first and last names)
          if (`${key}` === 'physician_name') {
            return `${patientData.physician_first_name || 'N/A'} ${
              patientData.physician_last_name || ''
            }`.trim();
          }

          return normalizedPatientData.hasOwnProperty(`${key}`)
            ? normalizedPatientData[`${key}`] || 'N/A'
            : 'N/A';
        });
        console.log(rowData);
        const options = {
          hostname: 'sheets.googleapis.com',
          path: appendPath,
          method: 'POST',
          headers: {
            Authorization: accessToken,
            'Content-Type': 'application/json',
          },
        };

        const req = https.request(options, (res) => {
          let responseData = '';

          res.on('data', (chunk) => {
            responseData += chunk;
          });

          res.on('end', () => {
            console.log('API Response:', responseData);

            if (res.statusCode === 200 || res.statusCode === 204) {
              console.log('Data added successfully');
              resolve({ message: 'Data added successfully' });
            } else {
              try {
                const result = JSON.parse(responseData);
                console.error('Error from API:', result);
                reject(result);
              } catch (error) {
                console.error('Error parsing response:', error);
                reject('Error parsing response');
              }
            }
          });

          req.on('error', (error) => {
            console.error('Request error:', error);
            reject(error);
          });

          req.setTimeout(5000, () => {
            console.error('Request timed out');
            req.abort();
            reject('Request timed out');
          });
        });
        req.write(JSON.stringify({ values: [rowData] }));
        req.end();
      } catch (error) {
        reject(error);
      }
    });
  }
  // async clearSheet(
  //   spreadsheetId: string,
  //   sheetName: string,
  //   accessToken: string,
  // ) {
  //   return new Promise((resolve, reject) => {
  //     const options = {
  //       hostname: 'sheets.googleapis.com',
  //       path: `/v4/spreadsheets/${spreadsheetId}/values/${encodeURIComponent(sheetName)}!A1:Z1000:clear`,
  //       method: 'POST',
  //       headers: {
  //         Authorization: accessToken,
  //         'Content-Type': 'application/json',
  //       },
  //     };

  //     const req = https.request(options, (res) => {
  //       res.on('end', () => resolve(true));
  //     });

  //     req.on('error', (error) => {
  //       reject(error);
  //     });

  //     req.end();
  //   });
  // }
  async updateSheetData(
    spreadsheetId: string,
    sheetName: string,
    values: any[][],
    accessToken: string,
  ) {
    return new Promise((resolve, reject) => {
      const options = {
        hostname: 'sheets.googleapis.com',
        path: `/v4/spreadsheets/${spreadsheetId}/values/${encodeURIComponent(
          sheetName,
        )}!A1:Z1000?valueInputOption=RAW`,
        method: 'PUT', // ✅ Correctly using PUT to overwrite the sheet
        headers: {
          Authorization: accessToken,
          'Content-Type': 'application/json',
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
            if (jsonData.error) {
              return reject(jsonData.error);
            }
            resolve(true);
          } catch (error) {
            reject(error);
          }
        });
      });

      req.on('error', (error) => {
        reject(error);
      });

      req.write(
        JSON.stringify({
          majorDimension: 'ROWS',
          values,
        }),
      );
      req.end();
    });
  }

  async deletePatientData(
    spreadsheetId: string,
    accessToken: string,
    ids: string[],
  ) {
    return new Promise(async (resolve, reject) => {
      try {
        const sheetNames = await this.getSheetNames(spreadsheetId, accessToken);
        if (!sheetNames.length) {
          return reject('No sheets found in the spreadsheet.');
        }

        // 🔹 Find the "patients" sheet or fallback to the first sheet
        let sheetName = sheetNames.find((name) =>
          name.toLowerCase().includes('patient'),
        );
        if (!sheetName) {
          sheetName = sheetNames[0];
        }

        console.log('Using Sheet:', sheetName);

        // ✅ Fetch all data from the sheet
        const options = {
          hostname: 'sheets.googleapis.com',
          path: `/v4/spreadsheets/${spreadsheetId}/values/${encodeURIComponent(
            sheetName,
          )}!A1:Z1000`,
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

          res.on('end', async () => {
            try {
              const jsonData = JSON.parse(data);
              if (!jsonData.values || jsonData.values.length === 0) {
                return reject('No data found in the sheet.');
              }

              const headers = jsonData.values[0]; // Get headers
              const rows = jsonData.values.slice(1); // Get row data

              // Get index of 'patientid' column
              const patientIdIndex = headers.findIndex(
                (h: any) => h.toLowerCase().trim() === 'patientid',
              );
              if (patientIdIndex === -1) {
                return reject('Patient ID column not found.');
              }

              // ✅ Filter out rows where patientId is not in the ids array
              const remainingRows = rows.filter(
                (row: any) => !ids.includes(row[patientIdIndex]),
              );

              console.log('Remaining Rows:', remainingRows);

              // ✅ Update the sheet with remaining data
              const updatedRows = [headers, ...remainingRows];
              console.log('Updated Rows:', updatedRows);
              if (updatedRows.length > 1) {
                await this.updateSheetData(
                  spreadsheetId,
                  sheetName,
                  updatedRows,
                  accessToken,
                );
              } else {
                // ✅ If only headers remain, write only headers
                await this.updateSheetData(
                  spreadsheetId,
                  sheetName,
                  [headers],
                  accessToken,
                );
              }

              resolve({ message: 'Selected patients deleted successfully' });
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
