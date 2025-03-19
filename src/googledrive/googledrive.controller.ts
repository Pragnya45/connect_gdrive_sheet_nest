import {
  Controller,
  Get,
  Query,
  Headers,
  Post,
  Body,
  Delete,
  Put,
} from '@nestjs/common';
import { GoogledriveService } from './googledrive.service';

@Controller('googledrive')
export class GoogledriveController {
  constructor(private readonly googleDriveService: GoogledriveService) {}

  @Get('get-spreadsheet')
  async getSpreadsheetData(
    @Query('spreadsheetId') spreadsheetId: string,
    @Headers('Authorization') accessToken: string,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
    @Query('name') name?: string,
  ) {
    return this.googleDriveService.fetchSpreadsheetData(
      spreadsheetId,
      accessToken,
      page,
      limit,
      name,
    );
  }
  @Get('get-patient')
  async getPatientById(
    @Query('spreadsheetId') spreadsheetId: string,
    @Query('patientId') patientId: string,
    @Headers('Authorization') accessToken: string,
  ) {
    if (!spreadsheetId || !patientId) {
      throw new Error('Spreadsheet ID and Patient ID are required.');
    }

    return await this.googleDriveService.getPatientById(
      spreadsheetId, // ✅ Corrected parameter order
      patientId,
      accessToken,
    );
  }

  @Post('add-patient')
  async addPatientData(
    @Query('spreadsheetId') spreadsheetId: string,
    @Headers('Authorization') accessToken: string,
    @Body() patientData: any,
  ) {
    return await this.googleDriveService.addPatientsData(
      spreadsheetId,
      accessToken,
      patientData,
    );
  }
  // google-drive.controller.ts
  @Put('edit-patient')
  async updatePatient(
    @Query('spreadsheetId') spreadsheetId: string,
    @Headers('Authorization') accessToken: string,
    @Query('patientId') patientId: string,
    @Body() patientData: any,
  ) {
    if (!spreadsheetId || !patientId) {
      throw new Error('Spreadsheet ID and Patient ID are required.');
    }

    return await this.googleDriveService.updatePatientById(
      patientId,
      spreadsheetId,
      accessToken,
      patientData,
    );
  }

  @Delete('delete-patient')
  async deletePatientData(
    @Query('spreadsheetId') spreadsheetId: string,
    @Headers('Authorization') accessToken: string,
    @Body('ids') ids: string[], // Array of patient IDs
  ) {
    return this.googleDriveService.deletePatientData(
      spreadsheetId,
      accessToken,
      ids,
    );
  }
}
