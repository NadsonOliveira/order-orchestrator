import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { OrderStatus } from '../enums/order-status.enum';

@Entity('orders')
export class Order {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ unique: true })
  idempotency_key: string;

  @Column()
  external_id: string;

  @Column({
    type: 'enum',
    enum: OrderStatus,
    default: OrderStatus.RECEIVED,
  })
  status: OrderStatus;

  @CreateDateColumn({ type: 'timestamp' })
  created_at: Date;

  @Column({ type: 'jsonb' })
  customers: any;

  @Column({ type: 'jsonb' })
  items: any;
}
