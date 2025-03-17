import { Controller, Get, Query, Headers } from '@nestjs/common';
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
  ) {
    return this.googleDriveService.fetchSpreadsheetData(
      spreadsheetId,
      accessToken,
      page,
      limit,
    );
  }
}
