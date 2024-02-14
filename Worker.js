const { Worker } = require("bullmq");
const Redis = require("ioredis");
const logger = require("./logger");
const config = require("config");

process.on("uncaughtException", (err) => {
  logger.error("Uncaught Exception:", err);
  process.exit(1);
});

process.on("unhandledRejection", (reason, promise) => {
  console.error("Unhandled Rejection at:", promise, "reason:", reason);
});

logger.info("Staring Consumer");

logger.info("Creating Redis Instance");
const publisher = Redis.createClient();

const redisWorker = new Redis(config.get("redis"));

const worker = new Worker(
  config.get("queue"),
  (job) => {
    return new Promise((resolve, reject) => {
      // We won't require the setTimeout function in the final implementation. This is just
      setTimeout(async () => {
        try {
          logger.info("Processing Job!!!");
          logger.info(
            `Job Details: ${job.id}, ${job.name}, ${job.data.someKey},${job.opts.totalData}`
          );

          const shouldResolve = Math.random() < 1.1;

          if (shouldResolve) {
            // Perform job processing here

            // The following are the number of steps a single job has to be divided in
            const totalSteps = 10; // This number will be defined by the user

            for (let step = 1; step <= totalSteps; step++) {
              // Perform processing for each step...

              // The following is just a mock implementation
              await new Promise((resolve) =>
                setTimeout(resolve, Math.random() * 1000)
              );
              // await new Promise((resolve) => setTimeout(resolve, 300));

              const completedDataSize = 1 / totalSteps;

              job.updateProgress(completedDataSize);
            }
            // Resolve the promise
            resolve("Job completed!");
          } else {
            // Reject the promise
            throw new Error("Job failed!");
          }
        } catch (error) {
          logger.error("Error in processing function:", error);
          reject(error);
        }
      }, 8000);
    });
  },
  { connection: redisWorker, concurrency: config.concurrency }
);

worker.on("progress", (job, progress) => {
  logger.info(`Job ${job.id} is ${progress}% complete `);
  publisher.publish(
    config.channels[1],
    JSON.stringify({ jobStr: job, progress: progress })
  );
});

worker.on("completed", async (job) => {
  logger.info(`Job completed with result: ${job.id}`);
  publisher.publish(config.channels[2], JSON.stringify({ jobStr: job }));
});

worker.on("failed", async (job, err) => {
  logger.info(`Job ${job.id} failed: ${err.message}`);
  publisher.publish(config.channels[0], JSON.stringify({ jobStr: job }));
});

redisWorker.on("connect", () => {
  logger.info("redisWorker connected");
});
redisWorker.on("error", (err) => {
  logger.error("Error connecting to Redis:", err);
});
