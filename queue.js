const WebSocket = require("ws");
//const { Queue } = require("bullmq");
const Redis = require("ioredis");
const logger = require("./logger");
// const { createClient } = require('redis'); 

const server = new WebSocket.Server({ port: 3000 });

//const clients = new Map();

const subscriber = Redis.createClient();

logger.info("Starting Producer .....");
logger.info("Creating Redis Instance");


const redisClient = new Redis({
  host: "127.0.0.1",
  port: 6379,
  maxRetriesPerRequest: null,
});

//logger.info("Creating Queue .....");
//const queue = new Queue("myQueue", { connection: redisClient });

subscriber.on("message", async (channel, message) => {

  const job = JSON.parse(message).jobStr;
  let filteredKeys;
  let totalProgress = 0;

  logger.info(`Job completed successfully`);
  try {
    const value = job.opts.jobId.split("_");
    console.log(value[0]);
    const regex = new RegExp(`^${value[0]}_\\d+$`);

    // Function to handle Jobs from redis (this will call the function above)
    const handleJobs = async (list, tp) => {
      const type =
        list === "completed" || list === "failed" ? "zrange" : "lrange";
      const type2 = list === "completed" || list === "failed" ? "zrem" : "lrem";

      await redisClient[type]("bull:myQueue:" + list, 0, -1, async (err, members) => {
        if (err) {
          logger.info("Error fetching members:", err);
        } else {
          filteredKeys = members.filter((key) => regex.test(key));
        }

        totalProgress = tp || ((filteredKeys.length / (job.opts.totalData)) * 100);     // Set the total progress to 100 to implement the functionality below, to empty completed queue in case of failure 

        if (!(list === "completed" && totalProgress != 100)) {        // The code below won't work if you have to evict from completed queue and the total progress hasn't reached 100 yet
          filteredKeys.forEach((jobId) => {
            redisClient[type2](
              "bull:myQueue:" + list,
              0,
              jobId,
              (err, removedCount) => {
                if (err) {
                  logger.info(`Error removing job ${jobId} from ${list} queue:`, err);
                } else {
                  logger.info(
                    `Removed ${removedCount} job(s) with ID ${jobId} from ${list} queue.`
                  );
                }
              }
            );
          });
        }
        
        if (list === "completed" && tp == undefined){           // Send progress to client only if a job has completed
          console.log("totall progress = ", totalProgress )
         // const socket = clients.get(value[0]);
          logger.debug(value[0]);
          redisClient.get(value[0], (err, socket) => {
            if (err) {
              logger.error(`Error: ${err}`);
            } else {
              logger.info(`Value of mykey: ${socket}`);
              socket.send(`Following is your progress ${totalProgress}`);
            }
          });
          console.log("check name", value[0]);
          //socket.send(`Following is your progress ${totalProgress}`);
        }

      });
    };

    if (channel === "jobFailed") {
      console.log("Your job failed");

      handleJobs("active");             // Remove jobs from the active channel of the BullMQ
      handleJobs("wait");               // Remove jobs from the wait channel of the BullMQ
      handleJobs("failed");             // Remove jobs from the active channel of the BullMQ
      handleJobs("completed", 100);     // setting total Progress 100 so the jobs can be removed from the completed queue

     // const socket = clients.get(value[0]);    
      logger.debug(value[0]);
      redisClient.get(value[0], (err, socket) => {
        if (err) {
          logger.error(`Error: ${err}`);
        } else {
          logger.info(`Value of mykey: ${socket}`);
          socket.send(`Your Job has failed!`);
        }
      });
      //socket.send(`Your Job has failed!`);
    }
    else{
      handleJobs("completed");          // Handling the completed queue in case of job success
    }

  } catch (error) {
    logger.error("Error in processing:", error);
  }
});



server.on("connection", (socket, request) => {
  logger.info("ihiiiiiiiiiiiiiiiiiiiiii");
  const clientId = request
    ? new URL(request.url, "http://localhost").searchParams.get("clientId")
    : null;
  logger.info(`Client connected: ${clientId}` + socket);

  if (!socket) {
    logger.error("Socket is null.");
    return;
  }
subscriber.subscribe("jobCompleted");
subscriber.subscribe("jobFailed");


  redisClient.set(clientId, socket, (err, result) => {
    if (err) {
        console.error('Error setting value in Redis:', err);
    } else {
        console.log('Value set successfully in Redis:', result);
    }
});
  //clients.set(clientId+"100", socket);

  // socket.on("message", (message) => {
  //   try {
  //     const clientData = JSON.parse(message);

  //     console.log("Checkkinggg socket")

  //     if (clientId && clientData[0] && clientData.length > 0) {
  //       clients.set(clientId + clientData[0].batchID, socket);
  //     } else {
  //       logger.warn("Invalid client data received.");
  //       return; // Exit early if clientData is null or empty
  //     }

  //   } catch (error) {
  //     logger.error("Error processing message:", error);
  //   }
  // });
  socket.on('close', () => {
    console.log(`WebSocket connection closed for ${clientId}`);
    
    // Perform cleanup tasks or update application state
    //activeConnections.delete(socket);
});
  if (clientId) {
    //socket.send(`Hello, client: ${clientId}!`);
  } else {
    logger.warn("No clientId found.");
  }
});

server.on("error", (error) => {
  logger.error("WebSocket server error:", error);
});

redisClient.on("connect", () => {
  logger.info("redisClient connected");
});

redisClient.on("error", (err) => {
  logger.error("Error connecting to Redis:", err);
});