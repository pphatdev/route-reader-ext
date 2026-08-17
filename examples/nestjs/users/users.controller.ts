import { Controller, Get, Post, Put, Delete, Patch, Param, Body } from '@nestjs/common';

@Controller('users')
export class UsersController {
  @Get()
  list() {
    return [];
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return { id };
  }

  @Post()
  create(@Body() body: unknown) {
    return body;
  }

  @Put(':id')
  replace(@Param('id') id: string, @Body() body: unknown) {
    return { id, ...(body as object) };
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() body: unknown) {
    return { id, ...(body as object) };
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return { id, deleted: true };
  }
}
