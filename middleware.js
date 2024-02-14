const WebSocket = require("ws");
const Redis = require("ioredis");
const logger = require("./logger");

const config = require("config");

const server = new WebSocket.Server(config.get("webSocketServer"));

const clients = new Map();

const progressMap = new Map();

process.on("uncaughtException", (err) => {
  logger.error("Uncaught Exception:", err);
  process.exit(1);
});

process.on("unhandledRejection", (reason, promise) => {
  console.error("Unhandled Rejection at:", promise, "reason:", reason);
});


const subscriber = Redis.createClient();

logger.info("Starting Producer .....");
logger.info("Creating Redis Instance");

const redisClient = new Redis(config.get("redis"));

logger.info("Application Name: " + config.get("name"));
logger.info("Creating Queue .....");

subscriber.on("message", async (channel, message) => {


  const job = JSON.parse(message).jobStr;
  let filteredKeys = [];
  let totalProg = 0;  


  logger.info(`Message Published`);
  try {
    const value = job.opts.jobId.split(config.get("delimeter"));
    const jobName = job.name.split(config.get("batchdelimeter"));

    let totalProgress = progressMap.get(jobName[0]);      // Getting total progress of each client;


    const regex = new RegExp(`^${value[0]}_\\d+$`);

    // Function to handle Jobs from redis (this will call the function above)
    const handleJobs = async (list, prog) => {
      let type =
        list === config.actions[3] || list === config.actions[2]
          ? config.range[0]
          : config.range[1];
      const type2 =
        list === config.actions[3] || list === config.actions[2]
          ? config.rem[0]
          : config.rem[1];

      await redisClient[type](
        "bull:myQueue:" + list,
        0,
        -1,
        async (err, members) => {
          if (err) {
            logger.info("Error fetching members:", err);
          } else {
            filteredKeys = members.filter((key) => regex.test(key));
          }

          if (prog === config.actions[4]) {
            const socket = clients.get(jobName[0]);
            logger.info(`socket name ${socket}`);
            logger.info(`Each job progress from worker ${JSON.parse(message).progress}`);

            let currentStep = (JSON.parse(message).progress / job.opts.totalData) * 100;
            logger.info(`Each job progress calculated ${currentStep}`);
           
            if (typeof socket === "undefined") {
              // String is either undefined, null, or NaN
              logger.error("Invalid socket");
            } else {
              
              totalProgress = progressMap.get(jobName[0]);      // Getting total progress of each client
              
              totalProgress = totalProgress + currentStep;
              totalProg = totalProgress;

              socket.send(`Following is your progress:${totalProg}`);

              progressMap.set(jobName[0], totalProgress); // Setting the total progress of each client in the map

              if (totalProg == 100) {
                progressMap.set(jobName[0], 0);
              }
              
            }
          } else if (!(list === config.actions[3] && totalProgress != 100)) {
            // The code below won't work if you have to evict from completed queue and the total progress hasn't reached 100 yet
            filteredKeys.forEach((jobId) => {
              redisClient[type2](
                "bull:myQueue:" + list,
                0,
                jobId,
                (err, removedCount) => {
                  if (err) {
                    logger.info(
                      `Error removing job ${jobId} from ${list} queue:`,
                      err
                    );
                  } else {
                    logger.info(
                      `Removed ${removedCount} job(s) with ID ${jobId} from ${list} queue.`
                    );
                  }
                }
              );
            });
          }
        }
      );
    };
    if (channel === config.channels[0]) {
      logger.info("Your job failed", jobName[0]);

      handleJobs(config.actions[0]); // Remove jobs from the active channel of the BullMQ
      handleJobs(config.actions[1]); // Remove jobs from the wait channel of the BullMQ
      handleJobs(config.actions[2]); // Remove jobs from the active channel of the BullMQ
      // handleJobs(config.actions[3], 100); // setting total Progress 100 so the jobs can be removed from the completed queue

      const socket = clients.get(jobName[0]);
      logger.debug(jobName[0]);
      if (typeof socket === "undefined") {
        logger.error("Invalid socket");
      } else {
        socket.send(config.get("jobFailedMessage"));
        
        progressMap.set(jobName[0], 0);   // Setting total progress for the client to 0
      }
    } else if (channel === config.channels[1]) {
      handleJobs(config.actions[3], config.actions[4]);
    }
  } catch (error) {
    logger.debug("Error in processing:", error);
  }
});

subscriber.subscribe(config.channels[2]);
subscriber.subscribe(config.channels[0]);
subscriber.subscribe(config.channels[1]);

server.on("connection", (socket, request) => {
  const clientId = request
    ? new URL(request.url, "http://localhost").searchParams.get("clientId")
    : null;
  logger.info(`Client connected: ${clientId}` + socket);

  if (!socket) {
    logger.error("Socket is null.");
    return;
  }

  clients.set(clientId, socket);

  progressMap.set(clientId, 0);

  if (clientId) {
    socket.send(`Hello, client: ${clientId}!`);
  } else {
    logger.warn("No clientId found.");
  }
});

server.on("error", (error) => {
  logger.error("WebSocket server error:", error);
});
server.on("close", () => {
  logger.error("WebSocket server is closed");
});

["SIGINT", "SIGTERM", "SIGQUIT"].forEach((signal) =>
  process.on(signal, () => {
    logger.info("Server is shutting down.");
    server.close(() => {
      logger.info("WebSocket server closed.");
    });
    clients.forEach((socket) => {
      socket.send("Server is shutting down. Goodbye!");
      socket.close();
    });
  })
);

redisClient.on("connect", () => {
  logger.info("redisClient connected");
});

redisClient.on("error", (err) => {
  logger.error("Error connecting to Redis:", err);
});
