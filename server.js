var mq = require("./message_queue.js");

function start(){

    //tell the worker to iterate 100000000 times
    var data = {
        iterations:1000000000
    }

    console.log("send to queue");
    mqi.sendToQueue(JSON.stringify(data));
    console.log("ready sending to queue");
}

var options = {
    amqphost : "amqp://localhost",
    channelQueue : "unique_channel_name"
};
var mqi = mq.getInstance(options);
mqi.start(function(){

    setInterval(function(){
        start();
    },1000)

})

