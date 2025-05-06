import { Module } from '@nestjs/common';
import OrderStatusCorrectionCommand from './adapters/order-status-correction.command';
import { ScriptExecutorModule } from '@app/script-executor/script-executor.module';
import { OrderStatusCorrection } from './usecases/order-status-correction.usecase';

@Module({
  imports: [ScriptExecutorModule],
  providers: [OrderStatusCorrectionCommand, OrderStatusCorrection],
})
export class ConsoleExampleModule {}
