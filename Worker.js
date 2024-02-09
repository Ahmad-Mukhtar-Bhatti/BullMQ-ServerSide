const { Worker } = require("bullmq");
const Redis = require("ioredis");
const logger = require("./logger");
// const { createClient } = require('redis');

logger.info("Staring Consumer");

logger.info("Creating Redis Instance");
const publisher = Redis.createClient();

// const redisWorker = createClient({
//     password: 'mj1Huv8rgFUsYOhmk3naB2WqVpiDjD54',
//     socket: {
//         host: 'redis-11355.c323.us-east-1-2.ec2.cloud.redislabs.com',
//         port: 11355
//     }
// });
// Create a Redis client
const redisWorker = new Redis({
  host: "127.0.0.1",
  port: 6379,
  maxRetriesPerRequest: null,
});

const worker = new Worker(
  "myQueue",
  (job) => {
    return new Promise((resolve, reject) => {
      setTimeout(() => {
        try {
          logger.info("Processing Job!!!");
          logger.info("Job Details:", job.id, job.name, job.data.someKey);
          // job.updateProgress(100);
          // resolve("Job completed!");

          const shouldResolve = Math.random() < 1.1;

          if (shouldResolve) {
            // Resolve the promise
            resolve("Job completed!");
          } else {
            // Reject the promise
            throw new Error("Job failed!");
          }
        } catch (error) {
          // job.updateProgress(0);
          logger.error("Error in processing function:", error);
          reject(error);
        }
      }, 7000);
    });
  },
  { connection: redisWorker }
);

worker.on("completed", async (job) => {
  logger.info(`Job completed with result: ${job.id}`);
  // job.updateProgress(100);
  publisher.publish("jobCompleted", JSON.stringify({ jobStr: job }));
});

worker.on("failed", (job, err) => {
  //job.updateProgress(0);
  logger.info(`Job ${job.id} failed: ${err.message}`);
  publisher.publish("jobFailed", JSON.stringify({ jobStr: job }));
});

redisWorker.on("connect", () => {
  logger.info("redisWorker connected");
});
redisWorker.on("error", (err) => {
  logger.error("Error connecting to Redis:", err);
});
