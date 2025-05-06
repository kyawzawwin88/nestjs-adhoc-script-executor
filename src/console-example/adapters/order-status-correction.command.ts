import { Command, CommandRunner, Option } from 'nest-commander';
import { Logger } from '@nestjs/common';
import {
  OrderStatusCorrection,
  OrderStatusCorrectionParams,
} from '../usecases/order-status-correction.usecase';
import { v4 as uuidv4 } from 'uuid';

interface CommandOptions {
  is_dry_run: boolean;
}

@Command({
  name: 'order-status-correction',
  description:
    'Command to correct order status data based on delivery and payment status',
})
export default class OrderStatusCorrectionCommand extends CommandRunner {
  private readonly logger = new Logger(OrderStatusCorrectionCommand.name);

  constructor(private readonly orderStatusCorrection: OrderStatusCorrection) {
    super();
  }

  async run(params: string[], options: CommandOptions): Promise<void> {
    this.logger.log(
      `OrderStatusCorrectionCommand has started with params ${JSON.stringify(params)} and options ${JSON.stringify(options)}`,
    );

    const request_id = uuidv4();
    const orderStatusCorrectionParams: OrderStatusCorrectionParams = {
      is_dry_run: options.is_dry_run == true,
    };

    await this.orderStatusCorrection.execute(
      request_id,
      orderStatusCorrectionParams,
    );
    this.logger.log(`OrderStatusCorrectionCommand completed`);
  }

  @Option({
    flags: '-dr, --dryrun [true/false]',
    description: 'whether dry run or actual run',
  })
  getIsDryRun(val?: string): boolean {
    return val === 'true';
  }
}
