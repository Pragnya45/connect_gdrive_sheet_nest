import {
  Controller,
  Get,
  Query,
  Headers,
  Post,
  Body,
  Delete,
} from '@nestjs/common';
import { GoogledriveService } from './googledrive.service';
@Controller('googledrive')
export class GoogledriveController {
  constructor(private readonly googleDriveService: GoogledriveService) {}

  @Get('get-spreadsheet')
  async getSpreadsheetData(
    @Query('spreadsheetId') spreadsheetId: string,
    @Headers('Authorization') accessToken: string,
    @Query('page') page: number = 1,
    @Query('limit') limit: number = 10,
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
