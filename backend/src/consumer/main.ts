import { Kafka } from 'kafkajs';

const TOPIC = 'wallet.transaction.confirmed';

async function main() {
  const kafka = new Kafka({
    clientId: 'wallet-consumer',
    brokers: (process.env.KAFKA_BROKERS ?? 'localhost:9092').split(','),
    retry: { retries: 10, initialRetryTime: 3000 },
    logLevel: 1,
  });

  const admin = kafka.admin();
  await admin.connect();
  await admin.createTopics({ topics: [{ topic: TOPIC, numPartitions: 1, replicationFactor: 1 }] });
  await admin.disconnect();

  const consumer = kafka.consumer({ groupId: 'wallet-consumer' });

  await consumer.connect();
  await consumer.subscribe({ topic: TOPIC, fromBeginning: true });

  console.log(`listening for ${TOPIC}`);

  await consumer.run({
    eachMessage: async ({ message }) => {
      const event = JSON.parse(message.value?.toString() ?? '{}');

      console.log(`confirmed transaction ${event.transaction_id} for ${event.amount_nano} nanoTRX`);
    },
  });
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
