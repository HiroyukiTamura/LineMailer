var channel_access_token = "**********************************";
var address = "*********";
var domain = "******.jp";
var sheet_id = "***********************************";
var log_sheet_id = "**********************************";
var ask_phrase1 = "「";
var ask_phrase2 = "」を登録しました。なお、botの詳しい仕様はプロフィールに記載してあります。";

var join_phrase = "このbotにコメントすると、*****のガラケーとやり取りができます。"
+ "ただしグループ・トークルームではコメントの発信者を識別できません。"
+ "まず、グループ名を教えてください。";

function doPost(e) {
  log("doPost");
  var events = JSON.parse(e.postData.contents).events;
  var ss0 = SpreadsheetApp.openById(log_sheet_id).getSheets()[0];
  var ss = SpreadsheetApp.openById(sheet_id);
  
  events.forEach(function(event) {
    var id;
    if(event.source.type=="user"){
      id = event.source.userId;
    } else if(event.source.type=="group"){
      id = event.source.groupId;
    } else if(event.source.type=="room"){
      id = event.source.roomId;
    }
    
    if(event.type == "message"){
      log("event.type == message");
      if(event.message.type=="text"){
        var user_ss = ss.getSheetByName("user");
        var row = findRow(user_ss, id, 2);
        if(row == 0){
          log("row == 0");
          var phrase = ask_phrase1 + event.message.text + ask_phrase2;
          lineReply(event, phrase);
          addFriend(event.message.text, id);
        } else {
          log("row != 0");
          var name = user_ss.getRange(row, 1).getValue();
          if(name == "unknown"){
            log("name == unknown");
            var phrase = ask_phrase1 + event.message.text + ask_phrase2;
            lineReply(event, phrase);
            user_ss.getRange(row, 1).setValue(event.message.text);
          } else {
            log("name != unknown");
            sendMail(event.message.text, name);
          }
         }
      } else {
        ss0.appendRow([event.message.type, event.source.type, event.message.text]);
      }
      
    } else if(event.type == "follow"){
      // 友だち追加・ブロック解除
      ss0.appendRow(["発火: 友達追加・ブロック解除"]);
      addFriend("unknown", event.source.userId);
      
    } else if(event.type == "unfollow"){
      // ブロック
      var user_id = event.source.userId;
      removeRaw(ss, user_id, "user");
      ss0.appendRow(["発火: ブロック"]);
      
    } else if(event.type == "join"){
      //グループ・トークルーム参加
      addFriend("unknown", id);
      lineReply(event, join_phrase);
    }
 });
}

function log(msg){
  var ss0 = SpreadsheetApp.openById(log_sheet_id).getSheets()[0];
  ss0.appendRow(["発火", msg]);
}

function lineReply(e, text) {
  log("lineReply");
  var postData = {
    "replyToken" : e.replyToken,
    "messages" : [
      {
        "type" : "text",
        "text" : text
      }
    ]
  };

  var options = {
    "method" : "post",
    "headers" : {
      "Content-Type" : "application/json",
      "Authorization" : "Bearer " + channel_access_token
    },
    "payload" : JSON.stringify(postData)
  };

  UrlFetchApp.fetch("https://api.line.me/v2/bot/message/reply", options);
}


function sendMail(msg, subject){
  Logger.log("発火 sendMail() msg: " + msg);
  MailApp.sendEmail(address + "@" + domain, subject, msg);
}


function findRow(sheet,val,col){ 
  var dat = sheet.getDataRange().getValues(); 
 
  for(var i=0;i<dat.length;i++){
    if(dat[i][col-1] === val){
      return i+1;
    }
  }
  return 0;
}


function getFriendName(sheet,val,col){
  var dat = sheet.getDataRange().getValues();
  for(var i=0;i<dat.length;i++){
    if(dat[i][col-1] === val){
      return dat[i][col-2];
    }
  }
  return null;
}


function addFriend(name, user_id){
  //var user_id = e.source.userId;
  var data_sheet = SpreadsheetApp.openById(sheet_id).getSheetByName("user");
  data_sheet.appendRow([name, user_id]);
}


function removeRaw(ss, user_id, sheet_name){
  var user_ss = ss.getSheetByName(sheet_name);
  var raw = findRow(user_ss, user_id, 2);
  user_ss.deleteRow(raw);
}


function checkGmail(){
  log("checkGmail()");
  var start = 0;
  var max = 500;
  var threads = GmailApp.search("label:linebot",start,max);
  var ss = SpreadsheetApp.getActiveSheet();
  var row = ss.getLastRow() + 1;
  Logger.log(threads.length);
  
  for(var n in threads){
    var the = threads[n];
    
    var msgs = the.getMessages();
    for(m in msgs){
      var msg = msgs[m];
        
      if(msg.isStarred()){
        Logger.log(m);
        var from = msg.getFrom();
        var subject = msg.getSubject();
        var body = msg.getPlainBody();
        ss.getRange(row,1).setValue(msg.getDate());
        ss.getRange(row, 2).setValue(from);
        ss.getRange(row, 3).setValue(subject);
        ss.getRange(row,4).setValue(body);
        
        var mail = address + "@" + domain;
        if(from == mail){
          if(subject == "友達一覧"){
            //友達一覧を返す
            log("subject == 友達一覧");
            var dat = user_ss.getDataRange().getValues();
            var arr_msg = makeAllFriendArr(dat);
            sendMail(arr_msg, "友達一覧");
          }
        } else {
          var name = subject.replace("Re:", "").replace(" ", "");
          log("name: " + name);
          var row = findRow(user_ss, name, 1);
          if(row == 0){
            sendMail("そんなアカウント名は存在しません！", "エラー");
          } else {
            var ss = SpreadsheetApp.openById(sheet_id).getSheetByName("user");
            var id = ss.getRange(row, 2).getValue();
            log(id);
            linePush(id, body);
          }
        }
        
        msg.unstar();
        
        row++;
      }
    }
    Utilities.sleep(1000);
  }
}


function makeAllFriendArr(dat){
  var arr = [];
  for(var i=1;i<dat.length;i++){
    var set = dat[i][0] + ";" + dat[i][1] + ";";
    arr.push(set);
  }
  return arr.join("");
}


function linePush(id2, text2){

  var postData = {
    "to" : id2,
    "messages" : [
      {
        "type" : "text",
        "text" : text2
      }
    ]
  };
  
  var options = {
    "method" : "post",
    "headers" : {
      "Content-Type" : "application/json",
      "Authorization" : "Bearer " + channel_access_token
    },
    "payload" : JSON.stringify(postData)
  };
  
  var responce = UrlFetchApp.fetch("https://api.line.me/v2/bot/message/push", options);
  log(responce.getResponseCode());
  log(responce.getContentText());
}
