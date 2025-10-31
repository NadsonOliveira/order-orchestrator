import {
  Controller,
  Post,
  Body,
  UsePipes,
  ValidationPipe,
} from '@nestjs/common';
import { CreateOrderDto } from './dto/create-order.dto';
import { OrdersService } from './services/orders.service';
import {
  ApiBadRequestResponse,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { Order } from './entities/order.entity';

@Controller('orders')
@ApiTags('Orders')
export class OrdersController {
  constructor(private readonly ordersService: OrdersService) {}

  @Post()
  @UsePipes(new ValidationPipe({ whitelist: true }))
  @ApiOperation({ summary: 'Processa um novo pedido e o enfileira.' })
  @ApiResponse({
    status: 201,
    description: 'Pedido criado e enfileirado com sucesso.',
  })
  @ApiBadRequestResponse({
    description:
      'A chave de idempotência já foi usada, ou o formato do pedido é inválido.',
  })
  async handleOrderCreation(
    @Body() createOrderDto: CreateOrderDto,
  ): Promise<Order> {
    const newOrder = await this.ordersService.receiveOrder(createOrderDto);

    return newOrder;
  }
}
