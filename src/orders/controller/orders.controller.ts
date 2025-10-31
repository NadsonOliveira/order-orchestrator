import {
  Controller,
  Post,
  Body,
  UsePipes,
  ValidationPipe,
  Get,
  Param,
  Query,
} from '@nestjs/common';
import { CreateOrderDto } from '../dto/create-order.dto';
import { OrdersService } from '../services/ordersCreate.service';
import {
  ApiBadRequestResponse,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { Order } from '../entities/order.entity';
import { OrderFilterDto } from '../dto/order-filter.dto';
import { Queue } from 'bull';
import { InjectQueue } from '@nestjs/bull';

@Controller('orders')
@ApiTags('Orders')
export class OrdersController {
  constructor(
    private readonly ordersService: OrdersService,
    @InjectQueue('order-processing')
    private readonly orderQueue: Queue,
  ) {}

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
    const newOrder = await this.ordersService.create(createOrderDto);

    return newOrder;
  }

  @Get()
  @ApiOperation({
    summary: 'Lista todos os pedidos com filtro opcional por status.',
  })
  @ApiResponse({ status: 200, description: 'Lista de pedidos.', type: [Order] })
  async listOrders(
    @Query(new ValidationPipe({ transform: true, whitelist: true }))
    filterDto: OrderFilterDto,
  ): Promise<Order[]> {
    return this.ordersService.findAll(filterDto);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Encontrar Orders por id' })
  @ApiBadRequestResponse({
    description: 'Id de Order não encontrada',
  })
  @ApiResponse({ status: 200, description: 'Order do id encotrado.' })
  async findById(@Param('id') id: number): Promise<Order> {
    return this.ordersService.findById(id);
  }
}
