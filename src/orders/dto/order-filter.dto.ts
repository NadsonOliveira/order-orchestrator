import { IsEnum, IsOptional } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { OrderStatus } from '../enums/order-status.enum';

export class OrderFilterDto {
  @ApiPropertyOptional({
    description: 'Filtra pedidos por status.',
    enum: OrderStatus,
    example: OrderStatus.RECEIVED,
  })
  @IsOptional()
  @IsEnum(OrderStatus, {
    message:
      'Status deve ser um valor válido: RECEIVED, QUEUED, PROCESSING, FAILED, COMPLETED.',
  })
  status?: OrderStatus;
}
