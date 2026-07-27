import { connect } from 'amqplib';

export class RabbitMqHealthClient {
  constructor(private readonly url: string) {}

  async check(): Promise<{ rabbitmq: { status: 'up' } }> {
    const connection = await connect(this.url, { timeout: 3_000 });
    try {
      return { rabbitmq: { status: 'up' } };
    } finally {
      await connection.close();
    }
  }
}
