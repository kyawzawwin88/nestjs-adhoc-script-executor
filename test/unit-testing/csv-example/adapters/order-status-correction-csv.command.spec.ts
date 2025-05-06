import { Test, TestingModule } from '@nestjs/testing';
import OrderStatusCorrectionCsvCommand from '@app/csv-example/adapters/order-status-correction-csv.command';
import { OrderStatusCorrectionCsv } from '@app/csv-example/usecases/order-status-correction-csv.usecase';
import { Logger } from '@nestjs/common';

describe('OrderStatusCorrectionCsvCommand', () => {
  let command: OrderStatusCorrectionCsvCommand;
  let mockOrderStatusCorrectionCsv: jest.Mocked<OrderStatusCorrectionCsv>;

  beforeEach(async () => {
    mockOrderStatusCorrectionCsv = {
      execute: jest.fn(),
    } as any;

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        OrderStatusCorrectionCsvCommand,
        {
          provide: OrderStatusCorrectionCsv,
          useValue: mockOrderStatusCorrectionCsv,
        },
      ],
    }).compile();

    command = module.get<OrderStatusCorrectionCsvCommand>(
      OrderStatusCorrectionCsvCommand,
    );
  });

  it('should be defined', () => {
    expect(command).toBeDefined();
  });

  describe('run', () => {
    it('should execute order status correction with dry run false', async () => {
      const logSpy = jest.spyOn(Logger.prototype, 'log');

      await command.run([], { is_dry_run: false });

      expect(mockOrderStatusCorrectionCsv.execute).toHaveBeenCalledWith(
        expect.any(String),
        { is_dry_run: false },
      );
      expect(logSpy).toHaveBeenCalledTimes(2);
    });

    it('should execute order status correction with dry run true', async () => {
      const logSpy = jest.spyOn(Logger.prototype, 'log');

      await command.run([], { is_dry_run: true });

      expect(mockOrderStatusCorrectionCsv.execute).toHaveBeenCalledWith(
        expect.any(String),
        { is_dry_run: true },
      );
      expect(logSpy).toHaveBeenCalledTimes(5);
    });
  });

  describe('getIsDryRun', () => {
    it('should return true when input is "true"', () => {
      expect(command.getIsDryRun('true')).toBe(true);
    });

    it('should return false when input is not "true"', () => {
      expect(command.getIsDryRun('false')).toBe(false);
      expect(command.getIsDryRun()).toBe(false);
      expect(command.getIsDryRun('anything')).toBe(false);
    });
  });
});
