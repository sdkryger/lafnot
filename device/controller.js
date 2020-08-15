class Controller {
  constructor(id,brokerAddress){
    this.id = id
    this.brokerAddress = brokerAddress
    var mqtt = require('mqtt')
    var options = {
      will:{
        topic:`death/${this.id}`,
        payload:`{"deviceId":"${this.id}"}`,
        qos:2
      }
    }
    this.client  = mqtt.connect(`mqtt://${brokerAddress}`,options)

    this.seq = 0

    this.desired = {
      telemetryRate:{
        value:1000,
        dataType:'integer'
      },
      timestampOffset:{
        value:0,
        dataType:'integer'
      }
    }

    this.reported = {
      telemetryRate:{
        value:1000,
        dataType:'integer'
      },
      timestampOffset:{
        value:0,
        dataType:'integer'
      },
      status:{
        value:'success',
        dataType:'string'
      }
    }

    this.telemetry = {
      
    }

    this.command = {
      rebirth:{
        value:false,
        dataType:'boolean'
      }
    }

    this.telemetryTimer = {}

    this.client.on('connect',()=>{
      this.client.subscribe(`cmd/${this.id}`)
      //this.publishBirth()
      //this.telemetryTimer = setInterval(()=>this.sendTelemetry(),this.reported.telemetryRate.value)
    })

    this.client.on('message', (topic, message) =>{
      this.messageHandler(topic,message)
    })
  }



  getTime(){
    return Date.now() + this.reported.timestampOffset.value
  }

  messageHandler(topic,message){
    console.log(`Message handler says - topic: ${topic}, payload: ${message.toString()}`)
    if(topic == `cmd/${this.id}`){
      message = JSON.parse(message)
      console.log(JSON.stringify(message))
      var metrics = message.metrics
      for(const metric of metrics){
        console.log(`metric.type: ${metric.type}, metric.name: ${metric.name}`)
        switch (metric.type){
          case 'command':
            switch(metric.name){
              case 'rebirth':
                this.publishBirth()
                break
              default:
                this.processCommandMetric(metric)
                break
            }
            break
          case 'desired':
            switch(metric.name){
              case 'telemetryRate':
                var telemetryRate = parseInt(metric.value)
                if(metric.value == telemetryRate && telemetryRate >= 100){
                  this.desired.telemetryRate.value = telemetryRate
                  this.reported.telemetryRate.value = telemetryRate
                  this.reported.status.value = 'success setting telemetry rate'
                  clearInterval(this.telemetryTimer)
                  this.telemetryTimer = setInterval(()=>this.sendTelemetry(),this.reported.telemetryRate.value)
                  this.publishPropertiesArray([
                    'desired.telemetryRate',
                    'reported.telemetryRate',
                    'reported.status'
                  ])
                }else{
                  console.log("value ignored")
                  this.reported.status.value = 'telemetry rate must be integer greater than or equal to 100'
                  this.publishPropertiesArray(['reported.status'])
                }
                break
              case 'timestampOffset':
                var offset = parseInt(metric.value)
                if(metric.value == offset){
                  this.desired.timestampOffset.value = offset
                  this.reported.timestampOffset.value = offset
                  this.reported.status.value = 'updated timestampOffset'
                  this.publishPropertiesArray([
                    'desired.timestampOffset',
                    'reported.timestampOffset',
                    'reported.status'
                  ])
                }else{
                  this.reported.status.value = 'timestampOffset must be an integer'
                  this.publishPropertiesArray(['reported.status'])
                }
                break
              default:
                this.processDesiredMetric(metric)
                break
            }
            break
          default:
            // don't handle reported or data
            break
        }
      }
    }else{
      console.log("hmm... somehow got someone else's message")
    }
  }

  metrics(category){
    var metrics = []
    for (const [key, value] of Object.entries(this[category])) {
      
      let metric = {
        type:category,
        name:key,
        value:value.value,
        dataType:value.dataType,
        timestamp:this.getTime()
      }
      metrics.push(metric)
    }
    return metrics
  }

  processDesiredMetric(metric){
    this.updateProperty('reported','status',`default behavior - unhandled desired metric name: ${metric.name}`)
  }

  processCommandMetric(metric){
    this.updateProperty('reported','status',`default behavior - unhandled command metric name: ${metric.name}`)
  }

  publishBirth(){
    var metrics = this.metrics('desired').concat(this.metrics('reported'),this.metrics('telemetry'),this.metrics('command'))
    //console.log(`Birth metrics: ${JSON.stringify(metrics)}`)
    this.publishMetricsArray(`birth/${this.id}`,metrics)
  }

  publishPropertiesArray(properties){
    var metrics = []
    for (const property of properties){
      console.log(JSON.stringify(property))
      let propArray = property.split('.')
      let metric = {
        type:propArray[0],
        name:propArray[1],
        value:this[propArray[0]][propArray[1]].value,
        dataType:this[propArray[0]][propArray[1]].dataType,
        timestamp:this.getTime()
      }
      metrics.push(metric)
    }
    console.log(JSON.stringify(metrics))
    this.publishMetricsArray(`data/${this.id}`,metrics)
  }

  updateProperty(type, name, value){
    console.log(JSON.stringify(this[type][name]))
    this[type][name].value = value
    let metrics = [{
      type:type,
      name:name,
      value:value,
      dataType:this[type][name].dataType,
      timestamp:this.getTime()
    }]
    console.log(JSON.stringify(metrics))
    this.publishMetricsArray(`data/${this.id}`,metrics)
  }

  publishMetricsArray(topic,metrics){
    console.log(`${this.id} - seq: ${this.seq}`)
    var payload = {
      timestamp:this.getTime(),
      metrics:metrics,
      seq:this.seq++
    }
    this.client.publish(topic,JSON.stringify(payload),{qos:2,retain:false})
    if(this.seq>255)
      this.seq = 0
    
  }

  sendTelemetry(){
    this.publishMetricsArray(`data/${this.id}`,this.metrics('telemetry'))
  }

  addDesired(desired){
    for(const prop of desired){
      this.desired[prop.name] = {
        value:prop.value,
        dataType:prop.dataType
      }
    }
    this.publishBirth()
  }

  addReported(reported){
    for(const prop of reported){
      this.reported[prop.name] = {
        value:prop.value,
        dataType:prop.dataType
      }
    }
    this.publishBirth()
  }

  addStatus(reported){
    for(const prop of reported){
      this.reported[prop.name] = {
        value:prop.value,
        dataType:prop.dataType
      }
    }
    this.publishBirth()
  }

  addSetting(desired){
    for(const prop of desired){
      let dataType = 'float'
      if(prop.hasOwnProperty('dataType'))
        dataType = prop.dataType
      this.desired[prop.name] = {
        value:prop.value,
        dataType:dataType
      }
      this.reported[prop.name] = {
        value:prop.value,
        dataType:dataType
      }
    }
    //this.publishBirth()
  }

  addTelemetry(telemetry){
    for(const prop of telemetry){
      let dataType = 'float'
      let value = -999
      if(prop.hasOwnProperty('dataType'))
          dataType = prop.dataType
      if(prop.hasOwnProperty('value'))
        value = prop.value
      this.telemetry[prop.name] = {
        value:value,
        dataType:dataType
      }
    }
    //this.publishBirth()
  }

  run(telemetryUpdateRate=100){
    this.publishBirth()
    this.telemetryTimer = setInterval(()=>this.sendTelemetry(),this.reported.telemetryRate.value)
    setInterval(()=>{this.updateTelemetryValues()},telemetryUpdateRate)
  }

  updateTelemetryValues(){
    //override this function to read from inputs and/or calculate telemetry
  }

}

module.exports = Controller