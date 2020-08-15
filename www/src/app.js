import Vue from 'vue'
import VueMqtt from 'vue-mqtt'
Vue.component('nav-component', require('./components/Nav.vue').default)
Vue.component('live-component', require('./components/LiveData.vue').default)
Vue.component('historian-component', require('./components/Historian.vue').default)

const mqttBrokerAddress = 'localhost';
//const mqttBrokerAddress = '192.168.0.250';

new Vue({
  el: '#app',
  data:{
    view:'live'
  },
  mounted(){
    console.log("Master controller: Root component mounted")
  },
  created(){
    var clientId = 'WebClient-' + parseInt(Math.random() * 100000)
    Vue.use(VueMqtt, `mqtt://${mqttBrokerAddress}:9001`, {
      clientId: clientId
    })
  },
  methods:{
    
  }
})