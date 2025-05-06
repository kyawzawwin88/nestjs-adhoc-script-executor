import { Test, TestingModule } from '@nestjs/testing';
import {
  OrderStatusCorrection,
  OrderStatusCorrectionParams,
  OrderStatusCorrectionStrategy,
} from '@app/console-example/usecases/order-status-correction.usecase';
import { ConsoleOutputScriptExecutor } from '@app/script-executor/usecases/console-output-script-executor.usecase';
import { HttpStatus } from '@nestjs/common';
import Task from '@app/script-executor/domains/task';
import { faker } from '@faker-js/faker';
import * as moment from 'moment';
import { OrderStatus } from '@app/console-example/domains/order';
import { PaymentStatus } from '@app/console-example/domains/payment';
import { DeliveryStatus } from '@app/console-example/domains/delivery';

describe('OrderStatusCorrection', () => {
  let usecase: OrderStatusCorrection;
  let mockConsoleOutputScriptExecutor: jest.Mocked<
    ConsoleOutputScriptExecutor<any, any>
  >;

  beforeEach(async () => {
    mockConsoleOutputScriptExecutor = {
      execute: jest.fn(),
    } as any;

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        OrderStatusCorrection,
        {
          provide: ConsoleOutputScriptExecutor,
          useValue: mockConsoleOutputScriptExecutor,
        },
      ],
    }).compile();

    usecase = module.get<OrderStatusCorrection>(OrderStatusCorrection);
  });

  describe('execute', () => {
    it('should execute successfully with dry run false', async () => {
      const requestId = 'test-request-id';
      const params: OrderStatusCorrectionParams = { is_dry_run: false };
      const mockTask = new Task<any, any>();
      mockTask.id = faker.database.mongodbObjectId();
      mockTask.task_group_id = faker.database.mongodbObjectId();
      mockTask.name = faker.commerce.productName();
      mockTask.is_dry_run = false;
      mockTask.items = [];
      mockTask.completed_at = moment().toDate();
      mockTask.created_at = moment().toDate();
      mockTask.updated_at = moment().toDate();

      const mockTasks = [mockTask];

      mockConsoleOutputScriptExecutor.execute.mockResolvedValue({
        status_code: HttpStatus.CREATED,
        status: 'Order status data corrected successfully',
        time_taken_in_ms: 0,
        data: mockTasks,
      });

      const result = await usecase.execute(requestId, params);

      expect(result).toEqual({
        status_code: HttpStatus.CREATED,
        status: 'Order status data corrected successfully',
        time_taken_in_ms: expect.any(Number),
        data: mockTasks,
      });

      expect(mockConsoleOutputScriptExecutor.execute).toHaveBeenCalledWith(
        requestId,
        expect.objectContaining({
          name: OrderStatusCorrection.name,
          is_dry_run: false,
          inputs: expect.any(Array),
        }),
      );
    });

    it('should execute successfully with dry run true', async () => {
      const requestId = 'test-request-id';
      const params: OrderStatusCorrectionParams = { is_dry_run: true };
      const mockTask = new Task<any, any>();
      mockTask.id = faker.database.mongodbObjectId();
      mockTask.task_group_id = faker.database.mongodbObjectId();
      mockTask.name = faker.commerce.productName();
      mockTask.is_dry_run = true;
      mockTask.items = [];
      mockTask.completed_at = moment().toDate();
      mockTask.created_at = moment().toDate();
      mockTask.updated_at = moment().toDate();

      const mockTasks = [mockTask];

      mockConsoleOutputScriptExecutor.execute.mockResolvedValue({
        status_code: HttpStatus.CREATED,
        status: 'Order status data corrected successfully',
        time_taken_in_ms: 0,
        data: mockTasks,
      });

      const result = await usecase.execute(requestId, params);

      expect(result).toEqual({
        status_code: HttpStatus.CREATED,
        status: 'Order status data corrected successfully',
        time_taken_in_ms: expect.any(Number),
        data: mockTasks,
      });

      expect(mockConsoleOutputScriptExecutor.execute).toHaveBeenCalledWith(
        requestId,
        expect.objectContaining({
          name: OrderStatusCorrection.name,
          is_dry_run: true,
          inputs: expect.any(Array),
        }),
      );
    });

    it('should handle errors', async () => {
      const requestId = 'test-request-id';
      const params: OrderStatusCorrectionParams = { is_dry_run: false };
      const error = new Error('Test error');

      mockConsoleOutputScriptExecutor.execute.mockRejectedValue(error);

      const result = await usecase.execute(requestId, params);

      expect(result).toEqual({
        status_code: HttpStatus.INTERNAL_SERVER_ERROR,
        status: error.message,
        time_taken_in_ms: expect.any(Number),
        data: null,
      });
    });
  });

  describe('getInputs', () => {
    it('should return array of inputs with correct structure', () => {
      const inputs = usecase.getInputs();

      expect(inputs).toHaveLength(1000);
      inputs.forEach((input) => {
        expect(input).toHaveProperty('order');
        expect(input).toHaveProperty('delivery');
        expect(input).toHaveProperty('payment');
        expect(input.order.order_id).toBe(input.delivery.order_id);
        expect(input.order.order_id).toBe(input.payment.order_id);
      });
    });
  });
});

