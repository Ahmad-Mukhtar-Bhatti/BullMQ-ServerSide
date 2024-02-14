
# BullMQ Middleware

### About

**BullMQ**\
BullMQ is a powerful, feature-rich Node.js library for managing and executing background jobs and tasks. It provides a robust and scalable solution for handling distributed job queues, enabling efficient processing of tasks asynchronously. BullMQ provides & ensures *Job Queue Management*, *Scalability*, *Reliablility* & *Advanced Job Control*. This leverages the Redis DataBase for quick storage and retrieval.

**Worker**\
In the context of BullMQ, workers are individual processes or instances responsible for executing jobs from the queue. These workers can be distributed across different machines or run locally, providing flexibility in scaling and optimizing the performance of your application.


## Table of Contents

1. [Project Structure](#project-structure)
2. [Getting Started](#getting-started)
  - [Prerequisites](#prerequisites)
  - [Installation](#installation)
3. [Usage](#Usage)
  - [Project Structure](#project-structure)
  - [Running the Project](#running-the-project)
4. [Testing](#testing)
5. [Conclusion](#conculsion)

## Project Structure

The codebase is divided into 2 sections, one is the server side, and the other is the Client/User side.\
The server side contains the code for two major files:
* `middelware.js`: The code that connects to the queue & sends the progress of each client through their respective socket connection.
* `worker.js`: This creates an instance of a worker which will get the same redis connection. The worker will work on the jobs pushed into the queue and mark them complete, inprogress or failed.

The client side has two further subdivisions, the backend and the frontend folder. The two major files are:
* `app.js`: This is the file in the backend folder which connects with the queue and the redis database and pushes the jobs into the queue. 
* `clientPage.jsx`: This is the react file in the frontend folder which intiates the socket connection with the server. This file also contains the progress bar component which displays the amount of jobs completed and the number of jobs failed.


## Getting Started
### Prerequisites

- [Node.js](https://nodejs.org/)
- [npm](https://www.npmjs.com/)
- [redis](https://redis.io/download/)

**Note:** Windows users are required to perfrom the project in Windows Subsystem for Linux (WSL) or a Virtual Machine for Linux, since Redis version 5 and higher is not directly supported on windows. You'll have to run the following commands in a separate cmd before running the project:

```sh
wsl 
redis-server
```


### Installation

1. Clone the two repositories:

   ```sh
   git clone https://github.com/Ahmad-Mukhtar-Bhatti/BullMQ-ServerSide.git
   cd BullMQ-ServerSide
   ```

   ```sh
   git clone https://github.com/Ahmad-Mukhtar-Bhatti/BullMQ-ClientSide.git
   cd BullMQ-ClientSide
   ```

2. Install the dependencies:

**Server Side:**
```sh
npm i
```

**Client Side:**
```sh
cd frontend
npm i
```
```sh
cd backend
npm i
```

## Usage

After setting up the project, you can use the code base to try out different variations of values, like concurrency of workers, number of workers, time taken for each job etc and checkout the results.

### Project Structure

After downloading the project, you'll be able to view the files inside of it. The `config` folder in each of the repositories contains the permanent values that you could change according to your requirement.

### Running the project

#### Starting the terminals 
You'll need to open a minimum of 4 terminals, 2 for server side and two for client side.

1. **Server side:**

Terminal 1:
```sh
nodemon middelware.js
```
Terminal 2:
```sh
nodemon worker.js
```

2. **Client side:**

Terminal 1:
```sh
cd backend
nodemon app.js
```
Terminal 2:
```sh
cd frontend
npm run dev
```

3. **Viewing Redis (optional)**
You can additionally run two more optional terminals to view redis storge, its keys & values, and easily delete the keys as well

Terminal 1:
```sh
redis-cli
```
- *Keys \** : to view the redis keys.
- *FLUSHALL* : to clear out the redis keys.

Terminal 2:
```sh
redis-commander
```
Click the browser link that appears in the terminal. The link will lead you to a browser page that will show you the stored keys and values in Redis.


#### Sending the Job Request

After running the frontend react application, you'll see a login screen. This screen doesn't contain any checks and is purely to allow you to view the functionality. Enter your login credentials. This will lead you to the Client page. Click the `Send Message` button, which will send the jobs to BullMQ for processing purposes. Clicking this multiple times would send more batches. You may open the browser terminal to view the logs.



## Testing

You may change certian variables to see how the functionality behaves differently.

1. **Changing Number of Jobs:**

In the client side's frontend folder, by default the number of jobs sent in each batch/message is 10.\
To change the value, move to the `clientPage.jsx` file, go to line 101, where the tasks array is being defined, and change the value (in both, 'length' and the metadata, i.e. 'totalData') from 10 to any desired value:

```javascript
const tasks = Array.from({ length: 10 }, () => ({
      user: name,
      appID: appName,
      totalData: "10",
      batchID: id,
      data: "",
    }));
```

2. **Changing Number of Clients:**

By default, opening up a single browser frontend screen would register one user. To try out multiple users, open up the react screen in a new tab and follow the same steps, i.e. login and send message.

*Note:*\
BullMQ processes the jobs sequentially, hence if the number of jobs sent by the first client is greater than or equal to the workers processing ability, the second client will need to wait before the workers get free.


3. **Changing Number of Workers:**

If you want to try running different workers, simply open up another terminal in the server side folder and run the following command:

```sh
nodemon worker.js
```

You can run this in as many terminals as you want, and this will increase the number of worker accordingly.


4. **Changing Concurrency of Workers:**

Concurrency means how many jobs a worker can handle at a single time, or simultaneously. By default, this is set to 1. To change it, move to the config folder in the server side, go to the `default.json` file and change the following value to any value you want:

```javascript
"concurrency": 1,
```

5. **Total Steps for a Single Job:**

This means that a single job in a batch wil be broken down into subtasks and the progress of each job will be updated and sent accordingly.
By default, this is set to 10, but to change this, you may can change the following code in `worker.js` (line 40) according to your need:

```javascript
const totalSteps = 10;
```

*Note:* Since currently each subtask is set to complete in between 0-1 second (line 47), and total job is completes in 8 seconds (line 65), You will be required to change the setTimeout() value in line 65 if your totalSteps multiplied by time taken for each step significantly increases a single job's time.

6. **Job Success or Failure:**

This will allow you to either fail or succeed a job. By default, the code makes all the jobs succeed (threshold value set to 1.1). To change the probability of the job succeeding, change the following threshold value in `worker.js` (line 34) according to your need:

```javascript
const shouldResolve = Math.random() < 1.1;
```


**NOTE:**

While you may increase values such as concurrency and the number of workers, note that since javascript is asynchronous in nature and every system has limited resources, there will obviously be a limit to how much jobs can be handled at a single time. Setting a very high number doesn't neccessarily mean the progress will be equally quick. This also depends on the nature of jobs. Some jobs can't be handled concurrently and will hence be processed seperately.


## Scaling the code

It is important to understand that while the code is created for directly using it in your projects, it has nonetheless been modified to allow proper demonstration. 

Following are a few places which you'll be required to change as a user to plug the code in your project:

1. `worker.js`:

For purely demonstration purposes, to imitate a realtime job, *setTimeout()* functions are used for each job and its subtasks. In a real-life scenerio, you will remove these setTimeout functions and the workers will process your job.

Secondly, as aforementioned, currently all jobs are divided into 10 subtasks. A single job is set to complete in 8 seconds, and its subtasks take 0-1 second to complete, in your code base, you will have to define how your job shall be broken down into multiple subtasks. In real-life, a job may be atomic and may not neccessarily be divided into subtasks. In that case, you will have to set totalSteps to 1.

2. `clientPage.jsx` & `clientPage.css`:

In your react application, you only require these two components to be integrated into your application. Although these are complete pages, you will have to futher extract the 'Progress Bar' and the socket functionality in this page and move that to your project. 

3. `app.js`

This file in the backend folder of client side will in real project required to be integrated into your project. The code currently uses express, and if your project doesn't contain express, you'll have to modify it accordingly. 

4. Changing the Ports 

The project is currently running on defined ports with a local redis connection. In order to adjust the code to your project, you need to change the port and endpoint settings in the JSON files in the config folder.

## Conclusion

BullMQ is a very useful library for porcessing the jobs. This Readme doesn't contain the detailed explanation of the dataflow or the code's nitty-gritty, but provides more of plug-modify-play functionality and a pure demonstration tutorial. 