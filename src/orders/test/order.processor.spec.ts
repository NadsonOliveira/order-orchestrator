import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Queue } from 'bull';
import { getQueueToken } from '@nestjs/bull';
import { ConflictException } from '@nestjs/common';
import { Order } from '../entities/order.entity';
import { OrderStatus } from '../enums/order-status.enum';
import { CreateOrderDto } from '../dto/create-order.dto';
import { OrdersService } from '../services/ordersCreate.service';
import { v4 as uuidv4 } from 'uuid';

describe('OrdersService', () => {
  let service: OrdersService;
  let ordersRepository: jest.Mocked<Repository<Order>>;
  let orderQueue: jest.Mocked<Queue>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        OrdersService,
        {
          provide: getRepositoryToken(Order),
          useValue: {
            findOne: jest.fn(),
            create: jest.fn(),
            save: jest.fn(),
            createQueryBuilder: jest.fn(() => ({
              select: jest.fn().mockReturnThis(),
              where: jest.fn().mockReturnThis(),
              orderBy: jest.fn().mockReturnThis(),
              getMany: jest.fn(),
            })),
          },
        },
        {
          provide: getQueueToken('order-processing'),
          useValue: {
            add: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<OrdersService>(OrdersService);
    ordersRepository = module.get(getRepositoryToken(Order));
    orderQueue = module.get(getQueueToken('order-processing'));
  });

  afterEach(() => jest.clearAllMocks());

  it('deve criar e enfileirar um pedido com sucesso', async () => {
    const dto: CreateOrderDto = {
      order_id: 'order_123',
      idempotency_key: '19dc3ed6-ec33-44fa-b764-7932ffff91b6',
      customer: [
        {
          name: 'John Doe',
          email: 'john@example.com',
        },
      ],
      items: [
        {
          sku: 'PROD-01',
          qty: 2,
          unit_price: 29.99,
        },
      ],
      currency: 'USD',
    };

    ordersRepository.findOne.mockResolvedValue(null);
    ordersRepository.create.mockReturnValue({
      id: 1,
      ...dto,
      status: OrderStatus.RECEIVED,
    } as any);
    ordersRepository.save.mockResolvedValueOnce({
      id: 1,
      external_id: uuidv4(),
      status: OrderStatus.RECEIVED,
    } as Order);

    orderQueue.add.mockResolvedValue({} as any);

    const result = await service.create(dto);

    expect(result.status).toBe(OrderStatus.RECEIVED);
  });

  it('deve lançar ConflictException se o pedido já existir', async () => {
    const dto: CreateOrderDto = {
      order_id: 'order_001',
      customer: [
        {
          name: 'Jane Doe',
          email: 'jane@example.com',
        },
      ],
      items: [
        {
          sku: 'PROD-02',
          qty: 1,
          unit_price: 59.99,
        },
      ],
      currency: 'USD',
      idempotency_key: uuidv4(),
    };

    ordersRepository.findOne.mockResolvedValue({ id: 1 } as any);

    await expect(service.create(dto)).rejects.toThrow(ConflictException);
  });

  it('deve lançar InternalServerErrorException se ocorrer erro ao salvar', async () => {
    const dto: CreateOrderDto = {
      order_id: 'order_002',
      customer: [
        {
          name: 'Error Tester',
          email: 'err@test.com',
        },
      ],
      items: [
        {
          sku: 'PROD-03',
          qty: 3,
          unit_price: 10,
        },
      ],
      currency: 'USD',
      idempotency_key: uuidv4(),
    };

    ordersRepository.findOne.mockResolvedValue(null);
    ordersRepository.create.mockReturnValue({} as any);
    ordersRepository.save.mockRejectedValue(new Error('Falha no banco'));

    await expect(service.create(dto)).rejects.toThrow();
  });
});
