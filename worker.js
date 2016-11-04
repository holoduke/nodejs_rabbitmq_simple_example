var mq = require("./message_queue.js");

var options = {
    amqphost : "amqp://localhost",
    channelQueue : "unique_channel_name"
};

var mqi = mq.getInstance(options);
mqi.start(function(){
    mqi.consume(function(message,channel){
        try{
            var data = JSON.parse(message.content.toString());

            console.log("incoming message, iterate ",data.iterate,"times");

            var d = new Date();

            for (var i=0; i < data.iterations;i++){

            }

            console.log("iteration complete in ",(new Date().getTime()-d.getTime())+"ms");
            channel.ack(message);
        }
        catch(e){
            console.log("something went terribly wrong ",e);
            channel.nack(message);
        }
    })
});