describe('OrderStatusCorrectionStrategy', () => {
  let strategy: OrderStatusCorrectionStrategy;

  beforeEach(() => {
    strategy = new OrderStatusCorrectionStrategy();
  });

  describe('transform', () => {
    it('should transform input with PAID payment status', async () => {
      const input = {
        order: { order_id: '123', order_status: OrderStatus.PENDING },
        payment: {
          payment_id: 'p1',
          order_id: '123',
          payment_status: PaymentStatus.PAID,
        },
        delivery: {
          delivery_id: 'd1',
          order_id: '123',
          delivery_status: DeliveryStatus.PENDING,
        },
      };

      const result = await strategy.transform(input);

      expect(result.new_order_status).toBe(OrderStatus.PAID);
      expect(result.is_order_status_updated).toBe(false);
    });

    it('should transform input with REFUNDED payment status', async () => {
      const input = {
        order: { order_id: '123', order_status: OrderStatus.PAID },
        payment: {
          payment_id: 'p1',
          order_id: '123',
          payment_status: PaymentStatus.REFUNDED,
        },
        delivery: {
          delivery_id: 'd1',
          order_id: '123',
          delivery_status: DeliveryStatus.PENDING,
        },
      };

      const result = await strategy.transform(input);

      expect(result.new_order_status).toBe(OrderStatus.CANCELLED);
      expect(result.is_order_status_updated).toBe(false);
    });

    it('should transform input with DELIVERED delivery status', async () => {
      const input = {
        order: { order_id: '123', order_status: OrderStatus.PAID },
        payment: {
          payment_id: 'p1',
          order_id: '123',
          payment_status: PaymentStatus.PENDING,
        },
        delivery: {
          delivery_id: 'd1',
          order_id: '123',
          delivery_status: DeliveryStatus.DELIVERED,
        },
      };

      const result = await strategy.transform(input);

      expect(result.new_order_status).toBe(OrderStatus.DELIVERED);
      expect(result.is_order_status_updated).toBe(false);
    });

    it('should transform input with RETURNED delivery status', async () => {
      const input = {
        order: { order_id: '123', order_status: OrderStatus.DELIVERED },
        payment: {
          payment_id: 'p1',
          order_id: '123',
          payment_status: PaymentStatus.PENDING,
        },
        delivery: {
          delivery_id: 'd1',
          order_id: '123',
          delivery_status: DeliveryStatus.RETURNED,
        },
      };

      const result = await strategy.transform(input);

      expect(result.new_order_status).toBe(OrderStatus.CANCELLED);
      expect(result.is_order_status_updated).toBe(false);
    });
  });

  describe('validate', () => {
    it('should fail validation when order_id is empty', async () => {
      const transformedData = {
        order_id: null,
        current_order_status: OrderStatus.PENDING,
        current_delivery_status: DeliveryStatus.PENDING,
        current_payment_status: PaymentStatus.PENDING,
        new_order_status: OrderStatus.PAID,
      };

      const result = await strategy.validate(transformedData);

      expect(result.has_pass_validation).toBe(false);
      expect(result.validation_remark).toBe('Order id is empty');
    });

    it('should fail validation when new_order_status is empty', async () => {
      const transformedData = {
        order_id: '123',
        current_order_status: OrderStatus.PENDING,
        current_delivery_status: DeliveryStatus.PENDING,
        current_payment_status: PaymentStatus.PENDING,
        new_order_status: null,
      };

      const result = await strategy.validate(transformedData);

      expect(result.has_pass_validation).toBe(false);
      expect(result.validation_remark).toBe('New order status is empty');
    });

    it('should fail validation when current and new status are same', async () => {
      const transformedData = {
        order_id: '123',
        current_order_status: OrderStatus.PAID,
        current_delivery_status: DeliveryStatus.PENDING,
        current_payment_status: PaymentStatus.PENDING,
        new_order_status: OrderStatus.PAID,
      };

      const result = await strategy.validate(transformedData);

      expect(result.has_pass_validation).toBe(false);
      expect(result.validation_remark).toBe(
        'New order status & existing order status is same',
      );
    });
  });

  describe('dry_run', () => {
    it('should mark order status as updated in dry run', async () => {
      const transformedData = {
        order_id: '123',
        current_order_status: OrderStatus.PENDING,
        current_delivery_status: DeliveryStatus.PENDING,
        current_payment_status: PaymentStatus.PENDING,
        new_order_status: OrderStatus.PAID,
        is_order_status_updated: false,
      };

      const result = await strategy.dry_run(transformedData);

      expect(result.is_order_status_updated).toBe(true);
    });
  });

  describe('verify', () => {
    it('should verify successfully when validation passed and status updated', async () => {
      const transformedData = {
        current_order_status: OrderStatus.PENDING,
        current_delivery_status: DeliveryStatus.PENDING,
        current_payment_status: PaymentStatus.PENDING,
        has_pass_validation: true,
        is_order_status_updated: true,
      };

      const result = await strategy.verify(transformedData);

      expect(result).toBe(true);
    });

    it('should verify successfully when validation failed and status not updated', async () => {
      const transformedData = {
        current_order_status: OrderStatus.PENDING,
        current_delivery_status: DeliveryStatus.PENDING,
        current_payment_status: PaymentStatus.PENDING,
        has_pass_validation: false,
        is_order_status_updated: false,
      };

      const result = await strategy.verify(transformedData);

      expect(result).toBe(true);
    });

    it('should fail verification when validation passed but status not updated', async () => {
      const transformedData = {
        current_order_status: OrderStatus.PENDING,
        current_delivery_status: DeliveryStatus.PENDING,
        current_payment_status: PaymentStatus.PENDING,
        has_pass_validation: true,
        is_order_status_updated: false,
      };

      const result = await strategy.verify(transformedData);

      expect(result).toBe(false);
    });
  });
});
