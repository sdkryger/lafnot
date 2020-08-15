<template>
  <div class="row">
    <div class="col-12">
      <div class="btn btn-primary" @click="refresh">Refresh</div>
    </div>
    <div class="col">
      <div class="row" v-for="device in devices">
        <div class="col-12">
          {{device.id}}
          <span class="badge badge-pill badge-info">{{device.dataCount}}</span>
        </div>
        <div class="col-12 pl-4" v-for="tag in device.tags">
          {{tag.fullName}}
          <span class="badge badge-pill badge-info">{{tag.dataCount}}</span>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
  export default {
    data(){
      return{
        devices:{}
      }
    },
    mounted(){
      //setInterval(this.updateSummary,1000)
      this.refresh()
    },
    methods:{
      refresh(){
        this.updateSummary()
      },
      updateSummary(){
        var self = this
        $.get(
          'api/listDevices',
          function(data){
            for(const device of data){
              if(!self.devices.hasOwnProperty(device)){
                var dev = {
                  id:device,
                  dataCount:'n/a',
                  tags:{}
                }
                self.$set(self.devices,device,dev)
              }
              self.updateDeviceDataCount(device)
              
            }
            self.updateTagList()
          },
          'json'
        )
      },
      updateDeviceDataCount(deviceId){
        var self = this
        $.get(
          'api/count',
          {
            deviceId:deviceId
          },
          function(data){
            self.$set(self.devices[deviceId],'dataCount',data.n)
          },
          'json'
        )
      },
      updateTagDataCount(tag,tagName,deviceId){
        var self = this
        $.get(
          'api/count',
          {
            tag:tag
          },
          function(data){
            self.$set(self.devices[deviceId].tags[tagName],'dataCount',data.n)
          },
          'json'
        )
      },
      updateTagList(){
        var self = this
        $.get(
          'api/listTags',
          function(data){
            for(const tag of data){
              console.log(tag)
              let tagArray = tag.split('_')
              let deviceId = tagArray[0]
              let tagName = tagArray[1]
              if(!self.devices[deviceId].tags.hasOwnProperty(tagName)){
                let newTag = {
                  fullName: tag,
                  dataCount: 'n/a'
                }
                self.$set(self.devices[deviceId].tags,tagName,newTag)
              }
              self.updateTagDataCount(tag,tagName,deviceId)
            }
          },
          'json'
        )
      }
    }
  }
</script>