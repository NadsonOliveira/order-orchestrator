import { ApiProperty } from '@nestjs/swagger';
import {
  IsNotEmpty,
  IsString,
  IsNumber,
  IsPositive,
  IsInt,
} from 'class-validator';

export class ItemDto {
  @ApiProperty({
    description: 'Unique identifier for the item (SKU)',
    example: 'PROD_XYZ123',
  })
  @IsString()
  @IsNotEmpty()
  sku: string;

  @ApiProperty({
    description: 'Quantity of the item ordered (must be an integer)',
    example: 2,
  })
  @IsInt()
  @IsPositive()
  qty: number;

  @ApiProperty({
    description: 'Unit price of the item (must be a positive number)',
    example: 29.99,
  })
  @IsNumber({ maxDecimalPlaces: 2 }) // ✅ Adicionar restrição de casas decimais para preço
  @IsPositive()
  // ⚠️ IsNotEmpty é redundante.
  unit_price: number;
}
