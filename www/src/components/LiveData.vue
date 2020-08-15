<template>
  <div class="row">
    <div class="col">
      <div class="row" v-for="(device, deviceName, deviceIndex) in devices">
        <div class="col">
          <div class="row-col border rounded mb-1 bg-secondary text-white p-1" data-toggle="collapse" :data-target="'#'+deviceName">
            + {{deviceName}} <span v-if="!device.connected" class="badge badge-pill badge-danger">Disconnected</span>
          </div>
          <div class="row collapse" v-for="(category, catName) in device" :id="deviceName">
            <div class="col ml-3">
              <div class="row-col rounded bg-light">
                {{catName}}
              </div>
              <div class="row mb-1" v-for="(metric, metricName, metricIndex) in category">
                <div class="col ml-3">
                  {{metricName}}
                </div>
                <div class="col">
                  <div v-if="catName=='command'" class="btn btn-primary btn-sm" @click="sendCommand(deviceName,metricName)">
                    {{metricName}}
                  </div>
                  <div v-else-if="catName=='desired'">
                    <input type="text" v-model="desired[deviceName][metricName]" @change="sendDesired(deviceName,metricName,$event)">
                  </div>
                  <div v-else>
                    {{metric.value}}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
      <div class="rowcol form-check">
        <input class="form-check-input" type="checkbox" v-model="displayMessages">
        <label class="form-check-label">Show messages</label>
      </div>
      <div class="rowcol form-check" v-if="displayMessages">
        <input class="form-check-input" type="checkbox" v-model="pause">
        <label class="form-check-label">Pause</label>
      </div>
      <template v-if="displayMessages">
        <div class="rowcol border rounded p-1 mb-1" v-for="message in messages">
          <span class="bg-secondary text-light p-1">{{message.topic}}</span> - {{message.payload}}
        </div>
      </template>
    </div>
  </div>
</template>

<script>
  export default {
    mounted(){
      console.log("Live data component mounted")
      var self = this
      this.$root.$mqtt.subscribe('#')
      this.$root.$mqtt.on('message',function(topic,message){
        try{
          var msg = JSON.parse(message)
          var dT = Date.now() - msg.timestamp
          //console.log(dT) // milliseconds delay between send and receive...
          var topicArray = topic.split('/')
          var deviceId = topicArray[1]
          var messageType = topicArray[0]
          //console.log(topicArray)
          //console.log(JSON.stringify(msg))
          if(self.displayMessages && !self.pause){
            let newMsg = {
              topic:topic,
              payload:JSON.stringify(msg)
            }
            self.messages.splice(0,0,newMsg)
            if(self.messages.length > 10)
              self.messages.pop()
              
          }
          switch(messageType){
            case 'birth':
              console.log(`got a birth message for device ${deviceId}`)
              if(self.devices.hasOwnProperty(deviceId)){
                delete self.devices.deviceId
                delete self.desired.deviceId
              }
              var contents = {
                desired:{},
                reported:{},
                telemetry:{},
                command:{},
                timing:{
                  msError:{
                    dataType:'float',
                    timestamp:0,
                    value:'n/a'
                  }
                },
                connected:true
              }

              var desired = {}
              
              for(const metric of msg.metrics){
                //console.log(JSON.stringify(metric))
                var metricType = metric.type
                var name = metric.name
                contents[metricType][name] = {
                  value:metric.value,
                  dataType:metric.dataType,
                  timestamp:metric.timestamp
                }
                if(metricType == 'desired')
                  desired[name] = metric.value
              }
              self.$set(self.devices,deviceId,contents)
              self.$set(self.desired,deviceId,desired)
              break
            case 'data':
              //console.log(`got a data message for device ${deviceId}`)
              if(self.devices.hasOwnProperty(deviceId)){
                self.devices[deviceId].timing.msError.value = dT
                for(const metric of msg.metrics){
                  //console.log(JSON.stringify(metric))
                  var metricType = metric.type
                  var name = metric.name
                  //if(!self.devices[deviceId][metricType].hasOwnProperty(name))
                  self.$set(self.devices[deviceId][metricType],name,
                  {
                    value:metric.value,
                    dataType:metric.dataType,
                    timestamp:metric.timestamp
                  })
                }
              }else{
                self.requestRebirth(deviceId)
              }
              break
            case 'death':
              console.log(`got death message from ${deviceId}`)
              self.$set(self.devices[deviceId],'connected',false)
              break
            default:
              console.log(`not currently handling message type ${messageType}`)
              break
          }
          
        }catch(err){
          if(topic != 'state'){
            console.log(`couldn't JSON parse message payload: ${message}`)
            console.log(err)
          }
          
        }
        //console.log(`topic:${topic}, payload:${message}`)
      })
    },
    data(){
      return{
        devices:{},
        desired:{},
        messages:[],
        displayMessages:false,
        pause:false
      }
    },
    methods:{
      publishMessage(topic,type,name,value,dataType='float'){
        var timestamp = Date.now()
        // seq should be handled by actual contoller, not UI. 
        // placeholder value of -999 used for seq
        var metrics = [
          {
            type:type,
            name:name,
            value:value,
            timestamp:timestamp,
            dataType:dataType
          }
        ]
        var payload = {
          timestamp:timestamp,
          metrics:metrics,
          seq:-999
        }
        this.$root.$mqtt.publish(topic,JSON.stringify(payload))
      },
      requestRebirth(deviceId){
        this.publishMessage(`cmd/${deviceId}`,'command','rebirth','')
      },
      sendCommand(deviceId,command){
        this.publishMessage(`cmd/${deviceId}`,'command',command,'')
      },
      sendDesired(deviceId,metric,event){
        this.publishMessage(`cmd/${deviceId}`,'desired',metric,event.target.value)
      }
    }
  }
</script>