import { Processor, Process } from '@nestjs/bull';
import { Job } from 'bull';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Order } from '../entities/order.entity';
import { OrderStatus } from '../enums/order-status.enum';

@Processor('order-processing')
export class OrderProcessor {
  constructor(
    @InjectRepository(Order)
    private readonly ordersRepository: Repository<Order>,
  ) {}

  @Process('process-order')
  async handleOrder(job: Job<{ orderId: number; externalId: string }>) {
    console.log(
      `📦 [Bull] Iniciando processamento do pedido ID ${job.data.orderId}`,
    );

    const order = await this.ordersRepository.findOne({
      where: { id: job.data.orderId },
    });

    if (!order) {
      console.error(`❌ Pedido não encontrado: ${job.data.orderId}`);
      return;
    }

    try {
      order.status = OrderStatus.ENRICHING;
      await this.ordersRepository.save(order);
      console.log(`🔍 Enriquecendo dados do pedido ${order.external_id}...`);
      await this.fakeDelay();

      order.status = OrderStatus.PENDING;
      await this.ordersRepository.save(order);
      console.log(`⏳ Pedido ${order.external_id} aguardando etapa final...`);
      await this.fakeDelay();

      order.status = OrderStatus.COMPLETED;
      await this.ordersRepository.save(order);
      console.log(`✅ Pedido ${order.external_id} concluído com sucesso!`);
    } catch (error) {
      console.error(
        `🚨 Erro ao processar o pedido ${order.external_id}:`,
        error,
      );
      order.status = OrderStatus.FAILED;
      await this.ordersRepository.save(order);
    }
  }

  private async fakeDelay(ms: number = 2000) {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}
