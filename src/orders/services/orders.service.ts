import {
  Injectable,
  InternalServerErrorException,
  ConflictException,
} from '@nestjs/common';
import { InjectQueue } from '@nestjs/bull';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Queue } from 'bull';
import { CreateOrderDto } from '../dto/create-order.dto';
import { OrderStatus } from '../enums/order-status.enum';
import { Order } from '../entities/order.entity';
import { v4 as uuidv4 } from 'uuid';

@Injectable()
export class OrdersService {
  constructor(
    @InjectRepository(Order)
    private ordersRepository: Repository<Order>,
    @InjectQueue('order-processing')
    private readonly orderQueue: Queue,
  ) {}

  async receiveOrder(createOrderDto: CreateOrderDto): Promise<Order> {
    const { idempotency_key, customer, items } = createOrderDto;

    const existingOrder = await this.ordersRepository.findOne({
      where: { idempotency_key },
    });
    if (existingOrder) {
      throw new ConflictException(
        'Pedido com esta chave de idempotência já existe.',
      );
    }

    let newOrder = this.ordersRepository.create({
      external_id: uuidv4(),
      idempotency_key: uuidv4(),
      customers: { ...customer },
      items: [...items],
      status: OrderStatus.RECEIVED,
    });

    try {
      newOrder = await this.ordersRepository.save(newOrder);

      await this.orderQueue.add('process-order', {
        orderId: newOrder.id,
        externalId: newOrder.external_id,
      });

      newOrder.status = OrderStatus.QUEUED;
      await this.ordersRepository.save(newOrder);

      return {
        ...newOrder,
        customers: createOrderDto.customer,
        items: createOrderDto.items,
      };
    } catch (error) {
      console.error('Falha ao persistir ou enfileirar pedido:', error);
      throw new InternalServerErrorException(
        'Falha de infraestrutura ao processar o pedido.',
      );
    }
  }
}
