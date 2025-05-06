import { Test, TestingModule } from '@nestjs/testing';
import OrderStatusCorrectionCommand from '@app/console-example/adapters/order-status-correction.command';
import { OrderStatusCorrection } from '@app/console-example/usecases/order-status-correction.usecase';

describe('OrderStatusCorrectionCommand', () => {
  let command: OrderStatusCorrectionCommand;
  let mockOrderStatusCorrection: jest.Mocked<OrderStatusCorrection>;

  beforeEach(async () => {
    mockOrderStatusCorrection = {
      execute: jest.fn(),
    } as any;

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        OrderStatusCorrectionCommand,
        {
          provide: OrderStatusCorrection,
          useValue: mockOrderStatusCorrection,
        },
      ],
    }).compile();

    command = module.get<OrderStatusCorrectionCommand>(
      OrderStatusCorrectionCommand,
    );
  });

  describe('run', () => {
    it('should execute order status correction with dry run false', async () => {
      const params: string[] = [];
      const options = { is_dry_run: false };

      await command.run(params, options);

      expect(mockOrderStatusCorrection.execute).toHaveBeenCalledWith(
        expect.any(String),
        { is_dry_run: false },
      );
    });

    it('should execute order status correction with dry run true', async () => {
      const params: string[] = [];
      const options = { is_dry_run: true };

      await command.run(params, options);

      expect(mockOrderStatusCorrection.execute).toHaveBeenCalledWith(
        expect.any(String),
        { is_dry_run: true },
      );
    });
  });

  describe('getIsDryRun', () => {
    it('should return true when input is "true"', () => {
      expect(command.getIsDryRun('true')).toBe(true);
    });

    it('should return false when input is not "true"', () => {
      expect(command.getIsDryRun('false')).toBe(false);
      expect(command.getIsDryRun()).toBe(false);
      expect(command.getIsDryRun('something')).toBe(false);
    });
  });
});
