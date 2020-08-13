const Controller = require('./controller.js')

let deviceId = 'temperatureController'
let brokerAddress = 'localhost'
var counter = 0 //used for simulation of telemetry data
controller = new Controller(deviceId, brokerAddress)

controller.addSetting([
  {
    name: 'temperatureSetpoint',
    value:20
  }
])

controller.addTelemetry([
  {
    name: 'temperature_degC'
  }
])

controller.addStatus([
  {
    name: 'mode',
    value: 'not set',
    dataType: 'string'
  }
])

controller.processDesiredMetric = (metric) => {
  switch(metric.name){
    case 'temperatureSetpoint':
      var value = parseFloat(metric.value)
      if(metric.value == value && value >= -40 && value <= 100){
        controller.updateProperty('reported','temperatureSetpoint',value)
        controller.updateProperty('reported','status','success setting temperatureSetpoint')
      }else
      controller.updateProperty('reported','status','temperature setpoint must be between -40 and 100')
      break
    default:
      console.log(`unhandled desired metric, name: ${metric.name}`)
      controller.updateProperty('reported','status',`unhandled desired metric, name: ${metric.name}`)
  }
}

controller.updateTelemetryValues = () => {
  for (const [key, value] of Object.entries(controller.telemetry)) {
    controller.telemetry[key].value = Math.sin(counter) * 10 + 20
  }
  var currentMode = 'cooling'
  if(controller.telemetry.temperature_degC.value < controller.reported.temperatureSetpoint.value)
    currentMode = 'heating'
  if(currentMode != controller.reported.mode.value){
    controller.updateProperty('reported','mode',currentMode)
  }
  counter += 0.01
}

controller.run()

