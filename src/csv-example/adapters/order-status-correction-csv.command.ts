import { Command, CommandRunner, Option } from 'nest-commander';
import { Logger } from '@nestjs/common';
import {
  OrderStatusCorrectionCsv,
  OrderStatusCorrectionCsvParams,
} from '../usecases/order-status-correction-csv.usecase';
import { v4 as uuidv4 } from 'uuid';

interface CommandOptions {
  is_dry_run: boolean;
}

@Command({
  name: 'order-status-correction-csv',
  description:
    'Command to correct order status data based on delivery and payment statu and csv as output',
})
export default class OrderStatusCorrectionCsvCommand extends CommandRunner {
  private readonly logger = new Logger(OrderStatusCorrectionCsvCommand.name);

  constructor(
    private readonly orderStatusCorrection: OrderStatusCorrectionCsv,
  ) {
    super();
  }

  async run(params: string[], options: CommandOptions): Promise<void> {
    this.logger.log(
      `OrderStatusCorrectionCsvCommand has started with params ${JSON.stringify(params)} and options ${JSON.stringify(options)}`,
    );

    const request_id = uuidv4();
    const orderStatusCorrectionCsvParams: OrderStatusCorrectionCsvParams = {
      is_dry_run: options.is_dry_run == true,
    };

    await this.orderStatusCorrection.execute(
      request_id,
      orderStatusCorrectionCsvParams,
    );
    this.logger.log(`OrderStatusCorrectionCsvCommand completed`);
  }

  @Option({
    flags: '-dr, --dryrun [true/false]',
    description: 'whether dry run or actual run',
  })
  getIsDryRun(val?: string): boolean {
    return val === 'true';
  }
}
