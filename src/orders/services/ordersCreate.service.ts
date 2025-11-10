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
import { OrderFilterDto } from '../dto/order-filter.dto';
import { v4 as uuidv4 } from 'uuid';

@Injectable()
export class OrdersService {
  constructor(
    @InjectRepository(Order)
    private ordersRepository: Repository<Order>,
    @InjectQueue('order-processing')
    private readonly orderQueue: Queue,
  ) {}

  async create(createOrderDto: CreateOrderDto): Promise<Order> {
    const { idempotency_key, customer, items } = createOrderDto;

    const existingOrder = await this.ordersRepository.findOne({
      where: { idempotency_key },
    });
    if (existingOrder) {
      throw new ConflictException(
        'Pedido com esta chave de idempotência já existe.',
      );
    }

    const newOrder = this.ordersRepository.create({
      external_id: uuidv4(),
      idempotency_key,
      customers: { ...customer },
      items: [...items],
      status: OrderStatus.RECEIVED,
    });

    try {
      const savedOrder = await this.ordersRepository.save(newOrder);

      this.orderQueue
        .add('process-order', {
          orderId: savedOrder.id,
          externalId: savedOrder.external_id,
        })
        .catch((err) => {
          console.error('Falha ao adicionar pedido na fila:', err);
        });

      return {
        ...savedOrder,
        customers: createOrderDto.customer,
        items: createOrderDto.items,
      };
    } catch (error) {
      console.error('Falha ao salvar pedido:', error);
      throw new InternalServerErrorException(
        'Falha de infraestrutura ao processar o pedido.',
      );
    }
  }

  async findAll(filterDto: OrderFilterDto): Promise<Order[]> {
    const { status } = filterDto;
    const query = this.ordersRepository.createQueryBuilder('o');
    query.select([
      'o.id',
      'o.idempotency_key',
      'o.external_id',
      'o.status',
      'o.created_at',
      'o.customers',
      'o.items',
    ]);

    if (status) {
      query.where('o.status = :status', { status });
    }
    query.orderBy('o.created_at', 'DESC');

    return query.getMany();
  }

  async findMetricas(): Promise<{ status: string; total: number }[]> {
    const query = this.ordersRepository
      .createQueryBuilder('o')
      .select('o.status', 'status')
      .addSelect('COUNT(*)', 'total')
      .groupBy('o.status')
      .orderBy('o.status', 'ASC');

    return query.getRawMany();
  }

  async findById(id: number): Promise<Order> {
    const orders = await this.ordersRepository.findOne({ where: { id } });
    if (!orders) {
      throw new Error(`Order com id ${id} não encontrada`);
    }
    return orders;
  }
}
