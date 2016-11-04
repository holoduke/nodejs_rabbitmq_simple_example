function messageQueue(options){

    var connecting = false;

    amqp = require('amqplib/callback_api');
    var channelQueue = options.channelQueue || "foo";

    var connectAMQP = function(cb) {

        if (connecting) {
            return;
        }
        connecting = true;

        try {
            amqp.connect(options.amqphost, function(err, conn) {
                connecting = false;
                if (err) {

                    console.log("error connecting. try in 500ms",err);
                    setTimeout(function() {
                        connectAMQP(startAMQPChannels);
                    }, 500)
                    return;
                }
                if (cb) cb(err, conn);
            });
        } catch (e) {
            connecting = false;
            console.log("error connecting. try in 500ms",err);
            setTimeout(function() {
                connectAMQP(startAMQPChannels);
            }, 500)
        }
    }

    var startAMQPChannels = function(err, conn,cb) {

        conn.createChannel(function(err, ch){
            console.log("channel ",channelQueue," opened");
            if (err != null) bail(err);
            ch.assertQueue(channelQueue);
            channel = ch;
            if (cb)cb(ch);
        });
    }

    var channel;
    var internalQueue = [];

    var queueOptions = {};
    queueOptions.persistent = true;
    queueOptions.durable = true;

    var consumeOptions = {};
    consumeOptions.noAck = false;

    this.consume = function(cb) {

        channel.assertQueue(channelQueue, consumeOptions);
        channel.consume(channelQueue, function(msg) {
            if (msg !== null) {
                return cb(msg,channel)
            }
        });
    }

    //ensures a message is always send through rabbitmq. in case of an outage of rabbitmq the message is internally cueued in memory.
    //this can happen when the service is not running. once the service is running the safety methods of rabbitmq itself are in the working
    this.sendToQueue = function(message){
        try {
            var options = {};
            options.persistent = true;
            options.durable = true;

            var processingInternalQueue = false;
            var lastProcessedInternalQueuedMessage = null;
            if (internalQueue.length != 0) {
                console.log("---- found internal queue -> process first ----")
                processingInternalQueue = true;
                while (internalQueue.length) {
                    console.log(internalQueue[0],"process internal queue message")
                    var lastProcessedInternalQueuedMessage = internalQueue.shift();//+" (internal queue)";
                    channel.sendToQueue(channelQueue, new Buffer(lastProcessedInternalQueuedMessage),queueOptions);
                }
            }

            console.log(message,"message send to queue");
            channel.sendToQueue(channelQueue, new Buffer(message),queueOptions);
            return true;
        } catch (e) {
            if (processingInternalQueue) {
                console.log(lastProcessedInternalQueuedMessage,"error happened in processing interal queue. put back in original")
                internalQueue.unshift(lastProcessedInternalQueuedMessage); //to make sure message is on same position as original
                console.log(internalQueue);
            }

            console.log(message,"cannot process message. put in internal queue")
            internalQueue.push(message);

            connectAMQP(startAMQPChannels);
            return false;
        }
    }

    this.start = function(cb){
        connectAMQP(function(err,conn){
            startAMQPChannels(err,conn,function(channel){
                cb();
            });
        });
    }
}

module.exports = {

    getInstance : function(options){
        return new messageQueue(options);
    }
}


