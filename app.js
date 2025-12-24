//app.js
App({
  onLaunch:function(){

    if(!wx.cloud){
      console.error('请使用2.2.3或以上的基础库以使用云能力')
    }else
    wx.cloud.init({
      env:"jihua-oa-dev-3goht9irae4d949f",//云开发环境
      traceuser:true,
      })
    }

    this.globalData={}
  }
})