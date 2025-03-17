import {
  Controller,
  Get,
  Param,
  Post,
  Body,
  Put,
  Delete,
  Query,
} from '@nestjs/common';

@Controller('patients')
export class PatientsController {
  /*
   GET /patients (search functionality)
   GET /patients/:id
   POST /patients
   PUT /patients/:id
   DELETE /patients/:id
   */
  @Get() //get patients with search functionality /patients?name=value
  findAll(@Query('name') name?: 'patients' | 'doctor') {
    return [];
  }
  @Get(':id') // get patients by id
  findOne(@Param('id') id: string) {
    return { id };
  }

  @Post()
  create(@Body() patient: {}) {
    return patient;
  }
  @Put(':id')
  update(@Param('id') id: string, @Body() patientUpdate: {}) {
    return { id, ...patientUpdate };
  }
  @Delete(':id')
  delete(@Param('id') id: string) {
    return { id };
  }
}
