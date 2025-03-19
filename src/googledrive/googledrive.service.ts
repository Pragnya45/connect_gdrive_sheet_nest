import { Injectable } from '@nestjs/common';
import * as https from 'https';
import * as dotenv from 'dotenv';
import { BadRequestException, NotFoundException } from '@nestjs/common';

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
            const sheetNames: string[] = jsonData?.sheets?.map(
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
    page?: number,
    limit?: number,
    name?: string,
  ) {
    console.log('Spreadsheet ID:', spreadsheetId);
    return new Promise(async (resolve, reject) => {
      try {
        console.log(accessToken);
        const sheetNames = await this.getSheetNames(spreadsheetId, accessToken);

        if (!sheetNames?.length) {
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
              if (!page || !limit) {
                console.log('✅ Returning Non-Paginated Results');
                return resolve({
                  results: [headers, ...filteredRows],
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
  async getPatientById(
    spreadsheetId: string,
    patientId: string,
    accessToken: string,
  ) {
    const data: any = await this.fetchSpreadsheetData(
      spreadsheetId,
      accessToken,
    );
    console.log(data);
    // Find the header and patient rows
    const headers = data?.results[0];
    const rows = data?.results?.slice(1);

    const patientIndex = headers.findIndex(
      (header: any) => header.toLowerCase() === 'patientid',
    );

    if (patientIndex === -1) {
      throw new Error('Patient ID column not found.');
    }

    const patientRow = rows.find((row: any) => row[patientIndex] === patientId);

    if (!patientRow) {
      throw new Error('Patient not found.');
    }

    // Map the row data to a JSON object using headers
    const patientData = {};
    headers.forEach((header: any, index: number) => {
      patientData[header] = patientRow[index] || '';
    });

    return patientData;
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
    rowIndex?: number,
  ) {
    return new Promise((resolve, reject) => {
      const options = {
        hostname: 'sheets.googleapis.com',
        path: `/v4/spreadsheets/${spreadsheetId}/values/${encodeURIComponent(
          sheetName,
        )}!A1${rowIndex ? rowIndex : ''}:Z${rowIndex ? rowIndex : 1000}?valueInputOption=RAW`,
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
  // google-drive.service.ts
  async updatePatientById(
    patientId: string,
    spreadsheetId: string,
    accessToken: string,
    patientData: any,
  ) {
    return new Promise(async (resolve, reject) => {
      try {
        const sheetNames = await this.getSheetNames(spreadsheetId, accessToken);

        let sheetName = sheetNames.find((name) =>
          name.toLowerCase().includes('patient'),
        );
        if (!sheetName) {
          throw new NotFoundException('Patient sheet not found.');
        }

        // Fetch all rows from the sheet
        const sheetData: any = await this.fetchSpreadsheetData(
          spreadsheetId,
          accessToken,
        );
        if (!sheetData?.results || sheetData?.results?.length === 0) {
          throw new NotFoundException('No data found in the sheet.');
        }

        // ✅ Extract headers and rows
        const headers = sheetData.results[0];
        const rows = sheetData.results.slice(1);

        // 🔎 Find the index of the "Patient ID" column
        const patientIndex = headers.findIndex(
          (h: string) => h.toLowerCase() === 'patientid',
        );
        if (patientIndex === -1) {
          throw new NotFoundException('Patient ID column not found.');
        }

        // 🔎 Find the row where patientId matches
        const rowIndex = rows.findIndex(
          (row: any) => row[patientIndex] === patientId,
        );
        if (rowIndex === -1) {
          throw new NotFoundException('Patient not found.');
        }

        const updatedRow = headers.map(
          (headerName: string, colIndex: number) => {
            // Use the field from patientData if available, otherwise keep the old value
            return patientData[headerName] !== undefined
              ? patientData[headerName]
              : rows[rowIndex][colIndex];
          },
        );

        // ✅ Update the row in Google Sheets
        await this.updateSheetData(
          spreadsheetId,
          sheetName,
          [updatedRow],
          accessToken,
          rowIndex + 2, // Corrected row number (rowIndex + 2 to account for header row)
        );
        resolve({ message: 'Patient updated successfully.' });
      } catch (error) {
        console.error('Error updating patient:', error);
        reject(error);
      }
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
                  undefined,
                );
              } else {
                // ✅ If only headers remain, write only headers
                await this.updateSheetData(
                  spreadsheetId,
                  sheetName,
                  [headers],
                  accessToken,
                  undefined,
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
