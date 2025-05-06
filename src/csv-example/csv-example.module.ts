import { Module } from '@nestjs/common';
import OrderStatusCorrectionCsvCommand from './adapters/order-status-correction-csv.command';
import { ScriptExecutorModule } from '@app/script-executor/script-executor.module';
import { OrderStatusCorrectionCsv } from './usecases/order-status-correction-csv.usecase';

@Module({
  imports: [ScriptExecutorModule],
  providers: [OrderStatusCorrectionCsvCommand, OrderStatusCorrectionCsv],
})
export class CsvExampleModule {}
