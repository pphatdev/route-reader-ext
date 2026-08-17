import { Controller, Get, Post, Delete, Param, Body } from '@nestjs/common';

@Controller({ path: 'posts' })
export class PostsController {
  @Get()
  list() {
    return [];
  }

  @Get(':slug')
  findBySlug(@Param('slug') slug: string) {
    return { slug };
  }

  @Get(':slug/comments')
  comments(@Param('slug') slug: string) {
    return { slug, comments: [] };
  }

  @Post()
  create(@Body() body: unknown) {
    return body;
  }

  @Post(':slug/comments')
  addComment(@Param('slug') slug: string, @Body() body: unknown) {
    return { slug, comment: body };
  }

  @Delete(':slug')
  remove(@Param('slug') slug: string) {
    return { slug, deleted: true };
  }
}
