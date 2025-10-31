import {
  IsNotEmpty,
  IsString,
  ValidateNested,
  IsArray,
  ArrayMinSize,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ItemDto } from './item.dto';
import { CustomerDto } from './customers.dto';
import { ApiProperty } from '@nestjs/swagger';

export class CreateOrderDto {
  @ApiProperty({
    description: 'Unique identifier for the order',
    example: 'order_12345',
  })
  @IsString()
  @IsNotEmpty()
  order_id: string;

  @ApiProperty({
    description: 'Customer information',
    example: {
      customer_id: 'cust_67890',
      name: 'John Doe',
      email: 'teste@gmail.com',
    },
  })
  @ValidateNested()
  @Type(() => CustomerDto)
  customer: CustomerDto[];

  @ApiProperty({
    description: 'List of items in the order',
    example: [
      {
        item_id: 'item_1',
        sku: 'Product 1',
        qty: 2,
        unit_price: 29.99,
      },
    ],
  })
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => ItemDto)
  items: ItemDto[];

  @ApiProperty({
    description: 'Total amount for the order',
    example: 59.98,
  })
  @IsString()
  @IsNotEmpty()
  currency: string;

  @ApiProperty({
    description: 'Idempotency key for the order',
    example: 'unique_key_12345',
  })
  @IsString()
  @IsNotEmpty()
  idempotency_key: string;
}
