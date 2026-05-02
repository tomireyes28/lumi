import { Controller, Get, Post, Body, Patch, Param, Delete, UseGuards, Req } from '@nestjs/common';
import { CategoriesService } from './categories.service';
import { CreateCategoryDto } from './dto/create-category.dto';
import { UpdateCategoryDto } from './dto/update-category.dto';
import { AuthGuard } from '@nestjs/passport';
import type { RequestWithUser } from '../auth/interfaces/auth.interfaces'; 

@UseGuards(AuthGuard('jwt')) 
@Controller('categories')
export class CategoriesController {
  constructor(private readonly categoriesService: CategoriesService) {}

  @Post()
  create(@Body() createCategoryDto: CreateCategoryDto, @Req() req: RequestWithUser) {
    return this.categoriesService.create(createCategoryDto, req.user.userId);
  }

  @Get()
  findAll(@Req() req: RequestWithUser) {
    return this.categoriesService.findAllByUser(req.user.userId);
  }

  @Patch(':id')
  update(
    @Param('id') id: string, 
    @Body() updateCategoryDto: UpdateCategoryDto, 
    @Req() req: RequestWithUser
  ) {
    return this.categoriesService.update(id, updateCategoryDto, req.user.userId);
  }

  @Delete(':id')
  remove(@Param('id') id: string, @Req() req: RequestWithUser) {
    return this.categoriesService.remove(id, req.user.userId);
  }
}