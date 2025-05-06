import { Test, TestingModule } from '@nestjs/testing';
import {
  OrderStatusCorrectionCsv,
  OrderStatusCorrectionCsvStrategy,
} from '@app/csv-example/usecases/order-status-correction-csv.usecase';
import { CsvOutputScriptExecutor } from '@app/script-executor/usecases/csv-output-script-executor.usecase';
import { HttpStatus } from '@nestjs/common';
import { OrderStatus } from '@app/csv-example/domains/order';
import { DeliveryStatus } from '@app/csv-example/domains/delivery';
import { PaymentStatus } from '@app/csv-example/domains/payment';
import { faker } from '@faker-js/faker';
import Task from '@app/script-executor/domains/task';
import * as moment from 'moment';

describe('OrderStatusCorrectionCsv', () => {
  let usecase: OrderStatusCorrectionCsv;
  let mockCsvOutputScriptExecutor: jest.Mocked<
    CsvOutputScriptExecutor<any, any>
  >;

  beforeEach(async () => {
    mockCsvOutputScriptExecutor = {
      execute: jest.fn(),
    } as any;

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        OrderStatusCorrectionCsv,
        {
          provide: CsvOutputScriptExecutor,
          useValue: mockCsvOutputScriptExecutor,
        },
      ],
    }).compile();

    usecase = module.get<OrderStatusCorrectionCsv>(OrderStatusCorrectionCsv);
  });

  it('should be defined', () => {
    expect(usecase).toBeDefined();
  });

  describe('execute', () => {
    it('should execute successfully', async () => {
      const mockTask = new Task<any, any>();
      mockTask.id = faker.database.mongodbObjectId();
      mockTask.task_group_id = faker.database.mongodbObjectId();
      mockTask.name = faker.commerce.productName();
      mockTask.is_dry_run = false;
      mockTask.items = [];
      mockTask.completed_at = moment().toDate();
      mockTask.created_at = moment().toDate();
      mockTask.updated_at = moment().toDate();

      const mockResult = {
        status_code: HttpStatus.CREATED,
        status: '',
        time_taken_in_ms: 0,
        data: [mockTask],
      };

      mockCsvOutputScriptExecutor.execute.mockResolvedValue(mockResult);

      const result = await usecase.execute('test-request-id', {
        is_dry_run: false,
      });

      expect(result.status_code).toBe(HttpStatus.CREATED);
      expect(result.status).toBe('Order status data corrected successfully');
      expect(result.data).toBe(mockResult.data);
    });

    it('should handle errors', async () => {
      const error = new Error('Test error');
      mockCsvOutputScriptExecutor.execute.mockRejectedValue(error);

      const result = await usecase.execute('test-request-id', {
        is_dry_run: false,
      });

      expect(result.status_code).toBe(HttpStatus.INTERNAL_SERVER_ERROR);
      expect(result.status).toBe('Test error');
      expect(result.data).toBeNull();
    });
  });

  describe('getInputs', () => {
    it('should return array of inputs with correct structure', () => {
      const inputs = usecase.getInputs();

      expect(inputs).toHaveLength(1000);
      inputs.forEach((input) => {
        expect(input.order).toBeDefined();
        expect(input.delivery).toBeDefined();
        expect(input.payment).toBeDefined();
        expect(input.order.order_id).toBe(input.delivery.order_id);
        expect(input.order.order_id).toBe(input.payment.order_id);
      });
    });
  });
});

describe('OrderStatusCorrectionCsvStrategy', () => {
  let strategy: OrderStatusCorrectionCsvStrategy;

  beforeEach(() => {
    strategy = new OrderStatusCorrectionCsvStrategy();
  });

  describe('transform', () => {
    it('should transform paid payment to paid order status', async () => {
      const orderId = 'test-order-id';
      const input = {
        order: { order_id: orderId, order_status: OrderStatus.PENDING },
        payment: {
          order_id: orderId,
          payment_id: faker.database.mongodbObjectId(),
          payment_status: PaymentStatus.PAID,
        },
      };

      const result = await strategy.transform(input);

      expect(result.new_order_status).toBe(OrderStatus.PAID);
    });

    it('should transform delivered delivery to delivered order status', async () => {
      const orderId = 'test-order-id';
      const input = {
        order: { order_id: orderId, order_status: OrderStatus.PENDING },
        delivery: {
          order_id: orderId,
          delivery_id: faker.database.mongodbObjectId(),
          delivery_status: DeliveryStatus.DELIVERED,
        },
      };

      const result = await strategy.transform(input);

      expect(result.new_order_status).toBe(OrderStatus.DELIVERED);
    });
  });

  describe('validate', () => {
    it('should fail validation when order id is empty', async () => {
      const transform = {
        order_id: null,
        current_order_status: OrderStatus.PENDING,
        current_delivery_status: DeliveryStatus.PENDING,
        current_payment_status: PaymentStatus.PENDING,
      };

      const result = await strategy.validate(transform);

      expect(result.has_pass_validation).toBe(false);
      expect(result.validation_remark).toBe('Order id is empty');
    });

    it('should fail validation when new status is same as current', async () => {
      const transform = {
        order_id: 'test-id',
        current_order_status: OrderStatus.PAID,
        new_order_status: OrderStatus.PAID,
        current_delivery_status: DeliveryStatus.PENDING,
        current_payment_status: PaymentStatus.PENDING,
      };

      const result = await strategy.validate(transform);

      expect(result.has_pass_validation).toBe(false);
      expect(result.validation_remark).toBe(
        'New order status & existing order status is same',
      );
    });
  });

  describe('verify', () => {
    it('should verify successfully when validation passed and status updated', async () => {
      const transform = {
        current_order_status: OrderStatus.PENDING,
        current_delivery_status: DeliveryStatus.PENDING,
        current_payment_status: PaymentStatus.PENDING,
        has_pass_validation: true,
        is_order_status_updated: true,
      };

      const result = await strategy.verify(transform);

      expect(result).toBe(true);
    });

    it('should verify successfully when validation failed and status not updated', async () => {
      const transform = {
        current_order_status: OrderStatus.PENDING,
        current_delivery_status: DeliveryStatus.PENDING,
        current_payment_status: PaymentStatus.PENDING,

        has_pass_validation: false,
        is_order_status_updated: false,
      };

      const result = await strategy.verify(transform);

      expect(result).toBe(true);
    });
  });
});
